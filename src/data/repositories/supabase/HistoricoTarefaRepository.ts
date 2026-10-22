import { supabase } from '@/lib/supabase'
import type { HistoricoTarefa } from '@/domain/types'
import type { HistoricoTarefaRepository as IHistoricoTarefaRepository } from '../interfaces'

export class SupabaseHistoricoTarefaRepository implements IHistoricoTarefaRepository {
  async findByTarefa(tenantId: string, tarefaId: string): Promise<HistoricoTarefa[]> {
    const { data, error } = await supabase.from('historico_tarefas').select('*').eq('tenant_id', tenantId).eq('tarefa_id', tarefaId)
    if (error) throw error
    return data ?? []
  }

  async create(item: HistoricoTarefa): Promise<HistoricoTarefa> {
    const { data, error } = await supabase.from('historico_tarefas').insert(item).select().single()
    if (error) throw error
    return data
  }
}
