import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { v4 as uuid } from 'uuid'
import { format } from 'date-fns'
import { guiaRepo } from '@/data/repositories/localStorage/GuiaRepository'
import type { GuiaRecolhimento, GuiaStatus, TipoGuia, SegundaViaStatus } from '@/domain/types'

export interface FiltrosGuia {
  tipo?: TipoGuia
  status?: GuiaStatus
  clienteId?: string
  competencia?: string
  busca?: string
}

function aplicarFiltros(guias: GuiaRecolhimento[], filtros: FiltrosGuia): GuiaRecolhimento[] {
  return guias.filter((g) => {
    if (filtros.tipo && g.tipo !== filtros.tipo) return false
    if (filtros.status && g.status !== filtros.status) return false
    if (filtros.clienteId && g.cliente_id !== filtros.clienteId) return false
    if (filtros.competencia && g.competencia !== filtros.competencia) return false
    if (filtros.busca) {
      const q = filtros.busca.toLowerCase()
      const match =
        g.descricao.toLowerCase().includes(q) ||
        g.numero_documento?.toLowerCase().includes(q) ||
        g.codigo_barras?.includes(q) ||
        g.linha_digitavel?.includes(q)
      if (!match) return false
    }
    return true
  })
}

export function derivarStatusGuia(g: GuiaRecolhimento): GuiaRecolhimento {
  if (g.status === 'paga' || g.status === 'cancelada' || g.status === 'aguardando_emissao') return g
  const hoje = format(new Date(), 'yyyy-MM-dd')
  if (g.status === 'emitida' && g.vencimento < hoje) {
    return { ...g, status: 'vencida' as GuiaStatus }
  }
  return g
}

export function useGuias(tenantId: string, filtros?: FiltrosGuia) {
  return useQuery({
    queryKey: ['guias', tenantId, filtros],
    queryFn: async () => {
      const all = await guiaRepo.findAll(tenantId)
      const derivadas = all.map(derivarStatusGuia)
      return filtros ? aplicarFiltros(derivadas, filtros) : derivadas
    },
    enabled: !!tenantId,
  })
}

export function useGuia(id: string) {
  return useQuery({
    queryKey: ['guia', id],
    queryFn: () => guiaRepo.findById(id),
    enabled: !!id,
  })
}

export function useGuiasByCliente(tenantId: string, clienteId: string) {
  return useQuery({
    queryKey: ['guias', tenantId, 'cliente', clienteId],
    queryFn: async () => {
      const guias = await guiaRepo.findByCliente(tenantId, clienteId)
      return guias.map(derivarStatusGuia)
    },
    enabled: !!tenantId && !!clienteId,
  })
}

export function useCreateGuia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<GuiaRecolhimento, 'id'>) =>
      guiaRepo.create({ ...data, id: uuid() }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['guias'] }),
  })
}

export function useUpdateGuia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<GuiaRecolhimento> }) =>
      guiaRepo.update(id, { ...data, atualizado_em: format(new Date(), 'yyyy-MM-dd') }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['guias'] })
      qc.invalidateQueries({ queryKey: ['guia', id] })
    },
  })
}

export function useBaixarGuia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      pago_em,
      pago_valor,
      pago_por,
      comprovante_storage_key,
      observacoes,
    }: {
      id: string
      pago_em: string
      pago_valor: number
      pago_por: string
      comprovante_storage_key?: string
      observacoes?: string
    }) => {
      return guiaRepo.update(id, {
        status: 'paga',
        pago_em,
        pago_valor,
        pago_por,
        comprovante_storage_key,
        observacoes,
        atualizado_em: format(new Date(), 'yyyy-MM-dd'),
      })
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['guias'] })
      qc.invalidateQueries({ queryKey: ['guia', id] })
    },
  })
}

export function useSolicitarSegundaVia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      return guiaRepo.update(id, {
        segunda_via_status: 'solicitada' as SegundaViaStatus,
        segunda_via_solicitada_em: format(new Date(), 'yyyy-MM-dd'),
        atualizado_em: format(new Date(), 'yyyy-MM-dd'),
      })
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['guias'] })
      qc.invalidateQueries({ queryKey: ['guia', id] })
    },
  })
}

export function useDisponibilizarSegundaVia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, arquivo_key }: { id: string; arquivo_key: string }) => {
      return guiaRepo.update(id, {
        segunda_via_status: 'disponivel' as SegundaViaStatus,
        segunda_via_arquivo_key: arquivo_key,
        atualizado_em: format(new Date(), 'yyyy-MM-dd'),
      })
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['guias'] })
      qc.invalidateQueries({ queryKey: ['guia', id] })
    },
  })
}

export function useEnviarComprovanteGuia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, comprovante_storage_key }: { id: string; comprovante_storage_key: string }) => {
      return guiaRepo.update(id, {
        comprovante_storage_key,
        atualizado_em: format(new Date(), 'yyyy-MM-dd'),
      })
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['guias'] })
      qc.invalidateQueries({ queryKey: ['guia', id] })
    },
  })
}

export function useCancelarGuia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      guiaRepo.update(id, {
        status: 'cancelada',
        atualizado_em: format(new Date(), 'yyyy-MM-dd'),
      }),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['guias'] })
      qc.invalidateQueries({ queryKey: ['guia', id] })
    },
  })
}
