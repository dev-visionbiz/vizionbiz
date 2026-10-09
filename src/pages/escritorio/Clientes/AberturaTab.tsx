import { useState } from 'react'
import { useAuth } from '@/auth/AuthProvider'
import { useUsers } from '@/data/hooks/useUsers'
import { useUpdateClient } from '@/data/hooks/useClients'
import { useProcessoAbertura, useCreateProcessoAbertura, useUpdateProcessoAbertura } from '@/data/hooks/useProcessoAbertura'
import { useRegistrarLogAtividade } from '@/data/hooks/useLogAtividadeCliente'
import { useClienteContatos } from '@/data/hooks/useClienteContatos'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { WhatsAppMessageDialog } from '@/components/whatsapp/WhatsAppMessageDialog'
import type { ContatoDisponivel } from '@/components/whatsapp/WhatsAppMessageDialog'
import {
  Building2, CheckCircle2, Clock, Copy, ExternalLink, Loader2,
  MessageCircle, Pencil, RefreshCw, Send, Unlock,
} from 'lucide-react'
import type { Client, ProcessoAberturaStatus } from '@/domain/types'
import { formatDate } from '@/lib/utils'
import { templateFormularioColeta } from '@/lib/whatsapp/templates'
import { v4 as uuidv4 } from 'uuid'
import {
  CAMPOS_CONFIG, CAMPOS_DEFAULT, SECAO_LABELS,
  type SecaoFormulario,
} from '@/lib/formularioAbertura'

const STATUS_STEPS: { value: ProcessoAberturaStatus; label: string }[] = [
  { value: 'coleta_dados',    label: 'Coleta de Dados' },
  { value: 'documentos',      label: 'Documentos' },
  { value: 'submetido',       label: 'Submetido' },
  { value: 'aguardando_cnpj', label: 'Aguardando CNPJ' },
]

const STATUS_LABEL: Record<ProcessoAberturaStatus, string> = {
  coleta_dados:    'Coleta de Dados',
  documentos:      'Documentos',
  submetido:       'Submetido',
  aguardando_cnpj: 'Aguardando CNPJ',
  concluido:       'Concluído',
  cancelado:       'Cancelado',
}

const FORMULARIO_STATUS_CONFIG = {
  nao_enviado: { label: 'Link não gerado',  cor: 'bg-muted text-muted-foreground' },
  enviado:     { label: 'Link enviado',      cor: 'bg-blue-100 text-blue-800' },
  preenchido:  { label: 'Formulário preenchido', cor: 'bg-green-100 text-green-800' },
  expirado:    { label: 'Link expirado',     cor: 'bg-red-100 text-red-800' },
}

interface Props {
  client: Client
  clientId: string
  tenantId: string
}

