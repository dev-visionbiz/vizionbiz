import type { GrupoEmpresa } from '@/domain/types'
import { BaseLocalStorageRepository } from './BaseLocalStorageRepository'

export class LocalGrupoEmpresaRepository extends BaseLocalStorageRepository<GrupoEmpresa> {
  constructor() {
    super('grupo_empresas')
  }

  async findByGrupo(tenantId: string, grupoId: string): Promise<GrupoEmpresa[]> {
    return (await this.findAll(tenantId)).filter((ge) => ge.grupo_id === grupoId)
  }

  async findByEmpresa(tenantId: string, empresaId: string): Promise<GrupoEmpresa[]> {
    return (await this.findAll(tenantId)).filter((ge) => ge.empresa_id === empresaId)
  }
}
