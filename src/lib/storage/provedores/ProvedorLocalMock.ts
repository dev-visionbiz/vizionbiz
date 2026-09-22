import { v4 as uuidv4 } from 'uuid'
import type { DestinoEnvio, ProvedorStorage, ResultadoEnvio } from '../ProvedorStorage'

const PREFIX = 'vb_files_'
const MAX_FILE_SIZE = 2 * 1024 * 1024

async function sha256Hex(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const hash = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function buildKey(destino: DestinoEnvio, file: File): string {
  const ext = file.name.split('.').pop() ?? 'bin'
  return `${destino.escritorioId}/${destino.clienteId}/${destino.ano}/${uuidv4()}.${ext}`
}

export class ProvedorLocalMock implements ProvedorStorage {
  async enviar(arquivo: File, destino: DestinoEnvio): Promise<ResultadoEnvio> {
    if (arquivo.size > MAX_FILE_SIZE) {
      throw new Error(
        `Arquivo muito grande (${(arquivo.size / 1024 / 1024).toFixed(1)} MB). Limite: 2 MB.`,
      )
    }

    const key = buildKey(destino, arquivo)
    const sha256 = await sha256Hex(arquivo)

    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string
        try {
          localStorage.setItem(`${PREFIX}${key}`, dataUrl)
          resolve({
            provider_file_id: key,
            sha256,
            tamanho_bytes: arquivo.size,
            mime_type: arquivo.type || 'application/octet-stream',
          })
        } catch {
          reject(new Error('Armazenamento local cheio. Remova arquivos antigos e tente novamente.'))
        }
      }
      reader.onerror = () => reject(new Error('Falha ao ler o arquivo.'))
      reader.readAsDataURL(arquivo)
    })
  }

  async baixar(providerFileId: string): Promise<string> {
    const dataUrl = localStorage.getItem(`${PREFIX}${providerFileId}`)
    if (!dataUrl) throw new Error('Arquivo não encontrado.')
    return dataUrl
  }

  async excluir(providerFileId: string): Promise<void> {
    localStorage.removeItem(`${PREFIX}${providerFileId}`)
  }

  async garantirPasta(_caminho: string[]): Promise<string> {
    return _caminho.join('/')
  }

  async testarConexao(): Promise<{ ok: boolean; mensagem?: string }> {
    return { ok: true, mensagem: 'Armazenamento local ativo.' }
  }
}
