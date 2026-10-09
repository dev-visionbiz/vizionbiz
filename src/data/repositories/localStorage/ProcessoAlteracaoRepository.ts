import { BaseLocalStorageRepository } from './BaseLocalStorageRepository'
import type { ProcessoAlteracao } from '@/domain/types'

export class LocalProcessoAlteracaoRepository extends BaseLocalStorageRepository<ProcessoAlteracao> {
  constructor() {
    super('processos_alteracao')
  }

  async findByCliente(tenantId: string, clienteId: string): Promise<ProcessoAlteracao[]> {
    return Promise.resolve(
      this.readAll().filter((p) => p.tenant_id === tenantId && p.client_id === clienteId)
    )
  }

  async findAtivos(tenantId: string): Promise<ProcessoAlteracao[]> {
    return Promise.resolve(
      this.readAll().filter(
        (p) => p.tenant_id === tenantId && p.status !== 'concluido' && p.status !== 'cancelado'
      )
    )
  }

  async findByToken(token: string): Promise<ProcessoAlteracao | null> {
    const item = this.readAll().find((p) => p.formulario_token === token)
    return Promise.resolve(item ?? null)
  }
}

export const processoAlteracaoRepo = new LocalProcessoAlteracaoRepository()
