import { differenceInDays } from 'date-fns'
import type { Invoice, BillingPolicy, ChargeCalculation } from '../types'

// Índice IPCA mock: 0.4% ao mês
const IPCA_MENSAL = 0.004

export function calcularEncargos(
  invoice: Invoice,
  policy: BillingPolicy,
  hoje: Date
): ChargeCalculation {
  const vencimento = new Date(invoice.vencimento + 'T00:00:00')
  const diasAtraso = differenceInDays(hoje, vencimento)
  const memoria: ChargeCalculation['memoria'] = []

  // Dentro da carência: sem encargo
  if (diasAtraso <= policy.carencia_dias) {
    return {
      invoice_id: invoice.id,
      valor_original: invoice.valor_original,
      dias_atraso: diasAtraso,
      dentro_carencia: true,
      multa: 0,
      juros: 0,
      correcao: 0,
      total: invoice.valor_original,
      memoria: [{
        descricao: 'Dentro do prazo de carência',
        base: invoice.valor_original,
        taxa: 0,
        dias: diasAtraso,
        valor: 0,
      }],
    }
  }

  // Multa: única vez sobre valor_original
  const multaValor = invoice.valor_original * (policy.multa_pct / 100)
  memoria.push({
    descricao: `Multa (${policy.multa_pct}%)`,
    base: invoice.valor_original,
    taxa: policy.multa_pct / 100,
    dias: 0,
    valor: multaValor,
  })

  // Juros simples pro rata die: juros_mes_pct / 30 por dia
  const taxaDiaria = policy.juros_mes_pct / 100 / 30
  const jurosValor = invoice.valor_original * taxaDiaria * diasAtraso
  memoria.push({
    descricao: `Juros simples (${policy.juros_mes_pct}% a.m. pro rata die)`,
    base: invoice.valor_original,
    taxa: taxaDiaria,
    dias: diasAtraso,
    valor: jurosValor,
  })

  // Correção monetária IPCA pro rata die
  let correcaoValor = 0
  if (policy.indice_correcao === 'ipca') {
    const taxaIpcaDiaria = IPCA_MENSAL / 30
    correcaoValor = invoice.valor_original * taxaIpcaDiaria * diasAtraso
    memoria.push({
      descricao: 'Correção IPCA (mock 0,4% a.m. pro rata die)',
      base: invoice.valor_original,
      taxa: taxaIpcaDiaria,
      dias: diasAtraso,
      valor: correcaoValor,
    })
  }

  const total = invoice.valor_original + multaValor + jurosValor + correcaoValor

  return {
    invoice_id: invoice.id,
    valor_original: invoice.valor_original,
    dias_atraso: diasAtraso,
    dentro_carencia: false,
    multa: multaValor,
    juros: jurosValor,
    correcao: correcaoValor,
    total,
    memoria,
  }
}
