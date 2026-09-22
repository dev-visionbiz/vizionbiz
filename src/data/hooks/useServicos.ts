import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { LocalServicoRepository } from '@/data/repositories/localStorage'
import type { Servico } from '@/domain/types'

const repo = new LocalServicoRepository()

export function useServicos(tenantId: string) {
  return useQuery({
    queryKey: ['servicos', tenantId],
    queryFn: () => repo.findAll(tenantId),
    enabled: !!tenantId,
  })
}

export function useServicosAtivos(tenantId: string) {
  return useQuery({
    queryKey: ['servicos', tenantId, 'ativos'],
    queryFn: () => repo.findAtivos(tenantId),
    enabled: !!tenantId,
  })
}

export function useCreateServico() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (s: Servico) => repo.create(s),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['servicos'] }),
  })
}

export function useUpdateServico() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Servico> }) => repo.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['servicos'] }),
  })
}

export function useDeleteServico() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => repo.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['servicos'] }),
  })
}
