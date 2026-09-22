import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { LocalPessoaRepository, LocalEmpresaPessoaRepository } from '@/data/repositories/localStorage'
import type { Pessoa, EmpresaPessoa } from '@/domain/types'

const pessoaRepo = new LocalPessoaRepository()
const empPessoaRepo = new LocalEmpresaPessoaRepository()

// --- Pessoas ---

export function usePessoas(tenantId: string) {
  return useQuery({
    queryKey: ['pessoas', tenantId],
    queryFn: () => pessoaRepo.findAll(tenantId),
    enabled: !!tenantId,
  })
}

export function usePessoa(id: string) {
  return useQuery({
    queryKey: ['pessoa', id],
    queryFn: () => pessoaRepo.findById(id),
    enabled: !!id,
  })
}

export function useCreatePessoa() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (item: Pessoa) => pessoaRepo.create(item),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['pessoas', data.tenant_id] })
    },
  })
}

export function useUpdatePessoa() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Pessoa> }) =>
      pessoaRepo.update(id, data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['pessoas', data.tenant_id] })
      qc.invalidateQueries({ queryKey: ['pessoa', data.id] })
    },
  })
}

export function useDeletePessoa() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, tenantId }: { id: string; tenantId: string }) =>
      pessoaRepo.delete(id).then(() => tenantId),
    onSuccess: (tenantId) => {
      qc.invalidateQueries({ queryKey: ['pessoas', tenantId] })
    },
  })
}

export function useAllEmpresaPessoas(tenantId: string) {
  return useQuery({
    queryKey: ['all-empresa-pessoas', tenantId],
    queryFn: () => empPessoaRepo.findAll(tenantId),
    enabled: !!tenantId,
  })
}

// --- EmpresaPessoa ---

export function useEmpresaPessoas(tenantId: string, empresaId: string) {
  return useQuery({
    queryKey: ['empresa-pessoas', tenantId, empresaId],
    queryFn: () => empPessoaRepo.findByEmpresa(tenantId, empresaId),
    enabled: !!tenantId && !!empresaId,
  })
}

export function usePessoaEmpresas(tenantId: string, pessoaId: string) {
  return useQuery({
    queryKey: ['pessoa-empresas', tenantId, pessoaId],
    queryFn: () => empPessoaRepo.findByPessoa(tenantId, pessoaId),
    enabled: !!tenantId && !!pessoaId,
  })
}

export function useCreateEmpresaPessoa() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (item: EmpresaPessoa) => empPessoaRepo.create(item),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['empresa-pessoas', data.tenant_id, data.empresa_id] })
      qc.invalidateQueries({ queryKey: ['pessoa-empresas', data.tenant_id, data.pessoa_id] })
      qc.invalidateQueries({ queryKey: ['client-contatos', data.tenant_id, data.empresa_id] })
    },
  })
}

export function useUpdateEmpresaPessoa() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<EmpresaPessoa> }) =>
      empPessoaRepo.update(id, data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['empresa-pessoas', data.tenant_id, data.empresa_id] })
      qc.invalidateQueries({ queryKey: ['client-contatos', data.tenant_id, data.empresa_id] })
    },
  })
}

export function useDeleteEmpresaPessoa() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, tenantId, empresaId }: { id: string; tenantId: string; empresaId: string }) =>
      empPessoaRepo.delete(id).then(() => ({ tenantId, empresaId })),
    onSuccess: ({ tenantId, empresaId }) => {
      qc.invalidateQueries({ queryKey: ['empresa-pessoas', tenantId, empresaId] })
      qc.invalidateQueries({ queryKey: ['client-contatos', tenantId, empresaId] })
    },
  })
}

// --- Hook combinado: pessoas vinculadas a uma empresa com dados completos ---

export type ContatoComPessoa = EmpresaPessoa & { pessoa: Pessoa }

export function useClientContatos(tenantId: string, clientId: string) {
  return useQuery({
    queryKey: ['client-contatos', tenantId, clientId],
    queryFn: async (): Promise<ContatoComPessoa[]> => {
      const vinculos = await empPessoaRepo.findByEmpresa(tenantId, clientId)
      const todasPessoas = await pessoaRepo.findAll(tenantId)
      const pessoaMap = new Map(todasPessoas.map((p) => [p.id, p]))
      return vinculos
        .map((v) => ({ ...v, pessoa: pessoaMap.get(v.pessoa_id)! }))
        .filter((v) => v.pessoa)
    },
    enabled: !!tenantId && !!clientId,
  })
}
