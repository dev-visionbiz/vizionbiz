import { describe, it, expect } from 'vitest'
import { podeBaixar } from '../src/domain/documentos/podeBaixar'
import type { Document, DocumentType, BillingPolicy, Invoice } from '../src/domain/types'

const doc: Document = {
  id: 'd1', tenant_id: 't1', client_id: 'c1', folder_id: 'f1',
  type_id: 'dt1', nome: 'balancete.pdf', competencia: '2025-07',
  versao: 1, storage_key: 'd1', tamanho: 1000, mime: 'application/pdf',
  criado_por: 'u1', criado_em: '2025-07-01T00:00:00Z',
}

const tipoEssencial: DocumentType = { id: 'dt1', tenant_id: 't1', nome: 'Guia', essencial: true }
const tipoNaoEssencial: DocumentType = { id: 'dt2', tenant_id: 't1', nome: 'Balancete', essencial: false }

const policy = (modo: 'informativo' | 'parcial' | 'total'): BillingPolicy => ({
  id: 'p1', tenant_id: 't1', multa_pct: 2, juros_mes_pct: 1,
  indice_correcao: 'nenhum', carencia_dias: 3,
  encargo_renegociacao_tipo: 'nenhum', encargo_renegociacao_valor: 0,
  encargo_teto: 0, parcelas_max: 12, desconto_avista_encargos_pct: 0,
  modo_acesso: modo,
})

const faturasVencidas: Invoice[] = [{
  id: 'inv-1', tenant_id: 't1', client_id: 'c1',
  competencia: '2025-06', vencimento: '2025-06-10',
  valor_original: 1000, status: 'vencida', origem: 'contrato',
}]

describe('podeBaixar', () => {
  it('sem pendência: sempre permite', () => {
    const result = podeBaixar(doc, tipoNaoEssencial, [], policy('parcial'))
    expect(result.permitido).toBe(true)
  })

  it('modo informativo: permite mesmo com pendência', () => {
    const result = podeBaixar(doc, tipoNaoEssencial, faturasVencidas, policy('informativo'))
    expect(result.permitido).toBe(true)
    expect(result.motivo).toBe('informativo')
  })

  it('modo parcial: tipo essencial liberado com pendência', () => {
    const result = podeBaixar(doc, tipoEssencial, faturasVencidas, policy('parcial'))
    expect(result.permitido).toBe(true)
    expect(result.motivo).toBe('tipo_essencial_liberado')
  })

  it('modo parcial: tipo não-essencial bloqueado com pendência', () => {
    const result = podeBaixar(doc, tipoNaoEssencial, faturasVencidas, policy('parcial'))
    expect(result.permitido).toBe(false)
    expect(result.motivo).toBe('pendencia_financeira')
  })

  it('modo total: tipo essencial liberado', () => {
    const result = podeBaixar(doc, tipoEssencial, faturasVencidas, policy('total'))
    expect(result.permitido).toBe(true)
  })

  it('modo total: tipo não-essencial bloqueado', () => {
    const result = podeBaixar(doc, tipoNaoEssencial, faturasVencidas, policy('total'))
    expect(result.permitido).toBe(false)
  })
})
