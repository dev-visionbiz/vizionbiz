import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { LocalDocumentTypeRepository } from '@/data/repositories/localStorage'
import type { DocumentType } from '@/domain/types'

const repo = new LocalDocumentTypeRepository()

export function useDocumentTypes(tenantId: string) {
  return useQuery({
    queryKey: ['document-types', tenantId],
    queryFn: () => repo.findAll(tenantId),
    enabled: !!tenantId,
  })
}

export function useCreateDocumentType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dt: DocumentType) => repo.create(dt),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['document-types'] }),
  })
}

export function useUpdateDocumentType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<DocumentType> }) =>
      repo.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['document-types'] }),
  })
}

export function useDeleteDocumentType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => repo.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['document-types'] }),
  })
}
