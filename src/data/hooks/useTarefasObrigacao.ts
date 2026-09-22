import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { tarefaObrigacaoRepo } from '@/data/repositories/localStorage/TarefaObrigacaoRepository'
import type { TarefaObrigacao, TarefaStatus } from '@/domain/types'

function derivarStatus(t: TarefaObrigacao): TarefaObrigacao {
  const hoje = format(new Date(), 'yyyy-MM-dd')
  if (t.status === 'pendente' && !t.data_conclusao && t.data_prevista < hoje) {
    return { ...t, status: 'atrasada' }
  }
  // impedido é sempre manual — nunca sobrescrito por derivação automática
  return t
}

export function useTarefasTenant(tenantId: string) {
  return useQuery({
    queryKey: ['tarefas-obrigacao', tenantId, 'all'],
    queryFn: async () => {
      const tarefas = await tarefaObrigacaoRepo.findAll(tenantId)
      return tarefas.map(derivarStatus)
    },
    enabled: !!tenantId,
  })
}

export function useTarefasCompetencia(tenantId: string, competenciaId: string) {
  return useQuery({
    queryKey: ['tarefas-obrigacao', tenantId, competenciaId],
    queryFn: async () => {
      const tarefas = await tarefaObrigacaoRepo.findByCompetencia(tenantId, competenciaId)
      return tarefas.map(derivarStatus)
    },
    enabled: !!tenantId && !!competenciaId,
  })
}

export function useTarefasEtapa(tenantId: string, competenciaId: string, etapaId: string) {
  return useQuery({
    queryKey: ['tarefas-obrigacao', tenantId, competenciaId, etapaId],
    queryFn: async () => {
      const tarefas = await tarefaObrigacaoRepo.findByCompetenciaEtapa(tenantId, competenciaId, etapaId)
      return tarefas.map(derivarStatus)
    },
    enabled: !!tenantId && !!competenciaId && !!etapaId,
  })
}

export function useUpdateTarefa() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TarefaObrigacao> }) =>
      tarefaObrigacaoRepo.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tarefas-obrigacao'] }),
  })
}

export function useUpdateTarefasLote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      ids,
      data,
    }: {
      ids: string[]
      data: Partial<TarefaObrigacao>
    }) => {
      await Promise.all(ids.map((id) => tarefaObrigacaoRepo.update(id, data)))
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tarefas-obrigacao'] }),
  })
}

export function useConcluirTarefas() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const hoje = format(new Date(), 'yyyy-MM-dd')
      await Promise.all(
        ids.map((id) =>
          tarefaObrigacaoRepo.update(id, {
            status: 'concluida' as TarefaStatus,
            data_conclusao: hoje,
          })
        )
      )
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tarefas-obrigacao'] }),
  })
}
