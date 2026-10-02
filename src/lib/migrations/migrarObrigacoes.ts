import { v4 as uuid } from 'uuid'
import type { Rotina, Fluxo, FluxoTarefa, RotinaCliente, Ciclo, Ocorrencia, Tarefa } from '@/domain/types'

const MIGRATED_KEY = 'vb_migrated_obrigacoes_v1'

function readRaw<T>(storageKey: string): T[] {
  try {
    const raw = localStorage.getItem(storageKey)
    return raw ? (JSON.parse(raw) as T[]) : []
  } catch {
    return []
  }
}

function appendToStorage<T extends { id: string }>(storageKey: string, items: T[]): void {
  if (items.length === 0) return
  const existing = readRaw<T>(storageKey)
  const existingIds = new Set(existing.map((x) => x.id))
  const novos = items.filter((x) => !existingIds.has(x.id))
  if (novos.length > 0) {
    localStorage.setItem(storageKey, JSON.stringify([...existing, ...novos]))
  }
}

function calcularStatusOcorrencia(
  tarefas: Array<{ status: string }>
): 'pendente' | 'em_andamento' | 'concluida' | 'cancelada' {
  if (tarefas.every((t) => t.status === 'concluida' || t.status === 'nao_se_aplica')) {
    return 'concluida'
  }
  if (tarefas.some((t) => t.status === 'em_andamento' || t.status === 'concluida')) {
    return 'em_andamento'
  }
  return 'pendente'
}

function calcularDataConclusao(
  tarefas: Array<{ status: string; data_conclusao?: string }>
): string | undefined {
  const todasConcluidas = tarefas.every(
    (t) => t.status === 'concluida' || t.status === 'nao_se_aplica'
  )
  if (!todasConcluidas) return undefined
  const datas = tarefas.map((t) => t.data_conclusao).filter(Boolean) as string[]
  return datas.length > 0 ? datas.sort().pop() : undefined
}

