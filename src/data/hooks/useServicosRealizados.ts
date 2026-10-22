import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { servicoRealizadoRepo } from '@/data/repositories/financeiroProvider'
import type { ServicoRealizado } from '@/domain/types'

const QK = 'servicos_realizados'

export function useServicosRealizados(tenantId: string) {
  return useQuery({
    queryKey: [QK, tenantId],
    queryFn: () => servicoRealizadoRepo.findAll(tenantId),
    enabled: !!tenantId,
  })
}

export function useServicosPendentes(tenantId: string) {
  return useQuery({
    queryKey: [QK, 'pendentes', tenantId],
    queryFn: () => servicoRealizadoRepo.findPendentes(tenantId),
    enabled: !!tenantId,
  })
}

export function useServicosRealizadosByCliente(tenantId: string, clienteId: string) {
  return useQuery({
    queryKey: [QK, tenantId, clienteId],
    queryFn: () => servicoRealizadoRepo.findByCliente(tenantId, clienteId),
    enabled: !!tenantId && !!clienteId,
  })
}

export function useCreateServicoRealizado() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (item: ServicoRealizado) => servicoRealizadoRepo.create(item),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QK] }),
  })
}

export function useUpdateServicoRealizado() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ServicoRealizado> }) =>
      servicoRealizadoRepo.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QK] }),
  })
}
