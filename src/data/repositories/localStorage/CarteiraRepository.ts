import type { Carteira } from '@/domain/types'
import { BaseLocalStorageRepository } from './BaseLocalStorageRepository'

export class LocalCarteiraRepository extends BaseLocalStorageRepository<Carteira> {
  constructor() {
    super('carteiras')
  }
}
