import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { carteiraRepo as repo } from '@/data/repositories/clientesProvider'
import type { Carteira } from '@/domain/types'

export function useCarteiras(tenantId: string) {
  return useQuery({
    queryKey: ['carteiras', tenantId],
    queryFn: () => repo.findAll(tenantId),
    enabled: !!tenantId,
  })
}

export function useCreateCarteira() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (item: Carteira) => repo.create(item),
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ['carteiras', data.tenant_id] }),
  })
}

export function useUpdateCarteira() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Carteira> }) => repo.update(id, data),
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ['carteiras', data.tenant_id] }),
  })
}

export function useDeleteCarteira() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, tenantId }: { id: string; tenantId: string }) =>
      repo.delete(id).then(() => tenantId),
    onSuccess: (tenantId) => qc.invalidateQueries({ queryKey: ['carteiras', tenantId] }),
  })
}
