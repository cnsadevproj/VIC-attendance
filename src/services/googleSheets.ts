// Google Sheets API 서비스
// 결석자 데이터를 Google Spreadsheet에 내보내기

// 스프레드시트 ID (URL에서 추출)
const SPREADSHEET_ID = '1gVFE9dxJ-tl6f4KFqe5z2XDZ2B5mVgzpFAj7s-XrLAs'

// Google API 설정 (Google Cloud Console에서 생성 필요)
const API_KEY = '' // TODO: Google Cloud Console에서 API 키 생성 후 입력
const CLIENT_ID = '' // TODO: Google Cloud Console에서 OAuth 클라이언트 ID 생성 후 입력
const DISCOVERY_DOC = 'https://sheets.googleapis.com/$discovery/rest?version=v4'
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets'

export interface AbsentStudent {
  seatId: string
  name: string
  note: string // 비고 (사전결석 사유 또는 기타 메모)
  grade: number // 1 or 2
}

export interface ExportResult {
  success: boolean
  message: string
  sheetUrl?: string
}

// gapi 타입 선언
declare global {
  interface Window {
    gapi: {
      load: (api: string, callback: () => void) => void
      client: {
        init: (config: { apiKey: string; discoveryDocs: string[] }) => Promise<void>
        sheets: {
          spreadsheets: {
            get: (params: { spreadsheetId: string }) => Promise<{ result: { sheets: Array<{ properties: { title: string; sheetId: number } }> } }>
            batchUpdate: (params: { spreadsheetId: string; resource: unknown }) => Promise<unknown>
            values: {
              update: (params: {
                spreadsheetId: string
                range: string
                valueInputOption: string
                resource: { values: string[][] }
              }) => Promise<unknown>
              batchUpdate: (params: {
                spreadsheetId: string
                resource: {
                  valueInputOption: string
                  data: Array<{ range: string; values: string[][] }>
                }
              }) => Promise<unknown>
            }
          }
        }
      }
    }
    google: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string
            scope: string
            callback: (response: { access_token?: string; error?: string }) => void
          }) => { requestAccessToken: () => void }
        }
      }
    }
  }
}

let gapiInitialized = false
let tokenClient: { requestAccessToken: () => void } | null = null

// GAPI 초기화
export async function initGoogleAPI(): Promise<boolean> {
  if (!API_KEY || !CLIENT_ID) {
    console.warn('Google API 키가 설정되지 않았습니다.')
    return false
  }

  return new Promise((resolve) => {
    // gapi 스크립트 로드
    const gapiScript = document.createElement('script')
    gapiScript.src = 'https://apis.google.com/js/api.js'
    gapiScript.async = true
    gapiScript.defer = true
    gapiScript.onload = () => {
      window.gapi.load('client', async () => {
        try {
          await window.gapi.client.init({
            apiKey: API_KEY,
            discoveryDocs: [DISCOVERY_DOC],
          })
          gapiInitialized = true
          resolve(true)
        } catch (err) {
          console.error('GAPI 초기화 실패:', err)
          resolve(false)
        }
      })
    }
    document.body.appendChild(gapiScript)

    // Google Identity Services 스크립트 로드
    const gisScript = document.createElement('script')
    gisScript.src = 'https://accounts.google.com/gsi/client'
    gisScript.async = true
    gisScript.defer = true
    gisScript.onload = () => {
      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: () => {}, // 나중에 설정
      })
    }
    document.body.appendChild(gisScript)
  })
}

// 인증 요청
function requestAuth(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!tokenClient) {
      resolve(false)
      return
    }

    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (response) => {
        if (response.error) {
          console.error('인증 실패:', response.error)
          resolve(false)
        } else {
          resolve(true)
        }
      },
    })

    tokenClient.requestAccessToken()
  })
}

