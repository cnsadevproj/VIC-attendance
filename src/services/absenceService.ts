const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwDYX0zgyCDNHZmqSVslgjQ-_Q42NyIiq-uE8wCXJ1phlqJil-pnMkLUJAS8dVfGwrv1Q/exec'

export interface AbsenceEntry {
  studentId: string
  name: string
  type: '사전결석' | '외박'
  startDate: string
  endDate: string
  reason: string
}

function normalizeDate(dateStr: string): string {
  if (!dateStr) return ''

  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr
  }

  const cleanedDateStr = dateStr.replace(/\s*\([^)]*\)\s*$/, '')

  try {
    const date = new Date(cleanedDateStr)
    if (isNaN(date.getTime())) {
      console.error('[normalizeDate] Failed to parse:', dateStr)
      return ''
    }

    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  } catch (e) {
    console.error('[normalizeDate] Error:', e, dateStr)
    return ''
  }
}

export interface PreAbsenceInfo {
  reason: string
  startDate: string
  endDate: string
  type: '사전결석' | '외박'
}

let cachedData: AbsenceEntry[] | null = null
let cacheTimestamp: number = 0
const CACHE_DURATION = 5 * 60 * 1000

export async function fetchAbsenceData(): Promise<AbsenceEntry[]> {
  const now = Date.now()

  if (cachedData && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedData
  }

  try {
    const response = await fetch(APPS_SCRIPT_URL)
    if (!response.ok) {
      throw new Error('Failed to fetch absence data')
    }

    const rawData = await response.json() as AbsenceEntry[]

    const data = rawData.map(entry => ({
      ...entry,
      startDate: normalizeDate(entry.startDate),
      endDate: normalizeDate(entry.endDate)
    }))

    cachedData = data
    cacheTimestamp = now

    console.log(`[AbsenceService] Loaded ${data.length} entries from spreadsheet`)
    return data
  } catch (error) {
    console.error('[AbsenceService] Error fetching data:', error)
    if (cachedData) {
      return cachedData
    }
    return []
  }
}

export async function getPreAbsencesMap(): Promise<Record<string, PreAbsenceInfo>> {
  const entries = await fetchAbsenceData()
  const result: Record<string, PreAbsenceInfo> = {}

  entries.forEach(entry => {
    result[entry.studentId] = {
      reason: entry.type === '외박'
        ? (entry.reason ? `외박 (${entry.reason})` : '외박')
        : entry.reason,
      startDate: entry.startDate,
      endDate: entry.endDate,
      type: entry.type
    }
  })

  return result
}

export async function getAbsentStudentsOnDate(dateStr: string): Promise<AbsenceEntry[]> {
  const entries = await fetchAbsenceData()
  return entries.filter(entry =>
    dateStr >= entry.startDate && dateStr <= entry.endDate
  )
}

export async function isOvernightLeaveOnDate(studentId: string, dateStr: string): Promise<boolean> {
  const entries = await fetchAbsenceData()
  const entry = entries.find(e =>
    e.studentId === studentId &&
    e.type === '외박' &&
    dateStr >= e.startDate &&
    dateStr <= e.endDate
  )
  return !!entry
}

export function refreshCache(): void {
  cachedData = null
  cacheTimestamp = 0
}
