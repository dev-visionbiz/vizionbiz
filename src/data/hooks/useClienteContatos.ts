import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { clienteContatoRepo } from '@/data/repositories/localStorage'
import type { ClienteContato } from '@/domain/types'

export function useClienteContatos(tenantId: string, clienteId: string) {
  return useQuery({
    queryKey: ['cliente_contatos', tenantId, clienteId],
    queryFn: () => clienteContatoRepo.findByCliente(tenantId, clienteId),
    enabled: !!tenantId && !!clienteId,
  })
}

export function useCreateClienteContato() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (contato: ClienteContato) => clienteContatoRepo.create(contato),
    onSuccess: (data) =>
      qc.invalidateQueries({ queryKey: ['cliente_contatos', data.tenant_id, data.cliente_id] }),
  })
}

export function useUpdateClienteContato() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ClienteContato> }) =>
      clienteContatoRepo.update(id, data),
    onSuccess: (data) =>
      qc.invalidateQueries({ queryKey: ['cliente_contatos', data.tenant_id, data.cliente_id] }),
  })
}

export function useDeleteClienteContato() {
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
    }) => clienteContatoRepo.delete(id).then(() => ({ tenantId, clienteId })),
    onSuccess: ({ tenantId, clienteId }) =>
      qc.invalidateQueries({ queryKey: ['cliente_contatos', tenantId, clienteId] }),
  })
}
