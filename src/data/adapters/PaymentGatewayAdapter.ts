export interface PixPayment {
  qrCode: string
  copiaCola: string
  expiresAt: string
  gatewayRef: string
}

export interface BoletoPayment {
  barcode: string
  linhaDigitavel: string
  url: string
  expiresAt: string
  gatewayRef: string
}

export interface WebhookResult {
  status: 'paid'
  paidAt: string
  gatewayRef: string
}

export interface PaymentGatewayAdapter {
  createPixPayment(invoiceId: string, valor: number): Promise<PixPayment>
  createBoletoPayment(invoiceId: string, valor: number): Promise<BoletoPayment>
  simulateWebhook(gatewayRef: string): Promise<WebhookResult>
}

function randomRef(): string {
  return Math.random().toString(36).substring(2, 18).toUpperCase()
}

export class MockGateway implements PaymentGatewayAdapter {
  async createPixPayment(invoiceId: string, valor: number): Promise<PixPayment> {
    const ref = `PIX${randomRef()}`
    const valorFmt = valor.toFixed(2).replace('.', '')
    const copiaCola = `00020126580014BR.GOV.BCB.PIX0136${ref}5204000053039865406${valorFmt}5802BR5920VizionBiz Pagamentos6009SAO PAULO62070503***6304ABCD`

    return Promise.resolve({
      qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(copiaCola)}`,
      copiaCola,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      gatewayRef: ref,
    })
  }

  async createBoletoPayment(_invoiceId: string, valor: number): Promise<BoletoPayment> {
    const ref = `BOL${randomRef()}`
    // Linha digitável fake no formato padrão
    const linhaDigitavel = `10499.39304 14200.063401 18002.950000 1 ${new Date().getFullYear()}0001${Math.floor(valor * 100).toString().padStart(10, '0')}`

    return Promise.resolve({
      barcode: ref,
      linhaDigitavel,
      url: `https://boleto.fake/${ref}`,
      expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      gatewayRef: ref,
    })
  }

  async simulateWebhook(gatewayRef: string): Promise<WebhookResult> {
    await new Promise((r) => setTimeout(r, 1200)) // simula latência
    return Promise.resolve({
      status: 'paid',
      paidAt: new Date().toISOString(),
      gatewayRef,
    })
  }
}
