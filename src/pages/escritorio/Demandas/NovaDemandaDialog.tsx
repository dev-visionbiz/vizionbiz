import { useState, useEffect } from 'react'
import { v4 as uuid } from 'uuid'
import { format, addDays } from 'date-fns'
import { Plus, Trash2, ChevronLeft, Pencil, Building2, FileText, Users, Calculator } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/auth/AuthProvider'
import { useClients } from '@/data/hooks/useClients'
import { useUsers } from '@/data/hooks/useUsers'
import { useDemandaTemplatesAtivos, useEtapasDemandaTemplate } from '@/data/hooks/useDemandaTemplates'
import { useCreateDemanda } from '@/data/hooks/useDemandas'
import type { CategoriaDemanda } from '@/domain/types'

const categoriaConfig: Record<CategoriaDemanda, { label: string; icon: React.ElementType; color: string }> = {
  societario: { label: 'Societário',    icon: Building2,  color: 'text-purple-600' },
  fiscal:     { label: 'Fiscal',        icon: Calculator, color: 'text-blue-600' },
  dp:         { label: 'Dep. Pessoal',  icon: Users,      color: 'text-green-600' },
  contabil:   { label: 'Contábil',      icon: FileText,   color: 'text-orange-600' },
  outros:     { label: 'Outros',        icon: FileText,   color: 'text-gray-600' },
}

interface EtapaEditavel {
  _id: string
  nome: string
  descricao: string
  prazo_relativo_dias: number
  responsavel_id: string
}

// ─── Dialog de detalhe/criação de etapa ─────────────────────────────────────

interface EtapaEditavelDialogProps {
  etapa: EtapaEditavel | null  // null = criar nova
  ordem: number
  colaboradores: { id: string; nome: string }[]
  onClose: () => void
  onSalvar: (data: Partial<EtapaEditavel> & { nome: string; prazo_relativo_dias: number }) => void
}

