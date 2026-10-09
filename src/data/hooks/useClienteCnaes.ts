import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { clienteCnaeRepo } from '@/data/repositories/localStorage'
import type { ClienteCnae } from '@/domain/types'

export function useClienteCnaes(tenantId: string, clienteId: string) {
  return useQuery({
    queryKey: ['cliente_cnaes', tenantId, clienteId],
    queryFn: () => clienteCnaeRepo.findByCliente(tenantId, clienteId),
    enabled: !!tenantId && !!clienteId,
  })
}

export function useCreateClienteCnae() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (cnae: ClienteCnae) => clienteCnaeRepo.create(cnae),
    onSuccess: (data) =>
      qc.invalidateQueries({ queryKey: ['cliente_cnaes', data.tenant_id, data.cliente_id] }),
  })
}

export function useUpdateClienteCnae() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ClienteCnae> }) =>
      clienteCnaeRepo.update(id, data),
    onSuccess: (data) =>
      qc.invalidateQueries({ queryKey: ['cliente_cnaes', data.tenant_id, data.cliente_id] }),
  })
}

export function useDeleteClienteCnae() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      tenantId,
      clienteId,
    }: {
      id: string
      tenantId: string
      clienteId: string
    }) => clienteCnaeRepo.delete(id).then(() => ({ tenantId, clienteId })),
    onSuccess: ({ tenantId, clienteId }) =>
      qc.invalidateQueries({ queryKey: ['cliente_cnaes', tenantId, clienteId] }),
  })
}

export function useSyncClienteCnaes() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ tenantId, clienteId, cnaes }: { tenantId: string; clienteId: string; cnaes: ClienteCnae[] }) =>
      clienteCnaeRepo.replaceAllByCliente(tenantId, clienteId, cnaes),
    onSuccess: (_, { tenantId, clienteId }) =>
      qc.invalidateQueries({ queryKey: ['cliente_cnaes', tenantId, clienteId] }),
  })
}
