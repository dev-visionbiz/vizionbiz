import { supabase } from '@/lib/supabase'
import type { AppVisibility } from '@/domain/types'
import type { AppVisibilityRepository as IAppVisibilityRepository } from '../interfaces'

export class SupabaseAppVisibilityRepository implements IAppVisibilityRepository {
  async findByEscritorio(escritorioId: string): Promise<AppVisibility[]> {
    const { data, error } = await supabase
      .from('app_visibility')
      .select('*')
      .eq('escritorio_id', escritorioId)
    if (error) throw error
    return data ?? []
  }

  async findByApp(escritorioId: string, appId: string): Promise<AppVisibility | null> {
    const { data, error } = await supabase
      .from('app_visibility')
      .select('*')
      .eq('escritorio_id', escritorioId)
      .eq('app_id', appId)
      .maybeSingle()
    if (error) throw error
    return data
  }

  async upsert(item: AppVisibility): Promise<AppVisibility> {
    const { data, error } = await supabase
      .from('app_visibility')
      .upsert(item, { onConflict: 'escritorio_id,app_id' })
      .select()
      .single()
    if (error) throw error
    return data
  }
}
