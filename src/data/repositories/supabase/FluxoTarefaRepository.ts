import { supabase } from '@/lib/supabase'
import type { FluxoTarefa } from '@/domain/types'
import type { FluxoTarefaRepository as IFluxoTarefaRepository } from '../interfaces'

export class SupabaseFluxoTarefaRepository implements IFluxoTarefaRepository {
  async findAll(tenantId: string): Promise<FluxoTarefa[]> {
    const { data, error } = await supabase.from('fluxo_tarefas').select('*').eq('tenant_id', tenantId)
    if (error) throw error
    return data ?? []
  }

  async findById(id: string): Promise<FluxoTarefa | null> {
    const { data, error } = await supabase.from('fluxo_tarefas').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data ?? null
  }

  async findByFluxo(tenantId: string, fluxoId: string): Promise<FluxoTarefa[]> {
    const { data, error } = await supabase.from('fluxo_tarefas').select('*').eq('tenant_id', tenantId).eq('fluxo_id', fluxoId)
    if (error) throw error
    return data ?? []
  }

  async create(item: FluxoTarefa): Promise<FluxoTarefa> {
    const { data, error } = await supabase.from('fluxo_tarefas').insert(item).select().single()
    if (error) throw error
    return data
  }

  async update(id: string, data: Partial<FluxoTarefa>): Promise<FluxoTarefa> {
    const { data: updated, error } = await supabase.from('fluxo_tarefas').update(data).eq('id', id).select().single()
    if (error) throw error
    return updated
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('fluxo_tarefas').delete().eq('id', id)
    if (error) throw error
  }
}
