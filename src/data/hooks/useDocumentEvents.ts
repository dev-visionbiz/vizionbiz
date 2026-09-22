import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { LocalDocumentEventRepository } from '@/data/repositories/localStorage'
import type { DocumentEventRecord } from '@/domain/types'

const repo = new LocalDocumentEventRepository()

export function useClientDocumentEvents(tenantId: string, clientId: string) {
  return useQuery({
    queryKey: ['document-events', tenantId, clientId],
    queryFn: () => repo.findByClient(tenantId, clientId),
    enabled: !!tenantId && !!clientId,
  })
}

export function useDocumentEvents(documentId: string) {
  return useQuery({
    queryKey: ['document-events', documentId],
    queryFn: () => repo.findByDocument(documentId),
    enabled: !!documentId,
  })
}

export function useCreateDocumentEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (event: DocumentEventRecord) => repo.create(event),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['document-events'] }),
  })
}
