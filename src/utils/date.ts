// 한국 시간(KST) 기준 날짜 유틸리티

/**
 * 한국 시간 기준으로 오늘 날짜를 YYYY-MM-DD 형식으로 반환
 */
export function getTodayKST(): string {
  const now = new Date()
  // 한국 시간대 오프셋: UTC+9
  const kstOffset = 9 * 60 // 분 단위
  const utcOffset = now.getTimezoneOffset() // 현지 시간과 UTC의 차이 (분)
  const kstTime = new Date(now.getTime() + (utcOffset + kstOffset) * 60 * 1000)

  const year = kstTime.getFullYear()
  const month = String(kstTime.getMonth() + 1).padStart(2, '0')
  const day = String(kstTime.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

/**
 * 한국 시간 기준 현재 시각을 Date 객체로 반환
 */
export function getNowKST(): Date {
  const now = new Date()
  const kstOffset = 9 * 60
  const utcOffset = now.getTimezoneOffset()
  return new Date(now.getTime() + (utcOffset + kstOffset) * 60 * 1000)
}

/**
 * 날짜 문자열을 한국어 형식으로 변환
 */
export function formatDateKorean(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })
}
