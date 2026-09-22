import type { Renegotiation, Client, Tenant, RenegotiationSimulation } from '../types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function gerarTermoHTML(
  renegotiation: Renegotiation,
  simulation: RenegotiationSimulation,
  client: Client,
  tenant: Tenant
): string {
  const dataAtual = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
  const valorFmt = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Termo de Confissão e Renegociação de Dívida</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #333; }
    h1 { text-align: center; font-size: 18px; margin-bottom: 8px; }
    h2 { font-size: 14px; margin-top: 24px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
    p { line-height: 1.6; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 12px; }
    th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
    th { background: #f5f5f5; }
    .total { font-weight: bold; }
    .assinatura { margin-top: 60px; display: flex; justify-content: space-between; }
    .assinatura div { text-align: center; width: 45%; border-top: 1px solid #333; padding-top: 8px; font-size: 12px; }
    .hash { font-size: 10px; color: #999; margin-top: 24px; word-break: break-all; }
  </style>
</head>
<body>
  <h1>TERMO DE CONFISSÃO E RENEGOCIAÇÃO DE DÍVIDA</h1>
  <p style="text-align:center;font-size:12px;color:#666">${dataAtual}</p>

  <h2>1. PARTES</h2>
  <p><strong>Credor:</strong> ${tenant.nome} — CNPJ ${tenant.cnpj}</p>
  <p><strong>Devedor:</strong> ${client.razao_social} — CNPJ ${client.cnpj}</p>

  <h2>2. MEMÓRIA DE CÁLCULO</h2>
  <table>
    <thead>
      <tr><th>Fatura</th><th>Principal</th><th>Multa</th><th>Juros</th><th>Correção</th><th>Total</th></tr>
    </thead>
    <tbody>
      ${simulation.memoria.map((c) => `
        <tr>
          <td>${c.invoice_id}</td>
          <td>${valorFmt(c.valor_original)}</td>
          <td>${valorFmt(c.multa)}</td>
          <td>${valorFmt(c.juros)}</td>
          <td>${valorFmt(c.correcao)}</td>
          <td>${valorFmt(c.total)}</td>
        </tr>
      `).join('')}
    </tbody>
    <tfoot>
      <tr class="total">
        <td>TOTAIS</td>
        <td>${valorFmt(simulation.saldo_principal)}</td>
        <td>${valorFmt(simulation.multa)}</td>
        <td>${valorFmt(simulation.juros)}</td>
        <td>${valorFmt(simulation.correcao)}</td>
        <td>${valorFmt(simulation.saldo_principal + simulation.multa + simulation.juros + simulation.correcao)}</td>
      </tr>
    </tfoot>
  </table>

  <h2>3. CONDIÇÕES DO ACORDO</h2>
  <p>Encargo de renegociação: ${valorFmt(simulation.encargo)}</p>
  ${simulation.desconto_aplicado > 0 ? `<p>Desconto à vista concedido: (${valorFmt(simulation.desconto_aplicado)})</p>` : ''}
  <p><strong>Valor total acordado: ${valorFmt(simulation.total)}</strong></p>
  <p>Forma de pagamento: ${simulation.parcelas === 1 ? 'À Vista' : `${simulation.parcelas}x de ${valorFmt(simulation.valor_parcela)}`}</p>

  <h2>4. CLÁUSULAS</h2>
  <p>1. O devedor confessa dever ao credor o valor acima discriminado, resultante de honorários contábeis em atraso.</p>
  <p>2. O pagamento das parcelas na data acordada implica novação das dívidas originais, que ficam quitadas neste ato.</p>
  <p>3. O não pagamento de qualquer parcela no vencimento implicará vencimento antecipado do saldo devedor, acrescido de multa de 2% e juros de 1% a.m.</p>
  <p>4. O aceite eletrônico deste instrumento tem a mesma validade jurídica de assinatura física, nos termos da MP 2.200-2/2001 e Lei 14.063/2020.</p>

  <h2>5. ACEITE ELETRÔNICO</h2>
  <p>IP: ${renegotiation.aceite?.ip ?? 'N/A'} | Data/Hora: ${renegotiation.aceite?.em ? format(new Date(renegotiation.aceite.em), "dd/MM/yyyy 'às' HH:mm:ss") : 'Pendente'}</p>

  <div class="assinatura">
    <div>${tenant.nome}<br>CNPJ: ${tenant.cnpj}</div>
    <div>${client.razao_social}<br>CNPJ: ${client.cnpj}</div>
  </div>

  <p class="hash">Hash SHA-256 do documento: ${renegotiation.termo_hash || 'gerado após aceite'}</p>
</body>
</html>`
}
