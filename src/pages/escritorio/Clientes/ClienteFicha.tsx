import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useSmartBack } from '@/hooks/useSmartBack'
import { useAuth } from '@/auth/AuthProvider'
import { useClient, useUpdateClient, useClients } from '@/data/hooks/useClients'
import { useUsers } from '@/data/hooks/useUsers'
import { useClientInvoices, useCreateInvoice, useUpdateInvoice } from '@/data/hooks/useInvoices'
import { useLogAtividadeCliente, useRegistrarLogAtividade } from '@/data/hooks/useLogAtividadeCliente'
import { useBillingPolicy } from '@/data/hooks/useBillingPolicy'
import { useCarteiras } from '@/data/hooks/useCarteiras'
import { useHistoricoStatusCliente, useAlterarStatusCliente } from '@/data/hooks/useHistoricoStatusCliente'
import { useClientContracts } from '@/data/hooks/useContracts'
import { usePFsDeEmpresa } from '@/data/hooks/useClientVinculos'
import {
  useClienteEnderecos, useCreateClienteEndereco, useUpdateClienteEndereco, useDeleteClienteEndereco,
} from '@/data/hooks/useClienteEnderecos'
import {
  useClienteContatos, useCreateClienteContato, useUpdateClienteContato, useDeleteClienteContato,
} from '@/data/hooks/useClienteContatos'
import {
  useClienteCnaes, useCreateClienteCnae, useUpdateClienteCnae, useDeleteClienteCnae, useSyncClienteCnaes,
} from '@/data/hooks/useClienteCnaes'
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
import {
  ArrowLeft, Plus, FolderOpen, History, UserCog, ListChecks, Pencil, Activity,
  FileText, CheckCircle2, XCircle, MapPin, Phone, Mail, Star, Hash, Trash2,
  Loader2, Search, Users, AlertCircle, Info, RotateCcw,
} from 'lucide-react'
import type {
  Invoice, InvoiceStatus, ClientStatus, LogAtividadeAcao, LogAtividadeCliente,
  ClienteEndereco, ClienteContato, ClienteCnae, TipoEndereco,
} from '@/domain/types'
import { consultarCNPJ, buscarCnaes, formatarCEP, calcularDivergenciasRF } from '@/lib/brasilApi'
import type { DadosCNPJ, Divergencia } from '@/lib/brasilApi'
import { PessoasVinculadasCard } from './PessoasVinculadasCard'
import { GruposVinculadosCard } from './GruposVinculadosCard'
import { PFsVinculadosCard } from './PFsVinculadosCard'
import { ImportarSociosDialog } from './ImportarSociosDialog'
import { EmpresasVinculadasCard } from './EmpresasVinculadasCard'
import { ContratoTab } from './ContratoTab'
import { FichaRapidaTab } from './FichaRapidaTab'
import { AberturaTab } from './AberturaTab'
import { AlteracoesTab } from './AlteracoesTab'
import { formatCurrency, formatDate, formatCNPJ, formatCPF } from '@/lib/utils'
import { calcularEncargos } from '@/domain/financeiro/calcularEncargos'
import { v4 as uuidv4 } from 'uuid'

const TIPO_ENDERECO_LABEL: Record<TipoEndereco, string> = {
  fiscal: 'Fiscal',
  correspondencia: 'Correspondência',
  entrega: 'Entrega',
  cobranca: 'Cobrança',
  outro: 'Outro',
}

