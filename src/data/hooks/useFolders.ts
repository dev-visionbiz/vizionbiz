import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { folderRepo as repo } from '@/data/repositories/documentosProvider'
import type { Folder } from '@/domain/types'

export function useFolders(tenantId: string) {
  return useQuery({
    queryKey: ['folders', tenantId],
    queryFn: () => repo.findAll(tenantId),
    enabled: !!tenantId,
  })
}

export function useClientFolders(tenantId: string, clientId: string) {
  return useQuery({
    queryKey: ['folders', tenantId, clientId],
    queryFn: () => repo.findByClient(tenantId, clientId),
    enabled: !!tenantId && !!clientId,
  })
}

export function useCreateFolder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (folder: Folder) => repo.create(folder),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['folders'] }),
  })
}
