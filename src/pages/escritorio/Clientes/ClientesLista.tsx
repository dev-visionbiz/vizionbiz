import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'
import { useClients, useCreateClient } from '@/data/hooks/useClients'
import { useInvoices } from '@/data/hooks/useInvoices'
import { usePessoas, useAllEmpresaPessoas } from '@/data/hooks/usePessoas'
import { useGrupos, useAllGrupoEmpresas } from '@/data/hooks/useGrupos'
import { useAllClientVinculos } from '@/data/hooks/useClientVinculos'
import { useToast } from '@/components/ui/use-toast'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Users, Search, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react'
import type { Client, TipoPessoa } from '@/domain/types'
import { formatCNPJ } from '@/lib/utils'
import { v4 as uuidv4 } from 'uuid'

type FiltroTipo = 'todos' | 'juridica' | 'fisica'
type FiltroStatus = 'todos' | 'ativo' | 'inativo'
type ColunaOrdem = 'nome' | 'doc' | 'regime' | 'status' | 'pendencias'

interface FormPJ {
  razao_social: string; fantasia: string; cnpj: string
  regime: string; email: string; telefone: string
}
interface FormPF {
  nome: string; cpf: string
  regime: string; email: string; telefone: string
}

const defaultPJ: FormPJ = { razao_social: '', fantasia: '', cnpj: '', regime: 'Simples Nacional', email: '', telefone: '' }
const defaultPF: FormPF = { nome: '', cpf: '', regime: 'MEI', email: '', telefone: '' }

function SortBtn({
  col, label, ordem, onToggle,
}: {
  col: ColunaOrdem
  label: string
  ordem: { col: ColunaOrdem; dir: 'asc' | 'desc' }
  onToggle: (col: ColunaOrdem) => void
}) {
  const active = ordem.col === col
  return (
    <button
      className={`flex items-center gap-0.5 text-xs font-medium whitespace-nowrap hover:text-foreground transition-colors cursor-pointer ${active ? 'text-foreground' : 'text-muted-foreground'}`}
      onClick={() => onToggle(col)}
    >
      {label}
      {active
        ? ordem.dir === 'asc'
          ? <ChevronUp className="h-3 w-3 shrink-0" />
          : <ChevronDown className="h-3 w-3 shrink-0" />
        : <ArrowUpDown className="h-3 w-3 shrink-0 opacity-40" />
      }
    </button>
  )
}

