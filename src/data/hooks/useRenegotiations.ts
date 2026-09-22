import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { LocalRenegotiationRepository } from '@/data/repositories/localStorage'
import type { Renegotiation } from '@/domain/types'

const repo = new LocalRenegotiationRepository()

export function useRenegotiations(tenantId: string) {
  return useQuery({
    queryKey: ['renegotiations', tenantId],
    queryFn: () => repo.findAll(tenantId),
    enabled: !!tenantId,
  })
}

export function useClientRenegotiations(tenantId: string, clientId: string) {
  return useQuery({
    queryKey: ['renegotiations', tenantId, clientId],
    queryFn: () => repo.findByClient(tenantId, clientId),
    enabled: !!tenantId && !!clientId,
  })
}

export function useCreateRenegotiation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (reneg: Renegotiation) => repo.create(reneg),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['renegotiations'] }),
  })
}

export function useUpdateRenegotiation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Renegotiation> }) => repo.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['renegotiations'] }),
  })
}
