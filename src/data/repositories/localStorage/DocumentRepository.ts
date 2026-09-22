import { BaseLocalStorageRepository } from './BaseLocalStorageRepository'
import type { Document } from '@/domain/types'
import type { DocumentRepository as IDocumentRepository } from '../interfaces'

export class LocalDocumentRepository
  extends BaseLocalStorageRepository<Document>
  implements IDocumentRepository
{
  constructor() {
    super('documents')
  }

  async findByClient(tenantId: string, clientId: string): Promise<Document[]> {
    return Promise.resolve(
      this.readAll().filter((d) => d.tenant_id === tenantId && d.client_id === clientId)
    )
  }

  async findByFolder(folderId: string): Promise<Document[]> {
    return Promise.resolve(this.readAll().filter((d) => d.folder_id === folderId))
  }

  async findByCompetencia(tenantId: string, competencia: string): Promise<Document[]> {
    return Promise.resolve(
      this.readAll().filter((d) => d.tenant_id === tenantId && d.competencia === competencia)
    )
  }
}
