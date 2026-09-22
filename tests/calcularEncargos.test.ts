import { describe, it, expect } from 'vitest'
import { calcularEncargos } from '../src/domain/financeiro/calcularEncargos'
import type { Invoice, BillingPolicy } from '../src/domain/types'

const policy: BillingPolicy = {
  id: 'p1',
  tenant_id: 't1',
  multa_pct: 2,
  juros_mes_pct: 1,
  indice_correcao: 'ipca',
  carencia_dias: 3,
  encargo_renegociacao_tipo: 'pct',
  encargo_renegociacao_valor: 5,
  encargo_teto: 500,
  parcelas_max: 12,
  desconto_avista_encargos_pct: 10,
  modo_acesso: 'parcial',
}

const invoice: Invoice = {
  id: 'inv-1',
  tenant_id: 't1',
  client_id: 'c1',
  competencia: '2025-07',
  vencimento: '2025-07-10',
  valor_original: 1000,
  status: 'vencida',
  origem: 'contrato',
}

describe('calcularEncargos', () => {
  it('dentro da carência: sem encargos', () => {
    const hoje = new Date('2025-07-12') // 2 dias após vencimento
    const result = calcularEncargos(invoice, policy, hoje)
    expect(result.dentro_carencia).toBe(true)
    expect(result.multa).toBe(0)
    expect(result.juros).toBe(0)
    expect(result.total).toBe(1000)
  })

  it('multa de 2% após carência', () => {
    const hoje = new Date('2025-07-20') // 10 dias depois
    const result = calcularEncargos(invoice, policy, hoje)
    expect(result.dentro_carencia).toBe(false)
    expect(result.multa).toBeCloseTo(20, 2) // 2% de 1000
  })

  it('multa de 10%', () => {
    const policy10 = { ...policy, multa_pct: 10 }
    const hoje = new Date('2025-07-20')
    const result = calcularEncargos(invoice, policy10, hoje)
    expect(result.multa).toBeCloseTo(100, 2) // 10% de 1000
  })

  it('juros pro rata die: 30 dias', () => {
    const hoje = new Date('2025-08-10') // 30 dias depois (2025-07-10 + 30)
    const result = calcularEncargos(invoice, policy, hoje)
    // 1% a.m. / 30 dias * 30 dias = 1% = 10
    expect(result.juros).toBeCloseTo(10, 1)
  })

  it('juros pro rata die: 15 dias', () => {
    const hoje = new Date('2025-07-26') // 15 dias depois (2025-07-10 + 15 + 1 para TZ)
    const result = calcularEncargos(invoice, policy, hoje)
    // 1% a.m. / 30 * 15 = 0.5% = 5
    expect(result.juros).toBeCloseTo(5, 1)
  })

  it('sem correção quando indice = nenhum', () => {
    const policySemCorrecao = { ...policy, indice_correcao: 'nenhum' as const }
    const hoje = new Date('2025-07-20')
    const result = calcularEncargos(invoice, policySemCorrecao, hoje)
    expect(result.correcao).toBe(0)
  })

  it('retorna memória de cálculo com linhas detalhadas', () => {
    const hoje = new Date('2025-07-20')
    const result = calcularEncargos(invoice, policy, hoje)
    expect(result.memoria.length).toBeGreaterThan(0)
    expect(result.memoria[0]).toHaveProperty('descricao')
    expect(result.memoria[0]).toHaveProperty('valor')
  })
})
