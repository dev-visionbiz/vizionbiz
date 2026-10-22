import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { billingPolicyRepo as repo } from '@/data/repositories/financeiroProvider'
import type { BillingPolicy } from '@/domain/types'

export function useBillingPolicy(tenantId: string) {
  return useQuery({
    queryKey: ['billing-policy', tenantId],
    queryFn: () => repo.findByTenant(tenantId),
    enabled: !!tenantId,
  })
}

export function useUpsertBillingPolicy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (policy: BillingPolicy) => repo.upsert(policy),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['billing-policy'] }),
  })
}
