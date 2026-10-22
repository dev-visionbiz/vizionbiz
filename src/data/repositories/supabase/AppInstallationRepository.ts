import { supabase } from '@/lib/supabase'
import type { AppInstallation } from '@/domain/types'
import type { AppInstallationRepository as IAppInstallationRepository } from '../interfaces'

export class SupabaseAppInstallationRepository implements IAppInstallationRepository {
  async findByEscritorio(escritorioId: string): Promise<AppInstallation[]> {
    const { data, error } = await supabase
      .from('app_installations')
      .select('*')
      .eq('escritorio_id', escritorioId)
      .eq('status', 'ativa')
      .is('cliente_id', null)     // apenas instalações no nível do escritório
    if (error) throw error
    return data ?? []
  }

  async findByCliente(escritorioId: string, clienteId: string): Promise<AppInstallation[]> {
    const { data, error } = await supabase
      .from('app_installations')
      .select('*')
      .eq('escritorio_id', escritorioId)
      .eq('cliente_id', clienteId)
      .eq('status', 'ativa')
    if (error) throw error
    return data ?? []
  }

  async findById(id: string): Promise<AppInstallation | null> {
    const { data, error } = await supabase
      .from('app_installations')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return data
  }

  async findByApp(escritorioId: string, appId: string): Promise<AppInstallation | null> {
    const { data, error } = await supabase
      .from('app_installations')
      .select('*')
      .eq('escritorio_id', escritorioId)
      .eq('app_id', appId)
      .is('cliente_id', null)
      .eq('status', 'ativa')
      .maybeSingle()
    if (error) throw error
    return data
  }

  async create(item: AppInstallation): Promise<AppInstallation> {
    const { data, error } = await supabase
      .from('app_installations')
      .insert(item)
      .select()
      .single()
    if (error) throw error
    return data
  }

  async update(id: string, changes: Partial<AppInstallation>): Promise<AppInstallation> {
    const { data, error } = await supabase
      .from('app_installations')
      .update(changes)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }
}
