import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { LocalPlanoRepository } from '@/data/repositories/localStorage'
import type { Plano } from '@/domain/types'

const repo = new LocalPlanoRepository()

export function usePlanos(tenantId: string) {
  return useQuery({
    queryKey: ['planos', tenantId],
    queryFn: () => repo.findAll(tenantId),
    enabled: !!tenantId,
  })
}

export function usePlanosAtivos(tenantId: string) {
  return useQuery({
    queryKey: ['planos', tenantId, 'ativos'],
    queryFn: () => repo.findAtivos(tenantId),
    enabled: !!tenantId,
  })
}

export function useCreatePlano() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (p: Plano) => repo.create(p),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['planos'] }),
  })
}

export function useUpdatePlano() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Plano> }) => repo.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['planos'] }),
  })
}

export function useDeletePlano() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => repo.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['planos'] }),
  })
}
