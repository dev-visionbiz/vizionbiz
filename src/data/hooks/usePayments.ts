import { useMutation, useQueryClient } from '@tanstack/react-query'
import { LocalPaymentRepository } from '@/data/repositories/localStorage'
import type { Payment } from '@/domain/types'

const repo = new LocalPaymentRepository()

export function useCreatePayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payment: Payment) => repo.create(payment),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] }),
  })
}
