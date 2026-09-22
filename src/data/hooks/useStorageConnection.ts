import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { LocalStorageConnectionRepository } from '@/data/repositories/localStorage/StorageConnectionRepository'
import type { StorageConnection } from '@/domain/types'

const repo = new LocalStorageConnectionRepository()

export function useStorageConnection(escritorioId: string) {
  return useQuery({
    queryKey: ['storage-connection', escritorioId],
    queryFn: () => repo.buscarPorEscritorioId(escritorioId),
    enabled: !!escritorioId,
  })
}

export function useSalvarStorageConnection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (conn: StorageConnection) => repo.salvar(conn),
    onSuccess: (_data, conn) => {
      qc.invalidateQueries({ queryKey: ['storage-connection', conn.escritorio_id] })
    },
  })
}

export function useRemoverStorageConnection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (escritorioId: string) => repo.remover(escritorioId),
    onSuccess: (_data, escritorioId) => {
      qc.invalidateQueries({ queryKey: ['storage-connection', escritorioId] })
    },
  })
}
