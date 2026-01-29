import { getTodayKST } from '../utils/date'

export interface StaffSchedule {
  schedule_date: string
  grade: number
  staff_name_1: string
  staff_name_2: string
}

export interface TodayStaff {
  grade1: [string, string] | null
  grade2: [string, string] | null
}

const TEMP_STAFF_SCHEDULE: Record<string, TodayStaff> = {
  '2025-12-22': { grade1: ['김종규', '이건우'], grade2: ['조민경', '노예원'] },
  '2025-12-23': { grade1: ['이예진', '홍선영'], grade2: ['장보경', '김솔'] },
  '2025-12-24': { grade1: ['홍승민', '조현정'], grade2: ['강현수', '민수정'] },
  '2025-12-25': { grade1: ['박한비', '서률지'], grade2: ['정수빈', '김종규'] },
  '2025-12-26': { grade1: ['이건우', '조민경'], grade2: ['노예원', '이예진'] },
  '2025-12-29': { grade1: ['서률지', '정수빈'], grade2: ['김종규', '이건우'] },
  '2025-12-30': { grade1: ['조민경', '노예원'], grade2: ['이예진', '홍선영'] },
  '2025-12-31': { grade1: ['장보경', '김솔'], grade2: ['홍승민', '조현정'] },
  '2026-01-01': { grade1: ['강현수', '민수정'], grade2: ['박한비', '서률지'] },
  '2026-01-02': { grade1: ['정수빈', '김종규'], grade2: ['이건우', '조민경'] },
}

export function isTemporaryPeriod(dateStr: string): boolean {
  return dateStr in TEMP_STAFF_SCHEDULE
}

const FIXED_STAFF_SCHEDULE: Record<string, TodayStaff> = {
  '2026-01-07': { grade1: ['이예진', '조현정'], grade2: ['강현수', '김종규'] },
  '2026-01-08': { grade1: ['홍선영', '홍승민'], grade2: ['민수정', '정수빈'] },
  '2026-01-09': { grade1: ['장보경', '김솔'], grade2: ['박한비', '서률지'] },
  '2026-01-12': { grade1: ['노예원', '조민경'], grade2: ['홍선영', '강현수'] },
  '2026-01-13': { grade1: ['이건우', '장보경'], grade2: ['김솔', '박한비'] },
  '2026-01-14': { grade1: ['이예진', '조현정'], grade2: ['민수정', '홍승민'] },
  '2026-01-15': { grade1: ['서률지', '정수빈'], grade2: ['김종규', '이건우'] },
  '2026-01-16': { grade1: ['홍승민', '홍선영'], grade2: ['조민경', '노예원'] },
  '2026-01-19': { grade1: ['장보경', '박한비'], grade2: ['서률지', '이예진'] },
  '2026-01-20': { grade1: ['이건우', '김종규'], grade2: ['김솔', '조현정'] },
  '2026-01-21': { grade1: ['강현수', '민수정'], grade2: ['홍선영', '장보경'] },
  '2026-01-22': { grade1: ['정수빈', '조현정'], grade2: ['노예원', '조민경'] },
  '2026-01-23': { grade1: ['김솔', '강현수'], grade2: ['이예진', '서률지'] },
  '2026-01-26': { grade1: ['민수정', '김종규'], grade2: ['홍승민', '정수빈'] },
  '2026-01-27': { grade1: ['박한비', '홍선영'], grade2: ['조민경', '노예원'] },
  '2026-01-28': { grade1: ['이예진', '서률지'], grade2: ['장보경', '박한비'] },
  '2026-01-29': { grade1: ['노예원', '김종규'], grade2: ['강현수', '이건우'] },
  '2026-01-30': { grade1: ['민수정', '조현정'], grade2: ['정수빈', '박한비'] },
  '2026-02-02': { grade1: ['홍승민', '조민경'], grade2: ['서률지', '강현수'] },
  '2026-02-03': { grade1: ['민수정', '김솔'], grade2: ['정수빈', '이건우'] },
}

const ALL_STAFF_SCHEDULE: Record<string, TodayStaff> = {
  ...TEMP_STAFF_SCHEDULE,
  ...FIXED_STAFF_SCHEDULE,
}

export async function fetchTodayStaff(): Promise<TodayStaff> {
  const today = getTodayKST()
  console.log('[fetchTodayStaff] Today (KST):', today)
  return ALL_STAFF_SCHEDULE[today] || { grade1: null, grade2: null }
}

export async function fetchStaffForDate(date: Date): Promise<TodayStaff> {
  const dateStr = date.toISOString().split('T')[0]
  return ALL_STAFF_SCHEDULE[dateStr] || { grade1: null, grade2: null }
}

export function getOperatingDates(): string[] {
  return Object.keys(ALL_STAFF_SCHEDULE).sort()
}

export function getStaffForDateStr(dateStr: string): TodayStaff | null {
  return ALL_STAFF_SCHEDULE[dateStr] || null
}
