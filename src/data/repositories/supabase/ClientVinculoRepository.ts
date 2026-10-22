import { supabase } from '@/lib/supabase'
import type { ClientVinculo } from '@/domain/types'
import type { ClientVinculoRepository as IClientVinculoRepository } from '../interfaces'

export class SupabaseClientVinculoRepository implements IClientVinculoRepository {
  async findAll(tenantId: string): Promise<ClientVinculo[]> {
    const { data, error } = await supabase.from('client_vinculos').select('*').eq('tenant_id', tenantId)
    if (error) throw error
    return data ?? []
  }

  async findById(id: string): Promise<ClientVinculo | null> {
    const { data, error } = await supabase.from('client_vinculos').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data ?? null
  }

  async findByPJ(tenantId: string, pjId: string): Promise<ClientVinculo[]> {
    const { data, error } = await supabase.from('client_vinculos').select('*').eq('tenant_id', tenantId).eq('client_pj_id', pjId)
    if (error) throw error
    return data ?? []
  }

  async findByPF(tenantId: string, pfId: string): Promise<ClientVinculo[]> {
    const { data, error } = await supabase.from('client_vinculos').select('*').eq('tenant_id', tenantId).eq('client_pf_id', pfId)
    if (error) throw error
    return data ?? []
  }

  async create(item: ClientVinculo): Promise<ClientVinculo> {
    const { data, error } = await supabase.from('client_vinculos').insert(item).select().single()
    if (error) throw error
    return data
  }

  async update(id: string, data: Partial<ClientVinculo>): Promise<ClientVinculo> {
    const { data: updated, error } = await supabase.from('client_vinculos').update(data).eq('id', id).select().single()
    if (error) throw error
    return updated
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('client_vinculos').delete().eq('id', id)
    if (error) throw error
  }
}
