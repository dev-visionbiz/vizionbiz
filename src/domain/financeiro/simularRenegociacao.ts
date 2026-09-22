import type { Invoice, BillingPolicy, RenegotiationSimulation } from '../types'
import { calcularEncargos } from './calcularEncargos'

export function simularRenegociacao(
  invoices: Invoice[],
  policy: BillingPolicy,
  parcelas: number, // 0 = à vista
  hoje: Date = new Date()
): RenegotiationSimulation {
  // Nunca renegociar fatura já renegociada
  const elegíveis = invoices.filter((inv) => inv.origem !== 'renegociacao' && inv.status !== 'renegociada')

  const memoriaCalculos = elegíveis.map((inv) => calcularEncargos(inv, policy, hoje))

  const saldoPrincipal = memoriaCalculos.reduce((sum, c) => sum + c.valor_original, 0)
  const totalMulta = memoriaCalculos.reduce((sum, c) => sum + c.multa, 0)
  const totalJuros = memoriaCalculos.reduce((sum, c) => sum + c.juros, 0)
  const totalCorrecao = memoriaCalculos.reduce((sum, c) => sum + c.correcao, 0)

  // Encargo de renegociação: uma única vez sobre todo o acordo
  let encargo = 0
  if (policy.encargo_renegociacao_tipo === 'fixo') {
    encargo = policy.encargo_renegociacao_valor
  } else if (policy.encargo_renegociacao_tipo === 'pct') {
    const base = saldoPrincipal + totalMulta + totalJuros + totalCorrecao
    encargo = base * (policy.encargo_renegociacao_valor / 100)
  }
  if (policy.encargo_teto > 0) {
    encargo = Math.min(encargo, policy.encargo_teto)
  }

  const totalSemDesconto = saldoPrincipal + totalMulta + totalJuros + totalCorrecao + encargo

  let desconto = 0
  let total = totalSemDesconto

  if (parcelas === 0) {
    // À vista: desconto apenas sobre encargos (multa + juros + correção + encargo_reneg)
    const totalEncargos = totalMulta + totalJuros + totalCorrecao + encargo
    desconto = totalEncargos * (policy.desconto_avista_encargos_pct / 100)
    total = totalSemDesconto - desconto
  }

  const valorParcela = parcelas > 0 ? total / parcelas : total

  return {
    invoice_ids: elegíveis.map((i) => i.id),
    saldo_principal: saldoPrincipal,
    multa: totalMulta,
    juros: totalJuros,
    correcao: totalCorrecao,
    encargo,
    desconto_aplicado: desconto,
    total,
    parcelas: parcelas === 0 ? 1 : parcelas,
    valor_parcela: valorParcela,
    memoria: memoriaCalculos,
  }
}
