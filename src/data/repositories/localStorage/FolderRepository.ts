import { BaseLocalStorageRepository } from './BaseLocalStorageRepository'
import type { Folder } from '@/domain/types'
import type { FolderRepository as IFolderRepository } from '../interfaces'

export class LocalFolderRepository
  extends BaseLocalStorageRepository<Folder>
  implements IFolderRepository
{
  constructor() {
    super('folders')
  }

  async findByClient(tenantId: string, clientId: string): Promise<Folder[]> {
    return Promise.resolve(
      this.readAll().filter((f) => f.tenant_id === tenantId && f.client_id === clientId)
    )
  }

  async findChildren(parentId: string): Promise<Folder[]> {
    return Promise.resolve(this.readAll().filter((f) => f.parent_id === parentId))
  }
}
