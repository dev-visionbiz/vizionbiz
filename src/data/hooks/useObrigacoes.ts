import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { v4 as uuid } from 'uuid'
import { obrigacaoRepo } from '@/data/repositories/localStorage/ObrigacaoRepository'
import type { Obrigacao } from '@/domain/types'

export function useObrigacoes(tenantId: string) {
  return useQuery({
    queryKey: ['obrigacoes', tenantId],
    queryFn: () => obrigacaoRepo.findAll(tenantId),
    enabled: !!tenantId,
  })
}

export function useObrigacoesAtivas(tenantId: string) {
  return useQuery({
    queryKey: ['obrigacoes', 'ativas', tenantId],
    queryFn: () => obrigacaoRepo.findAtivas(tenantId),
    enabled: !!tenantId,
  })
}

export function useCreateObrigacao() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<Obrigacao, 'id'>) =>
      obrigacaoRepo.create({ ...data, id: uuid() }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['obrigacoes'] }),
  })
}

export function useUpdateObrigacao() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Obrigacao> }) =>
      obrigacaoRepo.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['obrigacoes'] }),
  })
}

export function useDeleteObrigacao() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => obrigacaoRepo.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['obrigacoes'] }),
  })
}
