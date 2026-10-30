import { BaseLocalStorageRepository } from './BaseLocalStorageRepository'
import type { ObrigacaoConfig, ObrigacaoLancamento } from '@/domain/types'

export class LocalObrigacaoConfigRepository extends BaseLocalStorageRepository<ObrigacaoConfig> {
  constructor() {
    super('obrigacao_configs')
  }

  async findByCliente(tenantId: string, clienteId: string): Promise<ObrigacaoConfig[]> {
    return this.readAll().filter(
      (c) => c.tenant_id === tenantId && c.client_id === clienteId
    )
  }

  async findAtivos(tenantId: string): Promise<ObrigacaoConfig[]> {
    return this.readAll().filter(
      (c) => c.tenant_id === tenantId && c.ativo === true
    )
  }
}

export const obrigacaoConfigRepo = new LocalObrigacaoConfigRepository()

export class LocalObrigacaoLancamentoRepository extends BaseLocalStorageRepository<ObrigacaoLancamento> {
  constructor() {
    super('obrigacao_lancamentos')
  }

  async findByCliente(tenantId: string, clienteId: string): Promise<ObrigacaoLancamento[]> {
    return this.readAll().filter(
      (l) => l.tenant_id === tenantId && l.client_id === clienteId
    )
  }

  async findByCompetencia(tenantId: string, competencia: string): Promise<ObrigacaoLancamento[]> {
    return this.readAll().filter(
      (l) => l.tenant_id === tenantId && l.competencia === competencia
    )
  }

  async findByClienteCompetencia(
    tenantId: string,
    clienteId: string,
    competencia: string
  ): Promise<ObrigacaoLancamento[]> {
    return this.readAll().filter(
      (l) => l.tenant_id === tenantId && l.client_id === clienteId && l.competencia === competencia
    )
  }
}

export const obrigacaoLancamentoRepo = new LocalObrigacaoLancamentoRepository()
