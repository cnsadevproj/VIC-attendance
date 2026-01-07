// SMS 발송 서비스
const SMS_API_URL = 'https://vic-sms-server-236744560712.asia-northeast3.run.app'

export interface SmsStudent {
  studentId: string
  name: string
}

// 수신자 타입
export type RecipientType = 'student_and_parent' | 'parent_only' | 'student_only'

export interface SmsResult {
  mode: 'test' | 'production'
  message: string
  absentStudentsReceived?: number
  results?: Array<{
    student: string
    status: 'success' | 'error'
    message: string
  }>
}

// 결석자에게 SMS 발송 (기본: 학생+학부모)
export async function sendAbsentSms(absentStudents: SmsStudent[]): Promise<SmsResult> {
  return sendCategorySms(absentStudents, 'student_and_parent')
}

// 카테고리별 SMS 발송
export async function sendCategorySms(
  students: SmsStudent[],
  recipientType: RecipientType
): Promise<SmsResult> {
  const response = await fetch(`${SMS_API_URL}/api/send-absent-sms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      absentStudents: students,
      recipientType
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'SMS 발송 실패')
  }

  return response.json()
}

// 테스트 SMS 발송 (장보경 선생님에게)
export async function sendTestSms(): Promise<SmsResult> {
  const response = await fetch(`${SMS_API_URL}/api/test-sms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || '테스트 SMS 발송 실패')
  }

  return response.json()
}

// 서버 상태 확인
export async function checkSmsServerHealth(): Promise<{ status: string; mode: string; productionStartDate: string }> {
  const response = await fetch(`${SMS_API_URL}/health`)

  if (!response.ok) {
    throw new Error('SMS 서버 연결 실패')
  }

  return response.json()
}
