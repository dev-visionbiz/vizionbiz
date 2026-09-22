import { describe, it, expect } from 'vitest'
import { simularRenegociacao } from '../src/domain/financeiro/simularRenegociacao'
import type { Invoice, BillingPolicy } from '../src/domain/types'

const policy: BillingPolicy = {
  id: 'p1',
  tenant_id: 't1',
  multa_pct: 2,
  juros_mes_pct: 1,
  indice_correcao: 'nenhum',
  carencia_dias: 3,
  encargo_renegociacao_tipo: 'pct',
  encargo_renegociacao_valor: 5,
  encargo_teto: 500,
  parcelas_max: 12,
  desconto_avista_encargos_pct: 10,
  modo_acesso: 'parcial',
}

const inv1: Invoice = {
  id: 'inv-1', tenant_id: 't1', client_id: 'c1',
  competencia: '2025-06', vencimento: '2025-06-10',
  valor_original: 1000, status: 'vencida', origem: 'contrato',
}
const inv2: Invoice = {
  id: 'inv-2', tenant_id: 't1', client_id: 'c1',
  competencia: '2025-07', vencimento: '2025-07-10',
  valor_original: 1000, status: 'vencida', origem: 'contrato',
}
const hoje = new Date('2025-08-09') // ~30 dias após inv2, ~60 após inv1

describe('simularRenegociacao', () => {
  it('consolida duas faturas corretamente', () => {
    const result = simularRenegociacao([inv1, inv2], policy, 1, hoje)
    expect(result.saldo_principal).toBe(2000)
    expect(result.invoice_ids).toHaveLength(2)
  })

  it('desconto à vista aplicado só sobre encargos', () => {
    const result = simularRenegociacao([inv1, inv2], policy, 0, hoje)
    expect(result.desconto_aplicado).toBeGreaterThan(0)
    // Total deve ser menor que sem desconto
    const semDesconto = simularRenegociacao([inv1, inv2], policy, 1, hoje)
    expect(result.total).toBeLessThan(semDesconto.total)
  })

  it('desconto à vista nunca reduz o principal', () => {
    const result = simularRenegociacao([inv1, inv2], policy, 0, hoje)
    expect(result.total).toBeGreaterThanOrEqual(result.saldo_principal)
  })

  it('parcelado divide o total', () => {
    const result = simularRenegociacao([inv1, inv2], policy, 6, hoje)
    expect(result.parcelas).toBe(6)
    expect(result.valor_parcela).toBeCloseTo(result.total / 6, 2)
  })

  it('ignora fatura com origem = renegociacao', () => {
    const invReneg: Invoice = { ...inv1, id: 'inv-3', origem: 'renegociacao' }
    const result = simularRenegociacao([inv1, invReneg], policy, 1, hoje)
    expect(result.invoice_ids).not.toContain('inv-3')
    expect(result.saldo_principal).toBe(1000)
  })

  it('encargo com teto', () => {
    const policyTeto = { ...policy, encargo_renegociacao_tipo: 'pct' as const, encargo_renegociacao_valor: 50, encargo_teto: 100 }
    const result = simularRenegociacao([inv1, inv2], policyTeto, 1, hoje)
    expect(result.encargo).toBeLessThanOrEqual(100)
  })
})
