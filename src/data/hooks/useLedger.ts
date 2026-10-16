import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { v4 as uuid } from 'uuid'
import { ledgerRepo } from '@/data/repositories/localStorage/LedgerRepository'
import type { LedgerEntry, LedgerEntryTipo } from '@/domain/types'

export function useLedger() {
  return useQuery({
    queryKey: ['ledger'],
    queryFn: () => ledgerRepo.findAll(),
  })
}

export function useLedgerByEscritorio(escritorioId: string) {
  return useQuery({
    queryKey: ['ledger', 'escritorio', escritorioId],
    queryFn: () => ledgerRepo.findByEscritorio(escritorioId),
    enabled: !!escritorioId,
  })
}

export function useLedgerByApp(appId: string) {
  return useQuery({
    queryKey: ['ledger', 'app', appId],
    queryFn: () => ledgerRepo.findByApp(appId),
    enabled: !!appId,
  })
}

// Registrar lançamento manual (ex: estorno)
export function useCreateLedgerEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<LedgerEntry, 'id' | 'criado_em'>) =>
      ledgerRepo.create({ ...data, id: uuid(), criado_em: new Date().toISOString() }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ledger'] }),
  })
}
