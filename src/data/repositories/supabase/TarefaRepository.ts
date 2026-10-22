import { supabase } from '@/lib/supabase'
import type { Tarefa } from '@/domain/types'
import type { TarefaRepository as ITarefaRepository } from '../interfaces'

export class SupabaseTarefaRepository implements ITarefaRepository {
  async findAll(tenantId: string): Promise<Tarefa[]> {
    const { data, error } = await supabase.from('tarefas').select('*').eq('tenant_id', tenantId)
    if (error) throw error
    return data ?? []
  }

  async findById(id: string): Promise<Tarefa | null> {
    const { data, error } = await supabase.from('tarefas').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data ?? null
  }

  async findByOcorrencia(tenantId: string, ocorrenciaId: string): Promise<Tarefa[]> {
    const { data, error } = await supabase
      .from('tarefas')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('ocorrencia_id', ocorrenciaId)
      .order('ordem')
    if (error) throw error
    return data ?? []
  }

  async findByCliente(tenantId: string, clienteId: string): Promise<Tarefa[]> {
    const { data, error } = await supabase.from('tarefas').select('*').eq('tenant_id', tenantId).eq('cliente_id', clienteId)
    if (error) throw error
    return data ?? []
  }

  async findByFormularioToken(token: string): Promise<Tarefa | null> {
    const { data, error } = await supabase.from('tarefas').select('*').eq('formulario_token', token).maybeSingle()
    if (error) throw error
    return data ?? null
  }

  async create(item: Tarefa): Promise<Tarefa> {
    const { data, error } = await supabase.from('tarefas').insert(item).select().single()
    if (error) throw error
    return data
  }

  async update(id: string, data: Partial<Tarefa>): Promise<Tarefa> {
    const { data: updated, error } = await supabase.from('tarefas').update(data).eq('id', id).select().single()
    if (error) throw error
    return updated
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('tarefas').delete().eq('id', id)
    if (error) throw error
  }
}