// 날짜를 시트 이름 형식으로 변환 (YYMMDD)
function formatSheetName(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  const yy = String(date.getFullYear()).slice(2)
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yy}${mm}${dd}`
}

// 날짜를 표시 형식으로 변환 (00월 00일(요일))
function formatDisplayDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  const month = date.getMonth() + 1
  const day = date.getDate()
  const weekdays = ['일', '월', '화', '수', '목', '금', '토']
  const weekday = weekdays[date.getDay()]
  return `${month}월 ${day}일(${weekday})`
}

// 결석자 데이터를 Google Sheets에 내보내기
export async function exportAbsentStudents(
  dateStr: string,
  absentStudents: AbsentStudent[]
): Promise<ExportResult> {
  // API 키 체크
  if (!API_KEY || !CLIENT_ID) {
    return {
      success: false,
      message: 'Google API 키가 설정되지 않았습니다. 관리자에게 문의하세요.',
    }
  }

  // GAPI 초기화
  if (!gapiInitialized) {
    const initialized = await initGoogleAPI()
    if (!initialized) {
      return {
        success: false,
        message: 'Google API 초기화에 실패했습니다.',
      }
    }
  }

  // 인증 요청
  const authenticated = await requestAuth()
  if (!authenticated) {
    return {
      success: false,
      message: '구글 인증에 실패했습니다. 다시 시도해주세요.',
    }
  }

  try {
    const sheetName = formatSheetName(dateStr)
    const displayDate = formatDisplayDate(dateStr)

    // 1. 기존 시트 목록 가져오기
    const spreadsheet = await window.gapi.client.sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    })

    const sheets = spreadsheet.result.sheets || []
    const existingSheet = sheets.find(
      (s) => s.properties.title === sheetName
    )

    // 2. 시트가 없으면 새로 생성 (템플릿 복사)
    if (!existingSheet) {
      // 템플릿 시트 (gid=1182308302) 복사
      const templateSheet = sheets.find(
        (s) => s.properties.sheetId === 1182308302
      )

      if (templateSheet) {
        await window.gapi.client.sheets.spreadsheets.batchUpdate({
          spreadsheetId: SPREADSHEET_ID,
          resource: {
            requests: [
              {
                duplicateSheet: {
                  sourceSheetId: templateSheet.properties.sheetId,
                  insertSheetIndex: 0,
                  newSheetName: sheetName,
                },
              },
            ],
          },
        })
      } else {
        // 템플릿이 없으면 빈 시트 생성
        await window.gapi.client.sheets.spreadsheets.batchUpdate({
          spreadsheetId: SPREADSHEET_ID,
          resource: {
            requests: [
              {
                addSheet: {
                  properties: {
                    title: sheetName,
                  },
                },
              },
            ],
          },
        })
      }
    }

    // 3. 데이터 준비
    // 1학년 결석자 (B, C, D열)
    const grade1Students = absentStudents.filter((s) => s.grade === 1)
    // 2학년 결석자 (G, H, I열)
    const grade2Students = absentStudents.filter((s) => s.grade === 2)

    // 4. 데이터 쓰기
    const updates: Array<{ range: string; values: string[][] }> = []

    // B2: 날짜
    updates.push({
      range: `'${sheetName}'!B2`,
      values: [[displayDate]],
    })

    // 1학년 데이터 (B4부터 시작)
    if (grade1Students.length > 0) {
      const grade1Data = grade1Students.map((s) => [s.seatId, s.name, s.note])
      updates.push({
        range: `'${sheetName}'!B4:D${3 + grade1Students.length}`,
        values: grade1Data,
      })
    }

    // 2학년 데이터 (G4부터 시작)
    if (grade2Students.length > 0) {
      const grade2Data = grade2Students.map((s) => [s.seatId, s.name, s.note])
      updates.push({
        range: `'${sheetName}'!G4:I${3 + grade2Students.length}`,
        values: grade2Data,
      })
    }

    // 배치 업데이트
    if (updates.length > 0) {
      await window.gapi.client.sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        resource: {
          valueInputOption: 'USER_ENTERED',
          data: updates,
        },
      })
    }

    return {
      success: true,
      message: `${sheetName} 시트에 결석자 ${absentStudents.length}명 내보내기 완료`,
      sheetUrl: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit#gid=0`,
    }
  } catch (error) {
    console.error('내보내기 실패:', error)
    return {
      success: false,
      message: `내보내기 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
    }
  }
}

// 클립보드로 내보내기 (Google API 키 없이 사용 가능)
export function exportToClipboard(
  dateStr: string,
  absentStudents: AbsentStudent[]
): string {
  const displayDate = formatDisplayDate(dateStr)
  const sheetName = formatSheetName(dateStr)

  const grade1Students = absentStudents.filter((s) => s.grade === 1)
  const grade2Students = absentStudents.filter((s) => s.grade === 2)

  let text = `시트 이름: ${sheetName}\n`
  text += `날짜 (B2): ${displayDate}\n\n`

  text += `=== 1학년 결석자 (B열:좌석, C열:이름, D열:비고) ===\n`
  if (grade1Students.length > 0) {
    grade1Students.forEach((s) => {
      text += `${s.seatId}\t${s.name}\t${s.note}\n`
    })
  } else {
    text += '(없음)\n'
  }

  text += `\n=== 2학년 결석자 (G열:좌석, H열:이름, I열:비고) ===\n`
  if (grade2Students.length > 0) {
    grade2Students.forEach((s) => {
      text += `${s.seatId}\t${s.name}\t${s.note}\n`
    })
  } else {
    text += '(없음)\n'
  }

  return text
}
