// BrasilAPI — consulta de CNPJ (sem autenticação, gratuito)
// https://brasilapi.com.br/api/cnpj/v1/{cnpj}

export interface QSASocio {
  nome_socio: string
  qualificacao_socio: string
  percentual_capital_social?: number
}

export interface DadosCNPJ {
  cnpj: string
  razao_social: string
  nome_fantasia: string
  situacao_cadastral: number           // 2 = ATIVA
  descricao_situacao_cadastral: string
  data_situacao_cadastral?: string     // YYYY-MM-DD
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  municipio: string
  uf: string
  cep: string                          // ex: "01311902" (sem hífen)
  ddd_telefone_1: string
  ddd_telefone_2?: string
  email: string
  cnae_fiscal: number
  cnae_fiscal_descricao: string
  cnaes_secundarios: Array<{ codigo: number; descricao: string }>
  qsa?: QSASocio[]
}

async function fetchCNPJ(url: string): Promise<DadosCNPJ> {
  let res: Response
  try {
    res = await fetch(url)
  } catch {
    throw new Error('network')
  }
  if (res.status === 404) throw new Error('CNPJ não encontrado na Receita Federal')
  if (res.status === 400) throw new Error('CNPJ inválido')
  if (!res.ok) throw new Error('unavailable')
  return res.json()
}

// ReceitaWS usa campos diferentes — mapeia para DadosCNPJ
interface ReceitaWSData {
  nome: string; fantasia: string; situacao: string
  logradouro: string; numero: string; complemento: string
  bairro: string; municipio: string; uf: string; cep: string
  telefone: string; email: string
  atividade_principal: Array<{ code: string; text: string }>
  atividades_secundarias: Array<{ code: string; text: string }>
  qsa?: Array<{ nome: string; qual: string }>
}

async function fetchReceitaWS(digits: string): Promise<DadosCNPJ> {
  let res: Response
  try {
    res = await fetch(`/api/receitaws/v1/cnpj/${digits}`)
  } catch {
    throw new Error('network')
  }
  if (res.status === 404) throw new Error('CNPJ não encontrado na Receita Federal')
  if (res.status === 400) throw new Error('CNPJ inválido')
  if (!res.ok) throw new Error('unavailable')
  const d: ReceitaWSData = await res.json()
  return {
    cnpj: digits,
    razao_social: d.nome || '',
    nome_fantasia: d.fantasia || '',
    situacao_cadastral: d.situacao === 'ATIVA' ? 2 : 0,
    descricao_situacao_cadastral: d.situacao || '',
    logradouro: d.logradouro || '',
    numero: d.numero || '',
    complemento: d.complemento || '',
    bairro: d.bairro || '',
    municipio: d.municipio || '',
    uf: d.uf || '',
    cep: d.cep?.replace(/\D/g, '') || '',
    ddd_telefone_1: d.telefone?.replace(/\D/g, '') || '',
    email: d.email || '',
    cnae_fiscal: d.atividade_principal?.[0]
      ? parseInt(d.atividade_principal[0].code.replace(/\D/g, ''), 10)
      : 0,
    cnae_fiscal_descricao: d.atividade_principal?.[0]?.text || '',
    cnaes_secundarios: (d.atividades_secundarias || []).map((c) => ({
      codigo: parseInt(c.code.replace(/\D/g, ''), 10),
      descricao: c.text,
    })),
    qsa: (d.qsa || []).map((s) => ({
      nome_socio: s.nome,
      qualificacao_socio: s.qual,
    })),
  }
}

export async function consultarCNPJ(cnpj: string): Promise<DadosCNPJ> {
  const digits = cnpj.replace(/\D/g, '')
  if (digits.length !== 14) throw new Error('CNPJ deve ter 14 dígitos')

  const isFatalError = (e: unknown) => {
    const msg = e instanceof Error ? e.message : ''
    return msg !== 'network' && msg !== 'unavailable'
  }

  try {
    return await fetchCNPJ(`https://brasilapi.com.br/api/cnpj/v1/${digits}`)
  } catch (e) {
    if (isFatalError(e)) throw e
  }

  try {
    return await fetchCNPJ(`https://minhareceita.org/${digits}`)
  } catch (e) {
    if (isFatalError(e)) throw e
  }

  try {
    return await fetchReceitaWS(digits)
  } catch (e) {
    const msg = e instanceof Error ? e.message : ''
    if (msg === 'network')
      throw new Error('Não foi possível conectar à Receita Federal. Verifique sua conexão.')
    if (msg === 'unavailable')
      throw new Error('A Receita Federal está temporariamente indisponível. Tente novamente em alguns minutos.')
    throw e
  }
}

// ─── Divergências entre o cadastro local e a Receita Federal ──────────────────

export interface Divergencia {
  campo: string
  atual: string
  receita: string
}

