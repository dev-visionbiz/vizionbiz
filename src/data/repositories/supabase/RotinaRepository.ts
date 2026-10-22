import { supabase } from '@/lib/supabase'
import type { Rotina } from '@/domain/types'
import type { RotinaRepository as IRotinaRepository } from '../interfaces'

export class SupabaseRotinaRepository implements IRotinaRepository {
  async findAll(tenantId: string): Promise<Rotina[]> {
    const { data, error } = await supabase.from('rotinas').select('*').eq('tenant_id', tenantId)
    if (error) throw error
    return data ?? []
  }

  async findById(id: string): Promise<Rotina | null> {
    const { data, error } = await supabase.from('rotinas').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data ?? null
  }

  async findAtivas(tenantId: string): Promise<Rotina[]> {
    const { data, error } = await supabase.from('rotinas').select('*').eq('tenant_id', tenantId).eq('ativo', true)
    if (error) throw error
    return data ?? []
  }

  async create(item: Rotina): Promise<Rotina> {
    const { data, error } = await supabase.from('rotinas').insert(item).select().single()
    if (error) throw error
    return data
  }

  async update(id: string, data: Partial<Rotina>): Promise<Rotina> {
    const { data: updated, error } = await supabase.from('rotinas').update(data).eq('id', id).select().single()
    if (error) throw error
    return updated
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('rotinas').delete().eq('id', id)
    if (error) throw error
  }
}
