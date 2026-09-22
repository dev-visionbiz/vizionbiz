import { useState, useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { AlertTriangle } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/auth/AuthProvider'
import { useObrigacoesAtivas } from '@/data/hooks/useObrigacoes'
import { useCompetencias } from '@/data/hooks/useCompetencias'
import { useEtapasObrigacao } from '@/data/hooks/useEtapasObrigacao'
import { useTarefasEtapa, useUpdateTarefa, useUpdateTarefasLote, useConcluirTarefas } from '@/data/hooks/useTarefasObrigacao'
import { useRegistrarLogAtividade } from '@/data/hooks/useLogAtividadeCliente'
import { useClients } from '@/data/hooks/useClients'
import { useUsers } from '@/data/hooks/useUsers'
import { formatDate } from '@/lib/utils'
import type { TarefaObrigacao, TarefaStatus } from '@/domain/types'

const statusConfig: Record<TarefaStatus, { label: string; className: string }> = {
  pendente:      { label: 'Pendente',     className: 'bg-blue-100 text-blue-800 border-transparent' },
  em_andamento:  { label: 'Em andamento', className: 'bg-yellow-100 text-yellow-800 border-transparent' },
  concluida:     { label: 'Concluída',    className: 'bg-green-100 text-green-800 border-transparent' },
  atrasada:      { label: 'Atrasada',     className: 'bg-red-100 text-red-800 border-transparent' },
  nao_se_aplica: { label: 'N/A',          className: 'bg-gray-100 text-gray-500 border-transparent' },
  impedido:      { label: 'Impedida',     className: 'bg-orange-100 text-orange-800 border-transparent' },
}

function periodoLabel(periodo: string): string {
  try {
    const [ano, mes] = periodo.split('-').map(Number)
    return format(new Date(ano, mes - 1, 1), 'MMM/yyyy', { locale: ptBR })
  } catch { return periodo }
}

export function PainelEtapa() {
  const { currentUser } = useAuth()
  const tenantId = currentUser?.tenant_id ?? ''
  const { toast } = useToast()

  const { data: obrigacoes = [] } = useObrigacoesAtivas(tenantId)
  const { data: clientes = [] } = useClients(tenantId)
  const { data: users = [] } = useUsers(tenantId)

  const [obrigacaoId, setObrigacaoId] = useState('')
  const [competenciaId, setCompetenciaId] = useState('')
  const [etapaId, setEtapaId] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<TarefaStatus | 'todos'>('todos')
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())

  const [obsDialog, setObsDialog] = useState(false)
  const [obsText, setObsText] = useState('')
  const [respDialog, setRespDialog] = useState(false)
  const [respId, setRespId] = useState('')

  const [tarefaDetalhe, setTarefaDetalhe] = useState<TarefaObrigacao | null>(null)
  const [detStatus,     setDetStatus]     = useState<TarefaStatus>('pendente')
  const [detResp,       setDetResp]       = useState('')
  const [detObs,        setDetObs]        = useState('')
  const [detImpDesc,    setDetImpDesc]    = useState('')
  const [detImpResp,    setDetImpResp]    = useState('')

  const { data: competencias = [] } = useCompetencias(tenantId, obrigacaoId)
  const { data: etapas = [] } = useEtapasObrigacao(tenantId, obrigacaoId)
  const { data: tarefas = [] } = useTarefasEtapa(tenantId, competenciaId, etapaId)

  const updateTarefa    = useUpdateTarefa()
  const updateLote      = useUpdateTarefasLote()
  const concluirTarefas = useConcluirTarefas()
  const registrarLog    = useRegistrarLogAtividade()

  const clienteMap     = useMemo(() => new Map(clientes.map((c) => [c.id, c])),     [clientes])
  const userMap        = useMemo(() => new Map(users.map((u) => [u.id, u])),         [users])
  const etapaMap       = useMemo(() => new Map(etapas.map((e) => [e.id, e])),        [etapas])
  const competenciaMap = useMemo(() => new Map(competencias.map((c) => [c.id, c])), [competencias])
  const obrigacaoMap   = useMemo(() => new Map(obrigacoes.map((o) => [o.id, o])),   [obrigacoes])
  const escritorioUsers = users.filter((u) => u.papel !== 'cliente' && u.ativo)

  const tarefasFiltradas = useMemo(() => {
    if (filtroStatus === 'todos') return tarefas
    return tarefas.filter((t) => t.status === filtroStatus)
  }, [tarefas, filtroStatus])

  function toggleSelecionado(id: string) {
    setSelecionados((prev) => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  function toggleTodos() {
    if (selecionados.size === tarefasFiltradas.length) {
      setSelecionados(new Set())
    } else {
      setSelecionados(new Set(tarefasFiltradas.map((t) => t.id)))
    }
  }

  async function handleConcluir() {
    const ids = Array.from(selecionados)
    const obrigacaoNome = obrigacaoMap.get(obrigacaoId)?.nome ?? 'obrigação'
    const etapaNome = etapaMap.get(etapaId)?.nome ?? 'etapa'
    await concluirTarefas.mutateAsync(ids)
    tarefasFiltradas
      .filter((t) => selecionados.has(t.id))
      .forEach((t) => registrarLog.mutate({
        tenantId,
        clientId: t.cliente_id,
        acao: 'tarefa_concluida',
        descricao: `Tarefa concluída: ${obrigacaoNome} › ${etapaNome}`,
        usuarioId: currentUser?.id ?? 'desconhecido',
        usuarioNome: currentUser?.nome ?? 'Sistema',
      }))
    setSelecionados(new Set())
    toast({ title: `${ids.length} tarefa${ids.length !== 1 ? 's' : ''} concluída${ids.length !== 1 ? 's' : ''}` })
  }

  async function handleEmAndamento() {
    const obrigacaoNome = obrigacaoMap.get(obrigacaoId)?.nome ?? 'obrigação'
    const etapaNome = etapaMap.get(etapaId)?.nome ?? 'etapa'
    await updateLote.mutateAsync({
      ids: Array.from(selecionados),
      data: { status: 'em_andamento' as TarefaStatus, data_conclusao: undefined },
    })
    tarefasFiltradas
      .filter((t) => selecionados.has(t.id))
      .forEach((t) => registrarLog.mutate({
        tenantId,
        clientId: t.cliente_id,
        acao: 'tarefa_atualizada',
        descricao: `Tarefa iniciada (em andamento): ${obrigacaoNome} › ${etapaNome}`,
        usuarioId: currentUser?.id ?? 'desconhecido',
        usuarioNome: currentUser?.nome ?? 'Sistema',
      }))
    setSelecionados(new Set())
  }

  async function handleSalvarObs() {
    await updateLote.mutateAsync({ ids: Array.from(selecionados), data: { observacoes: obsText } })
    setSelecionados(new Set())
    setObsDialog(false)
    setObsText('')
  }

  async function handleSalvarResp() {
    await updateLote.mutateAsync({ ids: Array.from(selecionados), data: { responsavel: respId || undefined } })
    setSelecionados(new Set())
    setRespDialog(false)
    setRespId('')
  }

  function abrirDetalhe(t: TarefaObrigacao) {
    setTarefaDetalhe(t)
    setDetStatus(t.status === 'atrasada' ? 'pendente' : t.status)
    setDetResp(t.responsavel ?? '')
    setDetObs(t.observacoes ?? '')
    setDetImpDesc(t.impedimento_descricao ?? '')
    setDetImpResp(t.impedimento_responsavel ?? '')
  }

  async function salvarDetalhe() {
    if (!tarefaDetalhe) return
    if (detStatus === 'impedido' && !detImpDesc.trim()) {
      toast({ title: 'Informe a descrição do impedimento', variant: 'destructive' })
      return
    }
    if (detStatus === 'impedido' && !detImpResp) {
      toast({ title: 'Atribua um responsável pela resolução', variant: 'destructive' })
      return
    }
    const hoje = format(new Date(), 'yyyy-MM-dd')
    await updateTarefa.mutateAsync({
      id: tarefaDetalhe.id,
      data: {
        status: detStatus,
        responsavel: detResp || undefined,
        observacoes: detObs || undefined,
        data_conclusao: detStatus === 'concluida' ? (tarefaDetalhe.data_conclusao ?? hoje) : undefined,
        ...(detStatus === 'impedido' ? {
          impedimento_descricao: detImpDesc.trim(),
          impedimento_responsavel: detImpResp,
          impedimento_data: tarefaDetalhe.impedimento_data ?? hoje,
        } : {}),
      },
    })
    const obrigacaoNome = obrigacaoMap.get(obrigacaoId)?.nome ?? 'obrigação'
    const etapaNome = etapaMap.get(etapaId)?.nome ?? 'etapa'
    const statusLabel = statusConfig[detStatus]?.label ?? detStatus
    registrarLog.mutate({
      tenantId,
      clientId: tarefaDetalhe.cliente_id,
      acao: detStatus === 'concluida' ? 'tarefa_concluida' : 'tarefa_atualizada',
      descricao: `Tarefa ${statusLabel.toLowerCase()}: ${obrigacaoNome} › ${etapaNome}`,
      usuarioId: currentUser?.id ?? 'desconhecido',
      usuarioNome: currentUser?.nome ?? 'Sistema',
    })
    toast({ title: 'Tarefa atualizada' })
    setTarefaDetalhe(null)
  }

  const algumSelecionado = selecionados.size > 0
  const todosSelec = tarefasFiltradas.length > 0 && selecionados.size === tarefasFiltradas.length

  const showPanel = obrigacaoId && competenciaId && etapaId

  return (
    <div className="px-4 sm:px-6 pb-8 space-y-4">
      <div className="flex flex-wrap gap-3">
        <Select value={obrigacaoId} onValueChange={(v) => { setObrigacaoId(v); setCompetenciaId(''); setEtapaId(''); setSelecionados(new Set()) }}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Obrigação" />
          </SelectTrigger>
          <SelectContent>
            {obrigacoes.map((o) => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select
          value={competenciaId}
          onValueChange={(v) => { setCompetenciaId(v); setEtapaId(''); setSelecionados(new Set()) }}
          disabled={!obrigacaoId}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Competência" />
          </SelectTrigger>
          <SelectContent>
            {competencias.map((c) => (
              <SelectItem key={c.id} value={c.id}>{periodoLabel(c.periodo)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={etapaId}
          onValueChange={(v) => { setEtapaId(v); setSelecionados(new Set()) }}
          disabled={!competenciaId}
        >
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Etapa" />
          </SelectTrigger>
          <SelectContent>
            {etapas.map((e) => (
              <SelectItem key={e.id} value={e.id}>{e.ordem}. {e.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filtroStatus}
          onValueChange={(v) => setFiltroStatus(v as TarefaStatus | 'todos')}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {(Object.keys(statusConfig) as TarefaStatus[]).map((s) => (
              <SelectItem key={s} value={s}>{statusConfig[s].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!showPanel ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm">Selecione obrigação, competência e etapa para ver as tarefas.</p>
        </div>
      ) : (
        <>
          {algumSelecionado && (
            <div className="flex flex-wrap items-center gap-2 px-3 py-2 rounded-md bg-muted/60 border">
              <span className="text-sm font-medium mr-1">{selecionados.size} selecionado{selecionados.size !== 1 ? 's' : ''}</span>
              <Button size="sm" onClick={handleConcluir} disabled={concluirTarefas.isPending}>Concluir</Button>
              <Button size="sm" variant="outline" onClick={handleEmAndamento} disabled={updateLote.isPending}>Em andamento</Button>
              <Button size="sm" variant="outline" onClick={() => setRespDialog(true)}>Reatribuir</Button>
              <Button size="sm" variant="outline" onClick={() => setObsDialog(true)}>Observação</Button>
              <Button size="sm" variant="ghost" onClick={() => setSelecionados(new Set())}>Cancelar</Button>
            </div>
          )}

          <div className="rounded-lg border">
            <div className="hidden sm:grid grid-cols-[2rem_1fr_9rem_10rem_9rem_1fr] gap-x-3 px-4 py-2 border-b bg-muted/40 text-xs font-medium text-muted-foreground">
              <Checkbox checked={todosSelec} onCheckedChange={toggleTodos} aria-label="Selecionar todos" />
              <span>Cliente</span>
              <span>Data prevista</span>
              <span>Status</span>
              <span>Responsável</span>
              <span>Observações</span>
            </div>

            {tarefasFiltradas.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                Nenhuma tarefa encontrada.
              </div>
            ) : (
              <div className="divide-y">
                {tarefasFiltradas.map((tarefa) => {
                  const cliente = clienteMap.get(tarefa.cliente_id)
                  const responsavel = tarefa.responsavel ? userMap.get(tarefa.responsavel) : null
                  const sel = selecionados.has(tarefa.id)
                  const sc = statusConfig[tarefa.status]

                  return (
                    <div key={tarefa.id} className={`hover:bg-muted/30 transition-colors ${tarefa.status === 'impedido' ? 'bg-orange-50/60' : ''}`}>
                      {/* Desktop row */}
                      <div className="hidden sm:grid grid-cols-[2rem_1fr_9rem_10rem_9rem_1fr] gap-x-3 px-4 py-3 items-center">
                        <Checkbox
                          checked={sel}
                          onCheckedChange={() => toggleSelecionado(tarefa.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="cursor-pointer" onClick={() => abrirDetalhe(tarefa)}>
                          <p className="text-sm font-medium">{cliente?.razao_social ?? tarefa.cliente_id}</p>
                          {cliente?.fantasia && <p className="text-xs text-muted-foreground">{cliente.fantasia}</p>}
                        </div>
                        <span className="text-sm text-muted-foreground cursor-pointer" onClick={() => abrirDetalhe(tarefa)}>
                          {formatDate(tarefa.data_prevista)}
                        </span>
                        <div className="cursor-pointer" onClick={() => abrirDetalhe(tarefa)}>
                          <div className="flex items-center gap-1">
                            {tarefa.status === 'impedido' && <AlertTriangle className="h-3.5 w-3.5 text-orange-600 shrink-0" />}
                            <Badge className={`text-xs w-fit ${sc.className}`}>{sc.label}</Badge>
                          </div>
                        </div>
                        <div className="min-w-0 cursor-pointer" onClick={() => abrirDetalhe(tarefa)}>
                          {tarefa.status === 'impedido' && tarefa.impedimento_responsavel
                            ? <span className="text-xs text-orange-700 font-medium truncate">{userMap.get(tarefa.impedimento_responsavel)?.nome ?? '—'}</span>
                            : <span className="text-sm text-muted-foreground truncate">{responsavel?.nome ?? '—'}</span>
                          }
                        </div>
                        <div className="min-w-0 cursor-pointer" onClick={() => abrirDetalhe(tarefa)}>
                          {tarefa.status === 'impedido' && tarefa.impedimento_descricao
                            ? <span className="text-xs text-orange-600/80 truncate">{tarefa.impedimento_descricao}</span>
                            : <span className="text-xs text-muted-foreground truncate">{tarefa.observacoes ?? '—'}</span>
                          }
                        </div>
                      </div>

                      {/* Mobile row */}
                      <div className="sm:hidden flex items-start gap-3 px-4 py-3" onClick={() => abrirDetalhe(tarefa)}>
                        <Checkbox
                          checked={sel}
                          onCheckedChange={() => toggleSelecionado(tarefa.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0 space-y-1">
                          <p className="text-sm font-medium">{cliente?.razao_social ?? tarefa.cliente_id}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            {tarefa.status === 'impedido' && <AlertTriangle className="h-3.5 w-3.5 text-orange-600" />}
                            <Badge className={`text-xs ${sc.className}`}>{sc.label}</Badge>
                            <span className="text-xs text-muted-foreground">{formatDate(tarefa.data_prevista)}</span>
                          </div>
                          {tarefa.status === 'impedido' && tarefa.impedimento_descricao
                            ? <p className="text-xs text-orange-600/80 line-clamp-1">{tarefa.impedimento_descricao}</p>
                            : tarefa.observacoes && <p className="text-xs text-muted-foreground">{tarefa.observacoes}</p>
                          }
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Observação dialog */}
      <Dialog open={obsDialog} onOpenChange={setObsDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Adicionar observação</DialogTitle></DialogHeader>
          <div className="py-2 space-y-1">
            <Label>Observação</Label>
            <Input
              value={obsText}
              onChange={(e) => setObsText(e.target.value)}
              placeholder="Texto da observação..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setObsDialog(false)}>Cancelar</Button>
            <Button onClick={handleSalvarObs} disabled={updateLote.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Responsável dialog */}
      <Dialog open={respDialog} onOpenChange={setRespDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Reatribuir responsável</DialogTitle></DialogHeader>
          <div className="py-2 space-y-1">
            <Label>Responsável</Label>
            <Select value={respId} onValueChange={(v) => setRespId(v === '_none' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Sem responsável" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">Sem responsável</SelectItem>
                {escritorioUsers.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRespDialog(false)}>Cancelar</Button>
            <Button onClick={handleSalvarResp} disabled={updateLote.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: detalhe da tarefa */}
      {tarefaDetalhe && (() => {
        const det        = tarefaDetalhe
        const detCliente = clienteMap.get(det.cliente_id)
        const detComp    = competenciaMap.get(det.competencia_id)
        const detEtapa   = etapaMap.get(det.etapa_id)
        const detObrig   = detComp ? obrigacaoMap.get(detComp.obrigacao_id) : undefined
        const detSc      = statusConfig[det.status]
        return (
          <Dialog open onOpenChange={(open) => { if (!open) setTarefaDetalhe(null) }}>
            <DialogContent className="sm:max-w-lg flex flex-col gap-0 p-0 max-h-[90vh] overflow-hidden">
              <DialogHeader className="px-6 pt-6 pb-3 shrink-0 border-b">
                <DialogTitle className="leading-snug">
                  {detCliente?.razao_social ?? det.cliente_id}
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {detObrig?.nome}{detComp ? ` · ${periodoLabel(detComp.periodo)}` : ''}
                </p>
              </DialogHeader>

              <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
                {/* Informações somente-leitura */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Etapa</p>
                    <p className="font-medium">{detEtapa?.nome ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Status atual</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {det.status === 'impedido' && <AlertTriangle className="h-3.5 w-3.5 text-orange-600" />}
                      <Badge className={`text-xs ${detSc.className}`}>{detSc.label}</Badge>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Data prevista</p>
                    <p>{formatDate(det.data_prevista)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Data conclusão</p>
                    <p>{det.data_conclusao ? formatDate(det.data_conclusao) : '—'}</p>
                  </div>
                  {detEtapa?.descricao && (
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground">Instruções / informativo</p>
                      <p className="whitespace-pre-wrap text-sm">{detEtapa.descricao}</p>
                    </div>
                  )}
                  {det.status === 'impedido' && (det.impedimento_descricao || det.impedimento_responsavel) && (
                    <div className="col-span-2 rounded-md bg-orange-50 border border-orange-200 p-3 space-y-1">
                      <p className="text-xs font-semibold text-orange-800 flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5" /> Impedimento registrado
                        {det.impedimento_data && <span className="font-normal text-orange-600 ml-1">em {formatDate(det.impedimento_data)}</span>}
                      </p>
                      {det.impedimento_descricao && <p className="text-xs text-orange-700 whitespace-pre-wrap">{det.impedimento_descricao}</p>}
                      {det.impedimento_responsavel && (
                        <p className="text-xs text-orange-700">
                          Responsável: <span className="font-medium">{userMap.get(det.impedimento_responsavel)?.nome ?? det.impedimento_responsavel}</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Campos editáveis */}
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Alterar status</Label>
                    <Select value={detStatus} onValueChange={(v) => setDetStatus(v as TarefaStatus)}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(['pendente', 'em_andamento', 'concluida', 'nao_se_aplica', 'impedido'] as TarefaStatus[]).map((s) => (
                          <SelectItem key={s} value={s}>{statusConfig[s].label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Responsável</Label>
                    <Select value={detResp || '_none'} onValueChange={(v) => setDetResp(v === '_none' ? '' : v)}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Sem responsável" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">Sem responsável</SelectItem>
                        {escritorioUsers.map((u) => (
                          <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Observações</Label>
                    <Textarea
                      value={detObs}
                      onChange={(e) => setDetObs(e.target.value)}
                      placeholder="Anotações sobre esta tarefa..."
                      rows={3}
                      className="text-sm resize-none"
                    />
                  </div>

                  {detStatus === 'impedido' && (
                    <div className="rounded-md border border-orange-200 bg-orange-50/60 p-3 space-y-3">
                      <p className="text-xs font-semibold text-orange-800 flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5" /> Registrar impedimento
                      </p>
                      <div className="space-y-1">
                        <Label className="text-xs">Descrição do problema <span className="text-destructive">*</span></Label>
                        <Textarea
                          value={detImpDesc}
                          onChange={(e) => setDetImpDesc(e.target.value)}
                          placeholder="Descreva o que está impedindo a conclusão desta etapa..."
                          rows={3}
                          className="text-sm resize-none bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Responsável pela resolução <span className="text-destructive">*</span></Label>
                        <Select value={detImpResp || '_none'} onValueChange={(v) => setDetImpResp(v === '_none' ? '' : v)}>
                          <SelectTrigger className="h-8 text-sm bg-white"><SelectValue placeholder="Selecionar responsável" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="_none">Selecionar responsável</SelectItem>
                            {escritorioUsers.map((u) => (
                              <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
              </div>{/* /scroll */}

              <DialogFooter className="px-6 py-4 border-t shrink-0">
                <Button variant="outline" onClick={() => setTarefaDetalhe(null)}>Cancelar</Button>
                <Button onClick={salvarDetalhe} disabled={updateTarefa.isPending}>Salvar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )
      })()}
    </div>
  )
}
