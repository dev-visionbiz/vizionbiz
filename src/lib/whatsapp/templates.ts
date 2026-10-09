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

function interpolar(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '')
}

// Variáveis disponíveis para o template de guia
export const VARS_GUIA = [
  { chave: '{{nomeCliente}}',      descricao: 'Nome do cliente' },
  { chave: '{{tipo}}',             descricao: 'Tipo da guia (ex.: DARF, DAS)' },
  { chave: '{{descricao}}',        descricao: 'Descrição da guia' },
  { chave: '{{competencia}}',      descricao: 'Mês de competência' },
  { chave: '{{valor}}',            descricao: 'Valor formatado' },
  { chave: '{{vencimento}}',       descricao: 'Data de vencimento' },
  { chave: '{{pixCopiaECola}}',    descricao: 'Bloco PIX Copia e Cola (omitido se vazio)' },
  { chave: '{{linhaDigitavel}}',   descricao: 'Bloco linha digitável (omitido se vazio)' },
  { chave: '{{codigoBarras}}',     descricao: 'Bloco código de barras (omitido se vazio)' },
  { chave: '{{linkPortal}}',       descricao: 'Link do portal (omitido se não configurado)' },
]

// Variáveis disponíveis para o template de documento
export const VARS_DOCUMENTO = [
  { chave: '{{nomeCliente}}',    descricao: 'Nome do cliente' },
  { chave: '{{nomeDocumento}}',  descricao: 'Nome do documento' },
  { chave: '{{linkPortal}}',     descricao: 'Link do portal (omitido se não configurado)' },
]

export const DEFAULT_TEMPLATE_GUIA =
  `Olá, {{nomeCliente}}! 👋\n\n` +
  `Seu escritório de contabilidade informa:\n\n` +
  `📋 *{{tipo}}* — {{descricao}}\n` +
  `📅 Competência: {{competencia}}\n` +
  `💰 Valor: *{{valor}}*\n` +
  `⏰ Vencimento: *{{vencimento}}*` +
  `{{pixCopiaECola}}` +
  `{{linhaDigitavel}}` +
  `{{codigoBarras}}` +
  `{{linkPortal}}` +
  `\n\nEm caso de dúvidas, entre em contato conosco.`

export const DEFAULT_TEMPLATE_DOCUMENTO =
  `Olá, {{nomeCliente}}! 👋\n\n` +
  `Seu escritório de contabilidade disponibilizou um novo documento:\n\n` +
  `📄 *{{nomeDocumento}}*` +
  `{{linkPortal}}` +
  `\n\nEm caso de dúvidas, entre em contato conosco.`

export function templateGuia(
  guia: GuiaRecolhimento,
  nomeCliente: string,
  templateCustom?: string,
): string {
  const tipo = TIPO_LABEL[guia.tipo] ?? 'Guia'
  const venc = formatarData(guia.vencimento)
  const valor = formatarValor(guia.valor)

  const pixBloco = guia.pix_copia_cola
    ? `\n\n💠 *PIX Copia e Cola:*\n${guia.pix_copia_cola}`
    : ''
  const linhaBloco = guia.linha_digitavel
    ? `\n\n🔢 *Linha Digitável:*\n${guia.linha_digitavel}`
    : ''
  const barrasBloco = guia.codigo_barras && !guia.linha_digitavel
    ? `\n\n🔢 *Código de Barras:*\n${guia.codigo_barras}`
    : ''
  const linkBloco = APP_URL
    ? `\n\n🔗 Acesse o portal:\n${APP_URL}/portal/guias`
    : ''

  return interpolar(templateCustom ?? DEFAULT_TEMPLATE_GUIA, {
    nomeCliente,
    tipo,
    descricao: guia.descricao,
    competencia: guia.competencia,
    valor,
    vencimento: venc,
    pixCopiaECola: pixBloco,
    linhaDigitavel: linhaBloco,
    codigoBarras: barrasBloco,
    linkPortal: linkBloco,
  })
}

export const DEFAULT_TEMPLATE_FORMULARIO_COLETA =
  `Olá, {{nomeCliente}}! 👋\n\n` +
  `Para darmos andamento ao processo de {{tipoProcesso}}, precisamos que você confirme e complete as suas informações.\n\n` +
  `📋 Acesse o formulário pelo link abaixo:\n{{linkFormulario}}\n\n` +
  `Você pode salvar o preenchimento e retornar depois. Quando estiver pronto, basta clicar em *Transmitir*.\n\n` +
  `Em caso de dúvidas, entre em contato conosco.`

export function templateFormularioColeta(
  nomeCliente: string,
  linkFormulario: string,
  tipo: 'abertura' | 'alteracao' = 'abertura',
): string {
  const tipoProcesso = tipo === 'abertura' ? 'abertura de empresa' : 'atualização de cadastro'
  return DEFAULT_TEMPLATE_FORMULARIO_COLETA
    .replace('{{nomeCliente}}', nomeCliente)
    .replace('{{tipoProcesso}}', tipoProcesso)
    .replace('{{linkFormulario}}', linkFormulario)
}

export function templateDocumento(
  nomeDocumento: string,
  nomeCliente: string,
  templateCustom?: string,
): string {
  const linkBloco = APP_URL
    ? `\n\n🔗 Acesse o portal para baixar:\n${APP_URL}/portal/documentos`
    : ''

  return interpolar(templateCustom ?? DEFAULT_TEMPLATE_DOCUMENTO, {
    nomeCliente,
    nomeDocumento,
    linkPortal: linkBloco,
  })
}
