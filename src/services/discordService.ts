// Discord 알림 서비스 (Apps Script 사용)
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxi0LfvzUXw391lDUFsdNlrknubjyb4sazyLK_92DOVbZUrAMEK7RY8c6gBjzf8celK/exec'

export interface DiscordReportParams {
  sheetName: string
  message: string
}

export interface DiscordReportResult {
  success: boolean
  message?: string
  error?: string
  range?: string
}

// Discord로 출결 리포트 전송 (Apps Script 경유 - 시트 캡쳐 포함)
export async function sendDiscordReport(params: DiscordReportParams): Promise<DiscordReportResult> {
  await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    mode: 'no-cors', // Apps Script CORS 제한
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'discord',
      sheetName: params.sheetName,
      message: params.message,
    }),
  })

  // no-cors 모드에서는 응답을 읽을 수 없으므로 성공으로 간주
  return { success: true, message: 'Discord 전송 요청 완료' }
}
