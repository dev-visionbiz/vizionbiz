import { supabase } from '@/lib/supabase'
import type { Plano } from '@/domain/types'
import type { PlanoRepository as IPlanoRepository } from '../interfaces'

export class SupabasePlanoRepository implements IPlanoRepository {
  async findAll(tenantId: string): Promise<Plano[]> {
    const { data, error } = await supabase.from('planos').select('*').eq('tenant_id', tenantId)
    if (error) throw error
    return data ?? []
  }

  async findById(id: string): Promise<Plano | null> {
    const { data, error } = await supabase.from('planos').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data ?? null
  }

  async findAtivos(tenantId: string): Promise<Plano[]> {
    const { data, error } = await supabase.from('planos').select('*').eq('tenant_id', tenantId).eq('ativo', true)
    if (error) throw error
    return data ?? []
  }

  async create(item: Plano): Promise<Plano> {
    const { data, error } = await supabase.from('planos').insert(item).select().single()
    if (error) throw error
    return data
  }

  async update(id: string, data: Partial<Plano>): Promise<Plano> {
    const { data: updated, error } = await supabase.from('planos').update(data).eq('id', id).select().single()
    if (error) throw error
    return updated
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('planos').delete().eq('id', id)
    if (error) throw error
  }
}
