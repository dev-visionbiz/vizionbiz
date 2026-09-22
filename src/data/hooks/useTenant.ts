import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { LocalTenantRepository } from '@/data/repositories/localStorage'
import type { Tenant } from '@/domain/types'

const repo = new LocalTenantRepository()

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
