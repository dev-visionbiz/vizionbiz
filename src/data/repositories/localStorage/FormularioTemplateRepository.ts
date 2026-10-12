import { BaseLocalStorageRepository } from './BaseLocalStorageRepository'
import type { FormularioTemplate, FormularioResposta } from '@/domain/types'
import type {
  FormularioTemplateRepository as IFormularioTemplateRepository,
  FormularioRespostaRepository as IFormularioRespostaRepository,
} from '../interfaces'

export class LocalFormularioTemplateRepository
  extends BaseLocalStorageRepository<FormularioTemplate>
  implements IFormularioTemplateRepository
{
  constructor() {
    super('formularios_template')
  }

  async findAtivos(tenantId: string): Promise<FormularioTemplate[]> {
    return Promise.resolve(
      this.readAll().filter((t) => t.tenant_id === tenantId && t.ativo)
    )
  }
}

export class LocalFormularioRespostaRepository
  extends BaseLocalStorageRepository<FormularioResposta>
  implements IFormularioRespostaRepository
{
  constructor() {
    super('formularios_resposta')
  }

  async findByOcorrencia(ocorrenciaId: string): Promise<FormularioResposta[]> {
    return Promise.resolve(
      this.readAll().filter((r) => r.ocorrencia_id === ocorrenciaId)
    )
  }

  async findByCliente(tenantId: string, clienteId: string): Promise<FormularioResposta[]> {
    return Promise.resolve(
      this.readAll().filter((r) => r.tenant_id === tenantId && r.cliente_id === clienteId)
    )
  }

  async findByTemplate(tenantId: string, templateId: string): Promise<FormularioResposta[]> {
    return Promise.resolve(
      this.readAll()
        .filter((r) => r.tenant_id === tenantId && r.template_id === templateId)
        .sort((a, b) => b.criado_em.localeCompare(a.criado_em))
    )
  }
}

export const formularioTemplateRepo = new LocalFormularioTemplateRepository()
export const formularioRespostaRepo = new LocalFormularioRespostaRepository()
