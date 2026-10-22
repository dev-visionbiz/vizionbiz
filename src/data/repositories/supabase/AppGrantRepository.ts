import { supabase } from '@/lib/supabase'
import type { AppGrant } from '@/domain/types'
import type { AppGrantRepository as IAppGrantRepository } from '../interfaces'

export class SupabaseAppGrantRepository implements IAppGrantRepository {
  async findByInstallation(installationId: string): Promise<AppGrant[]> {
    const { data, error } = await supabase
      .from('app_grants')
      .select('*')
      .eq('installation_id', installationId)
    if (error) throw error
    return data ?? []
  }

  async findActive(installationId: string): Promise<AppGrant[]> {
    const { data, error } = await supabase
      .from('app_grants')
      .select('*')
      .eq('installation_id', installationId)
      .is('revogado_em', null)
    if (error) throw error
    return data ?? []
  }

  async create(item: AppGrant): Promise<AppGrant> {
    const { data, error } = await supabase
      .from('app_grants')
      .insert(item)
      .select()
      .single()
    if (error) throw error
    return data
  }

  async revokeAll(installationId: string, revokedAt: string): Promise<void> {
    const { error } = await supabase
      .from('app_grants')
      .update({ revogado_em: revokedAt })
      .eq('installation_id', installationId)
      .is('revogado_em', null)
    if (error) throw error
  }
}
