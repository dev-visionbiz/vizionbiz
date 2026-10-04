import * as pdfjsLib from 'pdfjs-dist'
import jsQR from 'jsqr'
import type { TipoGuia } from '@/domain/types'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).href

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CamposExtraidos {
  tipo?: TipoGuia
  cnpj?: string           // 14 dígitos sem formatação
  cnpj_base?: string      // 8 dígitos (FGTS e outros que não exibem CNPJ completo)
  razao_social?: string   // razão social extraída, usada como fallback de matching
  competencia?: string    // YYYY-MM
  vencimento?: string     // YYYY-MM-DD
  valor?: number
  linha_digitavel?: string
  codigo_barras?: string
  pix_copia_cola?: string // PIX EMV copia e cola (FGTS Digital e outros)
  codigo_receita?: string
  periodo_apuracao?: string
  descricao?: string
  confianca: 'alta' | 'media' | 'baixa'  // quantos campos foram encontrados
}

// ─── Extração de texto ────────────────────────────────────────────────────────

// Tipo interno para itens de texto do PDF (TextItem do pdfjs tem str + transform)
type PDFTextItem = { str: string; transform: [number, number, number, number, number, number] }

function isPDFTextItem(item: unknown): item is PDFTextItem {
  return (
    typeof item === 'object' &&
    item !== null &&
    'str' in item &&
    'transform' in item &&
    Array.isArray((item as PDFTextItem).transform)
  )
}

export async function contarPaginasPDF(blob: Blob): Promise<number> {
  try {
    const buffer = await blob.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
    return pdf.numPages
  } catch {
    return 1
  }
}

// Renderiza cada página do PDF em canvas e tenta decodificar QR code PIX EMV.
// Útil para DAS/PGDAS e INSS onde o PIX está como imagem, não como texto.
export async function extrairPixDoQRCode(file: File): Promise<string | null> {
  try {
    const buffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise

    // Escaneia do final para o início (stub/recibo costuma estar na última página)
    for (let pageNum = pdf.numPages; pageNum >= 1; pageNum--) {
      const page = await pdf.getPage(pageNum)
      const viewport = page.getViewport({ scale: 2.5 })

      const canvas = document.createElement('canvas')
      canvas.width = viewport.width
      canvas.height = viewport.height
      const ctx = canvas.getContext('2d')
      if (!ctx) continue

      await page.render({ canvas, viewport }).promise

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(imageData.data, imageData.width, imageData.height)

      if (code?.data) {
        const emv = code.data.trim()
        // Valida payload PIX EMV: começa com 0002, termina com CRC 6304XXXX
        if (/^0002\d/.test(emv) && /6304[A-Fa-f0-9]{4}/i.test(emv)) {
          return emv
        }
      }
    }
  } catch {
    // Extração de QR é best-effort, falha silenciosa
  }
  return null
}

export async function extrairTextoPDF(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise

  const paginas: string[] = []
  const maxPaginas = Math.min(pdf.numPages, 3)

  for (let i = 1; i <= maxPaginas; i++) {
    const pagina = await pdf.getPage(i)
    const conteudo = await pagina.getTextContent()

    // Cast para unknown[] primeiro para que o type predicate funcione corretamente
    const itens = (conteudo.items as unknown[]).filter(isPDFTextItem)

    // Ordena por Y decrescente (topo para baixo) depois por X crescente
    itens.sort((a, b) => {
      const yDiff = b.transform[5] - a.transform[5]
      if (Math.abs(yDiff) > 3) return yDiff
      return a.transform[4] - b.transform[4]
    })

    // Agrupa itens da mesma linha (Y próximo) com quebra entre linhas diferentes
    const linhas: string[] = []
    let linhaAtual: string[] = []
    let yAnterior: number | null = null

    for (const item of itens) {
      const y = item.transform[5]
      if (yAnterior !== null && Math.abs(y - yAnterior) > 3) {
        if (linhaAtual.length > 0) linhas.push(linhaAtual.join(' ').trim())
        linhaAtual = []
      }
      if (item.str.trim()) linhaAtual.push(item.str)
      yAnterior = y
    }
    if (linhaAtual.length > 0) linhas.push(linhaAtual.join(' ').trim())

    paginas.push(linhas.filter(Boolean).join('\n'))
  }

  return paginas.join('\n')
}

