import { supabase } from '@/lib/supabase'
import type { CommissionRule } from '@/domain/types'

export class SupabaseCommissionRuleRepository {
  async findAll(): Promise<CommissionRule[]> {
    const { data, error } = await supabase.from('commission_rules').select('*')
    if (error) throw error
    return data ?? []
  }

  async findByApp(appId: string): Promise<CommissionRule[]> {
    const { data, error } = await supabase
      .from('commission_rules')
      .select('*')
      .eq('app_id', appId)
    if (error) throw error
    return data ?? []
  }

  async findEfetiva(appId: string, escritorioId: string): Promise<CommissionRule | null> {
    const { data, error } = await supabase
      .from('commission_rules')
      .select('*')
      .eq('app_id', appId)
    if (error) throw error
    const rules = data ?? []
    const especifica = rules.find((r) => r.escritorio_id === escritorioId)
    const padrao = rules.find((r) => !r.escritorio_id)
    return especifica ?? padrao ?? null
  }

  async create(item: CommissionRule): Promise<CommissionRule> {
    const { data, error } = await supabase
      .from('commission_rules')
      .insert(item)
      .select()
      .single()
    if (error) throw error
    return data
  }

  async upsert(item: CommissionRule): Promise<CommissionRule> {
    const { data, error } = await supabase
      .from('commission_rules')
      .upsert(item, { onConflict: 'app_id,escritorio_id' })
      .select()
      .single()
    if (error) throw error
    return data
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('commission_rules').delete().eq('id', id)
    if (error) throw error
  }
}
