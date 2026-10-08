const BASE_URL = import.meta.env.VITE_WHATSAPP_API_URL ?? ''

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
  async enviar({ escritorioId, telefone, mensagem, thumbnail }: EnvioWhatsApp): Promise<void> {
    if (!BASE_URL) throw new Error('VITE_WHATSAPP_API_URL não configurado.')

    const res = await fetch(`${BASE_URL}/api/${escritorioId}/send`, {
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
    if (!BASE_URL) return { status: 'disconnected', phone: null }
    try {
      const res = await fetch(`${BASE_URL}/api/${escritorioId}/status`)
      return await res.json()
    } catch {
      return { status: 'disconnected', phone: null }
    }
  },

  async obterQR(escritorioId: string): Promise<string | null> {
    if (!BASE_URL) return null
    try {
      const res = await fetch(`${BASE_URL}/api/${escritorioId}/qr`)
      if (!res.ok) return null
      const data = await res.json()
      return data.qr ?? null
    } catch {
      return null
    }
  },

  async conectar(escritorioId: string): Promise<void> {
    if (!BASE_URL) throw new Error('VITE_WHATSAPP_API_URL não configurado.')
    await fetch(`${BASE_URL}/api/${escritorioId}/connect`, { method: 'POST' })
  },

  async desconectar(escritorioId: string): Promise<void> {
    if (!BASE_URL) return
    await fetch(`${BASE_URL}/api/${escritorioId}/disconnect`, { method: 'POST' })
  },

  async verificarConexao(escritorioId: string): Promise<boolean> {
    const { status } = await whatsappService.obterStatus(escritorioId)
    return status === 'connected'
  },
}
