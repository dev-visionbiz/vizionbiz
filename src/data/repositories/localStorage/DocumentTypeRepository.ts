import { BaseLocalStorageRepository } from './BaseLocalStorageRepository'
import type { DocumentType } from '@/domain/types'
import type { DocumentTypeRepository as IDocumentTypeRepository } from '../interfaces'

export class LocalDocumentTypeRepository
  extends BaseLocalStorageRepository<DocumentType>
  implements IDocumentTypeRepository {
  constructor() {
    super('document_types')
  }
}
