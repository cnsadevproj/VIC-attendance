import { supabase } from '../config/supabase'
import type { AttendanceRecord } from '../types'

export interface ZoneAttendanceData {
  zone_id: string
  date: string
  data: [string, AttendanceRecord][]
  recorded_by: string | null
  notes: Record<string, string> | null
  created_at?: string
  updated_at?: string
}

export const zoneAttendanceService = {
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

  async get(zoneId: string, date: string): Promise<ZoneAttendanceData | null> {
    const { data, error } = await supabase
      .from('zone_attendance')
      .select('*')
      .eq('zone_id', zoneId)
      .eq('date', date)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      console.error('[zoneAttendanceService] Get error:', error)
      throw error
    }

    return data as ZoneAttendanceData
  },

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
