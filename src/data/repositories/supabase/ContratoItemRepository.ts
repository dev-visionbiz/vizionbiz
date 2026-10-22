import { supabase } from '@/lib/supabase'
import type { ContratoItem } from '@/domain/types'
import type { ContratoItemRepository as IContratoItemRepository } from '../interfaces'

export class SupabaseContratoItemRepository implements IContratoItemRepository {
  async findAll(tenantId: string): Promise<ContratoItem[]> {
    const { data, error } = await supabase.from('contrato_items').select('*').eq('tenant_id', tenantId)
    if (error) throw error
    return data ?? []
  }

  async findById(id: string): Promise<ContratoItem | null> {
    const { data, error } = await supabase.from('contrato_items').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data ?? null
  }

  async findByContrato(tenantId: string, contratoId: string): Promise<ContratoItem[]> {
    const { data, error } = await supabase.from('contrato_items').select('*').eq('tenant_id', tenantId).eq('contrato_id', contratoId)
    if (error) throw error
    return data ?? []
  }

  async create(item: ContratoItem): Promise<ContratoItem> {
    const { data, error } = await supabase.from('contrato_items').insert(item).select().single()
    if (error) throw error
    return data
  }

  async update(id: string, data: Partial<ContratoItem>): Promise<ContratoItem> {
    const { data: updated, error } = await supabase.from('contrato_items').update(data).eq('id', id).select().single()
    if (error) throw error
    return updated
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('contrato_items').delete().eq('id', id)
    if (error) throw error
  }
}
