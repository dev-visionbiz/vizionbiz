import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { processoAberturaRepo } from '@/data/repositories/localStorage'
import type { ProcessoAbertura } from '@/domain/types'

export function useProcessoAbertura(tenantId: string, clienteId: string) {
  return useQuery({
    queryKey: ['processo_abertura', tenantId, clienteId],
    queryFn: () => processoAberturaRepo.findByCliente(tenantId, clienteId),
    enabled: !!tenantId && !!clienteId,
  })
}

export function useProcessosAberturaAtivos(tenantId: string) {
  return useQuery({
    queryKey: ['processos_abertura_ativos', tenantId],
    queryFn: () => processoAberturaRepo.findAtivos(tenantId),
    enabled: !!tenantId,
  })
}

export function useCreateProcessoAbertura() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (processo: ProcessoAbertura) => processoAberturaRepo.create(processo),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['processo_abertura', data.tenant_id, data.client_id] })
      qc.invalidateQueries({ queryKey: ['processos_abertura_ativos', data.tenant_id] })
    },
  })
}

export function useUpdateProcessoAbertura() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ProcessoAbertura> }) =>
      processoAberturaRepo.update(id, data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['processo_abertura', data.tenant_id, data.client_id] })
      qc.invalidateQueries({ queryKey: ['processos_abertura_ativos', data.tenant_id] })
      if (data.formulario_token) {
        qc.invalidateQueries({ queryKey: ['processo_abertura_token', data.formulario_token] })
      }
    },
  })
}

export function useProcessoAberturaByToken(token: string) {
  return useQuery({
    queryKey: ['processo_abertura_token', token],
    queryFn: () => processoAberturaRepo.findByToken(token),
    enabled: !!token,
    staleTime: 0,
  })
}
