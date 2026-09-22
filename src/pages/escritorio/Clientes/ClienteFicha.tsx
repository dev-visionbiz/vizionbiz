import React, { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useSmartBack } from '@/hooks/useSmartBack'
import { useAuth } from '@/auth/AuthProvider'
import { useClient, useUpdateClient } from '@/data/hooks/useClients'
import { useUsers } from '@/data/hooks/useUsers'
import { useClientInvoices, useCreateInvoice, useUpdateInvoice } from '@/data/hooks/useInvoices'
import { useLogAtividadeCliente, useRegistrarLogAtividade } from '@/data/hooks/useLogAtividadeCliente'
import { useBillingPolicy } from '@/data/hooks/useBillingPolicy'
import { useCarteiras } from '@/data/hooks/useCarteiras'
import { useHistoricoStatusCliente, useAlterarStatusCliente } from '@/data/hooks/useHistoricoStatusCliente'
import { useClientContracts } from '@/data/hooks/useContracts'
import { useToast } from '@/components/ui/use-toast'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Plus, FolderOpen, History, UserCog, ListChecks, Pencil, Activity, FileText, CheckCircle2, XCircle } from 'lucide-react'
import type { Invoice, InvoiceStatus, ClientStatus, LogAtividadeAcao, LogAtividadeCliente } from '@/domain/types'
import { PessoasVinculadasCard } from './PessoasVinculadasCard'
import { GruposVinculadosCard } from './GruposVinculadosCard'
import { PFsVinculadosCard } from './PFsVinculadosCard'
import { EmpresasVinculadasCard } from './EmpresasVinculadasCard'
import { ContratoTab } from './ContratoTab'
import { FichaRapidaTab } from './FichaRapidaTab'
import { formatCurrency, formatDate, formatCNPJ, formatCPF } from '@/lib/utils'
import { calcularEncargos } from '@/domain/financeiro/calcularEncargos'
import { v4 as uuidv4 } from 'uuid'

const invoiceStatusConfig: Record<InvoiceStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' }> = {
  aberta: { label: 'Aberta', variant: 'default' },
  vencida: { label: 'Vencida', variant: 'destructive' },
  paga: { label: 'Paga', variant: 'success' },
  cancelada: { label: 'Cancelada', variant: 'secondary' },
  renegociada: { label: 'Renegociada', variant: 'outline' },
}

function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const { label, variant } = invoiceStatusConfig[status]
  return (
    <Badge variant={variant as 'default' | 'secondary' | 'destructive' | 'outline'} className={
      status === 'paga' ? 'bg-green-100 text-green-800 border-transparent' :
      status === 'renegociada' ? 'bg-purple-100 text-purple-800 border-transparent' : ''
    }>
      {label}
    </Badge>
  )
}

const logAcaoConfig: Record<LogAtividadeAcao, { icon: React.ElementType; cor: string; label: string }> = {
  cadastro_criado:     { icon: History,       cor: 'text-blue-500',   label: 'Cadastro criado' },
  dados_editados:      { icon: Pencil,        cor: 'text-amber-500',  label: 'Dados editados' },
  status_alterado:     { icon: Activity,      cor: 'text-purple-500', label: 'Status alterado' },
  fatura_criada:       { icon: FileText,      cor: 'text-sky-500',    label: 'Fatura criada' },
  fatura_baixada:      { icon: CheckCircle2,  cor: 'text-green-500',  label: 'Fatura baixada' },
  fatura_cancelada:    { icon: XCircle,       cor: 'text-red-500',    label: 'Fatura cancelada' },
  contrato_criado:     { icon: FileText,      cor: 'text-sky-500',    label: 'Contrato criado' },
  contrato_ativado:    { icon: CheckCircle2,  cor: 'text-green-500',  label: 'Contrato ativado' },
  contrato_suspenso:   { icon: Activity,      cor: 'text-amber-500',  label: 'Contrato suspenso' },
  contrato_encerrado:  { icon: XCircle,       cor: 'text-red-500',    label: 'Contrato encerrado' },
  documento_enviado:   { icon: FileText,      cor: 'text-indigo-500', label: 'Documento enviado' },
  ficha_rapida_alterada: { icon: Pencil,      cor: 'text-cyan-500',   label: 'Ficha rápida' },
  tarefa_concluida:    { icon: CheckCircle2,  cor: 'text-green-500',  label: 'Tarefa concluída' },
  tarefa_atualizada:   { icon: Activity,      cor: 'text-orange-500', label: 'Tarefa atualizada' },
  vinculo_adicionado:      { icon: CheckCircle2, cor: 'text-teal-500',   label: 'Vínculo adicionado' },
  vinculo_removido:        { icon: XCircle,      cor: 'text-slate-500',  label: 'Vínculo removido' },
  demanda_criada:          { icon: FileText,     cor: 'text-violet-500', label: 'Demanda criada' },
  demanda_concluida:       { icon: CheckCircle2, cor: 'text-green-500',  label: 'Demanda concluída' },
  etapa_demanda_atualizada: { icon: Activity,    cor: 'text-orange-500', label: 'Etapa de demanda' },
}

