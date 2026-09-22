import { useState, useEffect } from 'react'
import { v4 as uuid } from 'uuid'
import { format } from 'date-fns'
import { CheckCircle2, Circle, Clock, DollarSign, AlertTriangle, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { useClients } from '@/data/hooks/useClients'
import { useUsers } from '@/data/hooks/useUsers'
import { useInvoices, useCreateInvoice } from '@/data/hooks/useInvoices'
import {
  useEtapasDemanda, useUpdateDemanda, useUpdateEtapaDemanda, useConcluirEtapaDemanda,
  useCreateEtapaDemandaEspecifica, useDeleteEtapaDemandaEspecifica,
} from '@/data/hooks/useDemandas'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { DemandaEspecifica, EtapaDemandaEspecifica, DemandaStatus, TarefaStatus, CategoriaDemanda } from '@/domain/types'

const demandaStatusConfig: Record<DemandaStatus, { label: string; className: string }> = {
  pendente:     { label: 'Pendente',     className: 'bg-blue-100 text-blue-800 border-transparent' },
  em_andamento: { label: 'Em andamento', className: 'bg-yellow-100 text-yellow-800 border-transparent' },
  concluida:    { label: 'Concluída',    className: 'bg-green-100 text-green-800 border-transparent' },
  cancelada:    { label: 'Cancelada',    className: 'bg-gray-100 text-gray-500 border-transparent' },
}

const etapaStatusConfig: Record<TarefaStatus, { label: string; className: string }> = {
  pendente:      { label: 'Pendente',     className: 'bg-blue-100 text-blue-800 border-transparent' },
  em_andamento:  { label: 'Em andamento', className: 'bg-yellow-100 text-yellow-800 border-transparent' },
  concluida:     { label: 'Concluída',    className: 'bg-green-100 text-green-800 border-transparent' },
  atrasada:      { label: 'Atrasada',     className: 'bg-red-100 text-red-800 border-transparent' },
  nao_se_aplica: { label: 'N/A',          className: 'bg-gray-100 text-gray-500 border-transparent' },
  impedido:      { label: 'Impedida',     className: 'bg-orange-100 text-orange-800 border-transparent' },
}

const categoriaConfig: Record<CategoriaDemanda, { label: string }> = {
  societario: { label: 'Societário' },
  fiscal:     { label: 'Fiscal' },
  dp:         { label: 'Dep. Pessoal' },
  contabil:   { label: 'Contábil' },
  outros:     { label: 'Outros' },
}

// ─── Dialog de detalhe/edição de uma etapa individual ───────────────────────

interface EtapaDetalheDialogProps {
  etapa: EtapaDemandaEspecifica | null
  demandaTitulo: string
  colaboradores: { id: string; nome: string }[]
  onClose: () => void
  onSalvar: (id: string, data: Partial<EtapaDemandaEspecifica>) => void
  onConcluir: (id: string) => void
  isSaving: boolean
}

function EtapaDetalheDialog({
  etapa, demandaTitulo, colaboradores, onClose, onSalvar, onConcluir, isSaving,
}: EtapaDetalheDialogProps) {
  const { toast } = useToast()
  const [editNome,    setEditNome]    = useState(etapa?.nome ?? '')
  const [editData,    setEditData]    = useState(etapa?.data_prevista ?? '')
  const [editStatus,  setEditStatus]  = useState<TarefaStatus>(etapa?.status ?? 'pendente')
  const [editResp,    setEditResp]    = useState(etapa?.responsavel_id ?? '')
  const [editObs,     setEditObs]     = useState(etapa?.observacoes ?? '')
  const [editImpDesc, setEditImpDesc] = useState(etapa?.impedimento_descricao ?? '')
  const [editImpResp, setEditImpResp] = useState(etapa?.impedimento_responsavel ?? '')

  if (!etapa) return null

  const sc          = etapaStatusConfig[etapa.status]
  const isConcluida = etapa.status === 'concluida'
  const isImpedida  = etapa.status === 'impedido'

  const respExibido = isImpedida
    ? (etapa.impedimento_responsavel
        ? (colaboradores.find(u => u.id === etapa.impedimento_responsavel)?.nome ?? '—')
        : '—')
    : (etapa.responsavel_id
        ? (colaboradores.find(u => u.id === etapa.responsavel_id)?.nome ?? '—')
        : '—')

  function handleSalvar() {
    if (!etapa) return
    if (!editNome.trim()) return toast({ title: 'Informe o nome da etapa', variant: 'destructive' })
    if (editStatus === 'concluida') {
      onConcluir(etapa.id)
      return
    }
    if (editStatus === 'impedido') {
      if (!editImpDesc.trim()) return toast({ title: 'Informe a descrição do impedimento', variant: 'destructive' })
      if (!editImpResp) return toast({ title: 'Atribua um responsável pela resolução', variant: 'destructive' })
    }
    const hoje = format(new Date(), 'yyyy-MM-dd')
    onSalvar(etapa.id, {
      nome: editNome.trim(),
      data_prevista: editData,
      status: editStatus,
      responsavel_id: editResp || undefined,
      observacoes: editObs || undefined,
      ...(editStatus === 'impedido'
        ? {
            impedimento_descricao: editImpDesc.trim(),
            impedimento_responsavel: editImpResp,
            impedimento_data: etapa.impedimento_data ?? hoje,
          }
        : {
            impedimento_descricao: undefined,
            impedimento_responsavel: undefined,
          }),
    })
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-lg flex flex-col gap-0 p-0 max-h-[90vh] overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-3 shrink-0 border-b">
          <DialogTitle className="leading-snug text-base">{etapa.nome}</DialogTitle>
          <p className="text-sm text-muted-foreground mt-0.5">{demandaTitulo}</p>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          {/* Informações de execução somente-leitura */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Status atual</p>
              <div className="flex items-center gap-1 mt-0.5">
                {isImpedida && <AlertTriangle className="h-3.5 w-3.5 text-orange-600" />}
                <Badge className={`text-xs ${sc.className}`}>{sc.label}</Badge>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {isImpedida ? 'Responsável pela resolução' : 'Responsável'}
              </p>
              <p className="font-medium">{respExibido}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Data prevista</p>
              <p>{formatDate(etapa.data_prevista)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Data conclusão</p>
              <p>{etapa.data_conclusao ? formatDate(etapa.data_conclusao) : '—'}</p>
            </div>

            {isImpedida && (etapa.impedimento_descricao || etapa.impedimento_responsavel) && (
              <div className="col-span-2 rounded-md bg-orange-50 border border-orange-200 p-3 space-y-1">
                <p className="text-xs font-semibold text-orange-800 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" /> Impedimento registrado
                  {etapa.impedimento_data && (
                    <span className="font-normal text-orange-600 ml-1">
                      em {formatDate(etapa.impedimento_data)}
                    </span>
                  )}
                </p>
                {etapa.impedimento_descricao && (
                  <p className="text-xs text-orange-700 whitespace-pre-wrap">{etapa.impedimento_descricao}</p>
                )}
                {etapa.impedimento_responsavel && (
                  <p className="text-xs text-orange-700">
                    Responsável:{' '}
                    <span className="font-medium">
                      {colaboradores.find(u => u.id === etapa.impedimento_responsavel)?.nome ?? etapa.impedimento_responsavel}
                    </span>
                  </p>
                )}
              </div>
            )}

            {etapa.descricao && (
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground mb-1">Instruções / informativo</p>
                <p className="whitespace-pre-wrap text-sm bg-muted/40 rounded-md p-3 leading-relaxed">
                  {etapa.descricao}
                </p>
              </div>
            )}

            {etapa.observacoes && (
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground mb-1">Observações registradas</p>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground italic">
                  {etapa.observacoes}
                </p>
              </div>
            )}
          </div>

          {!isConcluida && (
            <>
              <Separator />

              <div className="space-y-3">
                {/* Definição da etapa */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Nome da etapa</Label>
                    <Input value={editNome} onChange={e => setEditNome(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Data prevista</Label>
                    <Input
                      type="date"
                      value={editData}
                      onChange={e => setEditData(e.target.value)}
                    />
                  </div>
                </div>

                <Separator />

                {/* Execução */}
                <div className="space-y-1">
                  <Label className="text-xs">Alterar status</Label>
                  <Select value={editStatus} onValueChange={v => setEditStatus(v as TarefaStatus)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(['pendente', 'em_andamento', 'concluida', 'nao_se_aplica', 'impedido'] as TarefaStatus[]).map(s => (
                        <SelectItem key={s} value={s}>{etapaStatusConfig[s].label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {editStatus === 'impedido' && (
                  <div className="rounded-md bg-orange-50 border border-orange-200 p-3 space-y-3">
                    <p className="text-xs font-semibold text-orange-800 flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5" /> Registrar impedimento
                    </p>
                    <div className="space-y-1">
                      <Label className="text-xs text-orange-800">Descrição do impedimento *</Label>
                      <Textarea
                        value={editImpDesc}
                        onChange={e => setEditImpDesc(e.target.value)}
                        rows={2}
                        className="text-sm border-orange-200 focus:ring-orange-400"
                        placeholder="O que está bloqueando esta etapa?"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-orange-800">Responsável pela resolução *</Label>
                      <Select value={editImpResp || '_none'} onValueChange={v => setEditImpResp(v === '_none' ? '' : v)}>
                        <SelectTrigger className="h-8 text-sm border-orange-200">
                          <SelectValue placeholder="Quem vai resolver?" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">Selecionar responsável</SelectItem>
                          {colaboradores.map(u => (
                            <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {editStatus !== 'impedido' && (
                  <div className="space-y-1">
                    <Label className="text-xs">Responsável</Label>
                    <Select value={editResp || '_none'} onValueChange={v => setEditResp(v === '_none' ? '' : v)}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Sem responsável" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">Sem responsável</SelectItem>
                        {colaboradores.map(u => (
                          <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-1">
                  <Label className="text-xs">Observações</Label>
                  <Textarea
                    value={editObs}
                    onChange={e => setEditObs(e.target.value)}
                    rows={3}
                    className="text-sm"
                    placeholder="Anotações sobre esta etapa..."
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t shrink-0">
          <Button variant="outline" onClick={onClose}>Fechar</Button>
          {!isConcluida && (
            <Button onClick={handleSalvar} disabled={isSaving}>
              {isSaving ? 'Salvando...' : editStatus === 'concluida' ? 'Marcar como concluída' : 'Salvar'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Dialog para adicionar nova etapa a uma demanda existente ───────────────

interface NovaEtapaDialogProps {
  demanda: DemandaEspecifica
  totalEtapas: number
  colaboradores: { id: string; nome: string }[]
  tenantId: string
  onClose: () => void
  onCreate: (data: { nome: string; data_prevista: string; descricao?: string; responsavel_id?: string; ordem: number }) => void
  isSaving: boolean
}

function NovaEtapaDialog({ demanda, totalEtapas, colaboradores, onClose, onCreate, isSaving }: NovaEtapaDialogProps) {
  const { toast } = useToast()
  const [nome, setNome]           = useState('')
  const [dataPrevista, setDataPrevista] = useState(demanda.data_prevista)
  const [descricao, setDescricao] = useState('')
  const [respId, setRespId]       = useState(demanda.responsavel_id ?? '')

  function handleSalvar() {
    if (!nome.trim()) return toast({ title: 'Informe o nome da etapa', variant: 'destructive' })
    onCreate({
      nome: nome.trim(),
      data_prevista: dataPrevista,
      descricao: descricao.trim() || undefined,
      responsavel_id: respId || undefined,
      ordem: totalEtapas + 1,
    })
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Etapa</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome *</Label>
            <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Reunião com cliente" autoFocus onKeyDown={e => e.key === 'Enter' && handleSalvar()} />
          </div>
          <div className="space-y-1.5">
            <Label>Data prevista</Label>
            <Input type="date" value={dataPrevista} onChange={e => setDataPrevista(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Responsável</Label>
            <Select value={respId} onValueChange={setRespId}>
              <SelectTrigger><SelectValue placeholder="Sem responsável" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Sem responsável</SelectItem>
                {colaboradores.map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Instruções / informativo</Label>
            <Textarea value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Orientações para executar esta etapa..." rows={4} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSalvar} disabled={isSaving}>
            {isSaving ? 'Adicionando...' : 'Adicionar etapa'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Formulário de edição da demanda ────────────────────────────────────────

interface EditDemandaFormProps {
  demanda: DemandaEspecifica
  colaboradores: { id: string; nome: string }[]
  onSalvar: (data: Partial<DemandaEspecifica>) => void
  onCancelar: () => void
  isSaving: boolean
}

function EditDemandaForm({ demanda, colaboradores, onSalvar, onCancelar, isSaving }: EditDemandaFormProps) {
  const [titulo, setTitulo]             = useState(demanda.titulo)
  const [descricao, setDescricao]       = useState(demanda.descricao ?? '')
  const [categoria, setCategoria]       = useState<CategoriaDemanda>(demanda.categoria)
  const [valor, setValor]               = useState(demanda.valor ? String(demanda.valor) : '')
  const [dataPrevista, setDataPrevista] = useState(demanda.data_prevista)
  const [responsavelId, setResponsavelId] = useState(demanda.responsavel_id ?? '')
  const { toast } = useToast()

  function handleSalvar() {
    if (!titulo.trim()) return toast({ title: 'Informe o título', variant: 'destructive' })
    onSalvar({
      titulo: titulo.trim(),
      descricao: descricao.trim() || undefined,
      categoria,
      valor: valor ? parseFloat(valor) : undefined,
      data_prevista: dataPrevista,
      responsavel_id: responsavelId || undefined,
    })
  }

  return (
    <div className="space-y-3 border rounded-lg p-4 bg-muted/20">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Editar demanda</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1">
          <Label className="text-xs">Título *</Label>
          <Input value={titulo} onChange={e => setTitulo(e.target.value)} />
        </div>
        <div className="col-span-2 space-y-1">
          <Label className="text-xs">Descrição</Label>
          <Textarea
            value={descricao}
            onChange={e => setDescricao(e.target.value)}
            rows={2}
            placeholder="Opcional..."
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Categoria</Label>
          <Select value={categoria} onValueChange={v => setCategoria(v as CategoriaDemanda)}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(categoriaConfig).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Valor (opcional)</Label>
          <Input
            type="number"
            value={valor}
            onChange={e => setValor(e.target.value)}
            placeholder="Incluso no contrato"
            step="0.01"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Data prevista</Label>
          <Input
            type="date"
            value={dataPrevista}
            onChange={e => setDataPrevista(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Responsável</Label>
          <Select value={responsavelId || '_none'} onValueChange={v => setResponsavelId(v === '_none' ? '' : v)}>
            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Sem responsável" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">Sem responsável</SelectItem>
              {colaboradores.map(u => (
                <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onCancelar}>Cancelar</Button>
        <Button size="sm" onClick={handleSalvar} disabled={isSaving}>
          {isSaving ? 'Salvando...' : 'Salvar alterações'}
        </Button>
      </div>
    </div>
  )
}

// ─── Dialog principal de detalhe da demanda ─────────────────────────────────

interface Props {
  demanda: DemandaEspecifica | null
  open: boolean
  onOpenChange: (v: boolean) => void
}

export function DemandaDetalheDialog({ demanda, open, onOpenChange }: Props) {
  const { currentUser } = useAuth()
  const tenantId = currentUser?.tenant_id ?? ''
  const { toast } = useToast()

  const { data: etapas = [] }   = useEtapasDemanda(tenantId, demanda?.id ?? '')
  const { data: clientes = [] } = useClients(tenantId)
  const { data: users = [] }    = useUsers(tenantId)
  const { data: invoices = [] } = useInvoices(tenantId)

  const updateDemanda        = useUpdateDemanda()
  const updateEtapa          = useUpdateEtapaDemanda()
  const concluirEtapa        = useConcluirEtapaDemanda()
  const createEtapa          = useCreateEtapaDemandaEspecifica()
  const deleteEtapa          = useDeleteEtapaDemandaEspecifica()
  const createInvoice        = useCreateInvoice()

  const [etapaDetalhe, setEtapaDetalhe]     = useState<EtapaDemandaEspecifica | null>(null)
  const [novaEtapaOpen, setNovaEtapaOpen]   = useState(false)
  const [editandoDemanda, setEditandoDemanda] = useState(false)

  useEffect(() => {
    if (!open) {
      setEditandoDemanda(false)
      setNovaEtapaOpen(false)
    }
  }, [open])

  if (!demanda) return null

  const cliente       = clientes.find(c => c.id === demanda.cliente_id)
  const colaboradores = users
    .filter(u => u.papel !== 'cliente' && u.ativo)
    .map(u => ({ id: u.id, nome: u.nome }))

  const invoiceDaDemanda = demanda.invoice_id
    ? invoices.find(inv => inv.id === demanda.invoice_id)
    : null

  const temValor        = (demanda.valor ?? 0) > 0
  const podeGerarFatura = temValor && !demanda.invoice_id

  const concluidas = etapas.filter(e => e.status === 'concluida').length
  const progresso  = etapas.length > 0 ? Math.round((concluidas / etapas.length) * 100) : 0

  function handleSalvarEtapa(id: string, data: Partial<EtapaDemandaEspecifica>) {
    updateEtapa.mutate(
      { id, data },
      {
        onSuccess: () => {
          toast({ title: 'Etapa atualizada' })
          setEtapaDetalhe(null)
        },
      }
    )
  }

  function handleConcluirEtapa(etapaId: string) {
    if (!demanda) return
    concluirEtapa.mutate(
      { etapaId, demandaId: demanda.id },
      {
        onSuccess: () => {
          toast({ title: 'Etapa concluída' })
          setEtapaDetalhe(null)
        },
      }
    )
  }

  function handleSalvarDemanda(data: Partial<DemandaEspecifica>) {
    if (!demanda) return
    updateDemanda.mutate(
      { id: demanda.id, data },
      {
        onSuccess: () => {
          toast({ title: 'Demanda atualizada' })
          setEditandoDemanda(false)
        },
      }
    )
  }

  function handleCriarEtapa(data: { nome: string; data_prevista: string; descricao?: string; responsavel_id?: string; ordem: number }) {
    if (!demanda) return
    createEtapa.mutate(
      { tenant_id: tenantId, demanda_id: demanda.id, status: 'pendente', ...data },
      {
        onSuccess: () => {
          toast({ title: 'Etapa adicionada' })
          setNovaEtapaOpen(false)
        },
      }
    )
  }

  function handleDeletarEtapa(etapaId: string) {
    deleteEtapa.mutate(etapaId, {
      onSuccess: () => toast({ title: 'Etapa removida' }),
    })
  }

  function cancelarDemanda() {
    if (!demanda) return
    updateDemanda.mutate(
      { id: demanda.id, data: { status: 'cancelada' } },
      { onSuccess: () => toast({ title: 'Demanda cancelada' }) }
    )
  }

  function gerarFatura() {
    if (!demanda) return
    const vencimento = format(new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
    const invoiceId  = uuid()

    createInvoice.mutate(
      {
        id: invoiceId,
        tenant_id: tenantId,
        client_id: demanda.cliente_id,
        competencia: format(new Date(), 'yyyy-MM'),
        vencimento,
        valor_original: demanda.valor!,
        status: 'aberta',
        origem: 'avulsa',
      },
      {
        onSuccess: () => {
          updateDemanda.mutate({ id: demanda.id, data: { invoice_id: invoiceId } })
          toast({ title: 'Fatura criada', description: `R$ ${demanda.valor?.toFixed(2)}` })
        },
      }
    )
  }

  const dstConfig   = demandaStatusConfig[demanda.status]
  const podeEditar  = demanda.status !== 'cancelada' && demanda.status !== 'concluida'

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between gap-2 pr-6">
              <div className="flex items-start gap-2 min-w-0">
                <div className="min-w-0">
                  <DialogTitle className="text-base leading-tight">{demanda.titulo}</DialogTitle>
                  <p className="text-sm text-muted-foreground mt-0.5">{cliente?.razao_social}</p>
                </div>
                {podeEditar && !editandoDemanda && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 shrink-0 mt-0.5"
                    onClick={() => setEditandoDemanda(true)}
                    title="Editar demanda"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              <Badge variant="outline" className={dstConfig.className}>{dstConfig.label}</Badge>
            </div>
          </DialogHeader>

          {/* Formulário de edição da demanda */}
          {editandoDemanda && (
            <EditDemandaForm
              demanda={demanda}
              colaboradores={colaboradores}
              onSalvar={handleSalvarDemanda}
              onCancelar={() => setEditandoDemanda(false)}
              isSaving={updateDemanda.isPending}
            />
          )}

          {/* Resumo */}
          {!editandoDemanda && (
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="border rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Solicitado</p>
                <p className="font-medium">{formatDate(demanda.data_solicitacao)}</p>
              </div>
              <div className="border rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Prazo</p>
                <p className="font-medium">{formatDate(demanda.data_prevista)}</p>
              </div>
              <div className="border rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Progresso</p>
                <p className="font-medium">{concluidas}/{etapas.length} etapas ({progresso}%)</p>
              </div>
            </div>
          )}

          {!editandoDemanda && demanda.descricao && (
            <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">{demanda.descricao}</p>
          )}

          {/* Fatura */}
          {(temValor || invoiceDaDemanda) && (
            <div className="flex items-center justify-between border rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span>
                  {demanda.valor?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
                {invoiceDaDemanda && (
                  <Badge variant="outline" className="text-xs">
                    Fatura {invoiceDaDemanda.status}
                  </Badge>
                )}
              </div>
              {podeGerarFatura && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={gerarFatura}
                  disabled={createInvoice.isPending || updateDemanda.isPending}
                >
                  Gerar Fatura Avulsa
                </Button>
              )}
            </div>
          )}

          <Separator />

          {/* Linha do tempo de etapas */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Etapas</p>
              {podeEditar && (
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setNovaEtapaOpen(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar etapa
                </Button>
              )}
            </div>
            {etapas.map((e, i) => {
              const stConfig    = etapaStatusConfig[e.status]
              const isConcluida = e.status === 'concluida'
              const isImpedida  = e.status === 'impedido'
              const temDesc     = !!e.descricao

              const respExibido = isImpedida
                ? colaboradores.find(u => u.id === e.impedimento_responsavel)?.nome
                : colaboradores.find(u => u.id === e.responsavel_id)?.nome

              return (
                <button
                  key={e.id}
                  type="button"
                  className={cn(
                    'w-full text-left border rounded-lg p-3 space-y-1.5 transition-colors group',
                    isImpedida && 'bg-orange-50/60 border-orange-200',
                    demanda.status !== 'cancelada' && 'hover:bg-accent/30 cursor-pointer',
                    isImpedida && demanda.status !== 'cancelada' && 'hover:bg-orange-100/60',
                    demanda.status === 'cancelada' && 'cursor-default opacity-70'
                  )}
                  onClick={() => demanda.status !== 'cancelada' && setEtapaDetalhe(e)}
                >
                  <div className="flex items-center gap-3">
                    <div className="shrink-0">
                      {isConcluida
                        ? <CheckCircle2 className="h-5 w-5 text-green-600" />
                        : isImpedida
                          ? <AlertTriangle className="h-5 w-5 text-orange-500" />
                          : <Circle className="h-5 w-5 text-muted-foreground" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm font-medium', isConcluida && 'line-through text-muted-foreground')}>
                        {i + 1}. {e.nome}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(e.data_prevista)}
                        </span>
                        {e.data_conclusao && (
                          <span className="text-green-600">Concluído em {formatDate(e.data_conclusao)}</span>
                        )}
                        {respExibido && (
                          <span className={isImpedida ? 'text-orange-700 font-medium' : ''}>
                            {isImpedida ? `Resolução: ${respExibido}` : respExibido}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {temDesc && (
                        <span className="text-xs text-muted-foreground/60 italic hidden sm:block">instruções</span>
                      )}
                      <Badge variant="outline" className={`text-xs ${stConfig.className}`}>{stConfig.label}</Badge>
                      {podeEditar && !isConcluida && (
                        <button
                          onClick={ev => { ev.stopPropagation(); handleDeletarEtapa(e.id) }}
                          className="text-muted-foreground hover:text-destructive transition-colors ml-1 opacity-0 group-hover:opacity-100"
                          disabled={deleteEtapa.isPending}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {isImpedida && e.impedimento_descricao ? (
                    <p className="text-xs text-orange-600/80 italic pl-8 truncate">{e.impedimento_descricao}</p>
                  ) : e.observacoes ? (
                    <p className="text-xs text-muted-foreground italic pl-8 truncate">{e.observacoes}</p>
                  ) : null}
                </button>
              )
            })}
          </div>

          {demanda.status !== 'cancelada' && demanda.status !== 'concluida' && (
            <>
              <Separator />
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={cancelarDemanda}
                  disabled={updateDemanda.isPending}
                >
                  Cancelar demanda
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de detalhe da etapa individual */}
      {etapaDetalhe && (
        <EtapaDetalheDialog
          etapa={etapaDetalhe}
          demandaTitulo={demanda.titulo}
          colaboradores={colaboradores}
          onClose={() => setEtapaDetalhe(null)}
          onSalvar={handleSalvarEtapa}
          onConcluir={handleConcluirEtapa}
          isSaving={updateEtapa.isPending || concluirEtapa.isPending}
        />
      )}

      {/* Dialog para adicionar nova etapa */}
      {novaEtapaOpen && (
        <NovaEtapaDialog
          demanda={demanda}
          totalEtapas={etapas.length}
          colaboradores={colaboradores}
          tenantId={tenantId}
          onClose={() => setNovaEtapaOpen(false)}
          onCreate={handleCriarEtapa}
          isSaving={createEtapa.isPending}
        />
      )}
    </>
  )
}
