import type { ProvedorStorage } from './ProvedorStorage'
import { ProvedorLocalMock } from './provedores/ProvedorLocalMock'
import { ProvedorSupabase } from './provedores/ProvedorSupabase'
import { ProvedorGoogleDrive } from './provedores/ProvedorGoogleDrive'
import { LocalStorageConnectionRepository } from '@/data/repositories/localStorage/StorageConnectionRepository'

const connRepo = new LocalStorageConnectionRepository()

export async function obterProvedorStorage(escritorioId: string): Promise<ProvedorStorage> {
  const conn = await connRepo.buscarPorEscritorioId(escritorioId)

  if (!conn || conn.provider === 'local') return new ProvedorLocalMock()
  if (conn.provider === 'supabase') return new ProvedorSupabase()
  if (conn.provider === 'google_drive' && conn.status !== 'desconectado')
    return new ProvedorGoogleDrive(escritorioId)

  return new ProvedorLocalMock()
}
