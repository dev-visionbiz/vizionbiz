import { LocalStorageStorage } from './LocalStorageStorage'
import type { StorageService } from './StorageService'

export type { StorageService }
export { LocalStorageStorage }

// Singleton para thumbnails (salvarThumbnail, obterThumbnail, excluirThumbnail).
// Upload/download de documentos deve usar obterProvedorStorage().
export const storageService: StorageService = new LocalStorageStorage()

export type { ProvedorStorage, DestinoEnvio, ResultadoEnvio } from './ProvedorStorage'
export { obterProvedorStorage } from './factory'
