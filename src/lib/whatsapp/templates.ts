import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { GuiaRecolhimento } from '@/domain/types'

const APP_URL = (import.meta.env.VITE_APP_URL ?? '').replace(/\/$/, '')

const TIPO_LABEL: Record<string, string> = {
  darf: 'DARF',
  das: 'DAS',
  dae: 'DAE',
  darf_simples: 'DARF Simples',
  fgts: 'FGTS',
  gnre: 'GNRE',
  iss: 'ISS',
  iptu: 'IPTU',
  boleto_prefeitura: 'Boleto Prefeitura',
  bombeiros: 'Bombeiros',
  vigilancia_sanitaria: 'Vigilância Sanitária',
  outro: 'Guia',
}

function formatarValor(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatarData(data: string) {
  try {
    return format(parseISO(data), 'dd/MM/yyyy', { locale: ptBR })
  } catch {
    return data
  }
}

export function templateGuia(guia: GuiaRecolhimento, nomeCliente: string): string {
  const tipo = TIPO_LABEL[guia.tipo] ?? 'Guia'
  const venc = formatarData(guia.vencimento)
  const valor = formatarValor(guia.valor)

  let msg = `Olá, ${nomeCliente}! 👋\n\n`
  msg += `Seu escritório de contabilidade informa:\n\n`
  msg += `📋 *${tipo}* — ${guia.descricao}\n`
  msg += `📅 Competência: ${guia.competencia}\n`
  msg += `💰 Valor: *${valor}*\n`
  msg += `⏰ Vencimento: *${venc}*\n`

  if (guia.pix_copia_cola) {
    msg += `\n💠 *PIX Copia e Cola:*\n${guia.pix_copia_cola}\n`
  }
  if (guia.linha_digitavel) {
    msg += `\n🔢 *Linha Digitável:*\n${guia.linha_digitavel}\n`
  }
  if (guia.codigo_barras && !guia.linha_digitavel) {
    msg += `\n🔢 *Código de Barras:*\n${guia.codigo_barras}\n`
  }

  if (APP_URL) {
    msg += `\n🔗 Acesse o portal:\n${APP_URL}/portal/guias`
  }

  msg += `\n\nEm caso de dúvidas, entre em contato conosco.`
  return msg
}

export function templateDocumento(nomeDocumento: string, nomeCliente: string): string {
  const link = APP_URL ? `\n\n🔗 Acesse o portal para baixar:\n${APP_URL}/portal/documentos` : ''

  return (
    `Olá, ${nomeCliente}! 👋\n\n` +
    `Seu escritório de contabilidade disponibilizou um novo documento:\n\n` +
    `📄 *${nomeDocumento}*` +
    link +
    `\n\nEm caso de dúvidas, entre em contato conosco.`
  )
}