function EtapaEditavelDialog({ etapa, ordem, colaboradores, onClose, onSalvar }: EtapaEditavelDialogProps) {
  const { toast } = useToast()
  const [nome, setNome]           = useState(etapa?.nome ?? '')
  const [descricao, setDescricao] = useState(etapa?.descricao ?? '')
  const [prazoDias, setPrazoDias] = useState(etapa?.prazo_relativo_dias ?? 0)
  const [respId, setRespId]       = useState(etapa?.responsavel_id ?? '')

  function handleSalvar() {
    if (!nome.trim()) return toast({ title: 'Informe o nome da etapa', variant: 'destructive' })
    onSalvar({ _id: etapa?._id, nome: nome.trim(), descricao, prazo_relativo_dias: prazoDias, responsavel_id: respId })
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {etapa ? `Etapa ${ordem} — ${etapa.nome || 'sem nome'}` : 'Nova Etapa'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome *</Label>
            <Input
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Ex: Reunião com cliente"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleSalvar()}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Tempo (dias)</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={prazoDias}
                onChange={e => setPrazoDias(parseInt(e.target.value) || 0)}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">dias em relação ao prazo final</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Negativo = antes do vencimento · 0 = no vencimento · Positivo = depois
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Responsável</Label>
            <Select value={respId} onValueChange={setRespId}>
              <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Nenhum</SelectItem>
                {colaboradores.map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Instruções / informativo</Label>
            <Textarea
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              placeholder="Orientações para executar esta etapa..."
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSalvar}>{etapa ? 'Salvar' : 'Adicionar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Dialog principal ────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
}

export function NovaDemandaDialog({ open, onOpenChange }: Props) {
  const { currentUser } = useAuth()
  const tenantId = currentUser?.tenant_id ?? ''
  const { toast } = useToast()

  const { data: templates = [] } = useDemandaTemplatesAtivos(tenantId)
  const { data: clientes = [] }  = useClients(tenantId)
  const { data: users = [] }     = useUsers(tenantId)

  const [passo, setPasso] = useState<'escolher' | 'preencher'>('escolher')
  const [templateId, setTemplateId] = useState<string | null>(null)

  const [clienteId, setClienteId]       = useState('')
  const [titulo, setTitulo]             = useState('')
  const [descricao, setDescricao]       = useState('')
  const [categoria, setCategoria]       = useState<CategoriaDemanda>('outros')
  const [valor, setValor]               = useState('')
  const [dataPrevista, setDataPrevista] = useState(format(addDays(new Date(), 15), 'yyyy-MM-dd'))
  const [responsavelId, setResponsavelId] = useState('')
  const [etapas, setEtapas]             = useState<EtapaEditavel[]>([])

  // Dialog de etapa
  const [etapaDialog, setEtapaDialog] = useState<EtapaEditavel | null | 'nova'>(null)

  const templateSelecionado = templates.find(t => t.id === templateId)
  const { data: etapasTemplate = [] } = useEtapasDemandaTemplate(tenantId, templateId ?? '')

  const colaboradores = users.filter(u => u.papel !== 'cliente' && u.ativo).map(u => ({ id: u.id, nome: u.nome }))

  useEffect(() => {
    if (!open) {
      setPasso('escolher')
      setTemplateId(null)
      setClienteId('')
      setTitulo('')
      setDescricao('')
      setCategoria('outros')
      setValor('')
      setDataPrevista(format(addDays(new Date(), 15), 'yyyy-MM-dd'))
      setResponsavelId('')
      setEtapas([])
      setEtapaDialog(null)
    }
  }, [open])

  useEffect(() => {
    if (templateSelecionado) {
      setTitulo(templateSelecionado.nome)
      setCategoria(templateSelecionado.categoria)
      if (templateSelecionado.valor_sugerido) setValor(String(templateSelecionado.valor_sugerido))
      setDataPrevista(format(addDays(new Date(), templateSelecionado.prazo_dias_padrao), 'yyyy-MM-dd'))
    }
  }, [templateSelecionado])

  useEffect(() => {
    if (etapasTemplate.length > 0) {
      setEtapas(etapasTemplate.map(e => ({
        _id: uuid(),
        nome: e.nome,
        descricao: e.descricao ?? '',
        prazo_relativo_dias: e.prazo_relativo_dias,
        responsavel_id: e.responsavel_padrao ?? '',
      })))
    }
  }, [etapasTemplate])

  const createDemanda = useCreateDemanda()

  function selecionarTemplate(id: string | null) {
    setTemplateId(id)
    if (!id) {
      setTitulo('')
      setCategoria('outros')
      setValor('')
      setEtapas([{ _id: uuid(), nome: '', descricao: '', prazo_relativo_dias: 0, responsavel_id: '' }])
    }
    setPasso('preencher')
  }

  function handleEtapaDialogSalvar(data: Partial<EtapaEditavel> & { nome: string; prazo_relativo_dias: number }) {
    if (etapaDialog === 'nova') {
      setEtapas(prev => [...prev, { _id: uuid(), nome: data.nome, descricao: data.descricao ?? '', prazo_relativo_dias: data.prazo_relativo_dias, responsavel_id: data.responsavel_id ?? '' }])
    } else if (etapaDialog && data._id) {
      setEtapas(prev => prev.map(e => e._id === data._id ? { ...e, nome: data.nome, descricao: data.descricao ?? '', prazo_relativo_dias: data.prazo_relativo_dias, responsavel_id: data.responsavel_id ?? '' } : e))
    }
    setEtapaDialog(null)
  }

  function removeEtapa(id: string) {
    setEtapas(prev => prev.filter(e => e._id !== id))
  }

  function calcularDataEtapa(prazoRelativo: number): string {
    const base = new Date(dataPrevista + 'T00:00:00')
    return format(addDays(base, prazoRelativo), 'yyyy-MM-dd')
  }

  async function handleSalvar() {
    if (!clienteId) return toast({ title: 'Selecione o cliente', variant: 'destructive' })
    if (!titulo.trim()) return toast({ title: 'Informe o título', variant: 'destructive' })
    if (etapas.length === 0) return toast({ title: 'Adicione ao menos uma etapa', variant: 'destructive' })
    if (etapas.some(e => !e.nome.trim())) return toast({ title: 'Há etapas sem nome', variant: 'destructive' })

    const hoje = format(new Date(), 'yyyy-MM-dd')

    createDemanda.mutate(
      {
        demanda: {
          tenant_id: tenantId,
          cliente_id: clienteId,
          template_id: templateId ?? undefined,
          titulo: titulo.trim(),
          descricao: descricao.trim() || undefined,
          categoria,
          valor: valor ? parseFloat(valor) : undefined,
          data_solicitacao: hoje,
          data_prevista: dataPrevista,
          status: 'pendente',
          responsavel_id: responsavelId || undefined,
          criado_por: currentUser?.id ?? '',
          criado_em: new Date().toISOString(),
        },
        etapas: etapas.map((e, i) => ({
          tenant_id: tenantId,
          nome: e.nome.trim(),
          descricao: e.descricao.trim() || undefined,
          data_prevista: calcularDataEtapa(e.prazo_relativo_dias),
          status: 'pendente' as const,
          responsavel_id: e.responsavel_id || responsavelId || undefined,
          ordem: i + 1,
        })),
      },
      {
        onSuccess: () => {
          toast({ title: 'Demanda criada com sucesso' })
          onOpenChange(false)
        },
        onError: () => toast({ title: 'Erro ao criar demanda', variant: 'destructive' }),
      }
    )
  }

  const etapaEmEdicao = etapaDialog !== 'nova' ? etapaDialog : null
  const etapaDialogOrdem = etapaDialog === 'nova'
    ? etapas.length + 1
    : etapas.findIndex(e => e._id === (etapaDialog as EtapaEditavel)?._id) + 1

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {passo === 'escolher' ? 'Nova Demanda — Escolher tipo' : 'Nova Demanda'}
            </DialogTitle>
          </DialogHeader>

          {/* Passo 1: escolher template */}
          {passo === 'escolher' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Selecione um template para pré-preencher as etapas, ou crie do zero.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {templates.map(t => {
                  const cfg = categoriaConfig[t.categoria]
                  const Icon = cfg.icon
                  return (
                    <button
                      key={t.id}
                      onClick={() => selecionarTemplate(t.id)}
                      className="flex items-start gap-3 p-4 border rounded-lg hover:bg-accent text-left transition-colors"
                    >
                      <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${cfg.color}`} />
                      <div>
                        <p className="font-medium text-sm">{t.nome}</p>
                        <p className="text-xs text-muted-foreground">{cfg.label} · {t.prazo_dias_padrao} dias</p>
                        {t.valor_sugerido && (
                          <p className="text-xs text-muted-foreground">
                            Valor sugerido: {t.valor_sugerido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </p>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
              <Separator />
              <button
                onClick={() => selecionarTemplate(null)}
                className="w-full flex items-center gap-3 p-4 border rounded-lg hover:bg-accent text-left transition-colors border-dashed"
              >
                <Plus className="h-5 w-5 text-muted-foreground shrink-0" />
                <div>
                  <p className="font-medium text-sm">Criar do zero</p>
                  <p className="text-xs text-muted-foreground">Defina título, etapas e prazo manualmente</p>
                </div>
              </button>
            </div>
          )}

          {/* Passo 2: preencher dados */}
          {passo === 'preencher' && (
            <div className="space-y-4">
              {templateSelecionado && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPasso('escolher')}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <Badge variant="outline">
                    {categoriaConfig[templateSelecionado.categoria].label} · Template: {templateSelecionado.nome}
                  </Badge>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <Label>Cliente *</Label>
                  <Select value={clienteId} onValueChange={setClienteId}>
                    <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                    <SelectContent>
                      {clientes.filter(c => c.status === 'ativo').map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.razao_social}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2 space-y-1.5">
                  <Label>Título *</Label>
                  <Input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ex: Alteração de Contrato Social" />
                </div>

                <div className="col-span-2 space-y-1.5">
                  <Label>Descrição</Label>
                  <Textarea value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Detalhes do pedido do cliente..." rows={2} />
                </div>

                <div className="space-y-1.5">
                  <Label>Categoria</Label>
                  <Select value={categoria} onValueChange={v => setCategoria(v as CategoriaDemanda)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(categoriaConfig).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Valor (opcional)</Label>
                  <Input type="number" value={valor} onChange={e => setValor(e.target.value)} placeholder="Incluso no contrato" step="0.01" />
                </div>

                <div className="space-y-1.5">
                  <Label>Data prevista *</Label>
                  <Input type="date" value={dataPrevista} onChange={e => setDataPrevista(e.target.value)} />
                </div>

                <div className="space-y-1.5">
                  <Label>Responsável padrão</Label>
                  <Select value={responsavelId} onValueChange={setResponsavelId}>
                    <SelectTrigger><SelectValue placeholder="Sem responsável" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Sem responsável</SelectItem>
                      {colaboradores.map(u => (
                        <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              {/* Etapas */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Etapas *</Label>
                  <Button size="sm" variant="outline" onClick={() => setEtapaDialog('nova')}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar etapa
                  </Button>
                </div>

                {etapas.length === 0 && (
                  <button
                    onClick={() => setEtapaDialog('nova')}
                    className="w-full py-5 border border-dashed rounded-lg text-sm text-muted-foreground hover:bg-accent/30 transition-colors"
                  >
                    Nenhuma etapa. Clique para adicionar.
                  </button>
                )}

                {etapas.map((e, i) => {
                  const respNome = colaboradores.find(u => u.id === e.responsavel_id)?.nome
                  return (
                    <div key={e._id} className="flex items-center gap-2 border rounded-lg px-3 py-2.5 hover:bg-accent/20 transition-colors group">
                      <span className="text-xs text-muted-foreground w-4 shrink-0">{i + 1}</span>
                      <button className="flex-1 text-left min-w-0" onClick={() => setEtapaDialog(e)}>
                        <p className="text-sm font-medium truncate">{e.nome || <span className="text-muted-foreground italic">sem nome</span>}</p>
                        <p className="text-xs text-muted-foreground">
                          {e.prazo_relativo_dias === 0 ? 'No vencimento' : e.prazo_relativo_dias < 0 ? `${Math.abs(e.prazo_relativo_dias)}d antes` : `${e.prazo_relativo_dias}d depois`}
                          {respNome && ` · ${respNome}`}
                        </p>
                      </button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100" onClick={() => setEtapaDialog(e)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <button
                        onClick={() => removeEtapa(e._id)}
                        className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                        disabled={etapas.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )
                })}

                <p className="text-xs text-muted-foreground">
                  Tempo (dias) é relativo ao prazo final (negativo = antes, 0 = no vencimento, positivo = depois).
                </p>
              </div>
            </div>
          )}

          {passo === 'preencher' && (
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={handleSalvar} disabled={createDemanda.isPending}>
                {createDemanda.isPending ? 'Salvando...' : 'Criar Demanda'}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de detalhe/criação de etapa */}
      {etapaDialog !== null && (
        <EtapaEditavelDialog
          etapa={etapaEmEdicao}
          ordem={etapaDialogOrdem}
          colaboradores={colaboradores}
          onClose={() => setEtapaDialog(null)}
          onSalvar={handleEtapaDialogSalvar}
        />
      )}
    </>
  )
}