const UF_OPTIONS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA',
  'MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN',
  'RS','RO','RR','SC','SP','SE','TO',
]

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
  abertura_iniciada:       { icon: FileText,     cor: 'text-amber-500',  label: 'Abertura iniciada' },
  abertura_concluida:      { icon: CheckCircle2, cor: 'text-green-500',  label: 'Abertura concluída' },
  abertura_cancelada:      { icon: XCircle,      cor: 'text-red-500',    label: 'Abertura cancelada' },
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
  const { data: enderecos } = useClienteEnderecos(tenantId, clientId ?? '')
  const { data: contatos } = useClienteContatos(tenantId, clientId ?? '')
  const { data: cnaes } = useClienteCnaes(tenantId, clientId ?? '')
  const { data: socios } = usePFsDeEmpresa(tenantId, clientId ?? '')
  const { data: todosClientes = [] } = useClients(tenantId)

  const updateClient = useUpdateClient()
  const alterarStatus = useAlterarStatusCliente()
  const createInvoice = useCreateInvoice()
  const updateInvoice = useUpdateInvoice()
  const registrarLog = useRegistrarLogAtividade()
  const createEndereco = useCreateClienteEndereco()
  const updateEndereco = useUpdateClienteEndereco()
  const deleteEndereco = useDeleteClienteEndereco()
  const createContato = useCreateClienteContato()
  const updateContato = useUpdateClienteContato()
  const deleteContato = useDeleteClienteContato()
  const createCnae = useCreateClienteCnae()
  const updateCnae = useUpdateClienteCnae()
  const deleteCnae = useDeleteClienteCnae()
  const syncCnaes = useSyncClienteCnaes()
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
    inscricao_estadual: string
    inscricao_municipal: string
    rg: string
    rg_orgao_expedidor: string
    data_nascimento: string
    titulo_eleitor: string
    doc_profissional_tipo: string
    doc_profissional_numero: string
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

  // Endereço dialog
  const [enderecoDialog, setEnderecoDialog] = useState(false)
  const [editingEndereco, setEditingEndereco] = useState<ClienteEndereco | null>(null)
  const [enderecoForm, setEnderecoForm] = useState<{
    tipo: TipoEndereco
    descricao: string
    cep: string
    logradouro: string
    numero: string
    complemento: string
    bairro: string
    cidade: string
    estado: string
    principal: boolean
  }>({ tipo: 'fiscal', descricao: '', cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '', principal: false })

  // Contato dialog
  const [contatoDialog, setContatoDialog] = useState(false)
  const [editingContato, setEditingContato] = useState<ClienteContato | null>(null)
  const [contatoForm, setContatoForm] = useState({
    nome: '', setor: '', cargo: '', telefone: '', email: '', principal: false, obs: '',
  })

  // CNAE dialog
  const [cnaeDialog, setCnaeDialog] = useState(false)
  const [editingCnae, setEditingCnae] = useState<ClienteCnae | null>(null)
  const [cnaeForm, setCnaeForm] = useState({ codigo: '', descricao: '', principal: false })

  // CNAE autocomplete
  const [cnaeBusca, setCnaeBusca] = useState('')
  const [cnaeResultados, setCnaeResultados] = useState<Array<{ codigo: string; descricao: string }>>([])
  const [cnaeBuscando, setCnaeBuscando] = useState(false)
  const [cnaeDropdown, setCnaeDropdown] = useState(false)
  const cnaeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!cnaeDialog) { setCnaeBusca(''); setCnaeResultados([]); return }
    if (cnaeTimerRef.current) clearTimeout(cnaeTimerRef.current)
    if (cnaeBusca.length < 2) { setCnaeResultados([]); setCnaeDropdown(false); return }
    setCnaeBuscando(true)
    cnaeTimerRef.current = setTimeout(async () => {
      try {
        const res = await buscarCnaes(cnaeBusca)
        setCnaeResultados(res)
        setCnaeDropdown(res.length > 0)
      } finally {
        setCnaeBuscando(false)
      }
    }, 400)
    return () => { if (cnaeTimerRef.current) clearTimeout(cnaeTimerRef.current) }
  }, [cnaeBusca, cnaeDialog])

  const selecionarCnae = (item: { codigo: string; descricao: string }) => {
    setCnaeForm((f) => ({ ...f, codigo: item.codigo, descricao: item.descricao }))
    setCnaeBusca('')
    setCnaeResultados([])
    setCnaeDropdown(false)
  }

  // CNPJ consulta na ficha
  const [cnpjConsultando, setCnpjConsultando] = useState(false)
  const [dadosCNPJ, setDadosCNPJ] = useState<DadosCNPJ | null>(null)
  const [divergenciasRF, setDivergenciasRF] = useState<Divergencia[]>([])
  const [sociosImportOpen, setSociosImportOpen] = useState(false)
  const [forcarSyncando, setForcarSyncando] = useState(false)
  const [confirmacaoConfig, setConfirmacaoConfig] = useState<{
    titulo: string; descricao: string; confirmLabel?: string
  } | null>(null)
  const confirmacaoAcao = useRef<(() => Promise<void>) | null>(null)

  const pedirConfirmacao = useCallback(
    (config: { titulo: string; descricao: string; confirmLabel?: string }, acao: () => Promise<void>) => {
      confirmacaoAcao.current = acao
      setConfirmacaoConfig(config)
    },
    [],
  )

  const consultarCNPJFicha = async () => {
    if (!client?.cnpj) return
    setCnpjConsultando(true)
    setDadosCNPJ(null)
    setDivergenciasRF([])
    try {
      const dados = await consultarCNPJ(client.cnpj)
      setDadosCNPJ(dados)
      const divs = calcularDivergenciasRF(client, enderecos, cnaes, dados)
      setDivergenciasRF(divs)
      if (editData) {
        setEditData((d) => d && {
          ...d,
          razao_social: dados.razao_social || d.razao_social,
          fantasia: dados.nome_fantasia || d.fantasia,
          email: dados.email?.toLowerCase() || d.email,
          telefone: dados.ddd_telefone_1?.trim() || d.telefone,
        })
      }
      toast({
        title: divs.length === 0
          ? 'Cadastro em dia com a Receita Federal'
          : `${divs.length} divergência(s) encontrada(s) com a Receita Federal`,
      })
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : 'Erro ao consultar CNPJ', variant: 'destructive' })
    } finally {
      setCnpjConsultando(false)
    }
  }

  const importarEnderecoReceita = async () => {
    if (!dadosCNPJ || !clientId) return
    try {
      const endFiscal = enderecos?.find((e) => e.tipo === 'fiscal' && e.principal)
        ?? enderecos?.find((e) => e.tipo === 'fiscal')
      const dados = {
        cep: formatarCEP(dadosCNPJ.cep),
        logradouro: dadosCNPJ.logradouro || '',
        numero: dadosCNPJ.numero || 'S/N',
        complemento: dadosCNPJ.complemento || undefined,
        bairro: dadosCNPJ.bairro || '',
        cidade: dadosCNPJ.municipio || '',
        estado: dadosCNPJ.uf || '',
      }
      if (endFiscal) {
        await updateEndereco.mutateAsync({ id: endFiscal.id, data: dados })
        toast({ title: 'Endereço fiscal atualizado' })
      } else {
        await createEndereco.mutateAsync({
          id: uuidv4(), tenant_id: tenantId, cliente_id: clientId,
          tipo: 'fiscal', principal: true, ...dados,
        })
        toast({ title: 'Endereço fiscal importado' })
      }
    } catch {
      toast({ title: 'Erro ao importar endereço', variant: 'destructive' })
    }
  }

  const importarCnaesReceita = async () => {
    if (!dadosCNPJ || !clientId) return
    try {
      const todos = [
        { id: uuidv4(), tenant_id: tenantId, cliente_id: clientId, codigo: String(dadosCNPJ.cnae_fiscal), descricao: dadosCNPJ.cnae_fiscal_descricao, principal: true },
        ...(dadosCNPJ.cnaes_secundarios ?? []).map((c) => ({
          id: uuidv4(), tenant_id: tenantId, cliente_id: clientId,
          codigo: String(c.codigo), descricao: c.descricao, principal: false,
        })),
      ]
      await syncCnaes.mutateAsync({ tenantId, clienteId: clientId, cnaes: todos })
      toast({ title: `CNAEs sincronizados com a Receita Federal (${todos.length} no total)` })
    } catch {
      toast({ title: 'Erro ao sincronizar CNAEs', variant: 'destructive' })
    }
  }

  // Divergências por campo (para exibição condicional dos botões de importação)
  const temDivEndereco = dadosCNPJ ? divergenciasRF.some((d) => d.campo === 'Endereço Fiscal') : false
  const temDivCnaes   = dadosCNPJ ? divergenciasRF.some((d) => d.campo === 'CNAEs') : false
  const temDivSocios  = useMemo(() => {
    if (!dadosCNPJ?.qsa?.length) return false
    const vinculados = socios?.filter((s) => s.papel === 'socio' || s.papel === 'administrador') ?? []
    if (vinculados.length !== dadosCNPJ.qsa.length) return true
    const linkedIds = new Set(vinculados.map((s) => s.client_pf_id))
    const linkedNomes = new Set(
      todosClientes.filter((c) => linkedIds.has(c.id)).map((c) => c.razao_social.toLowerCase().trim()),
    )
    return dadosCNPJ.qsa.some((s) => !linkedNomes.has(s.nome_socio.toLowerCase().trim()))
  }, [dadosCNPJ, socios, todosClientes])

  const forcarSincronizacaoCompleta = async () => {
    if (!dadosCNPJ || !clientId) return
    setForcarSyncando(true)
    try {
      await updateClient.mutateAsync({
        id: clientId,
        data: {
          ...(dadosCNPJ.razao_social ? { razao_social: dadosCNPJ.razao_social } : {}),
          fantasia: dadosCNPJ.nome_fantasia || undefined,
          email: dadosCNPJ.email?.toLowerCase() || undefined,
          telefone: dadosCNPJ.ddd_telefone_1?.trim() || undefined,
        },
      })

      if (dadosCNPJ.logradouro) {
        const endFiscal = enderecos?.find((e) => e.tipo === 'fiscal' && e.principal)
          ?? enderecos?.find((e) => e.tipo === 'fiscal')
        const endDados = {
          cep: formatarCEP(dadosCNPJ.cep),
          logradouro: dadosCNPJ.logradouro,
          numero: dadosCNPJ.numero || 'S/N',
          complemento: dadosCNPJ.complemento || undefined,
          bairro: dadosCNPJ.bairro,
          cidade: dadosCNPJ.municipio,
          estado: dadosCNPJ.uf,
        }
        if (endFiscal) {
          await updateEndereco.mutateAsync({ id: endFiscal.id, data: endDados })
        } else {
          await createEndereco.mutateAsync({
            id: uuidv4(), tenant_id: tenantId, cliente_id: clientId,
            tipo: 'fiscal', principal: true, ...endDados,
          })
        }
      }

      if (dadosCNPJ.cnae_fiscal) {
        const novosCnaes = [
          { id: uuidv4(), tenant_id: tenantId, cliente_id: clientId, codigo: String(dadosCNPJ.cnae_fiscal), descricao: dadosCNPJ.cnae_fiscal_descricao, principal: true },
          ...(dadosCNPJ.cnaes_secundarios ?? []).map((c) => ({
            id: uuidv4(), tenant_id: tenantId, cliente_id: clientId,
            codigo: String(c.codigo), descricao: c.descricao, principal: false,
          })),
        ]
        await syncCnaes.mutateAsync({ tenantId, clienteId: clientId, cnaes: novosCnaes })
      }

      log('dados_editados', 'Sincronização completa com a Receita Federal')
      toast({ title: 'Sincronização completa com a Receita Federal realizada.' })
      setEditData(null)
      setDadosCNPJ(null)
      setDivergenciasRF([])
    } catch (err) {
      console.error(err)
      toast({ title: 'Erro durante a sincronização', variant: 'destructive' })
    } finally {
      setForcarSyncando(false)
    }
  }

  // Tab navigation — abre aba Abertura automaticamente para clientes em_abertura
  const [activeTab, setActiveTab] = useState(() =>
    client?.status === 'em_abertura' ? 'abertura' : 'dados'
  )

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
      inscricao_estadual: client.inscricao_estadual ?? '',
      inscricao_municipal: client.inscricao_municipal ?? '',
      rg: client.rg ?? '',
      rg_orgao_expedidor: client.rg_orgao_expedidor ?? '',
      data_nascimento: client.data_nascimento ?? '',
      titulo_eleitor: client.titulo_eleitor ?? '',
      doc_profissional_tipo: client.doc_profissional_tipo ?? '',
      doc_profissional_numero: client.doc_profissional_numero ?? '',
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
              inscricao_estadual: editData.inscricao_estadual || undefined,
              inscricao_municipal: editData.inscricao_municipal || undefined,
            }
          : {
              razao_social: editData.razao_social,
              cpf: editData.cpf || undefined,
              email: editData.email || undefined,
              telefone: editData.telefone || undefined,
              regime: editData.regime,
              carteira_id: editData.carteira_id || undefined,
              rg: editData.rg || undefined,
              rg_orgao_expedidor: editData.rg_orgao_expedidor || undefined,
              data_nascimento: editData.data_nascimento || undefined,
              titulo_eleitor: editData.titulo_eleitor || undefined,
              doc_profissional_tipo: editData.doc_profissional_tipo || undefined,
              doc_profissional_numero: editData.doc_profissional_numero || undefined,
            },
      })
      log('dados_editados', 'Dados cadastrais atualizados')
      toast({ title: 'Cliente atualizado' })
      setEditData(null)
      setDadosCNPJ(null)
      setDivergenciasRF([])
    } catch {
      toast({ title: 'Erro', variant: 'destructive' })
    }
  }

  const openStatusDialog = () => {
    if (!client) return
    const defaultNext: ClientStatus = client.status === 'ativo' ? 'inativo' : 'ativo'
    setStatusForm({ novoStatus: defaultNext, motivo: '' })
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
      log('fatura_criada', `Fatura avulsa criada – competência ${invoiceForm.competencia}, venc. ${invoiceForm.vencimento}`)
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
      log('fatura_baixada', `Fatura baixada como paga – competência ${payTarget.competencia}`)
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
      log('fatura_cancelada', `Fatura cancelada – competência ${inv.competencia}`)
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

  // ---- Endereços ----
  const openEnderecoCreate = () => {
    setEditingEndereco(null)
    setEnderecoForm({ tipo: 'fiscal', descricao: '', cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '', principal: false })
    setEnderecoDialog(true)
  }
  const openEnderecoEdit = (e: ClienteEndereco) => {
    setEditingEndereco(e)
    setEnderecoForm({ tipo: e.tipo, descricao: e.descricao ?? '', cep: e.cep, logradouro: e.logradouro, numero: e.numero, complemento: e.complemento ?? '', bairro: e.bairro, cidade: e.cidade, estado: e.estado, principal: e.principal })
    setEnderecoDialog(true)
  }
  const saveEndereco = async () => {
    if (!enderecoForm.logradouro.trim() || !enderecoForm.cep.trim()) {
      toast({ title: 'Preencha pelo menos CEP e logradouro', variant: 'destructive' })
      return
    }
    try {
      if (editingEndereco) {
        await updateEndereco.mutateAsync({ id: editingEndereco.id, data: enderecoForm })
      } else {
        await createEndereco.mutateAsync({ id: uuidv4(), tenant_id: tenantId, cliente_id: clientId ?? '', ...enderecoForm })
      }
      setEnderecoDialog(false)
    } catch {
      toast({ title: 'Erro ao salvar endereço', variant: 'destructive' })
    }
  }
  const removeEndereco = async (e: ClienteEndereco) => {
    if (!confirm('Excluir este endereço?')) return
    deleteEndereco.mutate({ id: e.id, tenantId, clienteId: clientId ?? '' })
  }

  // ---- Contatos ----
  const openContatoCreate = () => {
    setEditingContato(null)
    setContatoForm({ nome: '', setor: '', cargo: '', telefone: '', email: '', principal: false, obs: '' })
    setContatoDialog(true)
  }
  const openContatoEdit = (c: ClienteContato) => {
    setEditingContato(c)
    setContatoForm({ nome: c.nome, setor: c.setor ?? '', cargo: c.cargo ?? '', telefone: c.telefone ?? '', email: c.email ?? '', principal: c.principal, obs: c.obs ?? '' })
    setContatoDialog(true)
  }
  const saveContato = async () => {
    if (!contatoForm.nome.trim()) {
      toast({ title: 'Informe o nome do contato', variant: 'destructive' })
      return
    }
    try {
      if (editingContato) {
        await updateContato.mutateAsync({ id: editingContato.id, data: { ...contatoForm, nome: contatoForm.nome.trim() } })
      } else {
        await createContato.mutateAsync({ id: uuidv4(), tenant_id: tenantId, cliente_id: clientId ?? '', ...contatoForm, nome: contatoForm.nome.trim() })
      }
      setContatoDialog(false)
    } catch {
      toast({ title: 'Erro ao salvar contato', variant: 'destructive' })
    }
  }
  const removeContato = async (c: ClienteContato) => {
    if (!confirm('Excluir este contato?')) return
    deleteContato.mutate({ id: c.id, tenantId, clienteId: clientId ?? '' })
  }

  // ---- CNAEs ----
  const openCnaeCreate = () => {
    setEditingCnae(null)
    setCnaeForm({ codigo: '', descricao: '', principal: false })
    setCnaeDialog(true)
  }
  const openCnaeEdit = (c: ClienteCnae) => {
    setEditingCnae(c)
    setCnaeForm({ codigo: c.codigo, descricao: c.descricao, principal: c.principal })
    setCnaeDialog(true)
  }
  const saveCnae = async () => {
    if (!cnaeForm.codigo.trim() || !cnaeForm.descricao.trim()) {
      toast({ title: 'Informe o código e a descrição', variant: 'destructive' })
      return
    }
    try {
      if (editingCnae) {
        await updateCnae.mutateAsync({ id: editingCnae.id, data: cnaeForm })
      } else {
        await createCnae.mutateAsync({ id: uuidv4(), tenant_id: tenantId, cliente_id: clientId ?? '', ...cnaeForm, codigo: cnaeForm.codigo.trim(), descricao: cnaeForm.descricao.trim() })
      }
      setCnaeDialog(false)
    } catch {
      toast({ title: 'Erro ao salvar CNAE', variant: 'destructive' })
    }
  }
  const removeCnae = async (c: ClienteCnae) => {
    if (!confirm('Excluir este CNAE?')) return
    deleteCnae.mutate({ id: c.id, tenantId, clienteId: clientId ?? '' })
  }

  if (loadingClient) return <PageLoader />
  if (!client) return (
    <EmptyState title="Cliente não encontrado" description="Volte para a lista de clientes." />
  )

  const carteiraAtual = carteiras?.find((c) => c.id === client.carteira_id)
  const isPJ = client.tipo === 'juridica' || !client.tipo

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
            {isPJ ? (
              <Badge className="bg-purple-100 text-purple-800 border-transparent text-xs shrink-0">PJ</Badge>
            ) : (
              <Badge className="bg-blue-100 text-blue-800 border-transparent text-xs shrink-0">PF</Badge>
            )}
          </div>
          {isPJ ? (
            <>
              {client.cnpj && <p className="text-sm text-muted-foreground font-mono">{formatCNPJ(client.cnpj)}</p>}
              {client.fantasia && <p className="text-sm text-muted-foreground truncate">{client.fantasia}</p>}
            </>
          ) : (
            client.cpf && <p className="text-sm text-muted-foreground font-mono">{formatCPF(client.cpf)}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          {isProspect && client.status !== 'em_abertura' && (
            <Badge className="bg-amber-100 text-amber-800 border-transparent">Prospect</Badge>
          )}
          {client.status === 'em_abertura' ? (
            <Badge className="bg-amber-100 text-amber-800 border-transparent cursor-pointer" onClick={openStatusDialog}>
              Em Abertura
            </Badge>
          ) : (
            <Badge
              variant={client.status === 'ativo' ? 'success' : 'secondary'}
              className="cursor-pointer"
              onClick={openStatusDialog}
            >
              {client.status === 'ativo' ? 'Ativo' : 'Inativo'}
            </Badge>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        {/* Mobile: select dropdown */}
        <Select value={activeTab} onValueChange={setActiveTab}>
          <SelectTrigger className="w-full sm:hidden">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {client.status === 'em_abertura' && <SelectItem value="abertura">Abertura</SelectItem>}
            <SelectItem value="dados">Dados</SelectItem>
            <SelectItem value="alteracoes">Alterações</SelectItem>
            <SelectItem value="contrato">Contrato</SelectItem>
            <SelectItem value="faturas">Faturas</SelectItem>
            <SelectItem value="historico">Histórico</SelectItem>
            <SelectItem value="ficha">Ficha Rápida</SelectItem>
          </SelectContent>
        </Select>

        {/* Desktop: tab bar */}
        <TabsList className="hidden sm:flex">
          {client.status === 'em_abertura' && (
            <TabsTrigger value="abertura" className="text-amber-700 data-[state=active]:text-amber-900">
              Abertura
            </TabsTrigger>
          )}
          <TabsTrigger value="dados">Dados</TabsTrigger>
          <TabsTrigger value="alteracoes">Alterações</TabsTrigger>
          <TabsTrigger value="contrato">Contrato</TabsTrigger>
          <TabsTrigger value="faturas">Faturas</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
          <TabsTrigger value="ficha">Ficha Rápida</TabsTrigger>
        </TabsList>

        {/* ABA ABERTURA */}
        {client.status === 'em_abertura' && (
          <TabsContent value="abertura" className="mt-4">
            <AberturaTab client={client} clientId={clientId ?? ''} tenantId={tenantId} />
          </TabsContent>
        )}

        {/* ABA ALTERAÇÕES */}
        <TabsContent value="alteracoes" className="mt-4">
          <AlteracoesTab client={client} clientId={clientId ?? ''} tenantId={tenantId} />
        </TabsContent>

        {/* ABA DADOS */}
        <TabsContent value="dados" className="mt-4">
          {/* Dados Básicos */}
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
                  {isPJ ? (
                    <>
                      <div className="space-y-1">
                        <Label>Nome Fantasia</Label>
                        <Input value={editData.fantasia} onChange={(e) => setEditData((d) => d && ({ ...d, fantasia: e.target.value }))} />
                      </div>
                      <div className="space-y-1">
                        <Label>CNPJ</Label>
                        <div className="flex gap-2">
                          <Input value={editData.cnpj} onChange={(e) => setEditData((d) => d && ({ ...d, cnpj: e.target.value }))} />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="shrink-0"
                            disabled={cnpjConsultando || !editData.cnpj}
                            onClick={() => pedirConfirmacao(
                              {
                                titulo: 'Consultar Receita Federal',
                                descricao: 'Os campos de nome empresarial, nome fantasia, e-mail e telefone do formulário serão preenchidos automaticamente com os dados encontrados na Receita Federal.',
                                confirmLabel: 'Consultar',
                              },
                              consultarCNPJFicha,
                            )}
                          >
                            {cnpjConsultando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                            <span className="ml-1 hidden sm:inline">Receita</span>
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label>Inscrição Estadual</Label>
                        <Input value={editData.inscricao_estadual} onChange={(e) => setEditData((d) => d && ({ ...d, inscricao_estadual: e.target.value }))} placeholder="Isento ou número" />
                      </div>
                      <div className="space-y-1">
                        <Label>Inscrição Municipal</Label>
                        <Input value={editData.inscricao_municipal} onChange={(e) => setEditData((d) => d && ({ ...d, inscricao_municipal: e.target.value }))} placeholder="Número ou não se aplica" />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-1">
                        <Label>CPF</Label>
                        <Input value={editData.cpf} onChange={(e) => setEditData((d) => d && ({ ...d, cpf: e.target.value }))} />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label>RG</Label>
                          <Input value={editData.rg} onChange={(e) => setEditData((d) => d && ({ ...d, rg: e.target.value }))} placeholder="Número" />
                        </div>
                        <div className="space-y-1">
                          <Label>Órgão Expedidor</Label>
                          <Input value={editData.rg_orgao_expedidor} onChange={(e) => setEditData((d) => d && ({ ...d, rg_orgao_expedidor: e.target.value }))} placeholder="SSP/SP" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label>Data de Nascimento</Label>
                        <Input type="date" value={editData.data_nascimento} onChange={(e) => setEditData((d) => d && ({ ...d, data_nascimento: e.target.value }))} />
                      </div>
                      <div className="space-y-1">
                        <Label>Título de Eleitor</Label>
                        <Input value={editData.titulo_eleitor} onChange={(e) => setEditData((d) => d && ({ ...d, titulo_eleitor: e.target.value }))} placeholder="000000000000" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label>Conselho profissional</Label>
                          <Select
                            value={editData.doc_profissional_tipo || '__none__'}
                            onValueChange={(v) => setEditData((d) => d && ({ ...d, doc_profissional_tipo: v === '__none__' ? '' : v }))}
                          >
                            <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">Nenhum</SelectItem>
                              <SelectItem value="CRM">CRM</SelectItem>
                              <SelectItem value="OAB">OAB</SelectItem>
                              <SelectItem value="CREA">CREA</SelectItem>
                              <SelectItem value="CRC">CRC</SelectItem>
                              <SelectItem value="CRP">CRP</SelectItem>
                              <SelectItem value="CFO">CFO</SelectItem>
                              <SelectItem value="COREN">COREN</SelectItem>
                              <SelectItem value="CRF">CRF</SelectItem>
                              <SelectItem value="CREFITO">CREFITO</SelectItem>
                              <SelectItem value="CAU">CAU</SelectItem>
                              <SelectItem value="Outro">Outro</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label>Nº do registro</Label>
                          <Input
                            value={editData.doc_profissional_numero}
                            onChange={(e) => setEditData((d) => d && ({ ...d, doc_profissional_numero: e.target.value }))}
                            placeholder="Ex: 12345/SP"
                            disabled={!editData.doc_profissional_tipo || editData.doc_profissional_tipo === '__none__'}
                          />
                        </div>
                      </div>
                    </>
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
                    <Button variant="outline" onClick={() => { setEditData(null); setDadosCNPJ(null); setDivergenciasRF([]) }}>Cancelar</Button>
                  </div>

                  {/* Resultado da consulta Receita Federal */}
                  {dadosCNPJ && (
                    <div className="space-y-2">
                      {divergenciasRF.length === 0 ? (
                        <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2.5 flex items-center gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                          <p className="text-green-800 font-medium">Cadastro em dia com a Receita Federal.</p>
                        </div>
                      ) : (
                        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                            <p className="font-medium text-amber-800">{divergenciasRF.length} divergência(s) com a Receita Federal:</p>
                          </div>
                          <div className="space-y-1.5 pl-6">
                            {divergenciasRF.map((d) => (
                              <div key={d.campo} className="text-xs space-y-0.5">
                                <p className="font-medium text-amber-900">{d.campo}</p>
                                <p className="text-muted-foreground">Atual: <span className="line-through">{d.atual}</span></p>
                                <p className="text-green-700">Receita: <span className="font-medium">{d.receita}</span></p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2.5 flex gap-2 text-xs text-blue-700">
                        <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        <p>
                          A Receita Federal atualiza: nome empresarial, nome fantasia, e-mail, telefone, endereço fiscal e CNAEs.
                          <strong> Regime de apuração, inscrição estadual e inscrição municipal</strong> precisam ser preenchidos manualmente.
                        </p>
                      </div>

                      {(temDivEndereco || temDivCnaes || temDivSocios) && (
                        <div className="rounded-md border border-green-200 bg-green-50 p-3 space-y-2 text-sm">
                          <p className="font-medium text-green-800">Importar da Receita Federal</p>
                          <div className="flex flex-wrap gap-2">
                            {temDivEndereco && (dadosCNPJ.logradouro || dadosCNPJ.municipio) && (
                              <Button
                                size="sm" variant="outline"
                                onClick={() => pedirConfirmacao(
                                  {
                                    titulo: 'Atualizar endereço fiscal',
                                    descricao: 'O endereço fiscal cadastrado será substituído pelo endereço registrado na Receita Federal. Esta ação não pode ser desfeita.',
                                    confirmLabel: 'Atualizar endereço',
                                  },
                                  importarEnderecoReceita,
                                )}
                              >
                                <MapPin className="h-3.5 w-3.5 mr-1" /> Importar endereço fiscal
                              </Button>
                            )}
                            {temDivCnaes && dadosCNPJ.cnae_fiscal > 0 && (
                              <Button
                                size="sm" variant="outline"
                                onClick={() => pedirConfirmacao(
                                  {
                                    titulo: 'Sincronizar CNAEs',
                                    descricao: `Os CNAEs cadastrados serão substituídos pelos ${1 + (dadosCNPJ.cnaes_secundarios?.length ?? 0)} CNAE(s) registrados na Receita Federal. Os CNAEs que não constam na Receita serão removidos.`,
                                    confirmLabel: 'Sincronizar CNAEs',
                                  },
                                  importarCnaesReceita,
                                )}
                              >
                                <Hash className="h-3.5 w-3.5 mr-1" />
                                Sincronizar {1 + (dadosCNPJ.cnaes_secundarios?.length ?? 0)} CNAE(s)
                              </Button>
                            )}
                            {temDivSocios && (dadosCNPJ.qsa?.length ?? 0) > 0 && (
                              <Button size="sm" variant="outline" onClick={() => setSociosImportOpen(true)}>
                                <Users className="h-3.5 w-3.5 mr-1" />
                                Importar {dadosCNPJ.qsa!.length} sócio(s)
                              </Button>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end">
                        <Button
                          size="sm" variant="ghost"
                          className="text-xs text-muted-foreground gap-1.5 h-7"
                          disabled={forcarSyncando}
                          onClick={() => pedirConfirmacao(
                            {
                              titulo: 'Forçar sincronização completa',
                              descricao: 'Todos os dados disponíveis na Receita Federal (nome empresarial, nome fantasia, e-mail, telefone, endereço fiscal e CNAEs) serão substituídos. Campos não fornecidos pela Receita (regime, inscrição estadual, inscrição municipal) não serão alterados. Esta ação salva imediatamente e não pode ser desfeita.',
                              confirmLabel: 'Sincronizar tudo',
                            },
                            forcarSincronizacaoCompleta,
                          )}
                        >
                          {forcarSyncando
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : <RotateCcw className="h-3 w-3" />
                          }
                          Forçar sincronização completa
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">{client.tipo === 'fisica' ? 'Nome' : 'Razão Social'}:</span> <span className="font-medium wrap-break-word">{client.razao_social}</span></div>
                  {isPJ && client.cnpj && (
                    <div><span className="text-muted-foreground">CNPJ:</span> <span className="font-mono">{formatCNPJ(client.cnpj)}</span></div>
                  )}
                  {client.tipo === 'fisica' && client.cpf && (
                    <div><span className="text-muted-foreground">CPF:</span> <span className="font-mono">{formatCPF(client.cpf)}</span></div>
                  )}
                  {!isPJ && (
                    <>
                      <div>
                        <span className="text-muted-foreground">RG:</span>{' '}
                        <span className={client.rg ? '' : 'text-muted-foreground italic'}>{client.rg || '—'}</span>
                        {client.rg_orgao_expedidor && (
                          <span className="text-muted-foreground ml-1 text-sm">{client.rg_orgao_expedidor}</span>
                        )}
                      </div>
                      <div><span className="text-muted-foreground">Nascimento:</span> <span className={client.data_nascimento ? '' : 'text-muted-foreground italic'}>{client.data_nascimento ? formatDate(client.data_nascimento) : '—'}</span></div>
                      <div><span className="text-muted-foreground">Título de Eleitor:</span> <span className={client.titulo_eleitor ? 'font-mono' : 'text-muted-foreground italic'}>{client.titulo_eleitor || '—'}</span></div>
                      <div>
                        <span className="text-muted-foreground">Doc. Profissional:</span>{' '}
                        {client.doc_profissional_tipo && client.doc_profissional_numero
                          ? <span className="font-mono">{client.doc_profissional_tipo} {client.doc_profissional_numero}</span>
                          : <span className="text-muted-foreground italic">—</span>}
                      </div>
                    </>
                  )}
                  {isPJ && client.fantasia && (
                    <div><span className="text-muted-foreground">Fantasia:</span> <span className="font-medium">{client.fantasia}</span></div>
                  )}
                  {isPJ && client.inscricao_estadual && (
                    <div><span className="text-muted-foreground">Insc. Estadual:</span> <span>{client.inscricao_estadual}</span></div>
                  )}
                  {isPJ && client.inscricao_municipal && (
                    <div><span className="text-muted-foreground">Insc. Municipal:</span> <span>{client.inscricao_municipal}</span></div>
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
                    {client.status === 'em_abertura' ? (
                      <Badge className="bg-amber-100 text-amber-800 border-transparent cursor-pointer" onClick={openStatusDialog}>
                        Em Abertura
                      </Badge>
                    ) : (
                      <Badge variant={client.status === 'ativo' ? 'success' : 'secondary'} className="cursor-pointer" onClick={openStatusDialog}>
                        {client.status === 'ativo' ? 'Ativo' : 'Inativo'}
                      </Badge>
                    )}
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

          {/* CNAEs — apenas PJ */}
          {isPJ && (
            <Card className="mt-4">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">CNAEs</CardTitle>
                    {(cnaes?.length ?? 0) > 0 && (
                      <Badge variant="secondary" className="text-xs">{cnaes!.length}</Badge>
                    )}
                  </div>
                  <Button variant="outline" size="sm" onClick={openCnaeCreate}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {(cnaes?.length ?? 0) === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum CNAE cadastrado.</p>
                ) : (
                  <div className="space-y-2">
                    {cnaes!.map((cnae) => (
                      <div key={cnae.id} className="flex items-start gap-2 rounded-md border px-3 py-2">
                        <Hash className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-sm font-medium">{cnae.codigo}</span>
                            {cnae.principal && (
                              <Badge className="bg-amber-100 text-amber-800 border-transparent text-xs">Principal</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{cnae.descricao}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openCnaeEdit(cnae)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => removeCnae(cnae)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Endereços */}
          <Card className="mt-4">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">Endereços</CardTitle>
                  {(enderecos?.length ?? 0) > 0 && (
                    <Badge variant="secondary" className="text-xs">{enderecos!.length}</Badge>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={openEnderecoCreate}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {(enderecos?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum endereço cadastrado.</p>
              ) : (
                <div className="space-y-2">
                  {enderecos!.map((end) => (
                    <div key={end.id} className="flex items-start gap-2 rounded-md border px-3 py-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs capitalize">{TIPO_ENDERECO_LABEL[end.tipo]}{end.tipo === 'outro' && end.descricao ? ` – ${end.descricao}` : ''}</Badge>
                          {end.principal && (
                            <Badge className="bg-amber-100 text-amber-800 border-transparent text-xs">Principal</Badge>
                          )}
                        </div>
                        <p className="text-sm mt-0.5">
                          {end.logradouro}{end.numero ? `, ${end.numero}` : ''}{end.complemento ? ` – ${end.complemento}` : ''}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {[end.bairro, end.cidade, end.estado].filter(Boolean).join(' · ')}{end.cep ? ` · CEP ${end.cep}` : ''}
                        </p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEnderecoEdit(end)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => removeEndereco(end)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contatos */}
          <Card className="mt-4">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">Contatos</CardTitle>
                  {(contatos?.length ?? 0) > 0 && (
                    <Badge variant="secondary" className="text-xs">{contatos!.length}</Badge>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={openContatoCreate}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {(contatos?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum contato cadastrado.</p>
              ) : (
                <div className="space-y-2">
                  {contatos!.map((ct) => (
                    <div key={ct.id} className="flex items-start gap-2 rounded-md border px-3 py-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{ct.nome}</span>
                          {ct.principal && (
                            <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />
                          )}
                          {(ct.setor || ct.cargo) && (
                            <span className="text-xs text-muted-foreground">
                              {[ct.setor, ct.cargo].filter(Boolean).join(' · ')}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 flex-wrap">
                          {ct.telefone && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3" />{ct.telefone}
                            </span>
                          )}
                          {ct.email && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Mail className="h-3 w-3" />{ct.email}
                            </span>
                          )}
                        </div>
                        {ct.obs && <p className="text-xs text-muted-foreground mt-0.5 italic">{ct.obs}</p>}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openContatoEdit(ct)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => removeContato(ct)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Histórico de Status */}
          {(historicoStatus?.length ?? 0) > 0 && (
            <Card className="mt-4">
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

          <Card className="mt-4">
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
          <FichaRapidaTab
            tenantId={tenantId}
            clientId={clientId ?? ''}
            client={client}
            enderecos={enderecos ?? []}
            contatos={contatos ?? []}
            socios={socios ?? []}
          />
        </TabsContent>
      </Tabs>

      {/* Dialog: Alterar Status */}
      <Dialog open={statusDialog} onOpenChange={setStatusDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Alterar Status do Cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {client?.status === 'em_abertura' && (
              <p className="text-sm text-muted-foreground rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
                Para concluir a abertura com o CNPJ, use a aba <strong>Abertura</strong>. Aqui você pode apenas cancelar o processo.
              </p>
            )}
            <div className="space-y-1">
              <Label>Novo Status</Label>
              <Select
                value={statusForm.novoStatus}
                onValueChange={(v) => setStatusForm((f) => ({ ...f, novoStatus: v as ClientStatus }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {client?.status !== 'em_abertura' && <SelectItem value="ativo">Ativo</SelectItem>}
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
                Fatura: {payTarget.competencia} – {formatCurrency(payTarget.valor_original)}
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

      {/* Dialog: Endereço */}
      <Dialog open={enderecoDialog} onOpenChange={setEnderecoDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingEndereco ? 'Editar Endereço' : 'Novo Endereço'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Tipo</Label>
                <Select value={enderecoForm.tipo} onValueChange={(v) => setEnderecoForm((f) => ({ ...f, tipo: v as TipoEndereco }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fiscal">Fiscal</SelectItem>
                    <SelectItem value="correspondencia">Correspondência</SelectItem>
                    <SelectItem value="entrega">Entrega</SelectItem>
                    <SelectItem value="cobranca">Cobrança</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>CEP</Label>
                <Input value={enderecoForm.cep} onChange={(e) => setEnderecoForm((f) => ({ ...f, cep: e.target.value }))} placeholder="00000-000" />
              </div>
            </div>
            {enderecoForm.tipo === 'outro' && (
              <div className="space-y-1">
                <Label>Descrição</Label>
                <Input value={enderecoForm.descricao} onChange={(e) => setEnderecoForm((f) => ({ ...f, descricao: e.target.value }))} placeholder="Ex: Depósito, Filial..." />
              </div>
            )}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1">
                <Label>Logradouro *</Label>
                <Input value={enderecoForm.logradouro} onChange={(e) => setEnderecoForm((f) => ({ ...f, logradouro: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Número</Label>
                <Input value={enderecoForm.numero} onChange={(e) => setEnderecoForm((f) => ({ ...f, numero: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Complemento</Label>
                <Input value={enderecoForm.complemento} onChange={(e) => setEnderecoForm((f) => ({ ...f, complemento: e.target.value }))} placeholder="Sala, Apto..." />
              </div>
              <div className="space-y-1">
                <Label>Bairro</Label>
                <Input value={enderecoForm.bairro} onChange={(e) => setEnderecoForm((f) => ({ ...f, bairro: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1">
                <Label>Cidade</Label>
                <Input value={enderecoForm.cidade} onChange={(e) => setEnderecoForm((f) => ({ ...f, cidade: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>UF</Label>
                <Select value={enderecoForm.estado} onValueChange={(v) => setEnderecoForm((f) => ({ ...f, estado: v }))}>
                  <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                  <SelectContent>
                    {UF_OPTIONS.map((uf) => (
                      <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="end-principal"
                checked={enderecoForm.principal}
                onChange={(e) => setEnderecoForm((f) => ({ ...f, principal: e.target.checked }))}
                className="h-4 w-4 rounded border"
              />
              <Label htmlFor="end-principal" className="cursor-pointer font-normal">Marcar como endereço principal</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEnderecoDialog(false)}>Cancelar</Button>
            <Button onClick={saveEndereco}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Contato */}
      <Dialog open={contatoDialog} onOpenChange={setContatoDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingContato ? 'Editar Contato' : 'Novo Contato'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Nome *</Label>
              <Input value={contatoForm.nome} onChange={(e) => setContatoForm((f) => ({ ...f, nome: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Setor / Departamento</Label>
                <Input value={contatoForm.setor} onChange={(e) => setContatoForm((f) => ({ ...f, setor: e.target.value }))} placeholder="Financeiro, TI..." />
              </div>
              <div className="space-y-1">
                <Label>Cargo</Label>
                <Input value={contatoForm.cargo} onChange={(e) => setContatoForm((f) => ({ ...f, cargo: e.target.value }))} placeholder="Gerente, Sócio..." />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Telefone / WhatsApp</Label>
                <Input value={contatoForm.telefone} onChange={(e) => setContatoForm((f) => ({ ...f, telefone: e.target.value }))} placeholder="(11) 99999-0000" />
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input type="email" value={contatoForm.email} onChange={(e) => setContatoForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Observações</Label>
              <Input value={contatoForm.obs} onChange={(e) => setContatoForm((f) => ({ ...f, obs: e.target.value }))} placeholder="Informação adicional..." />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="ct-principal"
                checked={contatoForm.principal}
                onChange={(e) => setContatoForm((f) => ({ ...f, principal: e.target.checked }))}
                className="h-4 w-4 rounded border"
              />
              <Label htmlFor="ct-principal" className="cursor-pointer font-normal">Contato principal (padrão no WhatsApp)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContatoDialog(false)}>Cancelar</Button>
            <Button onClick={saveContato}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: CNAE */}
      <Dialog open={cnaeDialog} onOpenChange={(o) => { setCnaeDialog(o); if (!o) { setCnaeBusca(''); setCnaeResultados([]) } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCnae ? 'Editar CNAE' : 'Novo CNAE'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {/* Autocomplete */}
            <div className="space-y-1">
              <Label>Buscar CNAE (código ou atividade)</Label>
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    className="pl-8 pr-8"
                    placeholder="Ex: padaria, 1091, comércio varejista..."
                    value={cnaeBusca}
                    onChange={(e) => setCnaeBusca(e.target.value)}
                    onFocus={() => { if (cnaeResultados.length > 0) setCnaeDropdown(true) }}
                  />
                  {cnaeBuscando && (
                    <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  )}
                </div>
                {cnaeDropdown && cnaeResultados.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 rounded-md border bg-popover shadow-md max-h-56 overflow-y-auto">
                    {cnaeResultados.map((item) => (
                      <button
                        key={item.codigo}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                        onMouseDown={(e) => { e.preventDefault(); selecionarCnae(item) }}
                      >
                        <span className="font-mono text-xs text-muted-foreground mr-2">{item.codigo}</span>
                        {item.descricao}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Selecione para preencher automaticamente, ou digite manualmente abaixo.</p>
            </div>
            <div className="space-y-1">
              <Label>Código *</Label>
              <Input
                value={cnaeForm.codigo}
                onChange={(e) => setCnaeForm((f) => ({ ...f, codigo: e.target.value }))}
                placeholder="0000-0/00"
                onFocus={() => setCnaeDropdown(false)}
              />
            </div>
            <div className="space-y-1">
              <Label>Descrição *</Label>
              <Input
                value={cnaeForm.descricao}
                onChange={(e) => setCnaeForm((f) => ({ ...f, descricao: e.target.value }))}
                onFocus={() => setCnaeDropdown(false)}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="cnae-principal"
                checked={cnaeForm.principal}
                onChange={(e) => setCnaeForm((f) => ({ ...f, principal: e.target.checked }))}
                className="h-4 w-4 rounded border"
              />
              <Label htmlFor="cnae-principal" className="cursor-pointer font-normal">CNAE principal</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCnaeDialog(false)}>Cancelar</Button>
            <Button onClick={saveCnae}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {dadosCNPJ && (dadosCNPJ.qsa?.length ?? 0) > 0 && (
        <ImportarSociosDialog
          open={sociosImportOpen}
          onClose={() => setSociosImportOpen(false)}
          tenantId={tenantId}
          clientId={clientId ?? ''}
          qsa={dadosCNPJ.qsa!}
          todosClientes={todosClientes}
          jaVinculados={socios ?? []}
        />
      )}

      <div className="h-16 rounded-xl border border-dashed border-border/40 bg-muted/20" />

      {/* Modal de consulta à Receita Federal */}
      <Dialog
        open={cnpjConsultando || forcarSyncando}
        onOpenChange={() => {}}
      >
        <DialogContent
          className="sm:max-w-xs text-center [&>button]:hidden"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <div className="flex flex-col items-center gap-5 py-4">
            {/* Anéis pulsantes + spinner central */}
            <div className="relative flex items-center justify-center">
              <span className="absolute h-20 w-20 rounded-full bg-primary/10 animate-ping" style={{ animationDuration: '1.6s' }} />
              <span className="absolute h-14 w-14 rounded-full bg-primary/15 animate-ping" style={{ animationDuration: '1.6s', animationDelay: '0.3s' }} />
              <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </span>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-semibold">
                {forcarSyncando ? 'Sincronizando dados…' : 'Consultando a Receita Federal…'}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {forcarSyncando
                  ? 'Atualizando nome, endereço e CNAEs no cadastro.'
                  : 'Buscando os dados cadastrais atuais da empresa.'}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação genérico */}
      {confirmacaoConfig && (
        <Dialog open={true} onOpenChange={() => setConfirmacaoConfig(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{confirmacaoConfig.titulo}</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground py-1">{confirmacaoConfig.descricao}</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmacaoConfig(null)}>Cancelar</Button>
              <Button
                onClick={async () => {
                  setConfirmacaoConfig(null)
                  await confirmacaoAcao.current?.()
                }}
              >
                {confirmacaoConfig.confirmLabel ?? 'Confirmar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
