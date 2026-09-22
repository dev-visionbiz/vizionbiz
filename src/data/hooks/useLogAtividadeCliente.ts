import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { LocalLogAtividadeClienteRepository } from '@/data/repositories/localStorage'
import type { LogAtividadeAcao, LogAtividadeCliente } from '@/domain/types'
import { v4 as uuidv4 } from 'uuid'

const repo = new LocalLogAtividadeClienteRepository()

export function useLogAtividadeCliente(tenantId: string, clientId: string) {
  return useQuery({
    queryKey: ['log-atividade-cliente', tenantId, clientId],
    queryFn: () => repo.findByClient(tenantId, clientId),
    enabled: !!tenantId && !!clientId,
  })
}

export function useRegistrarLogAtividade() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (entry: {
      tenantId: string
      clientId: string
      acao: LogAtividadeAcao
      descricao: string
      usuarioId: string
      usuarioNome: string
    }) => {
      const log: LogAtividadeCliente = {
        id: uuidv4(),
        tenant_id: entry.tenantId,
        client_id: entry.clientId,
        acao: entry.acao,
        descricao: entry.descricao,
        usuario_id: entry.usuarioId,
        usuario_nome: entry.usuarioNome,
        em: new Date().toISOString(),
      }
      return repo.create(log)
    },
    onSuccess: (log) => {
      qc.invalidateQueries({ queryKey: ['log-atividade-cliente', log.tenant_id, log.client_id] })
    },
  })
}