function LogEntrada({ entrada }: { entrada: LogAtividadeCliente }) {
  const cfg = logAcaoConfig[entrada.acao] ?? { icon: History, cor: 'text-muted-foreground', label: entrada.acao }
  const Icon = cfg.icon
  const [datePart, timePart] = entrada.em.split('T')
  const hora = timePart ? timePart.slice(0, 5) : ''
  return (
    <div className="relative flex gap-4 pl-2 pb-4">
      <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background border">
        <Icon className={`h-4 w-4 ${cfg.cor}`} />
      </div>
      <div className="flex-1 min-w-0 pt-1">
        <p className="text-sm font-medium leading-tight">{entrada.descricao}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {cfg.label} · {formatDate(datePart)}{hora && ` às ${hora}`} · {entrada.usuario_nome}
        </p>
      </div>
    </div>
  )
}

export default function ClienteFicha() {
  const { id: clientId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const goBack = useSmartBack('/escritorio/clientes')
  const { currentUser } = useAuth()
  const tenantId = currentUser?.tenant_id ?? ''

  const { data: client, isLoading: loadingClient } = useClient(clientId ?? '')
  const { data: portalUsers } = useUsers(tenantId, true)
  const clientUsers = portalUsers?.filter((u) => u.client_id === clientId && u.papel === 'cliente') ?? []
  const { data: invoices } = useClientInvoices(tenantId, clientId ?? '')
  const { data: policy } = useBillingPolicy(tenantId)
  const { data: carteiras } = useCarteiras(tenantId)
  const { data: historicoStatus } = useHistoricoStatusCliente(tenantId, clientId ?? '')
  const { data: contracts } = useClientContracts(tenantId, clientId ?? '')
  const { data: logAtividades } = useLogAtividadeCliente(tenantId, clientId ?? '')
  const updateClient = useUpdateClient()
  const alterarStatus = useAlterarStatusCliente()
  const createInvoice = useCreateInvoice()
  const updateInvoice = useUpdateInvoice()
  const registrarLog = useRegistrarLogAtividade()
  const { toast } = useToast()

  const log = (acao: LogAtividadeAcao, descricao: string) => {
    registrarLog.mutate({
      tenantId,
      clientId: clientId ?? '',
      acao,
      descricao,
      usuarioId: currentUser?.id ?? 'desconhecido',
      usuarioNome: currentUser?.nome ?? 'Sistema',
    })
  }

  const isProspect = !contracts?.some(
    (c) => (!c.natureza || c.natureza === 'principal') && (c.status === 'ativo' || c.status === 'suspenso' || c.status === 'rascunho')
  )

  // Client edit form
  const [editData, setEditData] = useState<{
    razao_social: string
    cnpj: string
    cpf: string
    fantasia: string
    email: string
    telefone: string
    regime: string
    carteira_id: string
  } | null>(null)

  // Status change dialog
  const [statusDialog, setStatusDialog] = useState(false)
  const [statusForm, setStatusForm] = useState<{ novoStatus: ClientStatus; motivo: string }>({
    novoStatus: 'ativo',
    motivo: '',
  })

  // Invoice dialog (avulsa)
  const [invoiceDialog, setInvoiceDialog] = useState(false)
  const [invoiceForm, setInvoiceForm] = useState({
    competencia: '',
    vencimento: '',
    valor_original: '',
  })

  // Payment dialog
  const [payDialog, setPayDialog] = useState(false)
  const [payTarget, setPayTarget] = useState<Invoice | null>(null)
  const [payDate, setPayDate] = useState(() => new Date().toISOString().split('T')[0])

  // Tab navigation
  const [activeTab, setActiveTab] = useState('dados')

  // Invoice filter
  const [filterStatus, setFilterStatus] = useState<string>('todos')
  const [filterComp, setFilterComp] = useState('')

  const today = new Date()

  const filteredInvoices = invoices?.filter((inv) => {
    if (filterStatus !== 'todos' && inv.status !== filterStatus) return false
    if (filterComp && !inv.competencia.includes(filterComp)) return false
    return true
  })

  const startEdit = () => {
    if (!client) return
    setEditData({
      razao_social: client.razao_social,
      cnpj: client.cnpj ?? '',
      cpf: client.cpf ?? '',
      fantasia: client.fantasia ?? '',
      email: client.email ?? '',
      telefone: client.telefone ?? '',
      regime: client.regime,
      carteira_id: client.carteira_id ?? '',
    })
  }

  const saveClient = async () => {
    if (!editData || !client) return
    try {
      const isPJ = client.tipo === 'juridica' || !client.tipo
      await updateClient.mutateAsync({
        id: client.id,
        data: isPJ
          ? {
              razao_social: editData.razao_social,
              cnpj: editData.cnpj,
              fantasia: editData.fantasia || undefined,
              email: editData.email || undefined,
              telefone: editData.telefone || undefined,
              regime: editData.regime,
              carteira_id: editData.carteira_id || undefined,
            }
          : {
              razao_social: editData.razao_social,
              cpf: editData.cpf || undefined,
              email: editData.email || undefined,
              telefone: editData.telefone || undefined,
              regime: editData.regime,
              carteira_id: editData.carteira_id || undefined,
            },
      })
      log('dados_editados', 'Dados cadastrais atualizados')
      toast({ title: 'Cliente atualizado' })
      setEditData(null)
    } catch {
      toast({ title: 'Erro', variant: 'destructive' })
    }
  }

  const openStatusDialog = () => {
    if (!client) return
    setStatusForm({ novoStatus: client.status === 'ativo' ? 'inativo' : 'ativo', motivo: '' })
    setStatusDialog(true)
  }

  const confirmarAlteracaoStatus = async () => {
    if (!client || !statusForm.motivo.trim()) {
      toast({ title: 'Informe o motivo da alteração', variant: 'destructive' })
      return
    }
    try {
      await alterarStatus.mutateAsync({
        tenantId,
        clientId: client.id,
        novoStatus: statusForm.novoStatus,
        motivo: statusForm.motivo,
        alteradoPor: currentUser?.id ?? 'desconhecido',
      })
      log('status_alterado', `Status alterado para ${statusForm.novoStatus === 'ativo' ? 'Ativo' : 'Inativo'}: ${statusForm.motivo}`)
      toast({ title: `Status alterado para ${statusForm.novoStatus === 'ativo' ? 'Ativo' : 'Inativo'}` })
      setStatusDialog(false)
    } catch {
      toast({ title: 'Erro ao alterar status', variant: 'destructive' })
    }
  }

  const createAvulsa = async () => {
    if (!invoiceForm.competencia || !invoiceForm.vencimento || !invoiceForm.valor_original) return
    const nova: Invoice = {
      id: uuidv4(),
      tenant_id: tenantId,
      client_id: clientId ?? '',
      competencia: invoiceForm.competencia,
      vencimento: invoiceForm.vencimento,
      valor_original: parseFloat(invoiceForm.valor_original),
      status: 'aberta',
      origem: 'avulsa',
    }
    try {
      await createInvoice.mutateAsync(nova)
      log('fatura_criada', `Fatura avulsa criada — competência ${invoiceForm.competencia}, venc. ${invoiceForm.vencimento}`)
      toast({ title: 'Fatura avulsa criada' })
      setInvoiceDialog(false)
      setInvoiceForm({ competencia: '', vencimento: '', valor_original: '' })
    } catch {
      toast({ title: 'Erro', variant: 'destructive' })
    }
  }

  const openPay = (inv: Invoice) => {
    setPayTarget(inv)
    setPayDate(new Date().toISOString().split('T')[0])
    setPayDialog(true)
  }

  const confirmPay = async () => {
    if (!payTarget) return
    try {
      await updateInvoice.mutateAsync({ id: payTarget.id, data: { status: 'paga' } })
      log('fatura_baixada', `Fatura baixada como paga — competência ${payTarget.competencia}`)
      toast({ title: 'Fatura baixada como paga' })
      setPayDialog(false)
    } catch {
      toast({ title: 'Erro', variant: 'destructive' })
    }
  }

  const cancelInvoice = async (inv: Invoice) => {
    if (!confirm('Cancelar esta fatura?')) return
    try {
      await updateInvoice.mutateAsync({ id: inv.id, data: { status: 'cancelada' } })
      log('fatura_cancelada', `Fatura cancelada — competência ${inv.competencia}`)
      toast({ title: 'Fatura cancelada' })
    } catch {
      toast({ title: 'Erro', variant: 'destructive' })
    }
  }

  const getUpdatedValue = (inv: Invoice): number => {
    if (inv.status !== 'vencida' || !policy) return inv.valor_original
    const calc = calcularEncargos(inv, policy, today)
    return calc.total
  }

  if (loadingClient) return <PageLoader />
  if (!client) return (
    <EmptyState title="Cliente não encontrado" description="Volte para a lista de clientes." />
  )

  const carteiraAtual = carteiras?.find((c) => c.id === client.carteira_id)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 min-w-0">
        <Button variant="ghost" size="sm" className="shrink-0 gap-1.5" onClick={goBack}>
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Clientes</span>
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold truncate">{client.razao_social}</h1>
            {(client.tipo === 'juridica' || !client.tipo) ? (
              <Badge className="bg-purple-100 text-purple-800 border-transparent text-xs shrink-0">PJ</Badge>
            ) : (
              <Badge className="bg-blue-100 text-blue-800 border-transparent text-xs shrink-0">PF</Badge>
            )}
          </div>
          {(client.tipo === 'juridica' || !client.tipo) ? (
            <>
              {client.cnpj && <p className="text-sm text-muted-foreground font-mono">{formatCNPJ(client.cnpj)}</p>}
              {client.fantasia && <p className="text-sm text-muted-foreground truncate">{client.fantasia}</p>}
            </>
          ) : (
            client.cpf && <p className="text-sm text-muted-foreground font-mono">{formatCPF(client.cpf)}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          {isProspect && (
            <Badge className="bg-amber-100 text-amber-800 border-transparent">Prospect</Badge>
          )}
          <Badge
            variant={client.status === 'ativo' ? 'success' : 'secondary'}
            className="cursor-pointer"
            onClick={openStatusDialog}
          >
            {client.status === 'ativo' ? 'Ativo' : 'Inativo'}
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        {/* Mobile: select dropdown */}
        <Select value={activeTab} onValueChange={setActiveTab}>
          <SelectTrigger className="w-full sm:hidden">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="dados">Dados</SelectItem>
            <SelectItem value="contrato">Contrato</SelectItem>
            <SelectItem value="faturas">Faturas</SelectItem>
            <SelectItem value="historico">Histórico</SelectItem>
            <SelectItem value="ficha">Ficha Rápida</SelectItem>
          </SelectContent>
        </Select>

        {/* Desktop: tab bar */}
        <TabsList className="hidden sm:flex">
          <TabsTrigger value="dados">Dados</TabsTrigger>
          <TabsTrigger value="contrato">Contrato</TabsTrigger>
          <TabsTrigger value="faturas">Faturas</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
          <TabsTrigger value="ficha">Ficha Rápida</TabsTrigger>
        </TabsList>

        {/* ABA DADOS */}
        <TabsContent value="dados" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Dados do Cliente</CardTitle>
                <div className="flex items-center gap-2">
                  <Button asChild variant="ghost" size="sm">
                    <Link to={`/escritorio/documentos?cliente=${clientId}`}>
                      <FolderOpen className="h-4 w-4 mr-1" />
                      Documentos
                    </Link>
                  </Button>
                  <Button asChild variant="ghost" size="sm">
                    <Link to={`/escritorio/obrigacoes?tab=consulta&cliente=${clientId}`}>
                      <ListChecks className="h-4 w-4 mr-1" />
                      Obrigações
                    </Link>
                  </Button>
                  {!editData && <Button variant="outline" size="sm" onClick={startEdit}>Editar</Button>}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {editData ? (
                <div className="space-y-4 max-w-md">
                  <div className="space-y-1">
                    <Label>{client.tipo === 'fisica' ? 'Nome' : 'Razão Social'}</Label>
                    <Input value={editData.razao_social} onChange={(e) => setEditData((d) => d && ({ ...d, razao_social: e.target.value }))} />
                  </div>
                  {(client.tipo === 'juridica' || !client.tipo) ? (
                    <>
                      <div className="space-y-1">
                        <Label>Nome Fantasia</Label>
                        <Input value={editData.fantasia} onChange={(e) => setEditData((d) => d && ({ ...d, fantasia: e.target.value }))} />
                      </div>
                      <div className="space-y-1">
                        <Label>CNPJ</Label>
                        <Input value={editData.cnpj} onChange={(e) => setEditData((d) => d && ({ ...d, cnpj: e.target.value }))} />
                      </div>
                    </>
                  ) : (
                    <div className="space-y-1">
                      <Label>CPF</Label>
                      <Input value={editData.cpf} onChange={(e) => setEditData((d) => d && ({ ...d, cpf: e.target.value }))} />
                    </div>
                  )}
                  <div className="space-y-1">
                    <Label>Email</Label>
                    <Input type="email" value={editData.email} onChange={(e) => setEditData((d) => d && ({ ...d, email: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Telefone</Label>
                    <Input value={editData.telefone} onChange={(e) => setEditData((d) => d && ({ ...d, telefone: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Regime</Label>
                    <Select value={editData.regime} onValueChange={(v) => setEditData((d) => d && ({ ...d, regime: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Simples Nacional">Simples Nacional</SelectItem>
                        <SelectItem value="Lucro Presumido">Lucro Presumido</SelectItem>
                        <SelectItem value="Lucro Real">Lucro Real</SelectItem>
                        <SelectItem value="MEI">MEI</SelectItem>
                        <SelectItem value="Autônomo">Autônomo / Liberal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Carteira</Label>
                    <Select
                      value={editData.carteira_id || '__none__'}
                      onValueChange={(v) => setEditData((d) => d && ({ ...d, carteira_id: v === '__none__' ? '' : v }))}
                    >
                      <SelectTrigger><SelectValue placeholder="Sem carteira" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Sem carteira</SelectItem>
                        {carteiras?.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={saveClient}>Salvar</Button>
                    <Button variant="outline" onClick={() => setEditData(null)}>Cancelar</Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">{client.tipo === 'fisica' ? 'Nome' : 'Razão Social'}:</span> <span className="font-medium wrap-break-word">{client.razao_social}</span></div>
                  {(client.tipo === 'juridica' || !client.tipo) && client.cnpj && (
                    <div><span className="text-muted-foreground">CNPJ:</span> <span className="font-mono">{formatCNPJ(client.cnpj)}</span></div>
                  )}
                  {client.tipo === 'fisica' && client.cpf && (
                    <div><span className="text-muted-foreground">CPF:</span> <span className="font-mono">{formatCPF(client.cpf)}</span></div>
                  )}
                  {(client.tipo === 'juridica' || !client.tipo) && client.fantasia && (
                    <div><span className="text-muted-foreground">Fantasia:</span> <span className="font-medium">{client.fantasia}</span></div>
                  )}
                  {client.email && (
                    <div><span className="text-muted-foreground">Email:</span> <span className="break-all">{client.email}</span></div>
                  )}
                  {client.telefone && (
                    <div><span className="text-muted-foreground">Telefone:</span> <span>{client.telefone}</span></div>
                  )}
                  <div><span className="text-muted-foreground">Regime:</span> <span className="capitalize">{client.regime}</span></div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant={client.status === 'ativo' ? 'success' : 'secondary'} className="cursor-pointer" onClick={openStatusDialog}>
                      {client.status === 'ativo' ? 'Ativo' : 'Inativo'}
                    </Badge>
                    <button
                      className="text-xs text-muted-foreground underline hover:text-foreground"
                      onClick={openStatusDialog}
                    >
                      Alterar
                    </button>
                  </div>
                  {carteiraAtual ? (
                    <div><span className="text-muted-foreground">Carteira:</span> <Badge variant="outline" className="ml-1">{carteiraAtual.nome}</Badge></div>
                  ) : (
                    <div><span className="text-muted-foreground">Carteira:</span> <span className="text-muted-foreground italic">Não definida</span></div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Histórico de Status */}
          {(historicoStatus?.length ?? 0) > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">Histórico de Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {historicoStatus!.map((h) => (
                    <div key={h.id} className="flex items-start gap-3 text-sm rounded-md border px-3 py-2">
                      <Badge variant={h.status === 'ativo' ? 'success' : 'secondary'} className="shrink-0 mt-0.5">
                        {h.status === 'ativo' ? 'Ativo' : 'Inativo'}
                      </Badge>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{h.motivo}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(h.data.split('T')[0])}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Usuários do Portal</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground gap-1"
                  onClick={() => navigate('/escritorio/configuracoes')}
                >
                  <UserCog className="h-3.5 w-3.5" />
                  Gerenciar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {clientUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum usuário vinculado a este cliente.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {clientUsers.map((u) => (
                    <div key={u.id} className={`flex items-center gap-3 text-sm ${!u.ativo ? 'opacity-50' : ''}`}>
                      <span className="flex-1 font-medium truncate">{u.nome}</span>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {u.papel_portal === 'membro' ? 'Membro' : 'Responsável'}
                      </Badge>
                      {!u.ativo && <Badge variant="secondary" className="text-xs shrink-0">Inativo</Badge>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {client.tipo === 'fisica' ? (
            <>
              <EmpresasVinculadasCard tenantId={tenantId} clientId={clientId ?? ''} />
              <GruposVinculadosCard tenantId={tenantId} clientId={clientId ?? ''} />
            </>
          ) : (
            <>
              <PessoasVinculadasCard tenantId={tenantId} clientId={clientId ?? ''} />
              <GruposVinculadosCard tenantId={tenantId} clientId={clientId ?? ''} />
              <PFsVinculadosCard tenantId={tenantId} clientId={clientId ?? ''} />
            </>
          )}
        </TabsContent>

        {/* ABA CONTRATO */}
        <TabsContent value="contrato" className="mt-4">
          <ContratoTab tenantId={tenantId} clientId={clientId ?? ''} />
        </TabsContent>

        {/* ABA FATURAS */}
        <TabsContent value="faturas" className="mt-4 space-y-4">
          <div className="space-y-2">
            <div className="flex gap-2 flex-wrap">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="flex-1 min-w-36">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="aberta">Aberta</SelectItem>
                  <SelectItem value="vencida">Vencida</SelectItem>
                  <SelectItem value="paga">Paga</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                  <SelectItem value="renegociada">Renegociada</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Competência (ex: 2025-07)"
                value={filterComp}
                onChange={(e) => setFilterComp(e.target.value)}
                className="flex-1 min-w-36"
              />
            </div>
            <Button size="sm" className="w-full sm:w-auto" onClick={() => setInvoiceDialog(true)}>
              <Plus className="mr-2 h-4 w-4" /> Fatura Avulsa
            </Button>
          </div>

          {!filteredInvoices?.length ? (
            <EmptyState title="Nenhuma fatura" description="Não há faturas com os filtros selecionados." />
          ) : (
            <div className="flex flex-col gap-2">
              {filteredInvoices.map((inv) => {
                const updatedVal = getUpdatedValue(inv)
                const hasCharges = updatedVal > inv.valor_original
                return (
                  <div key={inv.id} className="rounded-lg border bg-card p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-sm">Competência {inv.competencia}</p>
                      <InvoiceStatusBadge status={inv.status} />
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      <span className="text-muted-foreground">Vencimento</span>
                      <span className="text-right font-medium">{formatDate(inv.vencimento)}</span>
                      <span className="text-muted-foreground">Valor original</span>
                      <span className="text-right">{formatCurrency(inv.valor_original)}</span>
                      {hasCharges && (
                        <>
                          <span className="text-muted-foreground">Com encargos</span>
                          <span className="text-right font-semibold text-destructive">{formatCurrency(updatedVal)}</span>
                        </>
                      )}
                    </div>
                    {(inv.status === 'aberta' || inv.status === 'vencida') && (
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => openPay(inv)}>Baixar</Button>
                        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => cancelInvoice(inv)}>Cancelar</Button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* ABA HISTÓRICO */}
        <TabsContent value="historico" className="mt-4">
          {!logAtividades?.length ? (
            <EmptyState icon={History} title="Sem registros" description="Nenhuma atividade registrada para este cliente." />
          ) : (
            <div className="relative flex flex-col gap-0">
              <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />
              {logAtividades.map((entrada) => (
                <LogEntrada key={entrada.id} entrada={entrada} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ABA FICHA RÁPIDA */}
        <TabsContent value="ficha" className="mt-4">
          <FichaRapidaTab tenantId={tenantId} clientId={clientId ?? ''} />
        </TabsContent>
      </Tabs>

      {/* Dialog: Alterar Status */}
      <Dialog open={statusDialog} onOpenChange={setStatusDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Alterar Status do Cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Novo Status</Label>
              <Select
                value={statusForm.novoStatus}
                onValueChange={(v) => setStatusForm((f) => ({ ...f, novoStatus: v as ClientStatus }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="st-motivo">Motivo *</Label>
              <Textarea
                id="st-motivo"
                rows={3}
                placeholder="Descreva o motivo da alteração..."
                value={statusForm.motivo}
                onChange={(e) => setStatusForm((f) => ({ ...f, motivo: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialog(false)}>Cancelar</Button>
            <Button
              onClick={confirmarAlteracaoStatus}
              disabled={!statusForm.motivo.trim() || alterarStatus.isPending}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice Avulsa Dialog */}
      <Dialog open={invoiceDialog} onOpenChange={setInvoiceDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Fatura Avulsa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="inv-comp">Competência (AAAA-MM)</Label>
              <Input id="inv-comp" placeholder="2025-07" value={invoiceForm.competencia} onChange={(e) => setInvoiceForm((f) => ({ ...f, competencia: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="inv-venc">Vencimento</Label>
              <Input id="inv-venc" type="date" value={invoiceForm.vencimento} onChange={(e) => setInvoiceForm((f) => ({ ...f, vencimento: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="inv-valor">Valor (R$)</Label>
              <Input id="inv-valor" type="number" step="0.01" value={invoiceForm.valor_original} onChange={(e) => setInvoiceForm((f) => ({ ...f, valor_original: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInvoiceDialog(false)}>Cancelar</Button>
            <Button onClick={createAvulsa}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pay Dialog */}
      <Dialog open={payDialog} onOpenChange={setPayDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Baixa Manual</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {payTarget && (
              <p className="text-sm text-muted-foreground">
                Fatura: {payTarget.competencia} — {formatCurrency(payTarget.valor_original)}
              </p>
            )}
            <div className="space-y-1">
              <Label htmlFor="pay-date">Data do Pagamento</Label>
              <Input id="pay-date" type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialog(false)}>Cancelar</Button>
            <Button onClick={confirmPay}>Confirmar Pagamento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
