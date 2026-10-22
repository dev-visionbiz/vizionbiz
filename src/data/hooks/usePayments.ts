import { useMutation, useQueryClient } from '@tanstack/react-query'
import { paymentRepo as repo } from '@/data/repositories/financeiroProvider'
import type { Payment } from '@/domain/types'

export function useCreatePayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payment: Payment) => repo.create(payment),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] }),
  })
}
