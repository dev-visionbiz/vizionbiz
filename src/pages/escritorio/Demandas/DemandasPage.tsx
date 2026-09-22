import { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, Building2, FileText, Users, Calculator, Inbox } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { useDemandas, useEtapasDemanda } from '@/data/hooks/useDemandas'
import {
  useDemandaTemplates, useEtapasDemandaTemplate,
  useCreateDemandaTemplate, useUpdateDemandaTemplate, useDeleteDemandaTemplate,
  useCreateEtapaDemandaTemplate, useUpdateEtapaDemandaTemplate, useDeleteEtapaDemandaTemplate,
} from '@/data/hooks/useDemandaTemplates'
import { NovaDemandaDialog } from './NovaDemandaDialog'
import { DemandaDetalheDialog } from './DemandaDetalheDialog'
import { TemplateDetalheDialog, EtapaTemplateDialog, EtapaLocal } from './TemplateDetalheDialog'
import { formatDate } from '@/lib/utils'
import { v4 as uuid } from 'uuid'
import type { DemandaEspecifica, DemandaStatus, CategoriaDemanda, DemandaTemplate } from '@/domain/types'

const categoriaConfig: Record<CategoriaDemanda, { label: string; icon: React.ElementType; color: string }> = {
  societario: { label: 'Societário',   icon: Building2,  color: 'text-purple-600' },
  fiscal:     { label: 'Fiscal',       icon: Calculator, color: 'text-blue-600' },
  dp:         { label: 'Dep. Pessoal', icon: Users,      color: 'text-green-600' },
  contabil:   { label: 'Contábil',     icon: FileText,   color: 'text-orange-600' },
  outros:     { label: 'Outros',       icon: FileText,   color: 'text-gray-600' },
}

const demandaStatusConfig: Record<DemandaStatus, { label: string; className: string }> = {
  pendente:     { label: 'Pendente',     className: 'bg-blue-100 text-blue-800 border-transparent' },
  em_andamento: { label: 'Em andamento', className: 'bg-yellow-100 text-yellow-800 border-transparent' },
  concluida:    { label: 'Concluída',    className: 'bg-green-100 text-green-800 border-transparent' },
  cancelada:    { label: 'Cancelada',    className: 'bg-gray-100 text-gray-500 border-transparent' },
}

// Subcomponente para exibir progresso de uma demanda
function DemandaProgressoBadge({ tenantId, demandaId }: { tenantId: string; demandaId: string }) {
  const { data: etapas = [] } = useEtapasDemanda(tenantId, demandaId)
  const concluidas = etapas.filter(e => e.status === 'concluida').length
  return (
    <span className="text-xs text-muted-foreground tabular-nums">
      {concluidas}/{etapas.length}
    </span>
  )
}

