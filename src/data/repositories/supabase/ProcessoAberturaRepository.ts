import { supabase } from '@/lib/supabase'
import type { ProcessoAbertura } from '@/domain/types'

export class SupabaseProcessoAberturaRepository {
  async findAll(tenantId: string): Promise<ProcessoAbertura[]> {
    const { data, error } = await supabase
      .from('processos_abertura')
      .select('*')
      .eq('tenant_id', tenantId)
    if (error) throw error
    return data ?? []
  }

  async findById(id: string): Promise<ProcessoAbertura | null> {
    const { data, error } = await supabase
      .from('processos_abertura')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return data ?? null
  }

  async findByCliente(tenantId: string, clienteId: string): Promise<ProcessoAbertura | null> {
    const { data, error } = await supabase
      .from('processos_abertura')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('client_id', clienteId)
      .maybeSingle()
    if (error) throw error
    return data ?? null
  }

  async findAtivos(tenantId: string): Promise<ProcessoAbertura[]> {
    const { data, error } = await supabase
      .from('processos_abertura')
      .select('*')
      .eq('tenant_id', tenantId)
      .not('status', 'in', '("concluido","cancelado")')
    if (error) throw error
    return data ?? []
  }

  async findByToken(token: string): Promise<ProcessoAbertura | null> {
    const { data, error } = await supabase
      .from('processos_abertura')
      .select('*')
      .eq('formulario_token', token)
      .maybeSingle()
    if (error) throw error
    return data ?? null
  }

  async create(item: ProcessoAbertura): Promise<ProcessoAbertura> {
    const { data, error } = await supabase
      .from('processos_abertura')
      .insert(item)
      .select()
      .single()
    if (error) throw error
    return data
  }

  async update(id: string, item: Partial<ProcessoAbertura>): Promise<ProcessoAbertura> {
    const { data, error } = await supabase
      .from('processos_abertura')
      .update(item)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('processos_abertura')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
  }
}
