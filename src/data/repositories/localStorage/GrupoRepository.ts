import type { Grupo } from '@/domain/types'
import { BaseLocalStorageRepository } from './BaseLocalStorageRepository'

export class LocalGrupoRepository extends BaseLocalStorageRepository<Grupo> {
  constructor() {
    super('grupos')
  }
}
