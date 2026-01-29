const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1414838907299692626/JFA44m5Pf_iw3BILrS1rgY9vs0Mg_ajZDrMODKtScpjqmyz3znEFxr7hXbOPoKYGilig'

export interface AbsentStudentForDiscord {
  seatId: string
  name: string
  note: string
  grade: number
}

export interface DiscordReportParams {
  message: string
  displayDate: string
  absentStudents: AbsentStudentForDiscord[]
}

export interface DiscordReportResult {
  success: boolean
  message?: string
  error?: string
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob)
      else reject(new Error('Canvas → Blob 변환 실패'))
    }, 'image/png')
  })
}

async function renderTablePng(
  title: string,
  headers: string[],
  rows: string[][],
  grade1Count: number
): Promise<Blob> {
  const fontSize = 15
  const titleFontSize = 17
  const padding = { x: 12, y: 8 }
  const borderColor = '#aaaaaa'
  const font = `${fontSize}px "Malgun Gothic", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`
  const boldFont = `bold ${fontSize}px "Malgun Gothic", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`
  const titleFont = `bold ${titleFontSize}px "Malgun Gothic", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`

  const allRows = [headers, ...rows]
  const colCount = headers.length
  const colWidths = new Array(colCount).fill(0)

  const measureCanvas = document.createElement('canvas')
  const mCtx = measureCanvas.getContext('2d')!
  mCtx.font = boldFont

  for (const row of allRows) {
    for (let i = 0; i < colCount; i++) {
      const text = String(row[i] || '')
      const w = mCtx.measureText(text).width
      colWidths[i] = Math.max(colWidths[i], w + padding.x * 2)
    }
  }
  colWidths.forEach((w, i) => { colWidths[i] = Math.max(w, 60) })

  const rowHeight = fontSize + padding.y * 2
  const titleHeight = titleFontSize + padding.y * 2 + 4
  const totalWidth = Math.ceil(colWidths.reduce((s, w) => s + w, 0)) + 2
  const totalHeight = Math.ceil(titleHeight + rowHeight * allRows.length) + 2

  const dpr = 2
  const canvas = document.createElement('canvas')
  canvas.width = totalWidth * dpr
  canvas.height = totalHeight * dpr
  const ctx = canvas.getContext('2d')!
  ctx.scale(dpr, dpr)

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, totalWidth, totalHeight)

  let y = 1

  ctx.fillStyle = '#374151'
  ctx.fillRect(1, y, totalWidth - 2, titleHeight)
  ctx.strokeStyle = borderColor
  ctx.lineWidth = 1
  ctx.strokeRect(1, y, totalWidth - 2, titleHeight)
  ctx.fillStyle = '#ffffff'
  ctx.font = titleFont
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(title, totalWidth / 2, y + titleHeight / 2)
  y += titleHeight

  for (let rowIdx = 0; rowIdx < allRows.length; rowIdx++) {
    const row = allRows[rowIdx]
    const isHeader = rowIdx === 0

    let x = 1
    for (let colIdx = 0; colIdx < colCount; colIdx++) {
      const cellWidth = Math.ceil(colWidths[colIdx])
      const cellHeight = Math.ceil(rowHeight)
      const text = String(row[colIdx] || '')

      let bgColor: string
      if (isHeader) {
        bgColor = '#3d4777'
      } else {
        const di = rowIdx - 1
        if (di < grade1Count) {
          bgColor = di % 2 === 0 ? '#e8edff' : '#ffffff'
        } else {
          bgColor = (di - grade1Count) % 2 === 0 ? '#e8ffed' : '#ffffff'
        }
      }

      ctx.fillStyle = bgColor
      ctx.fillRect(x, y, cellWidth, cellHeight)

      ctx.strokeStyle = borderColor
      ctx.lineWidth = 1
      ctx.strokeRect(x, y, cellWidth, cellHeight)

      ctx.fillStyle = isHeader ? '#ffffff' : '#111111'
      ctx.font = isHeader ? boldFont : font
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(text, x + cellWidth / 2, y + cellHeight / 2)

      x += cellWidth
    }
    y += rowHeight
  }

  return canvasToBlob(canvas)
}

export async function sendDiscordReport(params: DiscordReportParams): Promise<DiscordReportResult> {
  const { message, displayDate, absentStudents } = params

  const grade1 = absentStudents.filter(s => s.grade === 1)
  const grade2 = absentStudents.filter(s => s.grade === 2)

  const headers = ['학년', '좌석', '이름', '비고']
  const rows = [
    ...grade1.map(s => ['1학년', s.seatId, s.name, s.note || '']),
    ...grade2.map(s => ['2학년', s.seatId, s.name, s.note || ''])
  ]

  try {
    const formData = new FormData()

    if (rows.length > 0) {
      const title = `VIC 조간면학 출결현황 - ${displayDate}`
      const pngBlob = await renderTablePng(title, headers, rows, grade1.length)

      formData.append('payload_json', JSON.stringify({ content: message }))
      formData.append('files[0]', pngBlob, 'attendance_report.png')
    } else {
      formData.append('payload_json', JSON.stringify({ content: message }))
    }

    await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      mode: 'no-cors',
      body: formData
    })

    return { success: true, message: 'Discord 전송 요청 완료' }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '네트워크 오류'
    }
  }
}
