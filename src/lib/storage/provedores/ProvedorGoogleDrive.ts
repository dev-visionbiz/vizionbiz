import type { DestinoEnvio, ProvedorStorage, ResultadoEnvio } from '../ProvedorStorage'

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? ''
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? ''

function edgeFn(path: string): string {
  return `${SUPABASE_URL}/functions/v1/${path}`
}

function baseHeaders(escritorioId: string): Record<string, string> {
  return {
    apikey: SUPABASE_ANON_KEY,
    'x-escritorio-id': escritorioId,
  }
}

async function sha256Hex(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const hash = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export class ProvedorGoogleDrive implements ProvedorStorage {
  constructor(private readonly escritorioId: string) {}

  async enviar(arquivo: File, destino: DestinoEnvio): Promise<ResultadoEnvio> {
    const res = await fetch(edgeFn('storage-upload'), {
      method: 'POST',
      headers: {
        ...baseHeaders(this.escritorioId),
        'x-nome-cliente': destino.nomeCliente,
        'x-ano': String(destino.ano),
        'x-tipo-doc': destino.tipoDoc,
        'x-filename': arquivo.name,
        'content-type': arquivo.type || 'application/octet-stream',
        'content-length': String(arquivo.size),
      },
      body: arquivo,
      // @ts-expect-error — necessário para streaming em alguns ambientes
      duplex: 'half',
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText })) as { error?: string }
      throw new Error(err.error ?? 'Erro no upload para o Google Drive')
    }

    const data = await res.json() as { provider_file_id: string }
    const sha256 = await sha256Hex(arquivo)

    return {
      provider_file_id: data.provider_file_id,
      sha256,
      tamanho_bytes: arquivo.size,
      mime_type: arquivo.type || 'application/octet-stream',
    }
  }

  async baixar(providerFileId: string): Promise<string> {
    const res = await fetch(
      `${edgeFn('storage-download')}?file_id=${encodeURIComponent(providerFileId)}`,
      { headers: baseHeaders(this.escritorioId) },
    )

    if (res.status === 404) {
      const body = await res.json().catch(() => ({})) as { error?: string }
      if (body.error === 'arquivo_ausente') throw new Error('arquivo_ausente')
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText })) as { error?: string }
      throw new Error(err.error ?? 'Erro no download')
    }

    const blob = await res.blob()
    // Cria URL temporária; o chamador deve chamar URL.revokeObjectURL() após uso
    return URL.createObjectURL(blob)
  }

  async excluir(providerFileId: string): Promise<void> {
    const res = await fetch(edgeFn('storage-upload'), {
      method: 'DELETE',
      headers: { ...baseHeaders(this.escritorioId), 'content-type': 'application/json' },
      body: JSON.stringify({ provider_file_id: providerFileId }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText })) as { error?: string }
      throw new Error(err.error ?? 'Erro ao excluir arquivo no Drive')
    }
  }

  // Pastas são criadas automaticamente dentro de storage-upload.
  async garantirPasta(_caminho: string[]): Promise<string> {
    return ''
  }

  async testarConexao(): Promise<{ ok: boolean; mensagem?: string }> {
    try {
      const res = await fetch(`${edgeFn('storage-download')}?action=test`, {
        headers: baseHeaders(this.escritorioId),
      })
      const data = await res.json() as { ok?: boolean }
      return data.ok
        ? { ok: true, mensagem: 'Google Drive conectado.' }
        : { ok: false, mensagem: 'Falha ao verificar conexão com Google Drive.' }
    } catch {
      return { ok: false, mensagem: 'Não foi possível verificar a conexão.' }
    }
  }
}
