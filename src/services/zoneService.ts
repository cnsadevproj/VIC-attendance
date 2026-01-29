import { supabase } from '../config/supabase'
import type { Database } from '../types/database.types'

type Zone = Database['public']['Tables']['zones']['Row']
type ZoneInsert = Database['public']['Tables']['zones']['Insert']

export const zoneService = {
  async getAll(): Promise<Zone[]> {
    const { data, error } = await supabase
      .from('zones')
      .select('*')
      .eq('is_active', true)
      .order('grade')
      .order('id')

    if (error) throw error
    return data || []
  },

  async getByGrade(grade: number): Promise<Zone[]> {
    const { data, error } = await supabase
      .from('zones')
      .select('*')
      .eq('grade', grade)
      .eq('is_active', true)
      .order('id')

    if (error) throw error
    return data || []
  },

  async getById(id: string): Promise<Zone | null> {
    const { data, error } = await supabase
      .from('zones')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
    return data
  },

  async create(zone: ZoneInsert): Promise<Zone> {
    const { data, error } = await supabase
      .from('zones')
      .insert(zone)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async update(id: string, updates: Partial<Zone>): Promise<Zone> {
    const { data, error } = await supabase
      .from('zones')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deactivate(id: string): Promise<void> {
    const { error } = await supabase
      .from('zones')
      .update({ is_active: false })
      .eq('id', id)

    if (error) throw error
  },

  async getGroupedByGrade(): Promise<Record<number, Zone[]>> {
    const zones = await this.getAll()
    return zones.reduce((acc, zone) => {
      if (!acc[zone.grade]) {
        acc[zone.grade] = []
      }
      acc[zone.grade].push(zone)
      return acc
    }, {} as Record<number, Zone[]>)
  },
}