export function AberturaTab({ client, clientId, tenantId }: Props) {
  const { currentUser } = useAuth()
  const { data: users } = useUsers(tenantId)
  const colaboradores = users?.filter((u) => u.papel !== 'cliente' && u.ativo) ?? []
  const { data: contatos } = useClienteContatos(tenantId, clientId)

  const { data: processo, isLoading } = useProcessoAbertura(tenantId, clientId)
  const createProcesso = useCreateProcessoAbertura()
  const updateProcesso = useUpdateProcessoAbertura()
  const updateClient = useUpdateClient()
  const registrarLog = useRegistrarLogAtividade()
  const { toast } = useToast()

  const log = (acao: 'abertura_iniciada' | 'abertura_concluida' | 'abertura_cancelada', descricao: string) => {
    registrarLog.mutate({
      tenantId, clientId, acao, descricao,
      usuarioId: currentUser?.id ?? 'desconhecido',
      usuarioNome: currentUser?.nome ?? 'Sistema',
    })
  }

  // ── Edit detalhes ──────────────────────────────────────────────────────────
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    tipo_empresa: '', capital_social: '', data_abertura_desejada: '',
    responsavel_id: '', observacoes: '',
  })

  const startEdit = () => {
    if (!processo) return
    setEditForm({
      tipo_empresa: processo.tipo_empresa ?? '',
      capital_social: processo.capital_social ? String(processo.capital_social) : '',
      data_abertura_desejada: processo.data_abertura_desejada ?? '',
      responsavel_id: processo.responsavel_id ?? '',
      observacoes: processo.observacoes ?? '',
    })
    setEditing(true)
  }

  const saveEdit = async () => {
    if (!processo) return
    await updateProcesso.mutateAsync({
      id: processo.id,
      data: {
        tipo_empresa: editForm.tipo_empresa || undefined,
        capital_social: editForm.capital_social ? parseFloat(editForm.capital_social) : undefined,
        data_abertura_desejada: editForm.data_abertura_desejada || undefined,
        responsavel_id: editForm.responsavel_id || undefined,
        observacoes: editForm.observacoes || undefined,
        atualizado_em: new Date().toISOString(),
      },
    })
    setEditing(false)
    toast({ title: 'Dados do processo atualizados' })
  }

  // ── Status do processo ─────────────────────────────────────────────────────
  const handleStatusChange = async (novoStatus: ProcessoAberturaStatus) => {
    if (!processo) return
    await updateProcesso.mutateAsync({
      id: processo.id,
      data: { status: novoStatus, atualizado_em: new Date().toISOString() },
    })
    toast({ title: `Status: ${STATUS_LABEL[novoStatus]}` })
  }

  // ── Concluir abertura ──────────────────────────────────────────────────────
  const [concluirDialog, setConcluirDialog] = useState(false)
  const [cnpjNovo, setCnpjNovo] = useState('')
  const [concluindo, setConcluindo] = useState(false)

  const confirmarConclusao = async () => {
    const cnpjDigits = cnpjNovo.replace(/\D/g, '')
    if (cnpjDigits.length !== 14) {
      toast({ title: 'CNPJ inválido (14 dígitos)', variant: 'destructive' })
      return
    }
    if (!processo) return
    setConcluindo(true)
    try {
      await updateClient.mutateAsync({ id: clientId, data: { cnpj: cnpjDigits, status: 'ativo' } })
      await updateProcesso.mutateAsync({
        id: processo.id,
        data: {
          status: 'concluido', cnpj_obtido: cnpjDigits,
          concluido_em: new Date().toISOString(),
          atualizado_em: new Date().toISOString(),
        },
      })
      log('abertura_concluida', `Abertura concluída — CNPJ ${cnpjNovo} registrado`)
      toast({ title: 'Abertura concluída! Cliente agora está ativo.' })
      setConcluirDialog(false)
      setCnpjNovo('')
    } catch {
      toast({ title: 'Erro ao concluir abertura', variant: 'destructive' })
    } finally {
      setConcluindo(false)
    }
  }

  // ── WhatsApp ───────────────────────────────────────────────────────────────
  const [whatsappOpen, setWhatsappOpen] = useState(false)

  // ── Formulário de coleta ───────────────────────────────────────────────────
  const [linkDialog, setLinkDialog] = useState(false)
  const [camposSelecionados, setCamposSelecionados] = useState<string[]>(CAMPOS_DEFAULT)

  const abrirLinkDialog = () => {
    setCamposSelecionados(processo?.formulario_campos ?? CAMPOS_DEFAULT)
    setLinkDialog(true)
  }

  const toggleCampo = (key: string) =>
    setCamposSelecionados((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    )

  const toggleSecao = (secao: SecaoFormulario) => {
    const keysSecao = CAMPOS_CONFIG.filter((c) => c.secao === secao).map((c) => c.key)
    const todasSelecionadas = keysSecao.every((k) => camposSelecionados.includes(k))
    setCamposSelecionados((prev) =>
      todasSelecionadas
        ? prev.filter((k) => !keysSecao.includes(k))
        : [...new Set([...prev, ...keysSecao])]
    )
  }

  const gerarLink = async () => {
    if (!processo || camposSelecionados.length === 0) return
    const token = uuidv4()
    await updateProcesso.mutateAsync({
      id: processo.id,
      data: {
        formulario_token: token,
        formulario_campos: camposSelecionados,
        formulario_status: 'enviado',
        atualizado_em: new Date().toISOString(),
      },
    })
    setLinkDialog(false)
    toast({ title: 'Link gerado com sucesso' })
  }

  const reabrirFormulario = async () => {
    if (!processo) return
    await updateProcesso.mutateAsync({
      id: processo.id,
      data: {
        formulario_status: 'enviado',
        formulario_preenchido_em: undefined,
        atualizado_em: new Date().toISOString(),
      },
    })
    toast({ title: 'Formulário reaberto — o cliente pode editar novamente.' })
  }

  const linkUrl = processo?.formulario_token
    ? `${window.location.origin}/formulario/${processo.formulario_token}`
    : null

  const copiarLink = () => {
    if (!linkUrl) return
    navigator.clipboard.writeText(linkUrl)
    toast({ title: 'Link copiado!' })
  }

  const contatosDisponiveis: ContatoDisponivel[] = [
    ...(client.telefone ? [{
      id: '__client__',
      nome: client.razao_social,
      telefone: client.telefone,
      principal: true,
    }] : []),
    ...(contatos ?? [])
      .filter((c) => !!c.telefone)
      .map((c) => ({
        id: c.id,
        nome: c.nome,
        telefone: c.telefone!,
        setor: c.setor,
        principal: c.principal,
      })),
  ]

  // ── Criar processo se não existe ───────────────────────────────────────────
  const criarProcesso = async () => {
    const novo = {
      id: uuidv4(), tenant_id: tenantId, client_id: clientId,
      status: 'coleta_dados' as ProcessoAberturaStatus,
      formulario_status: 'nao_enviado' as const,
      criado_por: currentUser?.id ?? 'desconhecido',
      criado_em: new Date().toISOString(),
    }
    await createProcesso.mutateAsync(novo)
    log('abertura_iniciada', 'Processo de abertura iniciado')
    toast({ title: 'Processo de abertura criado' })
  }

  if (isLoading) return <div className="py-8 text-center text-muted-foreground text-sm">Carregando...</div>

  if (!processo) {
    return (
      <Card>
        <CardContent className="py-10 text-center space-y-3">
          <Building2 className="h-8 w-8 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">Nenhum processo de abertura registrado.</p>
          <Button onClick={criarProcesso} disabled={createProcesso.isPending}>
            {createProcesso.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Iniciar Processo de Abertura
          </Button>
        </CardContent>
      </Card>
    )
  }

  const responsavelNome = colaboradores.find((u) => u.id === processo.responsavel_id)?.nome
  const currentStepIdx = STATUS_STEPS.findIndex((s) => s.value === processo.status)
  const fmtStatus = FORMULARIO_STATUS_CONFIG[processo.formulario_status ?? 'nao_enviado']

  return (
    <div className="space-y-4">
      {/* Banner CTA */}
      {processo.status !== 'concluido' && processo.status !== 'cancelado' && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-amber-800">
            <Clock className="h-4 w-4 shrink-0" />
            <span>Empresa em abertura. Quando o CNPJ chegar, registre aqui.</span>
          </div>
          <Button size="sm" className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white" onClick={() => setConcluirDialog(true)}>
            <CheckCircle2 className="h-4 w-4 mr-1.5" />
            Registrar CNPJ
          </Button>
        </div>
      )}

      {/* Pipeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Andamento</CardTitle>
        </CardHeader>
        <CardContent>
          {processo.status === 'concluido' ? (
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Abertura concluída</span>
              {processo.concluido_em && (
                <span className="text-xs text-muted-foreground ml-1">em {formatDate(processo.concluido_em.split('T')[0])}</span>
              )}
            </div>
          ) : processo.status === 'cancelado' ? (
            <Badge variant="secondary">Cancelado</Badge>
          ) : (
            <div className="space-y-2">
              <div className="flex items-start gap-1 overflow-x-auto pb-1">
                {STATUS_STEPS.map((step, idx) => {
                  const done = idx < currentStepIdx
                  const active = idx === currentStepIdx
                  return (
                    <div key={step.value} className="flex items-center gap-1 shrink-0">
                      <button
                        className={`flex flex-col items-center text-center w-24 sm:w-28 ${!done && !active ? 'opacity-50' : ''}`}
                        onClick={() => handleStatusChange(step.value)}
                        title={`Mover para: ${step.label}`}
                      >
                        <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors
                          ${done ? 'bg-green-500 border-green-500 text-white' : active ? 'bg-primary border-primary text-primary-foreground' : 'bg-background border-muted-foreground/40 text-muted-foreground'}`}>
                          {done ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
                        </div>
                        <span className={`text-xs mt-1 leading-tight ${active ? 'font-semibold' : 'text-muted-foreground'}`}>
                          {step.label}
                        </span>
                      </button>
                      {idx < STATUS_STEPS.length - 1 && (
                        <div className={`h-0.5 w-4 mt-3.5 shrink-0 ${idx < currentStepIdx ? 'bg-green-500' : 'bg-muted-foreground/20'}`} />
                      )}
                    </div>
                  )
                })}
              </div>
              <p className="text-xs text-muted-foreground">Clique numa etapa para avançar.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Formulário de coleta */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Send className="h-4 w-4 text-muted-foreground" />
              Formulário de Coleta de Dados
            </CardTitle>
            <Badge className={`text-xs ${fmtStatus.cor} border-transparent`}>
              {fmtStatus.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {processo.formulario_status === 'preenchido' ? (
            <div className="rounded-md border border-green-200 bg-green-50 p-3 space-y-3">
              <div className="space-y-1">
                <p className="text-sm font-medium text-green-800">Formulário transmitido pelo cliente</p>
                {processo.formulario_preenchido_em && (
                  <p className="text-xs text-green-700">
                    Em {formatDate(processo.formulario_preenchido_em.split('T')[0])}
                  </p>
                )}
                <p className="text-xs text-green-700">
                  Os dados foram importados para o cadastro do cliente automaticamente.
                </p>
              </div>
              <div className="flex gap-2 flex-wrap pt-1 border-t border-green-200">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 bg-white"
                  onClick={reabrirFormulario}
                  disabled={updateProcesso.isPending}
                >
                  {updateProcesso.isPending
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Unlock className="h-3.5 w-3.5" />}
                  Reabrir para edição
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 bg-white"
                  onClick={abrirLinkDialog}
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Gerar Novo Link
                </Button>
              </div>
            </div>
          ) : linkUrl ? (
            <div className="space-y-3">
              <div className="rounded-md border bg-muted/40 px-3 py-2">
                <p className="text-xs text-muted-foreground mb-1">Link do formulário</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono truncate flex-1 text-foreground">{linkUrl}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={copiarLink} title="Copiar link">
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => window.open(linkUrl, '_blank')} title="Abrir">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" className="gap-1.5 text-green-700 border-green-300 hover:bg-green-50" onClick={() => setWhatsappOpen(true)}>
                  <MessageCircle className="h-3.5 w-3.5" /> Enviar pelo WhatsApp
                </Button>
                <Button size="sm" variant="ghost" className="gap-1.5 text-muted-foreground" onClick={abrirLinkDialog}>
                  <RefreshCw className="h-3.5 w-3.5" /> Reconfigurar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {processo.formulario_campos?.length ?? 0} campo(s) configurado(s) para coleta.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Envie um formulário ao cliente para que ele preencha os dados. Os campos que você já
                tem no cadastro aparecerão pré-preenchidos — o cliente pode confirmar ou corrigir.
              </p>
              <Button size="sm" onClick={abrirLinkDialog} className="gap-1.5">
                <Send className="h-3.5 w-3.5" /> Configurar e Gerar Link
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detalhes */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Detalhes</CardTitle>
            {!editing && processo.status !== 'concluido' && processo.status !== 'cancelado' && (
              <Button variant="outline" size="sm" onClick={startEdit}>
                <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {editing ? (
            <div className="space-y-3 max-w-md">
              <div className="space-y-1">
                <Label>Tipo de Empresa</Label>
                <Select
                  value={editForm.tipo_empresa || '__none__'}
                  onValueChange={(v) => setEditForm((f) => ({ ...f, tipo_empresa: v === '__none__' ? '' : v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Não definido</SelectItem>
                    {['MEI','LTDA','SLU','SA','EIRELI','Outro'].map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Capital Social (R$)</Label>
                <Input type="number" step="0.01" placeholder="0,00"
                  value={editForm.capital_social}
                  onChange={(e) => setEditForm((f) => ({ ...f, capital_social: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Data desejada</Label>
                <Input type="date" value={editForm.data_abertura_desejada}
                  onChange={(e) => setEditForm((f) => ({ ...f, data_abertura_desejada: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Responsável (escritório)</Label>
                <Select
                  value={editForm.responsavel_id || '__none__'}
                  onValueChange={(v) => setEditForm((f) => ({ ...f, responsavel_id: v === '__none__' ? '' : v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Não atribuído" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Não atribuído</SelectItem>
                    {colaboradores.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Observações</Label>
                <Textarea rows={3} value={editForm.observacoes}
                  onChange={(e) => setEditForm((f) => ({ ...f, observacoes: e.target.value }))}
                  placeholder="Informações adicionais..." />
              </div>
              <div className="flex gap-2">
                <Button onClick={saveEdit} disabled={updateProcesso.isPending}>Salvar</Button>
                <Button variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Tipo: </span><span className="font-medium">{processo.tipo_empresa ?? '—'}</span></div>
              <div>
                <span className="text-muted-foreground">Capital social: </span>
                <span className="font-medium">
                  {processo.capital_social
                    ? processo.capital_social.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                    : '—'}
                </span>
              </div>
              <div><span className="text-muted-foreground">Abertura desejada: </span>
                <span>{processo.data_abertura_desejada ? formatDate(processo.data_abertura_desejada) : '—'}</span>
              </div>
              <div><span className="text-muted-foreground">Responsável: </span><span>{responsavelNome ?? '—'}</span></div>
              <div><span className="text-muted-foreground">Iniciado em: </span><span>{formatDate(processo.criado_em.split('T')[0])}</span></div>
              {processo.concluido_em && (
                <div><span className="text-muted-foreground">Concluído em: </span><span>{formatDate(processo.concluido_em.split('T')[0])}</span></div>
              )}
              {processo.cnpj_obtido && (
                <div><span className="text-muted-foreground">CNPJ obtido: </span><span className="font-mono">{processo.cnpj_obtido}</span></div>
              )}
              {processo.observacoes && (
                <div className="sm:col-span-2"><span className="text-muted-foreground">Observações: </span><span className="italic">{processo.observacoes}</span></div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Concluir Abertura */}
      <Dialog open={concluirDialog} onOpenChange={setConcluirDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Registrar CNPJ e Concluir Abertura</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">Informe o CNPJ obtido. O cliente será ativado automaticamente.</p>
            <div className="space-y-1">
              <Label htmlFor="cnpj-novo">CNPJ *</Label>
              <Input id="cnpj-novo" placeholder="00.000.000/0001-00"
                value={cnpjNovo} onChange={(e) => setCnpjNovo(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setConcluirDialog(false); setCnpjNovo('') }}>Cancelar</Button>
            <Button onClick={confirmarConclusao}
              disabled={concluindo || cnpjNovo.replace(/\D/g, '').length !== 14}>
              {concluindo && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Concluir Abertura
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* WhatsApp */}
      {linkUrl && (
        <WhatsAppMessageDialog
          open={whatsappOpen}
          onClose={() => setWhatsappOpen(false)}
          escritorioId={tenantId}
          titulo="Enviar formulário de abertura"
          mensagemInicial={templateFormularioColeta(client.razao_social, linkUrl, 'abertura')}
          contatosDisponiveis={contatosDisponiveis.length > 0 ? contatosDisponiveis : undefined}
          telefoneInicial={client.telefone ?? ''}
        />
      )}

      {/* Dialog: Configurar Link */}
      <Dialog open={linkDialog} onOpenChange={setLinkDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Configurar Formulário de Coleta</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <p className="text-sm text-muted-foreground">
              Selecione quais dados você quer coletar. Campos já preenchidos no cadastro aparecerão
              pré-preenchidos para o cliente confirmar ou corrigir.
            </p>
            {(['empresa', 'socio', 'endereco'] as SecaoFormulario[]).map((secao) => {
              const campos = CAMPOS_CONFIG.filter((c) => c.secao === secao)
              const todasSelecionadas = campos.every((c) => camposSelecionados.includes(c.key))
              const algumasSelecionadas = campos.some((c) => camposSelecionados.includes(c.key))
              return (
                <div key={secao} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`secao-${secao}`}
                      checked={todasSelecionadas}
                      ref={(el) => { if (el) el.indeterminate = !todasSelecionadas && algumasSelecionadas }}
                      onChange={() => toggleSecao(secao)}
                      className="h-4 w-4 rounded border"
                    />
                    <label htmlFor={`secao-${secao}`} className="text-sm font-semibold cursor-pointer">
                      {SECAO_LABELS[secao]}
                    </label>
                  </div>
                  <div className="ml-6 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {campos.map((campo) => (
                      <div key={campo.key} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={campo.key}
                          checked={camposSelecionados.includes(campo.key)}
                          onChange={() => toggleCampo(campo.key)}
                          className="h-3.5 w-3.5 rounded border"
                        />
                        <label htmlFor={campo.key} className="text-sm cursor-pointer select-none">
                          {campo.label}
                          {campo.obrigatorio && <span className="text-destructive ml-0.5">*</span>}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="border-t pt-3">
            <p className="text-xs text-muted-foreground">
              {camposSelecionados.length} campo(s) selecionado(s)
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialog(false)}>Cancelar</Button>
            <Button onClick={gerarLink} disabled={camposSelecionados.length === 0 || updateProcesso.isPending}>
              {updateProcesso.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {processo.formulario_token ? 'Regenerar Link' : 'Gerar Link'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