// ---- Tab: Lista de Demandas ----
function ListaDemandas({
  tenantId,
  onNova,
  onDetalhes,
}: {
  tenantId: string
  onNova: () => void
  onDetalhes: (d: DemandaEspecifica) => void
}) {
  const { data: demandas = [] }  = useDemandas(tenantId)
  const { data: clientes = [] }  = useClients(tenantId)
  const { data: users = [] }     = useUsers(tenantId)

  const [filtroStatus, setFiltroStatus]       = useState<DemandaStatus | ''>('')
  const [filtroCategoria, setFiltroCategoria] = useState<CategoriaDemanda | ''>('')
  const [filtroCliente, setFiltroCliente]     = useState('')
  const [filtroResp, setFiltroResp]           = useState('')

  const clienteMap = useMemo(() => Object.fromEntries(clientes.map(c => [c.id, c.razao_social])), [clientes])
  const userMap    = useMemo(() => Object.fromEntries(users.map(u => [u.id, u.nome])), [users])

  const filtradas = useMemo(() =>
    demandas
      .filter(d =>
        (!filtroStatus    || d.status === filtroStatus) &&
        (!filtroCategoria || d.categoria === filtroCategoria) &&
        (!filtroCliente   || clienteMap[d.cliente_id]?.toLowerCase().includes(filtroCliente.toLowerCase())) &&
        (!filtroResp      || d.responsavel_id === filtroResp)
      )
      .sort((a, b) => a.data_prevista.localeCompare(b.data_prevista)),
    [demandas, filtroStatus, filtroCategoria, filtroCliente, filtroResp, clienteMap]
  )

  const colaboradores = users.filter(u => u.papel !== 'cliente' && u.ativo)

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-end">
        <div>
          <Label className="text-xs">Cliente</Label>
          <Input
            value={filtroCliente}
            onChange={e => setFiltroCliente(e.target.value)}
            placeholder="Buscar cliente..."
            className="h-8 text-sm w-48"
          />
        </div>
        <div>
          <Label className="text-xs">Status</Label>
          <Select value={filtroStatus} onValueChange={v => setFiltroStatus(v as DemandaStatus | '')}>
            <SelectTrigger className="h-8 text-sm w-36">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              {Object.entries(demandaStatusConfig).map(([k, v]) => (
                <SelectItem key={k} value={k} className="text-sm">{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Categoria</Label>
          <Select value={filtroCategoria} onValueChange={v => setFiltroCategoria(v as CategoriaDemanda | '')}>
            <SelectTrigger className="h-8 text-sm w-36">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todas</SelectItem>
              {Object.entries(categoriaConfig).map(([k, v]) => (
                <SelectItem key={k} value={k} className="text-sm">{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Responsável</Label>
          <Select value={filtroResp} onValueChange={setFiltroResp}>
            <SelectTrigger className="h-8 text-sm w-40">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              {colaboradores.map(u => (
                <SelectItem key={u.id} value={u.id} className="text-sm">{u.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" onClick={onNova} className="ml-auto">
          <Plus className="h-4 w-4 mr-1" /> Nova Demanda
        </Button>
      </div>

      {/* Tabela */}
      {filtradas.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
          <Inbox className="h-10 w-10 opacity-40" />
          <p className="text-sm">Nenhuma demanda encontrada</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-xs text-muted-foreground">Cliente</th>
                <th className="text-left px-4 py-2.5 font-medium text-xs text-muted-foreground">Título</th>
                <th className="text-left px-4 py-2.5 font-medium text-xs text-muted-foreground">Categoria</th>
                <th className="text-left px-4 py-2.5 font-medium text-xs text-muted-foreground">Prazo</th>
                <th className="text-left px-4 py-2.5 font-medium text-xs text-muted-foreground">Etapas</th>
                <th className="text-left px-4 py-2.5 font-medium text-xs text-muted-foreground">Responsável</th>
                <th className="text-left px-4 py-2.5 font-medium text-xs text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtradas.map(d => {
                const cfg = categoriaConfig[d.categoria]
                const st  = demandaStatusConfig[d.status]
                const Icon = cfg.icon
                return (
                  <tr
                    key={d.id}
                    className="hover:bg-accent/30 cursor-pointer transition-colors"
                    onClick={() => onDetalhes(d)}
                  >
                    <td className="px-4 py-3 font-medium truncate max-w-40">{clienteMap[d.cliente_id] ?? '—'}</td>
                    <td className="px-4 py-3 truncate max-w-56">{d.titulo}</td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1 text-xs ${cfg.color}`}>
                        <Icon className="h-3.5 w-3.5" />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(d.data_prevista)}</td>
                    <td className="px-4 py-3">
                      <DemandaProgressoBadge tenantId={tenantId} demandaId={d.id} />
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {d.responsavel_id ? (userMap[d.responsavel_id] ?? '—') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={`text-xs ${st.className}`}>{st.label}</Badge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ---- Template Editor ----
interface TemplateFormState {
  nome: string
  descricao: string
  categoria: CategoriaDemanda
  prazo_dias_padrao: number
  valor_sugerido: string
}

function TemplateRow({ t, tenantId, onEdit }: { t: DemandaTemplate; tenantId: string; onEdit: (t: DemandaTemplate) => void }) {
  const [expanded, setExpanded] = useState(false)
  const { data: etapas = [] } = useEtapasDemandaTemplate(tenantId, t.id)
  const { data: users = [] }  = useUsers(tenantId)

  const deleteTemplate = useDeleteDemandaTemplate()
  const deleteEtapa    = useDeleteEtapaDemandaTemplate()
  const updateEtapa    = useUpdateEtapaDemandaTemplate()

  const colaboradores = users
    .filter(u => u.papel !== 'cliente' && u.ativo)
    .map(u => ({ id: u.id, nome: u.nome }))

  const [etapaDialog, setEtapaDialog] = useState<EtapaLocal | null>(null)

  function handleEtapaSalvar(data: Partial<EtapaLocal> & { nome: string; prazo_relativo_dias: number }) {
    if (!data.id) return
    updateEtapa.mutate(
      { id: data.id, data: {
        nome: data.nome,
        prazo_relativo_dias: data.prazo_relativo_dias,
        descricao: data.descricao?.trim() || undefined,
        responsavel_padrao: data.responsavel_padrao || undefined,
      }},
      { onSuccess: () => setEtapaDialog(null) }
    )
  }

  const cfg  = categoriaConfig[t.categoria]
  const Icon = cfg.icon

  return (
    <>
      <div className="border rounded-lg overflow-hidden">
        <div
          className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-accent/20 transition-colors"
          onClick={() => setExpanded(v => !v)}
        >
          <Icon className={`h-4 w-4 shrink-0 ${cfg.color}`} />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">{t.nome}</p>
            <p className="text-xs text-muted-foreground">{cfg.label} · {t.prazo_dias_padrao} dias · {etapas.length} etapas</p>
          </div>
          {t.valor_sugerido && (
            <span className="text-xs text-muted-foreground">
              {t.valor_sugerido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            onClick={e => { e.stopPropagation(); onEdit(t) }}
            title="Editar template"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-destructive hover:text-destructive"
            onClick={e => { e.stopPropagation(); deleteTemplate.mutate(t.id) }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          {expanded ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
        </div>

        {expanded && (
          <div className="border-t bg-muted/20 px-4 py-3 space-y-1">
            {etapas.length === 0 && (
              <p className="text-xs text-muted-foreground py-2 text-center">Nenhuma etapa. Clique em editar para adicionar.</p>
            )}
            {etapas.map((e, i) => {
              const respNome = colaboradores.find(u => u.id === e.responsavel_padrao)?.nome
              return (
                <div key={e.id} className="flex items-center gap-2 text-sm group">
                  <span className="text-xs text-muted-foreground w-4 shrink-0">{i + 1}.</span>
                  <button
                    className="flex-1 text-left hover:text-foreground transition-colors min-w-0"
                    onClick={() => setEtapaDialog({
                      _localId: e.id, id: e.id,
                      nome: e.nome, descricao: e.descricao ?? '',
                      prazo_relativo_dias: e.prazo_relativo_dias,
                      responsavel_padrao: e.responsavel_padrao ?? '',
                      ordem: e.ordem,
                    })}
                  >
                    <span className="truncate block">{e.nome}</span>
                    {respNome && <span className="text-xs text-muted-foreground">{respNome}</span>}
                  </button>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {e.prazo_relativo_dias === 0 ? 'no vencimento' : `${e.prazo_relativo_dias > 0 ? '+' : ''}${e.prazo_relativo_dias}d`}
                  </span>
                  <button
                    onClick={() => deleteEtapa.mutate(e.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {etapaDialog && (
        <EtapaTemplateDialog
          etapa={etapaDialog}
          ordem={etapas.findIndex(e => e.id === etapaDialog.id) + 1}
          colaboradores={colaboradores}
          onClose={() => setEtapaDialog(null)}
          onSalvar={handleEtapaSalvar}
        />
      )}
    </>
  )
}

function GerenciarTemplates({ tenantId }: { tenantId: string }) {
  const { data: templates = [] } = useDemandaTemplates(tenantId)
  const createTemplate = useCreateDemandaTemplate()
  const { toast } = useToast()

  const [showForm, setShowForm] = useState(false)
  const [templateDetalhe, setTemplateDetalhe]       = useState<DemandaTemplate | null>(null)
  const [templateDetalheOpen, setTemplateDetalheOpen] = useState(false)

  function abrirDetalhe(t: DemandaTemplate) {
    setTemplateDetalhe(t)
    setTemplateDetalheOpen(true)
  }

  const [form, setForm] = useState<TemplateFormState>({
    nome: '',
    descricao: '',
    categoria: 'societario',
    prazo_dias_padrao: 15,
    valor_sugerido: '',
  })

  function handleCreate() {
    if (!form.nome.trim()) return toast({ title: 'Informe o nome do template', variant: 'destructive' })
    createTemplate.mutate(
      {
        tenant_id: tenantId,
        nome: form.nome.trim(),
        descricao: form.descricao.trim() || undefined,
        categoria: form.categoria,
        prazo_dias_padrao: form.prazo_dias_padrao,
        valor_sugerido: form.valor_sugerido ? parseFloat(form.valor_sugerido) : undefined,
        ativo: true,
      },
      {
        onSuccess: () => {
          toast({ title: 'Template criado' })
          setShowForm(false)
          setForm({ nome: '', descricao: '', categoria: 'societario', prazo_dias_padrao: 15, valor_sugerido: '' })
        },
      }
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowForm(v => !v)}>
          <Plus className="h-4 w-4 mr-1" /> Novo Template
        </Button>
      </div>

      {showForm && (
        <div className="border rounded-lg p-4 space-y-3 bg-card">
          <p className="font-medium text-sm">Novo Template</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Nome *</Label>
              <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Rescisão de Sócio" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Categoria</Label>
              <Select value={form.categoria} onValueChange={v => setForm(f => ({ ...f, categoria: v as CategoriaDemanda }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(categoriaConfig).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Prazo padrão (dias)</Label>
              <Input
                type="number"
                value={form.prazo_dias_padrao}
                onChange={e => setForm(f => ({ ...f, prazo_dias_padrao: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Valor sugerido (opcional)</Label>
              <Input
                type="number"
                value={form.valor_sugerido}
                onChange={e => setForm(f => ({ ...f, valor_sugerido: e.target.value }))}
                placeholder="R$ 0,00"
              />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Descrição</Label>
              <Textarea
                value={form.descricao}
                onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                rows={2}
                placeholder="Opcional..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleCreate} disabled={createTemplate.isPending}>Criar</Button>
          </div>
        </div>
      )}

      {templates.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
          <FileText className="h-8 w-8 opacity-40" />
          <p className="text-sm">Nenhum template cadastrado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {templates.map(t => (
            <TemplateRow key={t.id} t={t} tenantId={tenantId} onEdit={abrirDetalhe} />
          ))}
        </div>
      )}

      <TemplateDetalheDialog
        template={templateDetalhe}
        open={templateDetalheOpen}
        onOpenChange={setTemplateDetalheOpen}
        tenantId={tenantId}
      />
    </div>
  )
}

// ---- Página principal ----
export default function DemandasPage() {
  const { currentUser } = useAuth()
  const tenantId = currentUser?.tenant_id ?? ''

  const [novaDemandaOpen, setNovaDemandaOpen]         = useState(false)
  const [demandaDetalhes, setDemandaDetalhes]           = useState<DemandaEspecifica | null>(null)
  const [demandaDetalheOpen, setDemandaDetalheOpen]     = useState(false)

  function abrirDetalhes(d: DemandaEspecifica) {
    setDemandaDetalhes(d)
    setDemandaDetalheOpen(true)
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Demandas</h1>
        <p className="text-muted-foreground text-sm">Pedidos específicos dos clientes com controle de etapas</p>
      </div>

      <Tabs defaultValue="demandas">
        <TabsList>
          <TabsTrigger value="demandas">Demandas</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="demandas" className="mt-4">
          <ListaDemandas
            tenantId={tenantId}
            onNova={() => setNovaDemandaOpen(true)}
            onDetalhes={abrirDetalhes}
          />
        </TabsContent>

        <TabsContent value="templates" className="mt-4">
          <GerenciarTemplates tenantId={tenantId} />
        </TabsContent>
      </Tabs>

      <NovaDemandaDialog open={novaDemandaOpen} onOpenChange={setNovaDemandaOpen} />

      <DemandaDetalheDialog
        demanda={demandaDetalhes}
        open={demandaDetalheOpen}
        onOpenChange={setDemandaDetalheOpen}
      />
    </div>
  )
}
