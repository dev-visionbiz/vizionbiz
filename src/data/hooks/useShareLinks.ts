import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { LocalShareLinkRepository } from '@/data/repositories/localStorage'
import type { ShareLink } from '@/domain/types'

const repo = new LocalShareLinkRepository()

export function useDocumentShareLinks(documentId: string) {
  return useQuery({
    queryKey: ['share-links', documentId],
    queryFn: () => repo.findByDocument(documentId),
    enabled: !!documentId,
  })
}

export function useCreateShareLink() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (link: ShareLink) => repo.create(link),
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ['share-links', data.document_id] }),
  })
}

export function useDeleteShareLink() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: { id: string; documentId: string }) => repo.delete(id),
    onSuccess: (_, variables) => qc.invalidateQueries({ queryKey: ['share-links', variables.documentId] }),
  })
}
