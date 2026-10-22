import { supabase } from '@/lib/supabase'
import type { GuiaRecolhimento, GuiaStatus, TipoGuia } from '@/domain/types'
import type { GuiaRecolhimentoRepository as IGuiaRecolhimentoRepository } from '../interfaces'

export class SupabaseGuiaRecolhimentoRepository implements IGuiaRecolhimentoRepository {
  async findAll(tenantId: string): Promise<GuiaRecolhimento[]> {
    const { data, error } = await supabase
      .from('guias_recolhimento')
      .select('*')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
    if (error) throw error
    return data ?? []
  }

  async findById(id: string): Promise<GuiaRecolhimento | null> {
    const { data, error } = await supabase
      .from('guias_recolhimento')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return data ?? null
  }

  async findByCliente(tenantId: string, clienteId: string): Promise<GuiaRecolhimento[]> {
    const { data, error } = await supabase
      .from('guias_recolhimento')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('cliente_id', clienteId)
      .is('deleted_at', null)
    if (error) throw error
    return data ?? []
  }

  async findByStatus(tenantId: string, status: GuiaStatus): Promise<GuiaRecolhimento[]> {
    const { data, error } = await supabase
      .from('guias_recolhimento')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', status)
      .is('deleted_at', null)
    if (error) throw error
    return data ?? []
  }

  async findByCompetencia(tenantId: string, competencia: string): Promise<GuiaRecolhimento[]> {
    const { data, error } = await supabase
      .from('guias_recolhimento')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('competencia', competencia)
      .is('deleted_at', null)
    if (error) throw error
    return data ?? []
  }

  async findByTipo(tenantId: string, tipo: TipoGuia): Promise<GuiaRecolhimento[]> {
    const { data, error } = await supabase
      .from('guias_recolhimento')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('tipo', tipo)
      .is('deleted_at', null)
    if (error) throw error
    return data ?? []
  }

  async findBySHA256(sha256: string): Promise<GuiaRecolhimento | null> {
    const { data, error } = await supabase
      .from('guias_recolhimento')
      .select('*')
      .eq('lote_arquivo_sha256', sha256)
      .maybeSingle()
    if (error) throw error
    return data ?? null
  }

  async create(item: GuiaRecolhimento): Promise<GuiaRecolhimento> {
    const { data, error } = await supabase
      .from('guias_recolhimento')
      .insert(item)
      .select()
      .single()
    if (error) throw error
    return data
  }

  async update(id: string, item: Partial<GuiaRecolhimento>): Promise<GuiaRecolhimento> {
    const { data, error } = await supabase
      .from('guias_recolhimento')
      .update(item)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('guias_recolhimento')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
  }
}
