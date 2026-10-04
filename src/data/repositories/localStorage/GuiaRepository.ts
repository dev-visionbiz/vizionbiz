import { BaseLocalStorageRepository } from './BaseLocalStorageRepository'
import type { GuiaRecolhimentoRepository } from '@/data/repositories/interfaces'
import type { GuiaRecolhimento, GuiaStatus, TipoGuia } from '@/domain/types'

class LocalGuiaRecolhimentoRepository
  extends BaseLocalStorageRepository<GuiaRecolhimento>
  implements GuiaRecolhimentoRepository
{
  constructor() {
    super('guias')
  }

  async findByCliente(tenantId: string, clienteId: string): Promise<GuiaRecolhimento[]> {
    return this.readAll().filter(
      (g) => g.tenant_id === tenantId && g.cliente_id === clienteId && !g.deleted_at
    )
  }

  async findByStatus(tenantId: string, status: GuiaStatus): Promise<GuiaRecolhimento[]> {
    return this.readAll().filter(
      (g) => g.tenant_id === tenantId && g.status === status && !g.deleted_at
    )
  }

  async findByCompetencia(tenantId: string, competencia: string): Promise<GuiaRecolhimento[]> {
    return this.readAll().filter(
      (g) => g.tenant_id === tenantId && g.competencia === competencia && !g.deleted_at
    )
  }

  async findByTipo(tenantId: string, tipo: TipoGuia): Promise<GuiaRecolhimento[]> {
    return this.readAll().filter(
      (g) => g.tenant_id === tenantId && g.tipo === tipo && !g.deleted_at
    )
  }

  async findBySHA256(sha256: string): Promise<GuiaRecolhimento | null> {
    return this.readAll().find((g) => g.lote_arquivo_sha256 === sha256) ?? null
  }

  override async findAll(tenantId: string): Promise<GuiaRecolhimento[]> {
    return this.readAll().filter(
      (g) => g.tenant_id === tenantId && !g.deleted_at
    )
  }
}

export const guiaRepo = new LocalGuiaRecolhimentoRepository()
