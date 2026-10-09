import type { Client, Pessoa, ClienteEndereco } from '@/domain/types'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type SecaoFormulario = 'empresa' | 'socio' | 'endereco'
export type TipoCampo = 'text' | 'email' | 'tel' | 'date' | 'cpf' | 'cep' | 'select'

export interface CampoConfig {
  key: string
  label: string
  tipo: TipoCampo
  secao: SecaoFormulario
  obrigatorio?: boolean
  opcoes?: { value: string; label: string }[]
}

const UF_OPCOES = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA',
  'MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN',
  'RS','RO','RR','SC','SP','SE','TO',
].map((uf) => ({ value: uf, label: uf }))

// ─── Catálogo completo de campos disponíveis ──────────────────────────────────

export const CAMPOS_CONFIG: CampoConfig[] = [
  // Empresa
  { key: 'empresa.razao_social',  label: 'Nome / Razão Social',      tipo: 'text',   secao: 'empresa', obrigatorio: true },
  { key: 'empresa.fantasia',      label: 'Nome Fantasia',             tipo: 'text',   secao: 'empresa' },
  { key: 'empresa.email',         label: 'E-mail',                    tipo: 'email',  secao: 'empresa' },
  { key: 'empresa.telefone',      label: 'Telefone / WhatsApp',       tipo: 'tel',    secao: 'empresa' },
  { key: 'empresa.regime',        label: 'Regime Tributário',         tipo: 'select', secao: 'empresa',
    opcoes: [
      { value: 'Simples Nacional', label: 'Simples Nacional' },
      { value: 'Lucro Presumido',  label: 'Lucro Presumido' },
      { value: 'Lucro Real',       label: 'Lucro Real' },
      { value: 'MEI',              label: 'MEI' },
    ],
  },
  // Sócio principal
  { key: 'socio.nome',             label: 'Nome completo',         tipo: 'text',   secao: 'socio', obrigatorio: true },
  { key: 'socio.cpf',              label: 'CPF',                   tipo: 'cpf',    secao: 'socio' },
  { key: 'socio.rg',               label: 'RG',                    tipo: 'text',   secao: 'socio' },
  { key: 'socio.data_nascimento',  label: 'Data de Nascimento',    tipo: 'date',   secao: 'socio' },
  { key: 'socio.email',            label: 'E-mail',                tipo: 'email',  secao: 'socio' },
  { key: 'socio.telefone',         label: 'Telefone',              tipo: 'tel',    secao: 'socio' },
  // Endereço fiscal
  { key: 'endereco.cep',           label: 'CEP',                   tipo: 'cep',    secao: 'endereco' },
  { key: 'endereco.logradouro',    label: 'Logradouro',            tipo: 'text',   secao: 'endereco' },
  { key: 'endereco.numero',        label: 'Número',                tipo: 'text',   secao: 'endereco' },
  { key: 'endereco.complemento',   label: 'Complemento',           tipo: 'text',   secao: 'endereco' },
  { key: 'endereco.bairro',        label: 'Bairro',                tipo: 'text',   secao: 'endereco' },
  { key: 'endereco.cidade',        label: 'Cidade',                tipo: 'text',   secao: 'endereco' },
  { key: 'endereco.estado',        label: 'UF',                    tipo: 'select', secao: 'endereco', opcoes: UF_OPCOES },
]

export const CAMPOS_CHAVES = CAMPOS_CONFIG.map((c) => c.key)

// Seleção padrão ao criar um novo link
export const CAMPOS_DEFAULT: string[] = [
  'empresa.razao_social', 'empresa.email', 'empresa.telefone',
  'socio.nome', 'socio.cpf', 'socio.data_nascimento', 'socio.email', 'socio.telefone',
  'endereco.cep', 'endereco.logradouro', 'endereco.numero',
  'endereco.bairro', 'endereco.cidade', 'endereco.estado',
]

export const SECAO_LABELS: Record<SecaoFormulario, string> = {
  empresa:  'Dados da Empresa',
  socio:    'Dados do Sócio Principal',
  endereco: 'Endereço Fiscal',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function camposPorSecao(campos: string[]): Record<SecaoFormulario, CampoConfig[]> {
  const result: Record<SecaoFormulario, CampoConfig[]> = { empresa: [], socio: [], endereco: [] }
  for (const key of campos) {
    const cfg = CAMPOS_CONFIG.find((c) => c.key === key)
    if (cfg) result[cfg.secao].push(cfg)
  }
  return result
}

/** Lê os valores atuais das entidades e retorna um mapa campo → valor string */
export function preencherFormulario(
  campos: string[],
  client: Client,
  socio?: Pessoa | null,
  endereco?: ClienteEndereco | null,
): Record<string, string> {
  const vals: Record<string, string> = {}
  for (const key of campos) {
    const dot = key.indexOf('.')
    const secao = key.slice(0, dot)
    const campo = key.slice(dot + 1)
    if (secao === 'empresa') {
      vals[key] = String((client as unknown as Record<string, unknown>)[campo] ?? '')
    } else if (secao === 'socio') {
      vals[key] = socio ? String((socio as unknown as Record<string, unknown>)[campo] ?? '') : ''
    } else if (secao === 'endereco') {
      vals[key] = endereco ? String((endereco as unknown as Record<string, unknown>)[campo] ?? '') : ''
    } else {
      vals[key] = ''
    }
  }
  return vals
}

/** Extrai deltas para cada entidade a partir dos valores do formulário */
export function extrairDeltas(
  valores: Record<string, string>,
  campos: string[],
): {
  clientDelta: Partial<Client>
  socioDelta: Partial<Pessoa>
  enderecoDelta: Partial<ClienteEndereco>
} {
  const clientDelta: Partial<Client> = {}
  const socioDelta: Partial<Pessoa> = {}
  const enderecoDelta: Partial<ClienteEndereco> = {}

  for (const key of campos) {
    const dot = key.indexOf('.')
    const secao = key.slice(0, dot)
    const campo = key.slice(dot + 1)
    const valor = valores[key]?.trim() ?? ''

    if (secao === 'empresa') {
      (clientDelta as unknown as Record<string, unknown>)[campo] = valor || undefined
    } else if (secao === 'socio') {
      (socioDelta as unknown as Record<string, unknown>)[campo] = valor || undefined
    } else if (secao === 'endereco') {
      (enderecoDelta as unknown as Record<string, unknown>)[campo] = valor || undefined
    }
  }

  return { clientDelta, socioDelta, enderecoDelta }
}

/** Conta campos preenchidos vs total — para progresso */
export function calcularProgresso(
  valores: Record<string, string>,
  campos: string[],
): { preenchidos: number; total: number } {
  const total = campos.length
  const preenchidos = campos.filter((k) => (valores[k] ?? '').trim() !== '').length
  return { preenchidos, total }
}
