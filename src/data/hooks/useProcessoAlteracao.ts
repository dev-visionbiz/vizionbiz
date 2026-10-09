import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { processoAlteracaoRepo } from '@/data/repositories/localStorage'
import type { ProcessoAlteracao } from '@/domain/types'

export function useProcessosAlteracao(tenantId: string, clienteId: string) {
  return useQuery({
    queryKey: ['processos_alteracao', tenantId, clienteId],
    queryFn: () => processoAlteracaoRepo.findByCliente(tenantId, clienteId),
    enabled: !!tenantId && !!clienteId,
  })
}

export function useCreateProcessoAlteracao() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (processo: ProcessoAlteracao) => processoAlteracaoRepo.create(processo),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['processos_alteracao', data.tenant_id, data.client_id] })
    },
  })
}

export function useUpdateProcessoAlteracao() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ProcessoAlteracao> }) =>
      processoAlteracaoRepo.update(id, data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['processos_alteracao', data.tenant_id, data.client_id] })
    },
  })
}
