import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { contractRepo as repo } from '@/data/repositories/financeiroProvider'
import type { Contract } from '@/domain/types'

export function useContracts(tenantId: string) {
  return useQuery({
    queryKey: ['contracts', tenantId],
    queryFn: () => repo.findAll(tenantId),
    enabled: !!tenantId,
  })
}

export function useClientContracts(tenantId: string, clientId: string) {
  return useQuery({
    queryKey: ['contracts', tenantId, clientId],
    queryFn: () => repo.findByClient(tenantId, clientId),
    enabled: !!tenantId && !!clientId,
  })
}

export function useCreateContract() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (contract: Contract) => repo.create(contract),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contracts'] }),
  })
}

export function useUpdateContract() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Contract> }) => repo.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contracts'] }),
  })
}
