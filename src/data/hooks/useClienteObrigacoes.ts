import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { v4 as uuid } from 'uuid'
import { format } from 'date-fns'
import { clienteObrigacaoRepo } from '@/data/repositories/localStorage/ClienteObrigacaoRepository'
import type { ClienteObrigacao } from '@/domain/types'

export function useClienteObrigacoes(tenantId: string, obrigacaoId: string) {
  return useQuery({
    queryKey: ['cliente-obrigacao', tenantId, obrigacaoId],
    queryFn: () => clienteObrigacaoRepo.findByObrigacao(tenantId, obrigacaoId),
    enabled: !!tenantId && !!obrigacaoId,
  })
}

export function useClienteObrigacoesPorCliente(tenantId: string, clienteId: string) {
  return useQuery({
    queryKey: ['cliente-obrigacao', 'cliente', tenantId, clienteId],
    queryFn: () => clienteObrigacaoRepo.findByCliente(tenantId, clienteId),
    enabled: !!tenantId && !!clienteId,
  })
}

export function useVincularCliente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      tenantId,
      clienteId,
      obrigacaoId,
      dataInicio,
    }: {
      tenantId: string
      clienteId: string
      obrigacaoId: string
      dataInicio?: string
    }) =>
      clienteObrigacaoRepo.create({
        id: uuid(),
        tenant_id: tenantId,
        cliente_id: clienteId,
        obrigacao_id: obrigacaoId,
        ativo: true,
        data_inicio: dataInicio ?? format(new Date(), 'yyyy-MM-dd'),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cliente-obrigacao'] }),
  })
}

export function useDesvincularCliente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      clienteObrigacaoRepo.update(id, { ativo: false, data_fim: format(new Date(), 'yyyy-MM-dd') }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cliente-obrigacao'] }),
  })
}

export function useVincularLote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      tenantId,
      clienteIds,
      obrigacaoId,
      existentes,
      dataInicio,
    }: {
      tenantId: string
      clienteIds: string[]
      obrigacaoId: string
      existentes: ClienteObrigacao[]
      dataInicio?: string
    }) => {
      const inicio = dataInicio ?? format(new Date(), 'yyyy-MM-dd')
      for (const clienteId of clienteIds) {
        const vinculo = existentes.find((v) => v.cliente_id === clienteId)
        if (!vinculo) {
          await clienteObrigacaoRepo.create({
            id: uuid(),
            tenant_id: tenantId,
            cliente_id: clienteId,
            obrigacao_id: obrigacaoId,
            ativo: true,
            data_inicio: inicio,
          })
        } else if (!vinculo.ativo) {
          await clienteObrigacaoRepo.update(vinculo.id, { ativo: true, data_inicio: inicio, data_fim: undefined })
        }
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cliente-obrigacao'] }),
  })
}

export function useDesvincularLote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const hoje = format(new Date(), 'yyyy-MM-dd')
      await Promise.all(ids.map((id) => clienteObrigacaoRepo.update(id, { ativo: false, data_fim: hoje })))
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cliente-obrigacao'] }),
  })
}
