import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { LocalContratoItemRepository } from '@/data/repositories/localStorage'
import type { ContratoItem } from '@/domain/types'

const repo = new LocalContratoItemRepository()

export function useContratoItems(tenantId: string, contratoId: string) {
  return useQuery({
    queryKey: ['contrato_items', tenantId, contratoId],
    queryFn: () => repo.findByContrato(tenantId, contratoId),
    enabled: !!tenantId && !!contratoId,
  })
}

export function useCreateContratoItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (item: ContratoItem) => repo.create(item),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contrato_items'] }),
  })
}

export function useUpdateContratoItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ContratoItem> }) => repo.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contrato_items'] }),
  })
}

export function useDeleteContratoItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => repo.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contrato_items'] }),
  })
}
