import type { Document, DocumentType, BillingPolicy, Invoice } from '../types'

export type PodeBaixarMotivo =
  | 'pendencia_financeira'
  | 'tipo_essencial_liberado'
  | 'informativo'
  | 'sem_pendencia'
  | 'cobranca_pendente'

export interface PodeBaixarResult {
  permitido: boolean
  motivo?: PodeBaixarMotivo
  mensagem?: string
  invoice_id?: string
}

export function podeBaixar(
  document: Document,
  documentType: DocumentType,
  invoicesVencidas: Invoice[],
  policy: BillingPolicy,
  allInvoices: Invoice[] = []
): PodeBaixarResult {
  // Verifica gate de cobrança vinculada ao documento
  if (document.invoice_id && document.download_apos_pagamento) {
    const inv = allInvoices.find((i) => i.id === document.invoice_id)
    if (!inv || inv.status !== 'paga') {
      return {
        permitido: false,
        motivo: 'cobranca_pendente',
        mensagem: 'Este documento só pode ser baixado após o pagamento da cobrança vinculada.',
        invoice_id: document.invoice_id,
      }
    }
  }

  const temPendencia = invoicesVencidas.length > 0

  if (!temPendencia) {
    return { permitido: true, motivo: 'sem_pendencia' }
  }

  switch (policy.modo_acesso) {
    case 'informativo':
      return {
        permitido: true,
        motivo: 'informativo',
        mensagem: 'Você possui faturas em aberto. Regularize para manter o acesso.',
      }

    case 'parcial':
      if (documentType.essencial) {
        return {
          permitido: true,
          motivo: 'tipo_essencial_liberado',
          mensagem: 'Documento essencial liberado mesmo com pendência financeira.',
        }
      }
      return {
        permitido: false,
        motivo: 'pendencia_financeira',
        mensagem: 'Regularize suas faturas em aberto para acessar este documento.',
      }

    case 'total':
      if (documentType.essencial) {
        return {
          permitido: true,
          motivo: 'tipo_essencial_liberado',
        }
      }
      return {
        permitido: false,
        motivo: 'pendencia_financeira',
        mensagem: 'Acesso bloqueado por inadimplência. Entre em contato com o escritório.',
      }

    default:
      return { permitido: true, motivo: 'sem_pendencia' }
  }
}
