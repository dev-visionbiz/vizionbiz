import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  LocalFichaBlocoRepository,
  LocalFichaCampoRepository,
} from '@/data/repositories/localStorage'
import type { FichaBloco, FichaCampo } from '@/domain/types'

const blocoRepo = new LocalFichaBlocoRepository()
const campoRepo = new LocalFichaCampoRepository()

// ---- Blocos ----

export function useFichaBlocos(tenantId: string, clientId: string) {
  return useQuery({
    queryKey: ['ficha_blocos', tenantId, clientId],
    queryFn: () => blocoRepo.findByClient(tenantId, clientId),
    enabled: !!tenantId && !!clientId,
  })
}

export function useCreateFichaBloco() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (bloco: FichaBloco) => blocoRepo.create(bloco),
    onSuccess: (data) =>
      qc.invalidateQueries({ queryKey: ['ficha_blocos', data.tenant_id, data.client_id] }),
  })
}

export function useUpdateFichaBloco() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FichaBloco> }) =>
      blocoRepo.update(id, data),
    onSuccess: (data) =>
      qc.invalidateQueries({ queryKey: ['ficha_blocos', data.tenant_id, data.client_id] }),
  })
}

export function useDeleteFichaBloco() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      tenantId,
      clientId,
    }: {
      id: string
      tenantId: string
      clientId: string
    }) => {
      await campoRepo.deleteByBloco(id)
      await blocoRepo.delete(id)
      return { tenantId, clientId, blocoId: id }
    },
    onSuccess: ({ tenantId, clientId, blocoId }) => {
      qc.invalidateQueries({ queryKey: ['ficha_blocos', tenantId, clientId] })
      qc.invalidateQueries({ queryKey: ['ficha_campos', tenantId, blocoId] })
    },
  })
}

// ---- Campos ----

export function useFichaCampos(tenantId: string, blocoId: string) {
  return useQuery({
    queryKey: ['ficha_campos', tenantId, blocoId],
    queryFn: () => campoRepo.findByBloco(tenantId, blocoId),
    enabled: !!tenantId && !!blocoId,
  })
}

export function useCreateFichaCampo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (campo: FichaCampo) => campoRepo.create(campo),
    onSuccess: (data) =>
      qc.invalidateQueries({ queryKey: ['ficha_campos', data.tenant_id, data.bloco_id] }),
  })
}

export function useUpdateFichaCampo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FichaCampo> }) =>
      campoRepo.update(id, data),
    onSuccess: (data) =>
      qc.invalidateQueries({ queryKey: ['ficha_campos', data.tenant_id, data.bloco_id] }),
  })
}

export function useDeleteFichaCampo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      tenantId,
      blocoId,
    }: {
      id: string
      tenantId: string
      blocoId: string
    }) =>
      campoRepo.delete(id).then(() => ({ tenantId, blocoId })),
    onSuccess: ({ tenantId, blocoId }) =>
      qc.invalidateQueries({ queryKey: ['ficha_campos', tenantId, blocoId] }),
  })
}
