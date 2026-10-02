import { BaseLocalStorageRepository } from './BaseLocalStorageRepository'
import type { OcorrenciaDocumento } from '@/domain/types'
import type { OcorrenciaDocumentoRepository as IOcorrenciaDocumentoRepository } from '../interfaces'

export class LocalOcorrenciaDocumentoRepository
  extends BaseLocalStorageRepository<OcorrenciaDocumento>
  implements IOcorrenciaDocumentoRepository
{
  constructor() {
    super('ocorrencia_documentos')
  }

  async findByOcorrencia(tenantId: string, ocorrenciaId: string): Promise<OcorrenciaDocumento[]> {
    return Promise.resolve(
      this.readAll().filter(
        (d) => d.tenant_id === tenantId && d.ocorrencia_id === ocorrenciaId
      )
    )
  }

  async findByTarefa(tenantId: string, tarefaId: string): Promise<OcorrenciaDocumento[]> {
    return Promise.resolve(
      this.readAll().filter(
        (d) => d.tenant_id === tenantId && d.tarefa_id === tarefaId
      )
    )
  }

  async findByCliente(tenantId: string, clienteId: string): Promise<OcorrenciaDocumento[]> {
    return Promise.resolve(
      this.readAll().filter(
        (d) => d.tenant_id === tenantId && d.client_id === clienteId
      )
    )
  }

  async findByDocument(documentId: string): Promise<OcorrenciaDocumento[]> {
    return Promise.resolve(
      this.readAll().filter((d) => d.document_id === documentId)
    )
  }
}

export const ocorrenciaDocumentoRepo = new LocalOcorrenciaDocumentoRepository()
