import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tenantRepo as repo } from '@/data/repositories/coreProvider'
import type { Tenant } from '@/domain/types'

export function useTenant(tenantId: string) {
  return useQuery({
    queryKey: ['tenant', tenantId],
    queryFn: () => repo.findById(tenantId),
    enabled: !!tenantId,
  })
}

export function useUpdateTenant() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Tenant> }) =>
      repo.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tenant'] }),
  })
}
