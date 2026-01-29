export function getTodayKST(): string {
  const now = new Date()
  const kstOffset = 9 * 60
  const utcOffset = now.getTimezoneOffset()
  const kstTime = new Date(now.getTime() + (utcOffset + kstOffset) * 60 * 1000)

  const year = kstTime.getFullYear()
  const month = String(kstTime.getMonth() + 1).padStart(2, '0')
  const day = String(kstTime.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function getNowKST(): Date {
  const now = new Date()
  const kstOffset = 9 * 60
  const utcOffset = now.getTimezoneOffset()
  return new Date(now.getTime() + (utcOffset + kstOffset) * 60 * 1000)
}

export function formatDateKorean(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })
}
