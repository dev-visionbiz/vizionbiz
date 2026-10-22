import { supabase } from '@/lib/supabase'
import type { AppVersion } from '@/domain/types'
import type { AppVersionRepository as IAppVersionRepository } from '../interfaces'

// O banco armazena o manifesto na coluna `manifesto` (jsonb).
// O tipo de domínio usa o mesmo nome — mapeamento direto.

export class SupabaseAppVersionRepository implements IAppVersionRepository {
  async findByApp(appId: string): Promise<AppVersion[]> {
    const { data, error } = await supabase
      .from('app_versions')
      .select('*')
      .eq('app_id', appId)
      .order('publicado_em', { ascending: false })
    if (error) throw error
    return data ?? []
  }

  async findLatest(appId: string): Promise<AppVersion | null> {
    const { data, error } = await supabase
      .from('app_versions')
      .select('*')
      .eq('app_id', appId)
      .order('publicado_em', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw error
    return data
  }

  async findById(id: string): Promise<AppVersion | null> {
    const { data, error } = await supabase
      .from('app_versions')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return data
  }

  async create(item: AppVersion): Promise<AppVersion> {
    const { data, error } = await supabase
      .from('app_versions')
      .insert(item)
      .select()
      .single()
    if (error) throw error
    return data
  }
}