function norm(s?: string | null): string {
  return (s ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
}

export function calcularDivergenciasRF(
  client: { razao_social: string; fantasia?: string | null; email?: string | null; telefone?: string | null },
  enderecos: Array<{ tipo: string; principal?: boolean; logradouro?: string; numero?: string; bairro?: string; cidade?: string; estado?: string; cep?: string }> | undefined | null,
  cnaes: Array<{ codigo: string }> | undefined | null,
  dados: DadosCNPJ,
): Divergencia[] {
  const divs: Divergencia[] = []

  if (dados.razao_social && norm(dados.razao_social) !== norm(client.razao_social))
    divs.push({ campo: 'Nome Empresarial', atual: client.razao_social || '—', receita: dados.razao_social })

  const rfFantasia = dados.nome_fantasia || ''
  const localFantasia = client.fantasia || ''
  if (norm(rfFantasia) !== norm(localFantasia))
    divs.push({ campo: 'Nome Fantasia', atual: localFantasia || '—', receita: rfFantasia || '—' })

  if (dados.email) {
    if (norm(dados.email) !== norm(client.email))
      divs.push({ campo: 'E-mail', atual: client.email || '—', receita: dados.email })
  }

  if (dados.ddd_telefone_1) {
    const rfTel = dados.ddd_telefone_1.replace(/\D/g, '')
    const localTel = (client.telefone || '').replace(/\D/g, '')
    if (rfTel && rfTel !== localTel)
      divs.push({ campo: 'Telefone', atual: client.telefone || '—', receita: dados.ddd_telefone_1 })
  }

  if (dados.logradouro) {
    const endFiscal = enderecos?.find((e) => e.tipo === 'fiscal' && e.principal)
      ?? enderecos?.find((e) => e.tipo === 'fiscal')
    const cepRF = dados.cep ? formatarCEP(dados.cep) : ''
    if (!endFiscal) {
      divs.push({
        campo: 'Endereço Fiscal',
        atual: 'Não cadastrado',
        receita: [dados.logradouro, dados.numero, dados.municipio && dados.uf ? `${dados.municipio}/${dados.uf}` : ''].filter(Boolean).join(', '),
      })
    } else {
      const changed =
        norm(endFiscal.logradouro) !== norm(dados.logradouro) ||
        norm(endFiscal.numero) !== norm(dados.numero) ||
        norm(endFiscal.bairro) !== norm(dados.bairro) ||
        norm(endFiscal.cidade) !== norm(dados.municipio) ||
        norm(endFiscal.estado) !== norm(dados.uf) ||
        norm(endFiscal.cep) !== norm(cepRF)
      if (changed) {
        const fmtEnd = (log?: string, num?: string, mun?: string, uf?: string) =>
          [log, num, mun && uf ? `${mun}/${uf}` : ''].filter(Boolean).join(', ')
        divs.push({
          campo: 'Endereço Fiscal',
          atual: fmtEnd(endFiscal.logradouro, endFiscal.numero, endFiscal.cidade, endFiscal.estado),
          receita: fmtEnd(dados.logradouro, dados.numero, dados.municipio, dados.uf),
        })
      }
    }
  }

  if (dados.cnae_fiscal) {
    const rfCods = [
      String(dados.cnae_fiscal),
      ...(dados.cnaes_secundarios ?? []).map((c) => String(c.codigo)),
    ].map((c) => c.replace(/\D/g, ''))
    const localCods = (cnaes ?? []).map((c) => c.codigo.replace(/\D/g, ''))
    const rfSet = new Set(rfCods)
    const localSet = new Set(localCods)
    if (rfCods.some((c) => !localSet.has(c)) || localCods.some((c) => !rfSet.has(c)))
      divs.push({
        campo: 'CNAEs',
        atual: localCods.length > 0 ? `${localCods.length} CNAE(s) cadastrado(s)` : 'Nenhum',
        receita: `${rfCods.length} CNAE(s) na Receita Federal`,
      })
  }

  return divs
}

// Formata CEP para "00000-000"
export function formatarCEP(cep: string | number): string {
  const s = String(cep).replace(/\D/g, '').padStart(8, '0')
  return `${s.slice(0, 5)}-${s.slice(5)}`
}

// ─── IBGE — busca de CNAEs por código ou descrição ────────────────────────────
// https://servicodados.ibge.gov.br/api/v2/cnae/subclasses

interface IbgeCnae {
  id: string        // ex: "0111-3/01"
  descricao: string
}

let _cnaeCache: IbgeCnae[] | null = null
let _cnaeFetch: Promise<IbgeCnae[]> | null = null

async function getCnaes(): Promise<IbgeCnae[]> {
  if (_cnaeCache) return _cnaeCache
  if (!_cnaeFetch) {
    _cnaeFetch = fetch('https://servicodados.ibge.gov.br/api/v2/cnae/subclasses')
      .then((r) => {
        if (!r.ok) throw new Error('Falha ao carregar CNAEs')
        return r.json() as Promise<IbgeCnae[]>
      })
      .then((data) => {
        _cnaeCache = data
        _cnaeFetch = null
        return data
      })
      .catch((err) => {
        _cnaeFetch = null  // permite retry na próxima busca
        throw err
      })
  }
  return _cnaeFetch
}

export async function buscarCnaes(
  termo: string
): Promise<Array<{ codigo: string; descricao: string }>> {
  const t = termo.trim()
  if (t.length < 2) return []
  let lista: IbgeCnae[]
  try {
    lista = await getCnaes()
  } catch {
    return []
  }
  const tLower = t.toLowerCase()
  const tDigits = t.replace(/\D/g, '')
  return lista
    .filter((c) => {
      const codeDigits = c.id.replace(/\D/g, '')
      return (
        (tDigits.length >= 2 && codeDigits.startsWith(tDigits)) ||
        c.id.includes(t) ||
        c.descricao.toLowerCase().includes(tLower)
      )
    })
    .slice(0, 15)
    .map((c) => ({ codigo: c.id, descricao: c.descricao }))
}
