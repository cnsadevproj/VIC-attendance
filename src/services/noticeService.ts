import { supabase } from '../config/supabase'

export interface DailyNotice {
  date: string
  notice: string
  updated_by?: string
  updated_at?: string
}

export const noticeService = {
  async save(date: string, notice: string, updatedBy?: string): Promise<void> {
    const { error } = await supabase
      .from('daily_notices')
      .upsert({
        date: date,
        notice: notice.trim() || null,
        updated_by: updatedBy || null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'date'
      })

    if (error) {
      console.error('[noticeService] Save error:', error)
      throw error
    }

    console.log('[noticeService] Saved notice for:', date)
  },

  async get(date: string): Promise<string> {
    console.log('[noticeService] Getting notice for:', date)
    const { data, error } = await supabase
      .from('daily_notices')
      .select('notice')
      .eq('date', date)
      .single()

    console.log('[noticeService] Result:', { data, error })

    if (error) {
      if (error.code === 'PGRST116') {
        console.log('[noticeService] No notice found for date:', date)
        return ''
      }
      console.error('[noticeService] Get error:', error)
      const fallback = localStorage.getItem(`admin_notice_${date}`) || ''
      console.log('[noticeService] Using localStorage fallback:', fallback)
      return fallback
    }

    console.log('[noticeService] Got notice:', data?.notice)
    return data?.notice || ''
  },

  async delete(date: string): Promise<void> {
    const { error } = await supabase
      .from('daily_notices')
      .delete()
      .eq('date', date)

    if (error) {
      console.error('[noticeService] Delete error:', error)
      throw error
    }
  },

  subscribeToDate(date: string, callback: (notice: string) => void) {
    const channel = supabase
      .channel(`daily_notice_${date}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_notices',
          filter: `date=eq.${date}`
        },
        async (payload) => {
          if (payload.eventType === 'DELETE') {
            callback('')
          } else {
            const newNotice = (payload.new as DailyNotice)?.notice || ''
            callback(newNotice)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }
}