export function migrarObrigacoes(): void {
  if (localStorage.getItem(MIGRATED_KEY)) return

  const obrigacoes = readRaw<any>('vb_obrigacoes')
  const etapas = readRaw<any>('vb_etapas_obrigacao')
  const clienteObrigacoes = readRaw<any>('vb_cliente_obrigacao')
  const competencias = readRaw<any>('vb_competencias')
  const tarefasObrigacao = readRaw<any>('vb_tarefas_obrigacao')

  if (obrigacoes.length === 0) {
    localStorage.setItem(MIGRATED_KEY, new Date().toISOString())
    return
  }

  const obrigacaoMap = new Map<string, { rotinaId: string; fluxoId: string }>()
  const etapaMap = new Map<string, { fluxoTarefaId: string; ordem: number; nome: string; descricao?: string }>()
  const competenciaMap = new Map<string, string>() // competencia.id → ciclo.id

  const novasRotinas: Rotina[] = []
  const novosFluxos: Fluxo[] = []
  const novosFluxoTarefas: FluxoTarefa[] = []

  // 1. Migrate each Obrigacao → Rotina + Fluxo + FluxoTarefa[]
  for (const obs of obrigacoes) {
    const rotinaId = uuid()
    const fluxoId = uuid()

    novasRotinas.push({
      id: rotinaId,
      tenant_id: obs.tenant_id,
      nome: obs.nome,
      fluxo_id: fluxoId,
      periodicidade: obs.periodicidade,
      regra_vencimento: obs.regra_vencimento,
      regime: obs.regime,
      ativo: obs.ativo,
      criado_em: new Date().toISOString(),
    })

    novosFluxos.push({
      id: fluxoId,
      tenant_id: obs.tenant_id,
      nome: obs.nome,
      categoria: 'fiscal' as const,
      prazo_dias_padrao: 0,
      ativo: obs.ativo,
    })

    obrigacaoMap.set(obs.id, { rotinaId, fluxoId })

    // Migrate EtapaObrigacao → FluxoTarefa for this obrigacao
    const etapasObs = etapas.filter((e: any) => e.obrigacao_id === obs.id)
    for (const etapa of etapasObs) {
      const ftId = uuid()
      novosFluxoTarefas.push({
        id: ftId,
        tenant_id: etapa.tenant_id,
        fluxo_id: fluxoId,
        ordem: etapa.ordem,
        nome: etapa.nome,
        descricao: etapa.descricao,
        prazo_relativo_dias: etapa.prazo_relativo_dias,
        responsavel_padrao: etapa.responsavel_padrao,
        checklist: etapa.checklist,
      })
      etapaMap.set(etapa.id, {
        fluxoTarefaId: ftId,
        ordem: etapa.ordem,
        nome: etapa.nome,
        descricao: etapa.descricao,
      })
    }
  }

  // 2. Migrate ClienteObrigacao → RotinaCliente
  const novosRotinaClientes: RotinaCliente[] = []
  for (const co of clienteObrigacoes) {
    const mapping = obrigacaoMap.get(co.obrigacao_id)
    if (!mapping) continue
    novosRotinaClientes.push({
      id: uuid(),
      tenant_id: co.tenant_id,
      rotina_id: mapping.rotinaId,
      cliente_id: co.cliente_id,
      ativo: co.ativo,
      data_inicio: co.data_inicio,
      data_fim: co.data_fim,
    })
  }

  // 3. Migrate Competencia → Ciclo
  const novosCiclos: Ciclo[] = []
  for (const comp of competencias) {
    const mapping = obrigacaoMap.get(comp.obrigacao_id)
    if (!mapping) continue
    const cicloId = uuid()
    novosCiclos.push({
      id: cicloId,
      tenant_id: comp.tenant_id,
      rotina_id: mapping.rotinaId,
      periodo: comp.periodo,
      data_vencimento: comp.data_vencimento,
      status: comp.status,
    })
    competenciaMap.set(comp.id, cicloId)
  }

  // 4. Group TarefaObrigacao by (competencia_id, cliente_id) → Ocorrencia + Tarefa[]
  const grupos = new Map<string, any[]>()
  for (const t of tarefasObrigacao) {
    const key = `${t.competencia_id}__${t.cliente_id}`
    if (!grupos.has(key)) grupos.set(key, [])
    grupos.get(key)!.push(t)
  }

  const novasOcorrencias: Ocorrencia[] = []
  const novasTarefas: Tarefa[] = []

  for (const [key, grupo] of grupos) {
    const [competenciaId, clienteId] = key.split('__')
    const comp = competencias.find((c: any) => c.id === competenciaId)
    if (!comp) continue
    const mapping = obrigacaoMap.get(comp.obrigacao_id)
    if (!mapping) continue
    const cicloId = competenciaMap.get(competenciaId)
    if (!cicloId) continue

    const obs = obrigacoes.find((o: any) => o.id === comp.obrigacao_id)
    const obsNome = obs?.nome ?? 'Rotina'
    const firstT = grupo[0]
    const ocorrenciaId = uuid()

    novasOcorrencias.push({
      id: ocorrenciaId,
      tenant_id: firstT.tenant_id,
      titulo: `${obsNome} — ${comp.periodo}`,
      cliente_id: clienteId,
      origem: 'rotina',
      fluxo_id: mapping.fluxoId,
      rotina_id: mapping.rotinaId,
      ciclo_id: cicloId,
      data_prevista: comp.data_vencimento,
      status: calcularStatusOcorrencia(grupo),
      data_conclusao: calcularDataConclusao(grupo),
      criado_por: 'system',
      criado_em: new Date().toISOString(),
    })

    for (const t of grupo) {
      const etapaInfo = etapaMap.get(t.etapa_id)
      novasTarefas.push({
        id: uuid(),
        tenant_id: t.tenant_id,
        ocorrencia_id: ocorrenciaId,
        fluxo_tarefa_id: etapaInfo?.fluxoTarefaId,
        ordem: etapaInfo?.ordem ?? 0,
        nome: etapaInfo?.nome ?? 'Etapa',
        descricao: etapaInfo?.descricao,
        data_prevista: t.data_prevista,
        data_conclusao: t.data_conclusao,
        status: t.status,
        responsavel_id: t.responsavel,
        observacoes: t.observacoes,
        impedimento_descricao: t.impedimento_descricao,
        impedimento_responsavel: t.impedimento_responsavel,
        impedimento_data: t.impedimento_data,
        checklist_progresso: t.checklist_progresso,
      })
    }
  }

  appendToStorage('vb_rotinas', novasRotinas)
  appendToStorage('vb_fluxos', novosFluxos)
  appendToStorage('vb_fluxo_tarefas', novosFluxoTarefas)
  appendToStorage('vb_rotina_clientes', novosRotinaClientes)
  appendToStorage('vb_ciclos', novosCiclos)
  appendToStorage('vb_ocorrencias', novasOcorrencias)
  appendToStorage('vb_tarefas', novasTarefas)

  localStorage.setItem(MIGRATED_KEY, new Date().toISOString())
}
