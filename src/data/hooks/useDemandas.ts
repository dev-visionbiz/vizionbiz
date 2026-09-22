import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { v4 as uuid } from 'uuid'
import { format } from 'date-fns'
import { demandaEspecificaRepo } from '@/data/repositories/localStorage/DemandaEspecificaRepository'
import { etapaDemandaEspecificaRepo } from '@/data/repositories/localStorage/EtapaDemandaEspecificaRepository'
import type { DemandaEspecifica, EtapaDemandaEspecifica, TarefaStatus } from '@/domain/types'

function derivarStatusEtapa(e: EtapaDemandaEspecifica): EtapaDemandaEspecifica {
  // impedido é sempre manual — nunca sobrescrito por derivação automática
  if (e.status === 'impedido') return e
  const hoje = format(new Date(), 'yyyy-MM-dd')
  if (e.status === 'pendente' && !e.data_conclusao && e.data_prevista < hoje) {
    return { ...e, status: 'atrasada' as TarefaStatus }
  }
  return e
}

export function useDemandas(tenantId: string) {
  return useQuery({
    queryKey: ['demandas', tenantId],
    queryFn: () => demandaEspecificaRepo.findAll(tenantId),
    enabled: !!tenantId,
  })
}

export function useDemandasByCliente(tenantId: string, clienteId: string) {
  return useQuery({
    queryKey: ['demandas', tenantId, 'cliente', clienteId],
    queryFn: () => demandaEspecificaRepo.findByCliente(tenantId, clienteId),
    enabled: !!tenantId && !!clienteId,
  })
}

export function useEtapasDemanda(tenantId: string, demandaId: string) {
  return useQuery({
    queryKey: ['etapas-demanda', tenantId, demandaId],
    queryFn: async () => {
      const etapas = await etapaDemandaEspecificaRepo.findByDemanda(tenantId, demandaId)
      return etapas.map(derivarStatusEtapa)
    },
    enabled: !!tenantId && !!demandaId,
  })
}

export function useTodasEtapasDemanda(tenantId: string) {
  return useQuery({
    queryKey: ['etapas-demanda', tenantId, 'todas'],
    queryFn: async () => {
      const etapas = await etapaDemandaEspecificaRepo.findAll(tenantId)
      return etapas.map(derivarStatusEtapa)
    },
    enabled: !!tenantId,
  })
}

export function useCreateDemanda() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      demanda,
      etapas,
    }: {
      demanda: Omit<DemandaEspecifica, 'id'>
      etapas: Omit<EtapaDemandaEspecifica, 'id' | 'demanda_id'>[]
    }) => {
      const demandaId = uuid()
      const criada = await demandaEspecificaRepo.create({ ...demanda, id: demandaId })
      await Promise.all(
        etapas.map((e, i) =>
          etapaDemandaEspecificaRepo.create({ ...e, id: uuid(), demanda_id: demandaId, ordem: i + 1 })
        )
      )
      return criada
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['demandas'] })
      qc.invalidateQueries({ queryKey: ['etapas-demanda'] })
    },
  })
}

export function useUpdateDemanda() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<DemandaEspecifica> }) =>
      demandaEspecificaRepo.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['demandas'] }),
  })
}

export function useUpdateEtapaDemanda() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<EtapaDemandaEspecifica> }) =>
      etapaDemandaEspecificaRepo.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['etapas-demanda'] })
      qc.invalidateQueries({ queryKey: ['demandas'] })
    },
  })
}

export function useCreateEtapaDemandaEspecifica() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<EtapaDemandaEspecifica, 'id'>) =>
      etapaDemandaEspecificaRepo.create({ ...data, id: uuid() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['etapas-demanda'] })
      qc.invalidateQueries({ queryKey: ['demandas'] })
    },
  })
}

export function useDeleteEtapaDemandaEspecifica() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => etapaDemandaEspecificaRepo.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['etapas-demanda'] })
      qc.invalidateQueries({ queryKey: ['demandas'] })
    },
  })
}

export function useConcluirEtapaDemanda() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ etapaId, demandaId }: { etapaId: string; demandaId: string }) => {
      const hoje = format(new Date(), 'yyyy-MM-dd')
      await etapaDemandaEspecificaRepo.update(etapaId, {
        status: 'concluida' as TarefaStatus,
        data_conclusao: hoje,
      })
      // Se todas as etapas da demanda estiverem concluídas, conclui a demanda
      const demanda = await demandaEspecificaRepo.findById(demandaId)
      if (!demanda) return
      const etapas = await etapaDemandaEspecificaRepo.findByDemanda(demanda.tenant_id, demandaId)
      const todasConcluidas = etapas.every((e) => e.status === 'concluida' || e.id === etapaId)
      if (todasConcluidas) {
        await demandaEspecificaRepo.update(demandaId, {
          status: 'concluida',
          data_conclusao: hoje,
        })
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['etapas-demanda'] })
      qc.invalidateQueries({ queryKey: ['demandas'] })
    },
  })
}
