import { getPreAbsencesMap, getAbsentStudentsOnDate, isOvernightLeaveOnDate as checkOvernightLeave } from '../services/absenceService'

export interface PreAbsenceInfo {
  reason: string
  startDate: string
  endDate: string
  type?: '사전결석' | '외박'
}

export const PRE_ABSENCES: Record<string, PreAbsenceInfo> = {
  '10103': { reason: '병원 (정기검진)', startDate: '2025-12-22', endDate: '2025-12-22' },
  '10118': { reason: '가족여행', startDate: '2025-12-23', endDate: '2025-12-26' },
  '10225': { reason: '학원 특강', startDate: '2025-12-24', endDate: '2025-12-24' },
  '10322': { reason: '경조사', startDate: '2025-12-22', endDate: '2025-12-23' },
  '10421': { reason: '병원 (치과)', startDate: '2025-12-26', endDate: '2025-12-26' },
  '10528': { reason: '개인사정', startDate: '2025-12-27', endDate: '2025-12-29' },
  '10621': { reason: '가족여행', startDate: '2025-12-24', endDate: '2025-12-27' },
  '10725': { reason: '병원', startDate: '2025-12-23', endDate: '2025-12-23' },
  '10812': { reason: '학원 캠프', startDate: '2025-12-26', endDate: '2025-12-29' },
  '10930': { reason: '경조사 (결혼식)', startDate: '2025-12-28', endDate: '2025-12-29' },
  '11115': { reason: '병원 (수술)', startDate: '2025-12-22', endDate: '2025-12-26' },
  '11219': { reason: '해외여행', startDate: '2025-12-23', endDate: '2025-12-29' },

  '20109': { reason: '병원', startDate: '2025-12-22', endDate: '2025-12-22' },
  '20212': { reason: '가족여행', startDate: '2025-12-24', endDate: '2025-12-27' },
  '20317': { reason: '학원 특강', startDate: '2025-12-23', endDate: '2025-12-24' },
  '20412': { reason: '경조사', startDate: '2025-12-26', endDate: '2025-12-27' },
  '20521': { reason: '병원 (정형외과)', startDate: '2025-12-22', endDate: '2025-12-24' },
  '20619': { reason: '개인사정', startDate: '2025-12-28', endDate: '2025-12-29' },
  '20722': { reason: '가족여행', startDate: '2025-12-23', endDate: '2025-12-26' },
  '20823': { reason: '해외여행', startDate: '2025-12-22', endDate: '2025-12-29' },
  '20922': { reason: '병원', startDate: '2025-12-27', endDate: '2025-12-27' },
  '21022': { reason: '학원', startDate: '2025-12-24', endDate: '2025-12-25' },
  '21117': { reason: '경조사 (장례)', startDate: '2025-12-26', endDate: '2025-12-28' },
  '21215': { reason: '가족행사', startDate: '2025-12-29', endDate: '2025-12-29' },

  '10101': { reason: '병원 (감기)', startDate: '2025-12-30', endDate: '2025-12-31' },
  '10114': { reason: '가족여행', startDate: '2025-12-30', endDate: '2025-12-31' },
  '10201': { reason: '학원 특강', startDate: '2025-12-30', endDate: '2025-12-30' },
  '10310': { reason: '경조사', startDate: '2025-12-31', endDate: '2025-12-31' },
  '10402': { reason: '병원', startDate: '2025-12-30', endDate: '2025-12-31' },
  '10507': { reason: '개인사정', startDate: '2025-12-30', endDate: '2025-12-31' },
  '10608': { reason: '가족행사', startDate: '2025-12-31', endDate: '2025-12-31' },
  '10719': { reason: '병원 (치과)', startDate: '2025-12-30', endDate: '2025-12-30' },
  '10807': { reason: '해외여행', startDate: '2025-12-30', endDate: '2025-12-31' },
  '10904': { reason: '학원 캠프', startDate: '2025-12-30', endDate: '2025-12-31' },
  '11009': { reason: '경조사 (결혼식)', startDate: '2025-12-30', endDate: '2025-12-31' },
  '11108': { reason: '병원 (수술 후 회복)', startDate: '2025-12-30', endDate: '2025-12-31' },
  '11203': { reason: '가족여행', startDate: '2025-12-30', endDate: '2025-12-31' },

  '20104': { reason: '병원', startDate: '2025-12-30', endDate: '2025-12-31' },
  '20208': { reason: '가족여행', startDate: '2025-12-30', endDate: '2025-12-31' },
  '20305': { reason: '학원', startDate: '2025-12-30', endDate: '2025-12-30' },
  '20406': { reason: '경조사', startDate: '2025-12-31', endDate: '2025-12-31' },
  '20512': { reason: '병원 (정형외과)', startDate: '2025-12-30', endDate: '2025-12-31' },
  '20611': { reason: '개인사정', startDate: '2025-12-30', endDate: '2025-12-31' },
  '20703': { reason: '가족행사', startDate: '2025-12-31', endDate: '2025-12-31' },
  '20807': { reason: '해외여행', startDate: '2025-12-30', endDate: '2025-12-31' },
  '20906': { reason: '병원', startDate: '2025-12-30', endDate: '2025-12-30' },
  '21005': { reason: '학원 특강', startDate: '2025-12-30', endDate: '2025-12-31' },
  '21106': { reason: '경조사 (장례)', startDate: '2025-12-30', endDate: '2025-12-31' },
  '21203': { reason: '가족여행', startDate: '2025-12-30', endDate: '2025-12-31' },

}

