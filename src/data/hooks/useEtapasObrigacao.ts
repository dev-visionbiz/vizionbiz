import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { v4 as uuid } from 'uuid'
import { etapaObrigacaoRepo } from '@/data/repositories/localStorage/EtapaObrigacaoRepository'
import type { EtapaObrigacao } from '@/domain/types'

export function useTodasEtapas(tenantId: string) {
  return useQuery({
    queryKey: ['etapas-obrigacao', tenantId, 'todas'],
    queryFn: () => etapaObrigacaoRepo.findAll(tenantId),
    enabled: !!tenantId,
  })
}

export function useEtapasObrigacao(tenantId: string, obrigacaoId: string) {
  return useQuery({
    queryKey: ['etapas-obrigacao', tenantId, obrigacaoId],
    queryFn: () => etapaObrigacaoRepo.findByObrigacao(tenantId, obrigacaoId),
    enabled: !!tenantId && !!obrigacaoId,
  })
}

export function useCreateEtapa() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<EtapaObrigacao, 'id'>) =>
      etapaObrigacaoRepo.create({ ...data, id: uuid() }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['etapas-obrigacao'] }),
  })
}

export function useUpdateEtapa() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<EtapaObrigacao> }) =>
      etapaObrigacaoRepo.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['etapas-obrigacao'] }),
  })
}

export function useDeleteEtapa() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => etapaObrigacaoRepo.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['etapas-obrigacao'] }),
  })
}

export function useReorderEtapas() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (etapas: EtapaObrigacao[]) => {
      await Promise.all(etapas.map((e, i) => etapaObrigacaoRepo.update(e.id, { ordem: i + 1 })))
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['etapas-obrigacao'] }),
  })
}
