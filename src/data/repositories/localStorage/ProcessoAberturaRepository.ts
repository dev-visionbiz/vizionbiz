import { BaseLocalStorageRepository } from './BaseLocalStorageRepository'
import type { ProcessoAbertura } from '@/domain/types'

export class LocalProcessoAberturaRepository extends BaseLocalStorageRepository<ProcessoAbertura> {
  constructor() {
    super('processos_abertura')
  }

  async findByCliente(tenantId: string, clienteId: string): Promise<ProcessoAbertura | null> {
    const all = this.readAll().filter(
      (p) => p.tenant_id === tenantId && p.client_id === clienteId
    )
    return Promise.resolve(all[0] ?? null)
  }

  async findAtivos(tenantId: string): Promise<ProcessoAbertura[]> {
    return Promise.resolve(
      this.readAll().filter(
        (p) => p.tenant_id === tenantId && p.status !== 'concluido' && p.status !== 'cancelado'
      )
    )
  }

  async findByToken(token: string): Promise<ProcessoAbertura | null> {
    const item = this.readAll().find((p) => p.formulario_token === token)
    return Promise.resolve(item ?? null)
  }
}

export const processoAberturaRepo = new LocalProcessoAberturaRepository()
