import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { clienteEnderecoRepo } from '@/data/repositories/localStorage'
import type { ClienteEndereco } from '@/domain/types'

export function useClienteEnderecos(tenantId: string, clienteId: string) {
  return useQuery({
    queryKey: ['cliente_enderecos', tenantId, clienteId],
    queryFn: () => clienteEnderecoRepo.findByCliente(tenantId, clienteId),
    enabled: !!tenantId && !!clienteId,
  })
}

export function useCreateClienteEndereco() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (endereco: ClienteEndereco) => clienteEnderecoRepo.create(endereco),
    onSuccess: (data) =>
      qc.invalidateQueries({ queryKey: ['cliente_enderecos', data.tenant_id, data.cliente_id] }),
  })
}

export function useUpdateClienteEndereco() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ClienteEndereco> }) =>
      clienteEnderecoRepo.update(id, data),
    onSuccess: (data) =>
      qc.invalidateQueries({ queryKey: ['cliente_enderecos', data.tenant_id, data.cliente_id] }),
  })
}

export function useDeleteClienteEndereco() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      tenantId,
      clienteId,
    }: {
      id: string
      tenantId: string
      clienteId: string
    }) => clienteEnderecoRepo.delete(id).then(() => ({ tenantId, clienteId })),
    onSuccess: ({ tenantId, clienteId }) =>
      qc.invalidateQueries({ queryKey: ['cliente_enderecos', tenantId, clienteId] }),
  })
}
