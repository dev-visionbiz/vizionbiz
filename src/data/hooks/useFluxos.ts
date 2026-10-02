import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { v4 as uuid } from 'uuid'
import { fluxoRepo } from '@/data/repositories/localStorage/FluxoRepository'
import { fluxoTarefaRepo } from '@/data/repositories/localStorage/FluxoTarefaRepository'
import type { Fluxo, FluxoTarefa } from '@/domain/types'

export function useFluxos(tenantId: string) {
  return useQuery({
    queryKey: ['fluxos', tenantId],
    queryFn: () => fluxoRepo.findAll(tenantId),
    enabled: !!tenantId,
  })
}

export function useFluxosAtivos(tenantId: string) {
  return useQuery({
    queryKey: ['fluxos', 'ativos', tenantId],
    queryFn: () => fluxoRepo.findAtivos(tenantId),
    enabled: !!tenantId,
  })
}

export function useFluxoTarefas(tenantId: string, fluxoId: string) {
  return useQuery({
    queryKey: ['fluxo-tarefas', tenantId, fluxoId],
    queryFn: () => fluxoTarefaRepo.findByFluxo(tenantId, fluxoId),
    enabled: !!tenantId && !!fluxoId,
  })
}

export function useCreateFluxo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      fluxo,
      tarefas,
    }: {
      fluxo: Omit<Fluxo, 'id'>
      tarefas: Omit<FluxoTarefa, 'id' | 'fluxo_id'>[]
    }) => {
      const fluxoId = uuid()
      const criado = await fluxoRepo.create({ ...fluxo, id: fluxoId })
      await Promise.all(
        tarefas.map((t, i) =>
          fluxoTarefaRepo.create({ ...t, id: uuid(), fluxo_id: fluxoId, ordem: i + 1 })
        )
      )
      return criado
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fluxos'] })
      qc.invalidateQueries({ queryKey: ['fluxo-tarefas'] })
    },
  })
}

export function useUpdateFluxo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Fluxo> }) =>
      fluxoRepo.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fluxos'] }),
  })
}

export function useDeleteFluxo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => fluxoRepo.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fluxos'] })
      qc.invalidateQueries({ queryKey: ['fluxo-tarefas'] })
    },
  })
}

export function useCreateFluxoTarefa() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<FluxoTarefa, 'id'>) =>
      fluxoTarefaRepo.create({ ...data, id: uuid() }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fluxo-tarefas'] }),
  })
}

export function useUpdateFluxoTarefa() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FluxoTarefa> }) =>
      fluxoTarefaRepo.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fluxo-tarefas'] }),
  })
}

export function useDeleteFluxoTarefa() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => fluxoTarefaRepo.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fluxo-tarefas'] }),
  })
}
