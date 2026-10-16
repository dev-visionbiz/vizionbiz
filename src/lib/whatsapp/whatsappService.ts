const STORAGE_KEY = 'vb_whatsapp_url'
const ENV_URL = import.meta.env.VITE_WHATSAPP_API_URL ?? ''

function getBaseUrl(): string {
  return (localStorage.getItem(STORAGE_KEY) ?? '').trim() || ENV_URL
}

export type WhatsAppStatus = 'connected' | 'connecting' | 'disconnected'

export interface EnvioWhatsApp {
  escritorioId: string
  telefone: string
  mensagem: string
  thumbnail?: string | null
}

export interface WhatsAppStatusResponse {
  status: WhatsAppStatus
  phone: string | null
}

export const whatsappService = {
  getUrl(): string {
    return getBaseUrl()
  },

  setUrl(url: string): void {
    const normalizada = url.trim().replace(/\/+$/, '')
    if (normalizada) {
      localStorage.setItem(STORAGE_KEY, normalizada)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  },

  clearUrl(): void {
    localStorage.removeItem(STORAGE_KEY)
  },

  isUrlCustomizada(): boolean {
    return !!(localStorage.getItem(STORAGE_KEY) ?? '').trim()
  },

  async enviar({ escritorioId, telefone, mensagem, thumbnail }: EnvioWhatsApp): Promise<void> {
    const base = getBaseUrl()
    if (!base) throw new Error('URL do servidor WhatsApp não configurada.')

    const res = await fetch(`${base}/api/${escritorioId}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telefone, mensagem, thumbnail: thumbnail ?? null }),
    })

    const data = await res.json()
    if (!res.ok || data.status === 'erro') {
      throw new Error(data.mensagem ?? data.detalhe ?? 'Erro ao enviar mensagem.')
    }
  },

  async obterStatus(escritorioId: string): Promise<WhatsAppStatusResponse> {
    const base = getBaseUrl()
    if (!base) return { status: 'disconnected', phone: null }
    try {
      const res = await fetch(`${base}/api/${escritorioId}/status`)
      return await res.json()
    } catch {
      return { status: 'disconnected', phone: null }
    }
  },

  async obterQR(escritorioId: string): Promise<string | null> {
    const base = getBaseUrl()
    if (!base) return null
    try {
      const res = await fetch(`${base}/api/${escritorioId}/qr`)
      if (!res.ok) return null
      const data = await res.json()
      return data.qr ?? null
    } catch {
      return null
    }
  },

  async conectar(escritorioId: string): Promise<void> {
    const base = getBaseUrl()
    if (!base) throw new Error('URL do servidor WhatsApp não configurada.')
    await fetch(`${base}/api/${escritorioId}/connect`, { method: 'POST' })
  },

  async desconectar(escritorioId: string): Promise<void> {
    const base = getBaseUrl()
    if (!base) return
    await fetch(`${base}/api/${escritorioId}/disconnect`, { method: 'POST' })
  },

  async verificarConexao(escritorioId: string): Promise<boolean> {
    const { status } = await whatsappService.obterStatus(escritorioId)
    return status === 'connected'
  },
}