export function isPreAbsentOnDate(studentId: string, dateStr: string): boolean {
  const info = PRE_ABSENCES[studentId]
  if (!info) return false

  return dateStr >= info.startDate && dateStr <= info.endDate
}

export function getPreAbsenceInfo(studentId: string): PreAbsenceInfo | null {
  return PRE_ABSENCES[studentId] || null
}

let cachedPreAbsences: Record<string, PreAbsenceInfo> | null = null
let cacheLoadPromise: Promise<Record<string, PreAbsenceInfo>> | null = null

export async function loadPreAbsencesFromSpreadsheet(): Promise<Record<string, PreAbsenceInfo>> {
  if (cachedPreAbsences) {
    return cachedPreAbsences
  }

  if (cacheLoadPromise) {
    return cacheLoadPromise
  }

  cacheLoadPromise = getPreAbsencesMap().then((data) => {
    cachedPreAbsences = data as Record<string, PreAbsenceInfo>
    return cachedPreAbsences
  }).catch((error) => {
    console.error('[PreAbsences] Failed to load from spreadsheet, using fallback:', error)
    cachedPreAbsences = PRE_ABSENCES
    return PRE_ABSENCES
  }).finally(() => {
    cacheLoadPromise = null
  })

  return cacheLoadPromise
}

export function refreshPreAbsencesCache(): void {
  cachedPreAbsences = null
  cacheLoadPromise = null
}

export async function isPreAbsentOnDateAsync(studentId: string, dateStr: string): Promise<boolean> {
  const absences = await loadPreAbsencesFromSpreadsheet()
  const info = absences[studentId]
  if (!info) return false

  return dateStr >= info.startDate && dateStr <= info.endDate
}

export async function getPreAbsenceInfoAsync(studentId: string): Promise<PreAbsenceInfo | null> {
  const absences = await loadPreAbsencesFromSpreadsheet()
  return absences[studentId] || null
}

export async function isOvernightLeaveOnDate(studentId: string, dateStr: string): Promise<boolean> {
  return checkOvernightLeave(studentId, dateStr)
}

export async function getPreAbsentStudentsOnDate(dateStr: string): Promise<{
  studentId: string
  name: string
  type: '사전결석' | '외박'
  reason: string
}[]> {
  const entries = await getAbsentStudentsOnDate(dateStr)
  return entries.map(entry => ({
    studentId: entry.studentId,
    name: entry.name,
    type: entry.type,
    reason: entry.reason
  }))
}
