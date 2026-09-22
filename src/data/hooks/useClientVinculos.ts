import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { LocalClientVinculoRepository } from '@/data/repositories/localStorage'
import { LocalClientRepository } from '@/data/repositories/localStorage'
import type { Client, ClientVinculo } from '@/domain/types'

const vinculoRepo = new LocalClientVinculoRepository()
const clientRepo = new LocalClientRepository()

export function useAllClientVinculos(tenantId: string) {
  return useQuery({
    queryKey: ['all-client-vinculos', tenantId],
    queryFn: () => vinculoRepo.findAll(tenantId),
    enabled: !!tenantId,
  })
}

export function useVinculosPJ(tenantId: string, pjId: string) {
  return useQuery({
    queryKey: ['client-vinculos-pj', tenantId, pjId],
    queryFn: () => vinculoRepo.findByPJ(tenantId, pjId),
    enabled: !!tenantId && !!pjId,
  })
}

export function useVinculosPF(tenantId: string, pfId: string) {
  return useQuery({
    queryKey: ['client-vinculos-pf', tenantId, pfId],
    queryFn: () => vinculoRepo.findByPF(tenantId, pfId),
    enabled: !!tenantId && !!pfId,
  })
}

export function useCreateClientVinculo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (item: ClientVinculo) => vinculoRepo.create(item),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['client-vinculos-pj', data.tenant_id, data.client_pj_id] })
      qc.invalidateQueries({ queryKey: ['client-vinculos-pf', data.tenant_id, data.client_pf_id] })
      qc.invalidateQueries({ queryKey: ['pfs-de-empresa', data.tenant_id, data.client_pj_id] })
      qc.invalidateQueries({ queryKey: ['empresas-de-pf', data.tenant_id, data.client_pf_id] })
    },
  })
}

export function useUpdateClientVinculo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ClientVinculo> }) =>
      vinculoRepo.update(id, data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['client-vinculos-pj', data.tenant_id, data.client_pj_id] })
      qc.invalidateQueries({ queryKey: ['client-vinculos-pf', data.tenant_id, data.client_pf_id] })
      qc.invalidateQueries({ queryKey: ['pfs-de-empresa', data.tenant_id, data.client_pj_id] })
      qc.invalidateQueries({ queryKey: ['empresas-de-pf', data.tenant_id, data.client_pf_id] })
    },
  })
}

export function useDeleteClientVinculo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, tenantId, pjId, pfId }: { id: string; tenantId: string; pjId: string; pfId: string }) =>
      vinculoRepo.delete(id).then(() => ({ tenantId, pjId, pfId })),
    onSuccess: ({ tenantId, pjId, pfId }) => {
      qc.invalidateQueries({ queryKey: ['client-vinculos-pj', tenantId, pjId] })
      qc.invalidateQueries({ queryKey: ['client-vinculos-pf', tenantId, pfId] })
      qc.invalidateQueries({ queryKey: ['pfs-de-empresa', tenantId, pjId] })
      qc.invalidateQueries({ queryKey: ['empresas-de-pf', tenantId, pfId] })
    },
  })
}

export type PFComVinculo = ClientVinculo & { clientePF: Client }
export type EmpresaComVinculo = ClientVinculo & { empresa: Client }

export function usePFsDeEmpresa(tenantId: string, pjId: string) {
  return useQuery({
    queryKey: ['pfs-de-empresa', tenantId, pjId],
    queryFn: async (): Promise<PFComVinculo[]> => {
      const vinculos = await vinculoRepo.findByPJ(tenantId, pjId)
      const todosClientes = await clientRepo.findAll(tenantId)
      const clienteMap = new Map(todosClientes.map((c) => [c.id, c]))
      return vinculos
        .map((v) => ({ ...v, clientePF: clienteMap.get(v.client_pf_id)! }))
        .filter((v) => v.clientePF)
    },
    enabled: !!tenantId && !!pjId,
  })
}

export function useEmpresasDePF(tenantId: string, pfId: string) {
  return useQuery({
    queryKey: ['empresas-de-pf', tenantId, pfId],
    queryFn: async (): Promise<EmpresaComVinculo[]> => {
      const vinculos = await vinculoRepo.findByPF(tenantId, pfId)
      const todosClientes = await clientRepo.findAll(tenantId)
      const clienteMap = new Map(todosClientes.map((c) => [c.id, c]))
      return vinculos
        .map((v) => ({ ...v, empresa: clienteMap.get(v.client_pj_id)! }))
        .filter((v) => v.empresa)
    },
    enabled: !!tenantId && !!pfId,
  })
}
