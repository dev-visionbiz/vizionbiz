import { useState, useMemo } from 'react'
import { Plus, Building2, FileText, Users, Calculator, Inbox, Layers } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { useAuth } from '@/auth/AuthProvider'
import { useClients } from '@/data/hooks/useClients'
import { useUsers } from '@/data/hooks/useUsers'
import { useOcorrencias, useTarefasOcorrencia } from '@/data/hooks/useOcorrencias'
import { useFluxos, useFluxoTarefas, useCreateFluxo, useUpdateFluxo, useDeleteFluxo } from '@/data/hooks/useFluxos'
import { NovaOcorrenciaDialog } from './NovaOcorrenciaDialog'
import { OcorrenciaDetalheDialog } from './OcorrenciaDetalheDialog'
import { formatDate } from '@/lib/utils'
import type { Ocorrencia, OcorrenciaStatus, CategoriaDemanda, Fluxo } from '@/domain/types'

const categoriaConfig: Record<CategoriaDemanda, { label: string; icon: React.ElementType; color: string }> = {
  societario: { label: 'Societário',   icon: Building2,  color: 'text-purple-600' },
  fiscal:     { label: 'Fiscal',       icon: Calculator, color: 'text-blue-600' },
  dp:         { label: 'Dep. Pessoal', icon: Users,      color: 'text-green-600' },
  contabil:   { label: 'Contábil',     icon: FileText,   color: 'text-orange-600' },
  outros:     { label: 'Outros',       icon: FileText,   color: 'text-gray-600' },
}

const ocorrenciaStatusConfig: Record<OcorrenciaStatus, { label: string; className: string }> = {
  pendente:     { label: 'Pendente',     className: 'bg-blue-100 text-blue-800 border-transparent' },
  em_andamento: { label: 'Em andamento', className: 'bg-yellow-100 text-yellow-800 border-transparent' },
  concluida:    { label: 'Concluída',    className: 'bg-green-100 text-green-800 border-transparent' },
  cancelada:    { label: 'Cancelada',    className: 'bg-gray-100 text-gray-500 border-transparent' },
}

function OcorrenciaProgressoBadge({ tenantId, ocorrenciaId }: { tenantId: string; ocorrenciaId: string }) {
  const { data: tarefas = [] } = useTarefasOcorrencia(tenantId, ocorrenciaId)
  const concluidas = tarefas.filter(t => t.status === 'concluida').length
  return (
    <span className="text-xs text-muted-foreground tabular-nums">
      {concluidas}/{tarefas.length}
    </span>
  )
}

