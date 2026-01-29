import { useState, useEffect, useCallback } from 'react'
import { fetchAbsenceData, refreshCache, type AbsenceEntry } from '../services/absenceService'

interface UsePreAbsencesResult {
  entries: AbsenceEntry[]
  isLoading: boolean
  error: Error | null
  refresh: () => Promise<void>
  isPreAbsentOnDate: (studentId: string, dateStr: string) => boolean
  getPreAbsenceInfo: (studentId: string, dateStr: string) => {
    reason: string
    type: '사전결석' | '외박'
    startDate: string
    endDate: string
  } | null
}

export function usePreAbsences(): UsePreAbsencesResult {
  const [entries, setEntries] = useState<AbsenceEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      console.log('[usePreAbsences] Fetching data...')
      const data = await fetchAbsenceData()
      console.log('[usePreAbsences] Data received:', data)
      setEntries(data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load data'))
      console.error('[usePreAbsences] Error loading data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const refresh = useCallback(async () => {
    refreshCache()
    await loadData()
  }, [loadData])

  const isPreAbsentOnDate = useCallback((studentId: string, dateStr: string): boolean => {
    return entries.some(entry =>
      entry.studentId === studentId &&
      dateStr >= entry.startDate &&
      dateStr <= entry.endDate
    )
  }, [entries])

  const getPreAbsenceInfo = useCallback((studentId: string, dateStr: string) => {
    const matchingEntries = entries.filter(e =>
      e.studentId === studentId &&
      dateStr >= e.startDate &&
      dateStr <= e.endDate
    )
    if (matchingEntries.length === 0) return null
    const entry = matchingEntries[matchingEntries.length - 1]
    return {
      reason: entry.reason || '',
      type: entry.type,
      startDate: entry.startDate,
      endDate: entry.endDate
    }
  }, [entries])

  return {
    entries,
    isLoading,
    error,
    refresh,
    isPreAbsentOnDate,
    getPreAbsenceInfo
  }
}
