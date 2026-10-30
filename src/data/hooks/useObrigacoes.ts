import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { v4 as uuid } from 'uuid'
import { format } from 'date-fns'
import { obrigacaoConfigRepo, obrigacaoLancamentoRepo } from '@/data/repositories/obrigacoesProvider'
import type { ObrigacaoConfig, ObrigacaoLancamento } from '@/domain/types'

export function useObrigacaoConfigs(tenantId: string) {
  return useQuery({
    queryKey: ['obrigacao_configs', tenantId],
    queryFn: () => obrigacaoConfigRepo.findAll(tenantId),
    enabled: !!tenantId,
  })
}

export function useObrigacaoConfigsByCliente(tenantId: string, clienteId: string) {
  return useQuery({
    queryKey: ['obrigacao_configs', tenantId, 'cliente', clienteId],
    queryFn: () => obrigacaoConfigRepo.findByCliente(tenantId, clienteId),
    enabled: !!tenantId && !!clienteId,
  })
}

export function useObrigacaoLancamentos(tenantId: string) {
  return useQuery({
    queryKey: ['obrigacao_lancamentos', tenantId],
    queryFn: () => obrigacaoLancamentoRepo.findAll(tenantId),
    enabled: !!tenantId,
  })
}

export function useObrigacaoLancamentosByCompetencia(tenantId: string, competencia: string) {
  return useQuery({
    queryKey: ['obrigacao_lancamentos', tenantId, 'competencia', competencia],
    queryFn: () => obrigacaoLancamentoRepo.findByCompetencia(tenantId, competencia),
    enabled: !!tenantId && !!competencia,
  })
}

export function useObrigacaoLancamentosByCliente(tenantId: string, clienteId: string) {
  return useQuery({
    queryKey: ['obrigacao_lancamentos', tenantId, 'cliente', clienteId],
    queryFn: () => obrigacaoLancamentoRepo.findByCliente(tenantId, clienteId),
    enabled: !!tenantId && !!clienteId,
  })
}

export function useCreateObrigacaoConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<ObrigacaoConfig, 'id'>) =>
      obrigacaoConfigRepo.create({ ...data, id: uuid() }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['obrigacao_configs'] }),
  })
}

export function useUpdateObrigacaoConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ObrigacaoConfig> }) =>
      obrigacaoConfigRepo.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['obrigacao_configs'] }),
  })
}

export function useCreateObrigacaoLancamento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<ObrigacaoLancamento, 'id'>) =>
      obrigacaoLancamentoRepo.create({ ...data, id: uuid() }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['obrigacao_lancamentos'] }),
  })
}

export function useUpdateObrigacaoLancamento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ObrigacaoLancamento> }) =>
      obrigacaoLancamentoRepo.update(id, { ...data, atualizado_em: format(new Date(), "yyyy-MM-dd'T'HH:mm:ss") }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['obrigacao_lancamentos'] }),
  })
}
