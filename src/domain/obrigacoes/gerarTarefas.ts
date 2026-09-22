import { addDays, format, parseISO } from 'date-fns'
import { v4 as uuid } from 'uuid'
import type { Competencia, EtapaObrigacao, TarefaObrigacao } from '@/domain/types'

/**
 * Gera as tarefas para uma competência × clientes × etapas.
 * O chamador deve verificar duplicatas antes de persistir.
 */
export function gerarTarefas(
  competencia: Competencia,
  etapas: EtapaObrigacao[],
  clienteIds: string[],
  tenantId: string
): TarefaObrigacao[] {
  const vencimento = parseISO(competencia.data_vencimento)
  const tarefas: TarefaObrigacao[] = []

  for (const clienteId of clienteIds) {
    for (const etapa of etapas) {
      const dataPrevista = addDays(vencimento, etapa.prazo_relativo_dias)
      tarefas.push({
        id: uuid(),
        tenant_id: tenantId,
        cliente_id: clienteId,
        competencia_id: competencia.id,
        etapa_id: etapa.id,
        data_prevista: format(dataPrevista, 'yyyy-MM-dd'),
        status: 'pendente',
        responsavel: etapa.responsavel_padrao,
      })
    }
  }

  return tarefas
}
