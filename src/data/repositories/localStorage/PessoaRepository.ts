import type { Pessoa } from '@/domain/types'
import { BaseLocalStorageRepository } from './BaseLocalStorageRepository'

export class LocalPessoaRepository extends BaseLocalStorageRepository<Pessoa> {
  constructor() {
    super('pessoas')
  }
}