// â”€â”€â”€ Aba: Lista de Ocorrências â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function ListaOcorrencias({
  tenantId,
  onNova,
  onDetalhes,
}: {
  tenantId: string
  onNova: (clienteId?: string) => void
  onDetalhes: (o: Ocorrencia) => void
}) {
  const { data: ocorrencias = [] } = useOcorrencias(tenantId)
  const { data: clientes = [] }    = useClients(tenantId)
  const { data: users = [] }       = useUsers(tenantId)

  const [filtroStatus,    setFiltroStatus]    = useState<OcorrenciaStatus | ''>('')
  const [filtroCategoria, setFiltroCategoria] = useState<CategoriaDemanda | ''>('')
  const [filtroClienteId, setFiltroClienteId] = useState('')
  const [filtroResp,      setFiltroResp]      = useState('')
  const [filtroLote,      setFiltroLote]      = useState('')

  const clienteMap = useMemo(() => Object.fromEntries(clientes.map(c => [c.id, c.razao_social])), [clientes])
  const userMap    = useMemo(() => Object.fromEntries(users.map(u => [u.id, u.nome])), [users])

  // Agrupa ocorrências por lote_id para o filtro
  const loteGrupos = useMemo(() => {
    const map = new Map<string, Ocorrencia[]>()
    for (const o of ocorrencias) {
      if (!o.lote_id) continue
      if (!map.has(o.lote_id)) map.set(o.lote_id, [])
      map.get(o.lote_id)!.push(o)
    }
    return map
  }, [ocorrencias])

  const filtradas = useMemo(() =>
    ocorrencias
      .filter(o =>
        (!filtroLote       || o.lote_id === filtroLote) &&
        (!filtroStatus     || o.status === filtroStatus) &&
        (!filtroCategoria  || o.categoria === filtroCategoria) &&
        (!filtroClienteId  || o.cliente_id === filtroClienteId) &&
        (!filtroResp       || o.responsavel_id === filtroResp)
      )
      .sort((a, b) => a.data_prevista.localeCompare(b.data_prevista)),
    [ocorrencias, filtroLote, filtroStatus, filtroCategoria, filtroClienteId, filtroResp]
  )

  const colaboradores = users.filter(u => u.papel !== 'cliente' && u.ativo)

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-end">
        <div>
          <Label className="text-xs">Cliente</Label>
          <Select value={filtroClienteId} onValueChange={setFiltroClienteId}>
            <SelectTrigger className="h-8 w-44 text-sm"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              {clientes.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.razao_social}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Status</Label>
          <Select value={filtroStatus} onValueChange={v => setFiltroStatus(v as OcorrenciaStatus | '')}>
            <SelectTrigger className="h-8 w-36 text-sm"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              {(Object.keys(ocorrenciaStatusConfig) as OcorrenciaStatus[]).map(s => (
                <SelectItem key={s} value={s}>{ocorrenciaStatusConfig[s].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Categoria</Label>
          <Select value={filtroCategoria} onValueChange={v => setFiltroCategoria(v as CategoriaDemanda | '')}>
            <SelectTrigger className="h-8 w-36 text-sm"><SelectValue placeholder="Todas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todas</SelectItem>
              {(Object.keys(categoriaConfig) as CategoriaDemanda[]).map(c => (
                <SelectItem key={c} value={c}>{categoriaConfig[c].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Responsável</Label>
          <Select value={filtroResp} onValueChange={setFiltroResp}>
            <SelectTrigger className="h-8 w-36 text-sm"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              {colaboradores.map(u => (
                <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {loteGrupos.size > 0 && (
          <div>
            <Label className="text-xs">Lote</Label>
            <Select value={filtroLote} onValueChange={setFiltroLote}>
              <SelectTrigger className="h-8 w-44 text-sm"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                {[...loteGrupos.entries()].map(([loteId, ocrs]) => (
                  <SelectItem key={loteId} value={loteId}>
                    {ocrs[0].titulo} ({ocrs.length})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {(filtroStatus || filtroCategoria || filtroClienteId || filtroResp || filtroLote) && (
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setFiltroStatus(''); setFiltroCategoria(''); setFiltroClienteId(''); setFiltroResp(''); setFiltroLote('') }}>
            Limpar filtros
          </Button>
        )}
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {filtradas.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Inbox className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhuma ocorrência encontrada</p>
            <Button size="sm" variant="outline" className="mt-4" onClick={() => onNova(filtroClienteId || undefined)}>
              <Plus className="h-4 w-4 mr-1" /> Nova Ocorrência
            </Button>
          </div>
        ) : (
          filtradas.map(o => {
            const stConfig  = ocorrenciaStatusConfig[o.status]
            const catConfig = o.categoria ? categoriaConfig[o.categoria] : null
            const CatIcon   = catConfig?.icon
            const clienteNome = clienteMap[o.cliente_id ?? ''] ?? 'â€”'
            const respNome    = o.responsavel_id ? (userMap[o.responsavel_id] ?? 'â€”') : null

            return (
              <button
                key={o.id}
                className="w-full text-left border rounded-lg p-3.5 hover:bg-accent/30 transition-colors group"
                onClick={() => onDetalhes(o)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {CatIcon && <CatIcon className={`h-4 w-4 shrink-0 mt-0.5 ${catConfig?.color}`} />}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{o.titulo}</p>
                      <p className="text-xs text-muted-foreground truncate">{clienteNome}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <OcorrenciaProgressoBadge tenantId={tenantId} ocorrenciaId={o.id} />
                    <span className="text-xs text-muted-foreground hidden sm:block">{formatDate(o.data_prevista)}</span>
                    {respNome && <span className="text-xs text-muted-foreground hidden md:block">{respNome}</span>}
                    {o.lote_id && (
                      <button
                        onClick={e => { e.stopPropagation(); setFiltroLote(o.lote_id!) }}
                        title="Filtrar por este lote"
                        className="flex items-center gap-1 text-[10px] text-primary/70 hover:text-primary border border-primary/20 rounded px-1.5 py-0.5 transition-colors"
                      >
                        <Layers className="h-2.5 w-2.5" /> Lote
                      </button>
                    )}
                    <Badge variant="outline" className={`text-xs ${stConfig.className}`}>{stConfig.label}</Badge>
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

// â”€â”€â”€ Aba: Gerenciar Fluxos â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function GerenciarFluxos({ tenantId }: { tenantId: string }) {
  const { data: fluxos = [] } = useFluxos(tenantId)
  const deleteFluxo = useDeleteFluxo()

  if (fluxos.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">Nenhum fluxo cadastrado</p>
        <p className="text-xs mt-1">Fluxos são templates reutilizáveis para criar ocorrências</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {fluxos.map(f => {
        const cfg    = f.categoria ? categoriaConfig[f.categoria] : null
        const Icon   = cfg?.icon ?? FileText
        return (
          <div key={f.id} className="flex items-center gap-3 border rounded-lg p-3.5 group hover:bg-accent/20 transition-colors">
            <Icon className={`h-4 w-4 shrink-0 ${cfg?.color ?? 'text-muted-foreground'}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{f.nome}</p>
              <p className="text-xs text-muted-foreground">
                {cfg?.label ?? 'Outros'} · {f.prazo_dias_padrao} dias
                {f.valor_sugerido ? ` · ${f.valor_sugerido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` : ''}
              </p>
            </div>
            <Badge variant="outline" className="text-xs">{f.ativo ? 'Ativo' : 'Inativo'}</Badge>
          </div>
        )
      })}
    </div>
  )
}

// â”€â”€â”€ Página principal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function OcorrenciasPage() {
  const { currentUser } = useAuth()
  const tenantId = currentUser?.tenant_id ?? ''

  const [novaOcorrenciaOpen, setNovaOcorrenciaOpen]         = useState(false)
  const [novaOcorrenciaClienteId, setNovaOcorrenciaClienteId] = useState<string | undefined>()
  const [ocorrenciaSelecionada, setOcorrenciaSelecionada]   = useState<Ocorrencia | null>(null)
  const [detalheOpen, setDetalheOpen]                       = useState(false)

  function handleNova(clienteId?: string) {
    setNovaOcorrenciaClienteId(clienteId)
    setNovaOcorrenciaOpen(true)
  }

  function handleDetalhes(o: Ocorrencia) {
    setOcorrenciaSelecionada(o)
    setDetalheOpen(true)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Ocorrências</h1>
          <p className="text-muted-foreground text-sm">Processos e solicitações de clientes</p>
        </div>
        <Button onClick={() => handleNova()}>
          <Plus className="h-4 w-4 mr-1.5" /> Nova Ocorrência
        </Button>
      </div>

      <ListaOcorrencias
        tenantId={tenantId}
        onNova={handleNova}
        onDetalhes={handleDetalhes}
      />

      <NovaOcorrenciaDialog
        open={novaOcorrenciaOpen}
        onOpenChange={setNovaOcorrenciaOpen}
        initialClienteId={novaOcorrenciaClienteId}
      />

      <OcorrenciaDetalheDialog
        ocorrencia={ocorrenciaSelecionada}
        open={detalheOpen}
        onOpenChange={setDetalheOpen}
      />

      <div className="h-16 rounded-xl border border-dashed border-border/40 bg-muted/20" />
    </div>
  )
}
