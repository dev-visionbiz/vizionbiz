import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { LocalDocumentRepository } from '@/data/repositories/localStorage'
import type { Document } from '@/domain/types'

const repo = new LocalDocumentRepository()

export function useDocuments(tenantId: string) {
  return useQuery({
    queryKey: ['documents', tenantId],
    queryFn: () => repo.findAll(tenantId),
    enabled: !!tenantId,
  })
}

export function useClientDocuments(tenantId: string, clientId: string) {
  return useQuery({
    queryKey: ['documents', tenantId, clientId],
    queryFn: () => repo.findByClient(tenantId, clientId),
    enabled: !!tenantId && !!clientId,
  })
}

export function useFolderDocuments(folderId: string) {
  return useQuery({
    queryKey: ['documents', 'folder', folderId],
    queryFn: () => repo.findByFolder(folderId),
    enabled: !!folderId,
  })
}

export function useCreateDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (doc: Document) => repo.create(doc),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  })
}

export function useUpdateDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Document> }) => repo.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  })
}

export function useDeleteDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => repo.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  })
}
