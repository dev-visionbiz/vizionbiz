import type { EmpresaPessoa } from '@/domain/types'
import { BaseLocalStorageRepository } from './BaseLocalStorageRepository'

export class LocalEmpresaPessoaRepository extends BaseLocalStorageRepository<EmpresaPessoa> {
  constructor() {
    super('empresa_pessoas')
  }

  async findByEmpresa(tenantId: string, empresaId: string): Promise<EmpresaPessoa[]> {
    return (await this.findAll(tenantId)).filter((ep) => ep.empresa_id === empresaId)
  }

  async findByPessoa(tenantId: string, pessoaId: string): Promise<EmpresaPessoa[]> {
    return (await this.findAll(tenantId)).filter((ep) => ep.pessoa_id === pessoaId)
  }
}
