import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { v4 as uuid } from 'uuid'
import { format } from 'date-fns'
import { ocorrenciaRepo } from '@/data/repositories/localStorage/OcorrenciaRepository'
import { tarefaRepo } from '@/data/repositories/localStorage/TarefaRepository'
import type { Ocorrencia, Tarefa, TarefaStatus, ChecklistItemProgresso, OcorrenciaStatus } from '@/domain/types'

function derivarStatusTarefa(t: Tarefa): Tarefa {
  if (t.status === 'impedido') return t
  const hoje = format(new Date(), 'yyyy-MM-dd')
  if (t.status === 'pendente' && !t.data_conclusao && t.data_prevista < hoje) {
    return { ...t, status: 'atrasada' as TarefaStatus }
  }
  return t
}

export function useOcorrencias(tenantId: string) {
  return useQuery({
    queryKey: ['ocorrencias', tenantId],
    queryFn: () => ocorrenciaRepo.findAll(tenantId),
    enabled: !!tenantId,
  })
}

export function useOcorrenciasByCliente(tenantId: string, clienteId: string) {
  return useQuery({
    queryKey: ['ocorrencias', tenantId, 'cliente', clienteId],
    queryFn: () => ocorrenciaRepo.findByCliente(tenantId, clienteId),
    enabled: !!tenantId && !!clienteId,
  })
}

export function useTarefasOcorrencia(tenantId: string, ocorrenciaId: string) {
  return useQuery({
    queryKey: ['tarefas', tenantId, ocorrenciaId],
    queryFn: async () => {
      const tarefas = await tarefaRepo.findByOcorrencia(tenantId, ocorrenciaId)
      return tarefas.map(derivarStatusTarefa)
    },
    enabled: !!tenantId && !!ocorrenciaId,
  })
}

export function useTodasTarefas(tenantId: string) {
  return useQuery({
    queryKey: ['tarefas', tenantId, 'todas'],
    queryFn: async () => {
      const tarefas = await tarefaRepo.findAll(tenantId)
      return tarefas.map(derivarStatusTarefa)
    },
    enabled: !!tenantId,
  })
}

export function useCreateOcorrencia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      ocorrencia,
      tarefas,
    }: {
      ocorrencia: Omit<Ocorrencia, 'id'>
      tarefas: Omit<Tarefa, 'id' | 'ocorrencia_id'>[]
    }) => {
      const ocorrenciaId = uuid()
      const criada = await ocorrenciaRepo.create({ ...ocorrencia, id: ocorrenciaId })
      await Promise.all(
        tarefas.map((t, i) =>
          tarefaRepo.create({ ...t, id: uuid(), ocorrencia_id: ocorrenciaId, ordem: i + 1 })
        )
      )
      return criada
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ocorrencias'] })
      qc.invalidateQueries({ queryKey: ['tarefas'] })
    },
  })
}

export function useCreateOcorrenciasLote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      loteId,
      clienteIds,
      ocorrenciaBase,
      tarefas,
    }: {
      loteId: string
      clienteIds: string[]
      ocorrenciaBase: Omit<Ocorrencia, 'id' | 'cliente_id' | 'lote_id'>
      tarefas: Omit<Tarefa, 'id' | 'ocorrencia_id'>[]
    }) => {
      const criadas: Ocorrencia[] = []
      for (const clienteId of clienteIds) {
        const ocorrenciaId = uuid()
        const criada = await ocorrenciaRepo.create({
          ...ocorrenciaBase,
          id: ocorrenciaId,
          cliente_id: clienteId,
          lote_id: loteId,
        })
        await Promise.all(
          tarefas.map((t, i) =>
            tarefaRepo.create({ ...t, id: uuid(), ocorrencia_id: ocorrenciaId, ordem: i + 1 })
          )
        )
        criadas.push(criada)
      }
      return criadas
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ocorrencias'] })
      qc.invalidateQueries({ queryKey: ['tarefas'] })
    },
  })
}

export function useUpdateOcorrencia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Ocorrencia> }) =>
      ocorrenciaRepo.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ocorrencias'] }),
  })
}

export function useUpdateTarefaNova() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Tarefa> }) =>
      tarefaRepo.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tarefas'] })
      qc.invalidateQueries({ queryKey: ['ocorrencias'] })
    },
  })
}

export function useCreateTarefa() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<Tarefa, 'id'>) =>
      tarefaRepo.create({ ...data, id: uuid() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tarefas'] })
      qc.invalidateQueries({ queryKey: ['ocorrencias'] })
    },
  })
}

export function useDeleteTarefa() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => tarefaRepo.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tarefas'] })
      qc.invalidateQueries({ queryKey: ['ocorrencias'] })
    },
  })
}

export function useUpdateChecklistTarefa() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, checklist_progresso }: { id: string; checklist_progresso: ChecklistItemProgresso[] }) =>
      tarefaRepo.update(id, { checklist_progresso }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tarefas'] }),
  })
}

export function useConcluirTarefa() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ tarefaId, ocorrenciaId }: { tarefaId: string; ocorrenciaId: string }) => {
      const hoje = format(new Date(), 'yyyy-MM-dd')
      await tarefaRepo.update(tarefaId, {
        status: 'concluida' as TarefaStatus,
        data_conclusao: hoje,
      })
      const ocorrencia = await ocorrenciaRepo.findById(ocorrenciaId)
      if (!ocorrencia) return
      const tarefas = await tarefaRepo.findByOcorrencia(ocorrencia.tenant_id, ocorrenciaId)
      const todasConcluidas = tarefas.every(t => t.status === 'concluida' || t.id === tarefaId)
      if (todasConcluidas) {
        await ocorrenciaRepo.update(ocorrenciaId, {
          status: 'concluida' as OcorrenciaStatus,
          data_conclusao: hoje,
        })
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tarefas'] })
      qc.invalidateQueries({ queryKey: ['ocorrencias'] })
    },
  })
}
