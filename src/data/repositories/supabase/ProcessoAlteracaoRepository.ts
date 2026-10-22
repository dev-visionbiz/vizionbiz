import { supabase } from '@/lib/supabase'
import type { ProcessoAlteracao } from '@/domain/types'

export class SupabaseProcessoAlteracaoRepository {
  async findAll(tenantId: string): Promise<ProcessoAlteracao[]> {
    const { data, error } = await supabase
      .from('processos_alteracao')
      .select('*')
      .eq('tenant_id', tenantId)
    if (error) throw error
    return data ?? []
  }

  async findById(id: string): Promise<ProcessoAlteracao | null> {
    const { data, error } = await supabase
      .from('processos_alteracao')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return data ?? null
  }

  async findByCliente(tenantId: string, clienteId: string): Promise<ProcessoAlteracao[]> {
    const { data, error } = await supabase
      .from('processos_alteracao')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('client_id', clienteId)
    if (error) throw error
    return data ?? []
  }

  async findAtivos(tenantId: string): Promise<ProcessoAlteracao[]> {
    const { data, error } = await supabase
      .from('processos_alteracao')
      .select('*')
      .eq('tenant_id', tenantId)
      .not('status', 'in', '("concluido","cancelado")')
    if (error) throw error
    return data ?? []
  }

  async findByToken(token: string): Promise<ProcessoAlteracao | null> {
    const { data, error } = await supabase
      .from('processos_alteracao')
      .select('*')
      .eq('formulario_token', token)
      .maybeSingle()
    if (error) throw error
    return data ?? null
  }

  async create(item: ProcessoAlteracao): Promise<ProcessoAlteracao> {
    const { data, error } = await supabase
      .from('processos_alteracao')
      .insert(item)
      .select()
      .single()
    if (error) throw error
    return data
  }

  async update(id: string, item: Partial<ProcessoAlteracao>): Promise<ProcessoAlteracao> {
    const { data, error } = await supabase
      .from('processos_alteracao')
      .update(item)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('processos_alteracao')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
  }
}