export default function ClientesLista() {
  const navigate = useNavigate()
  const { currentUser, currentTenant } = useAuth()
  const tenantId = currentUser?.tenant_id ?? ''

  const { data: clients, isLoading } = useClients(tenantId)
  const { data: allInvoices } = useInvoices(tenantId)
  const { data: todasPessoas } = usePessoas(tenantId)
  const { data: todasEmpPessoas } = useAllEmpresaPessoas(tenantId)
  const { data: todosVinculos } = useAllClientVinculos(tenantId)
  const { data: grupos } = useGrupos(tenantId)
  const { data: todosGrupoEmpresas } = useAllGrupoEmpresas(tenantId)
  const createClient = useCreateClient()
  const { toast } = useToast()

  const [search, setSearch] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('todos')
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('todos')
  const [filtroGrupo, setFiltroGrupo] = useState('todos')
  const [ordem, setOrdem] = useState<{ col: ColunaOrdem; dir: 'asc' | 'desc' }>({ col: 'nome', dir: 'asc' })
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogTipo, setDialogTipo] = useState<TipoPessoa>('juridica')
  const [formPJ, setFormPJ] = useState<FormPJ>(defaultPJ)
  const [formPF, setFormPF] = useState<FormPF>(defaultPF)

  const today = new Date().toISOString().split('T')[0]

  // empresa_id -> nomes de pessoas vinculadas (sócios/contatos do cadastro de pessoas)
  const pessoasByEmpresa = useMemo(() => {
    const map = new Map<string, string[]>()
    if (!todasEmpPessoas || !todasPessoas) return map
    const pessoaMap = new Map(todasPessoas.map(p => [p.id, p]))
    for (const ep of todasEmpPessoas) {
      const p = pessoaMap.get(ep.pessoa_id)
      if (p) {
        const arr = map.get(ep.empresa_id) ?? []
        arr.push(p.nome.toLowerCase())
        map.set(ep.empresa_id, arr)
      }
    }
    return map
  }, [todasEmpPessoas, todasPessoas])

  // client_pj_id -> nomes dos clientes PF vinculados (sócios cadastrados como clientes)
  const pfNomesByPJ = useMemo(() => {
    const map = new Map<string, string[]>()
    if (!todosVinculos || !clients) return map
    const clientMap = new Map(clients.map(c => [c.id, c]))
    for (const v of todosVinculos) {
      const pf = clientMap.get(v.client_pf_id)
      if (pf) {
        const arr = map.get(v.client_pj_id) ?? []
        arr.push(pf.razao_social.toLowerCase())
        map.set(v.client_pj_id, arr)
      }
    }
    return map
  }, [todosVinculos, clients])

  // grupo_id -> Set de empresa_ids
  const empresasByGrupo = useMemo(() => {
    const map = new Map<string, Set<string>>()
    if (!todosGrupoEmpresas) return map
    for (const ge of todosGrupoEmpresas) {
      const s = map.get(ge.grupo_id) ?? new Set<string>()
      s.add(ge.empresa_id)
      map.set(ge.grupo_id, s)
    }
    return map
  }, [todosGrupoEmpresas])

  // client_id -> qtd faturas vencidas
  const overdueMap = useMemo(() => {
    const map = new Map<string, number>()
    if (!allInvoices) return map
    for (const inv of allInvoices) {
      if (inv.status === 'vencida' && inv.vencimento < today) {
        map.set(inv.client_id, (map.get(inv.client_id) ?? 0) + 1)
      }
    }
    return map
  }, [allInvoices, today])

  const toggleOrdem = (col: ColunaOrdem) =>
    setOrdem(prev => prev.col === col
      ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
      : { col, dir: 'asc' }
    )

  const filtered = useMemo(() => {
    if (!clients) return []
    let result = clients

    if (filtroTipo !== 'todos') result = result.filter(c => (c.tipo ?? 'juridica') === filtroTipo)
    if (filtroStatus !== 'todos') result = result.filter(c => c.status === filtroStatus)
    if (filtroGrupo !== 'todos') {
      const grpSet = empresasByGrupo.get(filtroGrupo) ?? new Set<string>()
      result = result.filter(c => grpSet.has(c.id))
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      const qD = q.replace(/\D/g, '')
      result = result.filter(c => {
        if (c.razao_social.toLowerCase().includes(q)) return true
        if (c.fantasia?.toLowerCase().includes(q)) return true
        const doc = (c.cnpj ?? c.cpf ?? '').replace(/\D/g, '')
        if (qD && doc.includes(qD)) return true
        if ((pessoasByEmpresa.get(c.id) ?? []).some(n => n.includes(q))) return true
        if ((pfNomesByPJ.get(c.id) ?? []).some(n => n.includes(q))) return true
        return false
      })
    }

    return [...result].sort((a, b) => {
      let cmp = 0
      if (ordem.col === 'nome') cmp = a.razao_social.localeCompare(b.razao_social, 'pt-BR')
      else if (ordem.col === 'doc') {
        const da = (a.cnpj ?? a.cpf ?? '').replace(/\D/g, '')
        const db = (b.cnpj ?? b.cpf ?? '').replace(/\D/g, '')
        cmp = da.localeCompare(db)
      }
      else if (ordem.col === 'regime') cmp = a.regime.localeCompare(b.regime, 'pt-BR')
      else if (ordem.col === 'status') cmp = a.status.localeCompare(b.status, 'pt-BR')
      else if (ordem.col === 'pendencias') cmp = (overdueMap.get(a.id) ?? 0) - (overdueMap.get(b.id) ?? 0)
      return ordem.dir === 'asc' ? cmp : -cmp
    })
  }, [clients, filtroTipo, filtroStatus, filtroGrupo, search, pessoasByEmpresa, pfNomesByPJ, empresasByGrupo, ordem, overdueMap])

  const openDialog = () => {
    setFormPJ(defaultPJ)
    setFormPF(defaultPF)
    setDialogTipo('juridica')
    setDialogOpen(true)
  }

  const handleCreate = async () => {
    try {
      if (dialogTipo === 'juridica') {
        if (!formPJ.razao_social.trim() || !formPJ.cnpj.trim()) return
        const novo: Client = {
          id: uuidv4(), tenant_id: tenantId, tipo: 'juridica',
          razao_social: formPJ.razao_social.trim(),
          fantasia: formPJ.fantasia.trim() || undefined,
          cnpj: formPJ.cnpj.replace(/\D/g, ''),
          regime: formPJ.regime, status: 'ativo',
          email: formPJ.email.trim() || undefined,
          telefone: formPJ.telefone.trim() || undefined,
        }
        await createClient.mutateAsync({ client: novo, modulos: currentTenant?.modulos })
        toast({ title: 'Cliente PJ criado', description: novo.razao_social })
      } else {
        if (!formPF.nome.trim()) return
        const novo: Client = {
          id: uuidv4(), tenant_id: tenantId, tipo: 'fisica',
          razao_social: formPF.nome.trim(),
          cpf: formPF.cpf.replace(/\D/g, '') || undefined,
          regime: formPF.regime, status: 'ativo',
          email: formPF.email.trim() || undefined,
          telefone: formPF.telefone.trim() || undefined,
        }
        await createClient.mutateAsync({ client: novo, modulos: currentTenant?.modulos })
        toast({ title: 'Cliente PF criado', description: novo.razao_social })
      }
      setDialogOpen(false)
    } catch {
      toast({ title: 'Erro ao criar cliente', variant: 'destructive' })
    }
  }

  const canSubmit = dialogTipo === 'juridica'
    ? formPJ.razao_social.trim() !== '' && formPJ.cnpj.trim() !== ''
    : formPF.nome.trim() !== ''

  if (isLoading) return <PageLoader />

  const hasFilters = search || filtroTipo !== 'todos' || filtroStatus !== 'todos' || filtroGrupo !== 'todos'
  const sortProps = { ordem, onToggle: toggleOrdem }

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-sm text-muted-foreground">
            {clients?.length ?? 0} cadastro(s) —{' '}
            {clients?.filter(c => (c.tipo ?? 'juridica') === 'juridica').length ?? 0} PJ,{' '}
            {clients?.filter(c => c.tipo === 'fisica').length ?? 0} PF
          </p>
        </div>
        <Button onClick={openDialog} className="sm:shrink-0">
          <Plus className="mr-2 h-4 w-4" /> Novo Cliente
        </Button>
      </div>

      {/* Filtros */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por nome, sócio, CPF, CNPJ..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={filtroTipo} onValueChange={v => setFiltroTipo(v as FiltroTipo)}>
            <SelectTrigger className="flex-1 min-w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              <SelectItem value="juridica">Pessoa Jurídica</SelectItem>
              <SelectItem value="fisica">Pessoa Física</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filtroStatus} onValueChange={v => setFiltroStatus(v as FiltroStatus)}>
            <SelectTrigger className="flex-1 min-w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos status</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="inativo">Inativo</SelectItem>
            </SelectContent>
          </Select>
          {(grupos?.length ?? 0) > 0 && (
            <Select value={filtroGrupo} onValueChange={setFiltroGrupo}>
              <SelectTrigger className="flex-1 min-w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os grupos</SelectItem>
                {grupos!.map(g => (
                  <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {hasFilters && (
        <p className="text-xs text-muted-foreground">
          {filtered.length} resultado(s) de {clients?.length ?? 0}
        </p>
      )}

      {/* Lista */}
      {!filtered.length ? (
        <EmptyState
          icon={Users}
          title={hasFilters ? 'Nenhum resultado' : 'Nenhum cliente cadastrado'}
          description={hasFilters ? 'Tente outro termo ou filtro.' : 'Clique em "Novo Cliente" para começar.'}
          action={!hasFilters ? <Button onClick={openDialog}>Novo Cliente</Button> : undefined}
        />
      ) : (
        <div className="rounded-lg border overflow-hidden">
          {/* Cabeçalho das colunas — só em telas ≥ sm */}
          <div className="hidden sm:grid grid-cols-[2.5rem_1fr_9rem_9rem_6rem_8rem_3.5rem] gap-x-3 px-4 py-2 bg-muted/40 border-b">
            <span className="text-xs font-medium text-muted-foreground">Tipo</span>
            <SortBtn col="nome" label="Nome / Razão Social" {...sortProps} />
            <SortBtn col="doc" label="Documento" {...sortProps} />
            <SortBtn col="regime" label="Regime" {...sortProps} />
            <SortBtn col="status" label="Status" {...sortProps} />
            <SortBtn col="pendencias" label="Pendências" {...sortProps} />
            <span />
          </div>

          {/* Linhas */}
          <div className="divide-y">
            {filtered.map(client => {
              const tipo = client.tipo ?? 'juridica'
              const vencidas = overdueMap.get(client.id) ?? 0
              const doc = tipo === 'juridica'
                ? (client.cnpj ? formatCNPJ(client.cnpj) : '—')
                : (client.cpf ?? '—')
              const tipoBadgeClass = tipo === 'fisica' ? 'border-blue-400 text-blue-600' : 'border-purple-400 text-purple-600'
              return (
                <div
                  key={client.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => navigate(`/escritorio/clientes/${client.id}`)}
                >
                  {/* Mobile card */}
                  <div className="sm:hidden px-4 py-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge variant="outline" className={`text-xs w-8 justify-center shrink-0 ${tipoBadgeClass}`}>
                          {tipo === 'fisica' ? 'PF' : 'PJ'}
                        </Badge>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{client.razao_social}</p>
                          {client.fantasia && <p className="text-xs text-muted-foreground truncate">{client.fantasia}</p>}
                        </div>
                      </div>
                      <Badge variant={client.status === 'ativo' ? 'success' : 'secondary'} className="shrink-0">
                        {client.status === 'ativo' ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs gap-4">
                      <span className="text-muted-foreground font-mono">{doc}</span>
                      <span className="text-muted-foreground truncate">{client.regime}</span>
                    </div>
                    {vencidas > 0
                      ? <Badge variant="destructive" className="w-fit">{vencidas} vencida(s)</Badge>
                      : <span className="text-xs text-muted-foreground">Sem pendências</span>
                    }
                  </div>

                  {/* Desktop row */}
                  <div className="hidden sm:grid sm:grid-cols-[2.5rem_1fr_9rem_9rem_6rem_8rem_3.5rem] px-4 py-3 gap-x-3 items-center">
                    <Badge variant="outline" className={`text-xs w-8 justify-center shrink-0 ${tipoBadgeClass}`}>
                      {tipo === 'fisica' ? 'PF' : 'PJ'}
                    </Badge>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{client.razao_social}</p>
                      {client.fantasia && <p className="text-xs text-muted-foreground truncate">{client.fantasia}</p>}
                    </div>
                    <span className="text-xs text-muted-foreground font-mono whitespace-nowrap">{doc}</span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap truncate">{client.regime}</span>
                    <Badge variant={client.status === 'ativo' ? 'success' : 'secondary'} className="shrink-0 w-fit">
                      {client.status === 'ativo' ? 'Ativo' : 'Inativo'}
                    </Badge>
                    {vencidas > 0
                      ? <Badge variant="destructive" className="shrink-0 w-fit">{vencidas} vencida(s)</Badge>
                      : <span className="text-xs text-muted-foreground whitespace-nowrap">Sem pendências</span>
                    }
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs shrink-0"
                      onClick={e => { e.stopPropagation(); navigate(`/escritorio/clientes/${client.id}`) }}
                    >
                      Ver
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Modal novo cliente */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Cliente</DialogTitle>
          </DialogHeader>
          <Tabs value={dialogTipo} onValueChange={v => setDialogTipo(v as TipoPessoa)}>
            <TabsList className="w-full mb-4">
              <TabsTrigger value="juridica" className="flex-1">Pessoa Jurídica</TabsTrigger>
              <TabsTrigger value="fisica" className="flex-1">Pessoa Física</TabsTrigger>
            </TabsList>

            <TabsContent value="juridica" className="space-y-3">
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Razão Social *</Label>
                  <Input autoFocus value={formPJ.razao_social} onChange={e => setFormPJ(f => ({ ...f, razao_social: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Nome Fantasia</Label>
                  <Input value={formPJ.fantasia} onChange={e => setFormPJ(f => ({ ...f, fantasia: e.target.value }))} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>CNPJ *</Label>
                    <Input placeholder="00.000.000/0000-00" value={formPJ.cnpj} onChange={e => setFormPJ(f => ({ ...f, cnpj: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Regime Tributário</Label>
                    <Select value={formPJ.regime} onValueChange={v => setFormPJ(f => ({ ...f, regime: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Simples Nacional">Simples Nacional</SelectItem>
                        <SelectItem value="Lucro Presumido">Lucro Presumido</SelectItem>
                        <SelectItem value="Lucro Real">Lucro Real</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Email</Label>
                    <Input type="email" value={formPJ.email} onChange={e => setFormPJ(f => ({ ...f, email: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Telefone</Label>
                    <Input value={formPJ.telefone} onChange={e => setFormPJ(f => ({ ...f, telefone: e.target.value }))} />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="fisica" className="space-y-3">
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Nome Completo *</Label>
                  <Input autoFocus value={formPF.nome} onChange={e => setFormPF(f => ({ ...f, nome: e.target.value }))} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>CPF</Label>
                    <Input placeholder="000.000.000-00" value={formPF.cpf} onChange={e => setFormPF(f => ({ ...f, cpf: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Regime Tributário</Label>
                    <Select value={formPF.regime} onValueChange={v => setFormPF(f => ({ ...f, regime: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MEI">MEI</SelectItem>
                        <SelectItem value="Simples Nacional">Simples Nacional</SelectItem>
                        <SelectItem value="Lucro Presumido">Lucro Presumido</SelectItem>
                        <SelectItem value="Autônomo">Autônomo / Liberal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Email</Label>
                    <Input type="email" value={formPF.email} onChange={e => setFormPF(f => ({ ...f, email: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Telefone</Label>
                    <Input value={formPF.telefone} onChange={e => setFormPF(f => ({ ...f, telefone: e.target.value }))} />
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!canSubmit || createClient.isPending}>
              Criar Cliente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
