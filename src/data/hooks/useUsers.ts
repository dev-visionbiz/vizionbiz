import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { LocalUserRepository } from '@/data/repositories/localStorage'
import type { User } from '@/domain/types'

const repo = new LocalUserRepository()

export function useUsers(tenantId: string, includeInactive = false) {
  return useQuery({
    queryKey: ['users', tenantId, includeInactive],
    queryFn: () => repo.findAll(tenantId, { includeInactive }),
    enabled: !!tenantId,
  })
}

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (user: User) => repo.create(user),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<User> }) =>
      repo.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function useDeactivateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => repo.update(id, { ativo: false }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function useActivateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => repo.update(id, { ativo: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}
