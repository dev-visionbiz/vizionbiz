import { v4 as uuid } from 'uuid'
import type { Ocorrencia, Tarefa } from '@/domain/types'

const MIGRATED_KEY = 'vb_migrated_demandas_v1'

export function migrarDemandas(): void {
  if (localStorage.getItem(MIGRATED_KEY)) return

  const demandas: any[] = JSON.parse(
    localStorage.getItem('vb_demandas_especificas') ?? '[]'
  )
  const etapas: any[] = JSON.parse(
    localStorage.getItem('vb_etapas_demanda_especifica') ?? '[]'
  )

  if (demandas.length === 0) {
    localStorage.setItem(MIGRATED_KEY, '1')
    return
  }

  const ocorrenciasExistentes: Ocorrencia[] = JSON.parse(
    localStorage.getItem('vb_ocorrencias') ?? '[]'
  )
  const tarefasExistentes: Tarefa[] = JSON.parse(
    localStorage.getItem('vb_tarefas') ?? '[]'
  )

  const novasOcorrencias: Ocorrencia[] = []
  const novasTarefas: Tarefa[] = []

  for (const demanda of demandas) {
    const ocorrenciaId = uuid()

    const ocorrencia: Ocorrencia = {
      id: ocorrenciaId,
      tenant_id: demanda.tenant_id,
      titulo: demanda.titulo,
      cliente_id: demanda.cliente_id,
      origem: demanda.template_id ? 'fluxo' : 'manual',
      fluxo_id: demanda.template_id,
      categoria: demanda.categoria,
      valor: demanda.valor,
      data_solicitacao: demanda.data_solicitacao,
      data_prevista: demanda.data_prevista,
      data_conclusao: demanda.data_conclusao,
      status: demanda.status as Ocorrencia['status'],
      responsavel_id: demanda.responsavel_id,
      criado_por: demanda.criado_por,
      criado_em: demanda.criado_em,
      invoice_id: demanda.invoice_id,
    }
    novasOcorrencias.push(ocorrencia)

    const etapasDemanda = etapas.filter(e => e.demanda_id === demanda.id)
    for (const etapa of etapasDemanda) {
      const tarefa: Tarefa = {
        id: uuid(),
        tenant_id: etapa.tenant_id,
        ocorrencia_id: ocorrenciaId,
        ordem: etapa.ordem,
        nome: etapa.nome,
        descricao: etapa.descricao,
        data_prevista: etapa.data_prevista,
        data_conclusao: etapa.data_conclusao,
        status: etapa.status,
        responsavel_id: etapa.responsavel_id,
        observacoes: etapa.observacoes,
        impedimento_descricao: etapa.impedimento_descricao,
        impedimento_responsavel: etapa.impedimento_responsavel,
        impedimento_data: etapa.impedimento_data,
        checklist_progresso: etapa.checklist_progresso,
      }
      novasTarefas.push(tarefa)
    }
  }

  localStorage.setItem(
    'vb_ocorrencias',
    JSON.stringify([...ocorrenciasExistentes, ...novasOcorrencias])
  )
  localStorage.setItem(
    'vb_tarefas',
    JSON.stringify([...tarefasExistentes, ...novasTarefas])
  )

  localStorage.setItem(MIGRATED_KEY, '1')
}
