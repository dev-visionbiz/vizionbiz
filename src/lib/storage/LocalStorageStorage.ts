import { v4 as uuidv4 } from 'uuid'
import type { StorageService } from './StorageService'

const MAX_FILE_SIZE = 2 * 1024 * 1024

async function sha256Hex(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const hash = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function buildKey(escritorioId: string, clienteId: string, file: File): string {
  const ano = new Date().getFullYear()
  const ext = file.name.split('.').pop() ?? 'bin'
  return `${escritorioId}/${clienteId}/${ano}/${uuidv4()}.${ext}`
}

export class LocalStorageStorage implements StorageService {
  private readonly prefix = 'vb_files_'

  async salvar(
    arquivo: File,
    destino: { escritorioId: string; clienteId: string },
  ): Promise<{ key: string; sha256: string; tamanho: number }> {
    if (arquivo.size > MAX_FILE_SIZE) {
      throw new Error(
        `Arquivo muito grande (${(arquivo.size / 1024 / 1024).toFixed(1)} MB). Limite: 2 MB.`,
      )
    }

    const key = buildKey(destino.escritorioId, destino.clienteId, arquivo)
    const sha256 = await sha256Hex(arquivo)
    const prefix = this.prefix

    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string
        try {
          localStorage.setItem(`${prefix}${key}`, dataUrl)
          resolve({ key, sha256, tamanho: arquivo.size })
        } catch {
          reject(new Error('Armazenamento local cheio. Remova arquivos antigos e tente novamente.'))
        }
      }
      reader.onerror = () => reject(new Error('Falha ao ler o arquivo.'))
      reader.readAsDataURL(arquivo)
    })
  }

  async gerarUrlDownload(key: string, _expiraEmSegundos: number): Promise<string> {
    const dataUrl = localStorage.getItem(`${this.prefix}${key}`)
    if (!dataUrl) throw new Error('Arquivo não encontrado.')
    return dataUrl
  }

  async excluir(key: string): Promise<void> {
    localStorage.removeItem(`${this.prefix}${key}`)
  }

  async existe(key: string): Promise<boolean> {
    return localStorage.getItem(`${this.prefix}${key}`) !== null
  }

  async salvarThumbnail(storageKey: string, dataUrl: string): Promise<void> {
    try {
      localStorage.setItem(`${this.prefix}${storageKey}_thumb`, dataUrl)
    } catch {
      // localStorage cheio — thumbnail é opcional, não propaga erro
    }
  }

  async obterThumbnail(storageKey: string): Promise<string | null> {
    return localStorage.getItem(`${this.prefix}${storageKey}_thumb`)
  }

  async excluirThumbnail(storageKey: string): Promise<void> {
    localStorage.removeItem(`${this.prefix}${storageKey}_thumb`)
  }
}