// ─── Normalização ─────────────────────────────────────────────────────────────

function norm(t: string): string {
  return t
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove acentos
}

function parseMoeda(s: string): number {
  return parseFloat(s.replace(/\./g, '').replace(',', '.'))
}

function iso(dia: string, mes: string, ano: string): string {
  return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`
}

// ─── Parsing de campos ────────────────────────────────────────────────────────

export function extrairCamposGuia(textoOriginal: string): CamposExtraidos {
  const t = norm(textoOriginal)
  const result: Partial<CamposExtraidos> = {}

  // ── Tipo ───────────────────────────────────────────────────────────────────
  if (/DARF SIMPLES/.test(t)) {
    result.tipo = 'darf_simples'
  } else if (/DOCUMENTO DE ARRECADACAO DE RECEITAS FEDERAIS/.test(t) || /\bDARF\b/.test(t)) {
    result.tipo = 'darf'
  } else if (/DOCUMENTO DE ARRECADACAO DO SIMPLES NACIONAL/.test(t)) {
    result.tipo = 'das'
  } else if (/\bDAS\b/.test(t) && /SIMPLES NACIONAL/.test(t)) {
    result.tipo = 'das'
  } else if (/GUIA DE RECOLHIMENTO DO FGTS/.test(t) || /\bFGTS\b/.test(t)) {
    result.tipo = 'fgts'
  } else if (/GUIA NACIONAL DE RECOLHIMENTO DE TRIBUTOS ESTADUAIS/.test(t) || /\bGNRE\b/.test(t)) {
    result.tipo = 'gnre'
  } else if (/IMPOSTO SOBRE SERVICOS/.test(t)) {
    result.tipo = 'iss'
  } else if (/\bIPTU\b/.test(t)) {
    result.tipo = 'iptu'
  } else if (/CORPO DE BOMBEIRO/.test(t)) {
    result.tipo = 'bombeiros'
  } else if (/VIGILANCIA SANITARIA/.test(t)) {
    result.tipo = 'vigilancia_sanitaria'
  } else if (/\bDAE\b/.test(t)) {
    result.tipo = 'dae'
  }

  // ── CNPJ ───────────────────────────────────────────────────────────────────
  // 1. Formato completo (XX.XXX.XXX/XXXX-XX)
  const cnpjFmt = textoOriginal.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/)
  if (cnpjFmt) {
    result.cnpj = cnpjFmt[0].replace(/\D/g, '')
  } else {
    // 2. 14 dígitos consecutivos
    const cnpjRaw = textoOriginal.replace(/[\s\-\.\/]/g, '').match(/\d{14}/)
    if (cnpjRaw) {
      result.cnpj = cnpjRaw[0]
    } else {
      // 3. CNPJ base (8 dígitos) — comum no FGTS Digital onde o campo é truncado
      // Tenta extrair da Tag FGTS: "55825449 08/2026 MENSAL"
      const tagFGTS = textoOriginal.match(/\b(\d{8})\s+\d{2}\/\d{4}\s+MENSAL\b/i)
      if (tagFGTS) {
        result.cnpj_base = tagFGTS[1]
      } else {
        // Campo CPF/CNPJ formatado como XX.XXX.XXX (sem /XXXX-XX)
        const cnpjBaseCtx = textoOriginal.match(
          /(?:CPF\/CNPJ[^\n]*\n\s*)(\d{2}\.\d{3}\.\d{3})(?!\d|\/)/,
        )
        if (cnpjBaseCtx) result.cnpj_base = cnpjBaseCtx[1].replace(/\D/g, '')
      }
    }
  }

  // ── Razão Social ───────────────────────────────────────────────────────────
  // Presente em FGTS Digital e GNRE; usada como fallback quando CNPJ incompleto
  {
    const linhas = textoOriginal.split('\n')
    for (let i = 0; i < linhas.length; i++) {
      if (/Raz[aã]o Social/i.test(linhas[i])) {
        // A razão social pode estar no mesmo label ou na próxima linha não vazia
        const restaMesmaLinha = linhas[i]
          .replace(/.*Raz[aã]o Social[^:]*:?\s*/i, '')
          .trim()
        if (restaMesmaLinha.length > 3) {
          result.razao_social = restaMesmaLinha
          break
        }
        for (let j = i + 1; j < Math.min(i + 4, linhas.length); j++) {
          const candidato = linhas[j].trim()
          if (candidato.length > 3 && /[A-Z]/.test(candidato)) {
            result.razao_social = candidato
            break
          }
        }
        if (result.razao_social) break
      }
    }
  }

  // ── Vencimento ─────────────────────────────────────────────────────────────
  // Busca "Vencimento" ou variantes (inclui "Pagar este documento até" do FGTS Digital)
  const vencKw = t.match(
    /(?:VENCIMENTO|DATA.*?VENCIMENTO|VENCE EM|DATA LIMITE|PAGAR ESTE DOCUMENTO ATE|PAGAR ATE|DATA DE PAGAMENTO)[^\d]*(\d{2})\/(\d{2})\/(\d{4})/,
  )
  if (vencKw) {
    result.vencimento = iso(vencKw[1], vencKw[2], vencKw[3])
  } else {
    // Fallback: qualquer DD/MM/YYYY com ano >= 2024
    for (const m of t.matchAll(/(\d{2})\/(\d{2})\/(\d{4})/g)) {
      const year = parseInt(m[3])
      const month = parseInt(m[2])
      if (year >= 2024 && year <= 2030 && month >= 1 && month <= 12) {
        result.vencimento = iso(m[1], m[2], m[3])
        break
      }
    }
  }

  // ── Competência ────────────────────────────────────────────────────────────
  // Busca "Competência" ou "Período de Apuração" seguido de MM/YYYY
  const compKw = t.match(
    /(?:COMPETENCIA|PERIODO DE APURACAO|PERIODO APURACAO|MES COMPETENCIA)[^\d\/]*(\d{2})\/(\d{4})/,
  )
  if (compKw) {
    const mes = parseInt(compKw[1]), ano = parseInt(compKw[2])
    if (mes >= 1 && mes <= 12 && ano >= 2020 && ano <= 2030) {
      result.competencia = `${compKw[2]}-${compKw[1].padStart(2, '0')}`
    }
  } else {
    // Fallback: MM/YYYY que não seja parte de DD/MM/YYYY
    const compAlt = textoOriginal.match(/(?<![\/\d])(\d{2})\/(\d{4})(?!\d)/)
    if (compAlt) {
      const mes = parseInt(compAlt[1]), ano = parseInt(compAlt[2])
      if (mes >= 1 && mes <= 12 && ano >= 2020 && ano <= 2030) {
        result.competencia = `${compAlt[2]}-${compAlt[1].padStart(2, '0')}`
      }
    }
  }

  // ── Valor ──────────────────────────────────────────────────────────────────
  // Prioridade: Total > Valor Total > Valor > maior valor encontrado
  const RE_MOEDA = /(\d{1,3}(?:\.\d{3})*,\d{2})/

  const totalM = t.match(
    new RegExp(`(?:TOTAL DO DOCUMENTO|VALOR TOTAL|TOTAL A PAGAR|TOTAL GERAL|TOTAL DA GUIA|VALOR A RECOLHER)[^\\d]*${RE_MOEDA.source}`),
  )
  const valorM = t.match(
    new RegExp(`(?:VALOR DO PRINCIPAL|VALOR PRINCIPAL|\\bVALOR\\b)[^\\d]*${RE_MOEDA.source}`),
  )

  if (totalM) {
    result.valor = parseMoeda(totalM[1])
  } else if (valorM) {
    result.valor = parseMoeda(valorM[1])
  } else {
    // Pega maior valor no documento (ignora valores muito pequenos como multa 0,00)
    const todos = [...t.matchAll(new RegExp(RE_MOEDA.source, 'g'))]
      .map((m) => parseMoeda(m[1]))
      .filter((v) => v >= 1 && v <= 1_000_000)
    if (todos.length > 0) result.valor = Math.max(...todos)
  }

  // ── Linha digitável ────────────────────────────────────────────────────────
  // Padrão boleto FEBRABAN: grupos de 5+5, 5+6, 5+6 separados por espaço/ponto
  const linhaM = textoOriginal.match(
    /\d{5}[.\s]\d{5}\s+\d{5}[.\s]\d{6}\s+\d{5}[.\s]\d{6}\s+\d\s+\d{14}/,
  )
  if (linhaM) {
    result.linha_digitavel = linhaM[0].replace(/\s+/g, ' ').trim()
  }

  // ── Código de barras ───────────────────────────────────────────────────────
  if (!result.linha_digitavel) {
    // Sequência de 44-48 dígitos (sem espaços no contexto)
    const barcodeM = textoOriginal.replace(/\s/g, '').match(/(?<!\d)\d{44,48}(?!\d)/)
    if (barcodeM) result.codigo_barras = barcodeM[0]
  }

  // ── PIX Copia e Cola ───────────────────────────────────────────────────────
  // Payload EMV completo: começa com 0002, termina com 6304XXXX (CRC-16)
  // Estratégia 1: linha que começa com 0002 e contém 6304 (padrão FGTS Digital)
  {
    const linhas = textoOriginal.split('\n')
    for (const linha of linhas) {
      const t = linha.trim()
      if (/^0002\d/.test(t) && /6304[A-Fa-f0-9]{4}/.test(t)) {
        result.pix_copia_cola = t
        break
      }
    }
    // Estratégia 2: regex multi-linha (quando o extrator quebra o EMV em várias linhas)
    if (!result.pix_copia_cola) {
      const m = textoOriginal.match(
        /\b(0002\d{2}[A-Za-z0-9\/\.\:\-\_\+\*\#\@\$\%\&\=\?\,\s]{40,}?6304[A-Fa-f0-9]{4})\b/s,
      )
      if (m) {
        // Remove quebras de linha mas preserva espaços internos (parte do nome do beneficiário)
        result.pix_copia_cola = m[1].replace(/[\r\n]+/g, '').trim()
      }
    }
  }

  // ── Campos específicos DARF ────────────────────────────────────────────────
  const codRecM = t.match(/(?:CODIGO DA RECEITA|CODIGO RECEITA)[^\d]*(\d{4})/)
  if (codRecM) result.codigo_receita = codRecM[1]

  const periodoM = t.match(
    /(?:PERIODO DE APURACAO)[^\d]*(\d{2})\/(\d{4})/,
  )
  if (periodoM) {
    result.periodo_apuracao = `${periodoM[1]}/${periodoM[2]}`
  }

  // ── Confiança ──────────────────────────────────────────────────────────────
  const camposChave = [
    result.tipo,
    result.cnpj ?? result.cnpj_base ?? result.razao_social,
    result.competencia,
    result.vencimento,
    result.valor,
  ]
  const encontrados = camposChave.filter(Boolean).length
  result.confianca = encontrados >= 4 ? 'alta' : encontrados >= 2 ? 'media' : 'baixa'

  return result as CamposExtraidos
}
