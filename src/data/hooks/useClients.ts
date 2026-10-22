import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { v4 as uuidv4 } from 'uuid'
import { clientRepo } from '@/data/repositories/clientesProvider'
import { folderRepo } from '@/data/repositories/documentosProvider'
import type { Client, FolderType } from '@/domain/types'
import { getPastasDefault } from '@/modulos/registry'

export function useClients(tenantId: string) {
  return useQuery({
    queryKey: ['clients', tenantId],
    queryFn: () => clientRepo.findAll(tenantId),
    enabled: !!tenantId,
  })
}

export function useClient(id: string) {
  return useQuery({
    queryKey: ['clients', 'detail', id],
    queryFn: () => clientRepo.findById(id),
    enabled: !!id,
  })
}

export function useCreateClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ client, modulos }: { client: Client; modulos?: string[] }) => {
      await clientRepo.create(client)
      const pastas = getPastasDefault(modulos)
      await Promise.all(
        pastas.map((f) =>
          folderRepo.create({
            id: uuidv4(),
            tenant_id: client.tenant_id,
            client_id: client.id,
            parent_id: null,
            nome: f.nome,
            tipo_padrao: f.tipo as FolderType,
            sistema: true,
          })
        )
      )
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clients'] })
      qc.invalidateQueries({ queryKey: ['folders'] })
    },
  })
}

export function useUpdateClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Client> }) => clientRepo.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }),
  })
}
