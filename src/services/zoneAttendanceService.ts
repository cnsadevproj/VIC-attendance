// Zone 단위 출결 데이터 Supabase 연동 서비스
import { supabase } from '../config/supabase'
import type { AttendanceRecord } from '../types'

export interface ZoneAttendanceData {
  zone_id: string
  date: string
  data: [string, AttendanceRecord][]  // [seatId, record][]
  recorded_by: string | null
  notes: Record<string, string> | null
  created_at?: string
  updated_at?: string
}

export const zoneAttendanceService = {
  // 출결 데이터 저장 (upsert)
  async save(
    zoneId: string,
    date: string,
    records: Map<string, AttendanceRecord>,
    recordedBy?: string,
    notes?: Record<string, string>
  ): Promise<void> {
    const dataArray = Array.from(records.entries())

    const { error } = await supabase
      .from('zone_attendance')
      .upsert({
        zone_id: zoneId,
        date: date,
        data: dataArray,
        recorded_by: recordedBy || null,
        notes: notes || null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'zone_id,date'
      })

    if (error) {
      console.error('[zoneAttendanceService] Save error:', error)
      throw error
    }

    console.log('[zoneAttendanceService] Saved:', zoneId, date)
  },

  // 특정 zone/date의 출결 데이터 조회
  async get(zoneId: string, date: string): Promise<ZoneAttendanceData | null> {
    const { data, error } = await supabase
      .from('zone_attendance')
      .select('*')
      .eq('zone_id', zoneId)
      .eq('date', date)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found
        return null
      }
      console.error('[zoneAttendanceService] Get error:', error)
      throw error
    }

    return data as ZoneAttendanceData
  },

  // 특정 날짜의 모든 zone 출결 데이터 조회
  async getAllByDate(date: string): Promise<ZoneAttendanceData[]> {
    const { data, error } = await supabase
      .from('zone_attendance')
      .select('*')
      .eq('date', date)

    if (error) {
      console.error('[zoneAttendanceService] GetAllByDate error:', error)
      throw error
    }

    return (data || []) as ZoneAttendanceData[]
  },

  // 실시간 구독 설정
  subscribeToDate(date: string, callback: (data: ZoneAttendanceData[]) => void) {
    const channel = supabase
      .channel(`zone_attendance_${date}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'zone_attendance',
          filter: `date=eq.${date}`
        },
        async () => {
          // 변경 발생 시 전체 데이터 다시 조회
          const data = await this.getAllByDate(date)
          callback(data)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }
}
