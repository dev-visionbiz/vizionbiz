import { addMonths, endOfMonth, setDate, format } from 'date-fns'

export type RegraVencimento =
  | { tipo: 'dia_mes_seguinte'; dia: number }
  | { tipo: 'dia_mes_atual'; dia: number }
  | { tipo: 'ultimo_dia_mes' }

export function parseRegra(regraJson: string): RegraVencimento {
  try {
    return JSON.parse(regraJson) as RegraVencimento
  } catch {
    return { tipo: 'dia_mes_seguinte', dia: 20 }
  }
}

/**
 * Calcula a data de vencimento de uma competência dado a regra e o período.
 * @param regraJson - JSON stringificado de RegraVencimento
 * @param periodo   - string "YYYY-MM" (ex: "2026-09")
 * @returns string  - data ISO "YYYY-MM-DD"
 */
export function calcularVencimento(regraJson: string, periodo: string): string {
  const regra = parseRegra(regraJson)
  const [ano, mes] = periodo.split('-').map(Number)
  const baseDate = new Date(ano, mes - 1, 1)

  if (regra.tipo === 'dia_mes_seguinte') {
    const mesSeguinte = addMonths(baseDate, 1)
    const maxDia = endOfMonth(mesSeguinte).getDate()
    const dia = Math.min(regra.dia, maxDia)
    return format(setDate(mesSeguinte, dia), 'yyyy-MM-dd')
  }

  if (regra.tipo === 'dia_mes_atual') {
    const maxDia = endOfMonth(baseDate).getDate()
    const dia = Math.min(regra.dia, maxDia)
    return format(setDate(baseDate, dia), 'yyyy-MM-dd')
  }

  // ultimo_dia_mes
  return format(endOfMonth(baseDate), 'yyyy-MM-dd')
}
