import { supabase } from '@/lib/supabase'
import type { Subscription } from '@/domain/types'

export class SupabaseSubscriptionRepository {
  async findByEscritorio(escritorioId: string): Promise<Subscription[]> {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('escritorio_id', escritorioId)
    if (error) throw error
    return data ?? []
  }

  async findByInstallation(installationId: string): Promise<Subscription | null> {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('installation_id', installationId)
      .eq('status', 'ativa')
      .order('criado_em', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw error
    return data
  }

  async findById(id: string): Promise<Subscription | null> {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return data
  }

  async create(item: Subscription): Promise<Subscription> {
    const { data, error } = await supabase
      .from('subscriptions')
      .insert(item)
      .select()
      .single()
    if (error) throw error
    return data
  }

  async update(id: string, changes: Partial<Subscription>): Promise<Subscription> {
    const { data, error } = await supabase
      .from('subscriptions')
      .update(changes)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }
}
