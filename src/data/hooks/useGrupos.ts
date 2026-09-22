import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { LocalGrupoRepository, LocalGrupoEmpresaRepository } from '@/data/repositories/localStorage'
import type { Grupo, GrupoEmpresa } from '@/domain/types'

const grupoRepo = new LocalGrupoRepository()
const grupoEmpresaRepo = new LocalGrupoEmpresaRepository()

// --- Grupos ---

export function useGrupos(tenantId: string) {
  return useQuery({
    queryKey: ['grupos', tenantId],
    queryFn: () => grupoRepo.findAll(tenantId),
    enabled: !!tenantId,
  })
}

export function useGrupo(id: string) {
  return useQuery({
    queryKey: ['grupo', id],
    queryFn: () => grupoRepo.findById(id),
    enabled: !!id,
  })
}

export function useCreateGrupo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (item: Grupo) => grupoRepo.create(item),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['grupos', data.tenant_id] })
    },
  })
}

export function useUpdateGrupo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Grupo> }) =>
      grupoRepo.update(id, data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['grupos', data.tenant_id] })
      qc.invalidateQueries({ queryKey: ['grupo', data.id] })
    },
  })
}

export function useDeleteGrupo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, tenantId }: { id: string; tenantId: string }) =>
      grupoRepo.delete(id).then(() => tenantId),
    onSuccess: (tenantId) => {
      qc.invalidateQueries({ queryKey: ['grupos', tenantId] })
    },
  })
}

export function useAllGrupoEmpresas(tenantId: string) {
  return useQuery({
    queryKey: ['all-grupo-empresas', tenantId],
    queryFn: () => grupoEmpresaRepo.findAll(tenantId),
    enabled: !!tenantId,
  })
}

// --- GrupoEmpresa ---

export function useGrupoEmpresas(tenantId: string, grupoId: string) {
  return useQuery({
    queryKey: ['grupo-empresas', tenantId, grupoId],
    queryFn: () => grupoEmpresaRepo.findByGrupo(tenantId, grupoId),
    enabled: !!tenantId && !!grupoId,
  })
}

export function useEmpresaGrupos(tenantId: string, empresaId: string) {
  return useQuery({
    queryKey: ['empresa-grupos', tenantId, empresaId],
    queryFn: () => grupoEmpresaRepo.findByEmpresa(tenantId, empresaId),
    enabled: !!tenantId && !!empresaId,
  })
}

export function useCreateGrupoEmpresa() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (item: GrupoEmpresa) => grupoEmpresaRepo.create(item),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['grupo-empresas', data.tenant_id, data.grupo_id] })
      qc.invalidateQueries({ queryKey: ['empresa-grupos', data.tenant_id, data.empresa_id] })
    },
  })
}

export function useDeleteGrupoEmpresa() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, tenantId, grupoId, empresaId }: { id: string; tenantId: string; grupoId: string; empresaId: string }) =>
      grupoEmpresaRepo.delete(id).then(() => ({ tenantId, grupoId, empresaId })),
    onSuccess: ({ tenantId, grupoId, empresaId }) => {
      qc.invalidateQueries({ queryKey: ['grupo-empresas', tenantId, grupoId] })
      qc.invalidateQueries({ queryKey: ['empresa-grupos', tenantId, empresaId] })
    },
  })
}
