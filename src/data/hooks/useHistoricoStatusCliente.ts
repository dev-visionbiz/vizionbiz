import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { LocalHistoricoStatusClienteRepository, LocalClientRepository } from '@/data/repositories/localStorage'
import type { ClientStatus, HistoricoStatusCliente } from '@/domain/types'
import { v4 as uuidv4 } from 'uuid'

const histRepo = new LocalHistoricoStatusClienteRepository()
const clientRepo = new LocalClientRepository()

export function useHistoricoStatusCliente(tenantId: string, clientId: string) {
  return useQuery({
    queryKey: ['historico-status-cliente', tenantId, clientId],
    queryFn: () => histRepo.findByClient(tenantId, clientId),
    enabled: !!tenantId && !!clientId,
  })
}

export function useAlterarStatusCliente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      tenantId,
      clientId,
      novoStatus,
      motivo,
      alteradoPor,
    }: {
      tenantId: string
      clientId: string
      novoStatus: ClientStatus
      motivo: string
      alteradoPor: string
    }) => {
      const registro: HistoricoStatusCliente = {
        id: uuidv4(),
        tenant_id: tenantId,
        client_id: clientId,
        status: novoStatus,
        motivo,
        alterado_por: alteradoPor,
        data: new Date().toISOString(),
      }
      await histRepo.create(registro)
      await clientRepo.update(clientId, { status: novoStatus })
      return registro
    },
    onSuccess: (registro) => {
      qc.invalidateQueries({ queryKey: ['clients'] })
      qc.invalidateQueries({ queryKey: ['historico-status-cliente', registro.tenant_id, registro.client_id] })
    },
  })
}
