import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { LocalHistoricoTarefaRepository } from '@/data/repositories/localStorage'
import type { HistoricoTarefa, HistoricoTipoEvento, TarefaStatus } from '@/domain/types'
import { v4 as uuidv4 } from 'uuid'

const repo = new LocalHistoricoTarefaRepository()

export function useHistoricoTarefa(tenantId: string, tarefaId: string) {
  return useQuery({
    queryKey: ['historico-tarefa', tenantId, tarefaId],
    queryFn: () => repo.findByTarefa(tenantId, tarefaId),
    enabled: !!tenantId && !!tarefaId,
  })
}

export function useRegistrarHistoricoTarefa() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (entry: {
      tenantId: string
      tarefaId: string
      tarefaTipo: 'tarefa'
      tipo: HistoricoTipoEvento
      autorId?: string
      autorNome?: string
      conteudo?: string
      meta?: {
        status_anterior?: TarefaStatus
        status_novo?: TarefaStatus
        responsavel_anterior_nome?: string
        responsavel_novo_nome?: string
        checklist_item_nome?: string
        tempo_decorrido_min?: number
      }
    }) => {
      const item: HistoricoTarefa = {
        id: uuidv4(),
        tenant_id: entry.tenantId,
        tarefa_tipo: entry.tarefaTipo,
        tarefa_id: entry.tarefaId,
        tipo: entry.tipo,
        autor_id: entry.autorId,
        autor_nome: entry.autorNome,
        conteudo: entry.conteudo,
        meta: entry.meta,
        criado_em: new Date().toISOString(),
      }
      return repo.create(item)
    },
    onSuccess: (item) => {
      qc.invalidateQueries({ queryKey: ['historico-tarefa', item.tenant_id, item.tarefa_id] })
    },
  })
}
