import { supabase } from '@/lib/supabase'
import type { Ocorrencia, OcorrenciaStatus } from '@/domain/types'
import type { OcorrenciaRepository as IOcorrenciaRepository } from '../interfaces'

export class SupabaseOcorrenciaRepository implements IOcorrenciaRepository {
  async findAll(tenantId: string): Promise<Ocorrencia[]> {
    const { data, error } = await supabase.from('ocorrencias').select('*').eq('tenant_id', tenantId)
    if (error) throw error
    return data ?? []
  }

  async findById(id: string): Promise<Ocorrencia | null> {
    const { data, error } = await supabase.from('ocorrencias').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data ?? null
  }

  async findByCliente(tenantId: string, clienteId: string): Promise<Ocorrencia[]> {
    const { data, error } = await supabase.from('ocorrencias').select('*').eq('tenant_id', tenantId).eq('cliente_id', clienteId)
    if (error) throw error
    return data ?? []
  }

  async findByStatus(tenantId: string, status: OcorrenciaStatus): Promise<Ocorrencia[]> {
    const { data, error } = await supabase.from('ocorrencias').select('*').eq('tenant_id', tenantId).eq('status', status)
    if (error) throw error
    return data ?? []
  }

  async findByLote(tenantId: string, loteId: string): Promise<Ocorrencia[]> {
    const { data, error } = await supabase.from('ocorrencias').select('*').eq('tenant_id', tenantId).eq('lote_id', loteId)
    if (error) throw error
    return data ?? []
  }

  async findByCiclo(tenantId: string, cicloId: string): Promise<Ocorrencia[]> {
    const { data, error } = await supabase.from('ocorrencias').select('*').eq('tenant_id', tenantId).eq('ciclo_id', cicloId)
    if (error) throw error
    return data ?? []
  }

  async create(item: Ocorrencia): Promise<Ocorrencia> {
    const { data, error } = await supabase.from('ocorrencias').insert(item).select().single()
    if (error) throw error
    return data
  }

  async update(id: string, data: Partial<Ocorrencia>): Promise<Ocorrencia> {
    const { data: updated, error } = await supabase.from('ocorrencias').update(data).eq('id', id).select().single()
    if (error) throw error
    return updated
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('ocorrencias').delete().eq('id', id)
    if (error) throw error
  }
}
