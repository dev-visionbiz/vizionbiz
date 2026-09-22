import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { LocalInvoiceRepository } from '@/data/repositories/localStorage'
import type { Invoice } from '@/domain/types'

const repo = new LocalInvoiceRepository()

export function useInvoices(tenantId: string) {
  return useQuery({
    queryKey: ['invoices', tenantId],
    queryFn: () => repo.findAll(tenantId),
    enabled: !!tenantId,
  })
}

export function useClientInvoices(tenantId: string, clientId: string) {
  return useQuery({
    queryKey: ['invoices', tenantId, clientId],
    queryFn: () => repo.findByClient(tenantId, clientId),
    enabled: !!tenantId && !!clientId,
  })
}

export function useOverdueInvoices(tenantId: string) {
  const today = new Date().toISOString().split('T')[0]
  return useQuery({
    queryKey: ['invoices', 'overdue', tenantId],
    queryFn: () => repo.findOverdue(tenantId, today),
    enabled: !!tenantId,
  })
}

export function useCreateInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (invoice: Invoice) => repo.create(invoice),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] }),
  })
}

export function useUpdateInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Invoice> }) => repo.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] }),
  })
}
