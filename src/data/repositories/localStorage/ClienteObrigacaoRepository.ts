import { BaseLocalStorageRepository } from './BaseLocalStorageRepository'
import type { ClienteObrigacao } from '@/domain/types'
import type { ClienteObrigacaoRepository as IClienteObrigacaoRepository } from '../interfaces'

export class LocalClienteObrigacaoRepository
  extends BaseLocalStorageRepository<ClienteObrigacao>
  implements IClienteObrigacaoRepository
{
  constructor() {
    super('cliente_obrigacao')
  }

  async findByCliente(tenantId: string, clienteId: string): Promise<ClienteObrigacao[]> {
    return Promise.resolve(
      this.readAll().filter((c) => c.tenant_id === tenantId && c.cliente_id === clienteId)
    )
  }

  async findByObrigacao(tenantId: string, obrigacaoId: string): Promise<ClienteObrigacao[]> {
    return Promise.resolve(
      this.readAll().filter((c) => c.tenant_id === tenantId && c.obrigacao_id === obrigacaoId)
    )
  }

  async findAtivos(tenantId: string, obrigacaoId: string): Promise<ClienteObrigacao[]> {
    return Promise.resolve(
      this.readAll().filter(
        (c) => c.tenant_id === tenantId && c.obrigacao_id === obrigacaoId && c.ativo
      )
    )
  }
}

export const clienteObrigacaoRepo = new LocalClienteObrigacaoRepository()
