import { useState } from 'react'
import { useAuth } from '@/auth/AuthProvider'
import { useUsers } from '@/data/hooks/useUsers'
import { useClienteContatos } from '@/data/hooks/useClienteContatos'
import { useProcessosAlteracao, useCreateProcessoAlteracao, useUpdateProcessoAlteracao } from '@/data/hooks/useProcessoAlteracao'
import { useRegistrarLogAtividade } from '@/data/hooks/useLogAtividadeCliente'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
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
  CheckCircle2, Copy, ExternalLink, FileEdit, Loader2,
  MessageCircle, Plus, RefreshCw, Unlock, UserCheck,
} from 'lucide-react'
import type { Client, ProcessoAlteracao, ProcessoAlteracaoStatus, TipoAlteracao } from '@/domain/types'
import { formatDate } from '@/lib/utils'
import { templateFormularioColeta } from '@/lib/whatsapp/templates'
import { v4 as uuidv4 } from 'uuid'
import {
  CAMPOS_CONFIG, CAMPOS_DEFAULT, SECAO_LABELS,
  type SecaoFormulario,
} from '@/lib/formularioAbertura'

const TIPO_LABEL: Record<TipoAlteracao, string> = {
  endereco:      'Mudança de Endereço',
  socio:         'Alteração de Sócios',
  dados_empresa: 'Dados da Empresa',
  multiplos:     'Múltiplas Alterações',
}

const TIPO_CAMPOS_DEFAULT: Record<TipoAlteracao, string[]> = {
  endereco:      CAMPOS_CONFIG.filter((c) => c.secao === 'endereco').map((c) => c.key),
  socio:         CAMPOS_CONFIG.filter((c) => c.secao === 'socio').map((c) => c.key),
  dados_empresa: CAMPOS_CONFIG.filter((c) => c.secao === 'empresa').map((c) => c.key),
  multiplos:     CAMPOS_DEFAULT,
}

const STATUS_CONFIG: Record<ProcessoAlteracaoStatus, { label: string; cor: string }> = {
  aguardando_envio:   { label: 'Aguardando formulário', cor: 'bg-amber-100 text-amber-800' },
  formulario_enviado: { label: 'Formulário enviado',    cor: 'bg-blue-100 text-blue-800' },
  preenchido:         { label: 'Dados preenchidos',     cor: 'bg-green-100 text-green-800' },
  concluido:          { label: 'Concluído',             cor: 'bg-slate-100 text-slate-700' },
  cancelado:          { label: 'Cancelado',             cor: 'bg-red-100 text-red-700' },
}

interface Props {
  client: Client
  clientId: string
  tenantId: string
}

export function AlteracoesTab({ client, clientId, tenantId }: Props) {
  const { currentUser } = useAuth()
  const { data: users } = useUsers(tenantId)
  const colaboradores = users?.filter((u) => u.papel !== 'cliente' && u.ativo) ?? []
  const { data: contatos } = useClienteContatos(tenantId, clientId)

  const { data: processos, isLoading } = useProcessosAlteracao(tenantId, clientId)
  const createProcesso = useCreateProcessoAlteracao()
  const updateProcesso = useUpdateProcessoAlteracao()
  const registrarLog = useRegistrarLogAtividade()
  const { toast } = useToast()

  // ── Novo processo ──────────────────────────────────────────────────────────
  const [novoDialog, setNovoDialog] = useState(false)
  const [novoForm, setNovoForm] = useState<{ tipo: TipoAlteracao | ''; descricao: string; responsavel_id: string }>({
    tipo: '', descricao: '', responsavel_id: '',
  })

  const criarProcesso = async () => {
    if (!novoForm.tipo) return
    const novo: ProcessoAlteracao = {
      id: uuidv4(),
      tenant_id: tenantId,
      client_id: clientId,
      tipo: novoForm.tipo as TipoAlteracao,
      descricao: novoForm.descricao || undefined,
      status: 'aguardando_envio',
      solicitado_por: 'escritorio',
      responsavel_id: novoForm.responsavel_id || undefined,
      criado_por: currentUser?.id ?? 'desconhecido',
      criado_em: new Date().toISOString(),
    }
    await createProcesso.mutateAsync(novo)
    registrarLog.mutate({
      tenantId, clientId, acao: 'dados_editados',
      descricao: `Processo de alteração iniciado: ${TIPO_LABEL[novoForm.tipo as TipoAlteracao]}`,
      usuarioId: currentUser?.id ?? 'desconhecido',
      usuarioNome: currentUser?.nome ?? 'Sistema',
    })
    toast({ title: 'Processo de alteração criado' })
    setNovoDialog(false)
    setNovoForm({ tipo: '', descricao: '', responsavel_id: '' })
  }

  // ── Configurar formulário ──────────────────────────────────────────────────
  const [linkDialog, setLinkDialog] = useState(false)
  const [processoAtivo, setProcessoAtivo] = useState<ProcessoAlteracao | null>(null)
  const [camposSelecionados, setCamposSelecionados] = useState<string[]>(CAMPOS_DEFAULT)

  const abrirLinkDialog = (proc: ProcessoAlteracao) => {
    setProcessoAtivo(proc)
    setCamposSelecionados(proc.formulario_campos ?? TIPO_CAMPOS_DEFAULT[proc.tipo] ?? CAMPOS_DEFAULT)
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
    if (!processoAtivo || camposSelecionados.length === 0) return
    const token = uuidv4()
    await updateProcesso.mutateAsync({
      id: processoAtivo.id,
      data: {
        formulario_token: token,
        formulario_campos: camposSelecionados,
        formulario_status: 'enviado',
        status: 'formulario_enviado',
        atualizado_em: new Date().toISOString(),
      },
    })
    setLinkDialog(false)
    toast({ title: 'Link gerado com sucesso' })
  }

  // ── Ações individuais ──────────────────────────────────────────────────────
  const copiarLink = (proc: ProcessoAlteracao) => {
    const url = `${window.location.origin}/formulario/${proc.formulario_token}`
    navigator.clipboard.writeText(url)
    toast({ title: 'Link copiado!' })
  }

  const reabrirFormulario = async (proc: ProcessoAlteracao) => {
    await updateProcesso.mutateAsync({
      id: proc.id,
      data: {
        formulario_status: 'enviado',
        formulario_preenchido_em: undefined,
        status: 'formulario_enviado',
        atualizado_em: new Date().toISOString(),
      },
    })
    toast({ title: 'Formulário reaberto para edição.' })
  }

  const concluirProcesso = async (proc: ProcessoAlteracao) => {
    await updateProcesso.mutateAsync({
      id: proc.id,
      data: {
        status: 'concluido',
        concluido_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString(),
      },
    })
    registrarLog.mutate({
      tenantId, clientId, acao: 'dados_editados',
      descricao: `Alteração concluída: ${TIPO_LABEL[proc.tipo]}`,
      usuarioId: currentUser?.id ?? 'desconhecido',
      usuarioNome: currentUser?.nome ?? 'Sistema',
    })
    toast({ title: 'Processo concluído.' })
  }

  // ── WhatsApp ───────────────────────────────────────────────────────────────
  const [whatsappProc, setWhatsappProc] = useState<ProcessoAlteracao | null>(null)

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

  if (isLoading) return <div className="py-8 text-center text-muted-foreground text-sm">Carregando...</div>

  const ativos = (processos ?? []).filter((p) => p.status !== 'concluido' && p.status !== 'cancelado')
  const historico = (processos ?? []).filter((p) => p.status === 'concluido' || p.status === 'cancelado')

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Gerencie solicitações de alteração de cadastro e envie formulários para o cliente confirmar os dados.
          </p>
        </div>
        <Button size="sm" className="gap-1.5 shrink-0" onClick={() => setNovoDialog(true)}>
          <Plus className="h-3.5 w-3.5" /> Nova Alteração
        </Button>
      </div>

      {/* Processos ativos */}
      {ativos.length === 0 && historico.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center space-y-3">
            <FileEdit className="h-8 w-8 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">Nenhum processo de alteração registrado.</p>
            <Button size="sm" onClick={() => setNovoDialog(true)} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Iniciar Alteração
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {ativos.map((proc) => {
            const stCfg = STATUS_CONFIG[proc.status]
            const fmtStatus = STATUS_CONFIG[proc.formulario_status === 'preenchido' ? 'preenchido' : proc.status]
            const linkUrl = proc.formulario_token
              ? `${window.location.origin}/formulario/${proc.formulario_token}`
              : null
            const responsavelNome = colaboradores.find((u) => u.id === proc.responsavel_id)?.nome

            return (
              <Card key={proc.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <CardTitle className="text-base flex items-center gap-2">
                        {TIPO_LABEL[proc.tipo]}
                        {proc.solicitado_por === 'cliente' && (
                          <Badge className="bg-violet-100 text-violet-700 border-transparent text-xs">
                            <UserCheck className="h-3 w-3 mr-1" /> Solicitado pelo cliente
                          </Badge>
                        )}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        Criado em {formatDate(proc.criado_em.split('T')[0])}
                        {responsavelNome && ` · Responsável: ${responsavelNome}`}
                      </p>
                      {proc.descricao && (
                        <p className="text-sm text-muted-foreground italic">{proc.descricao}</p>
                      )}
                    </div>
                    <Badge className={`${stCfg.cor} border-transparent text-xs shrink-0`}>
                      {stCfg.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {proc.formulario_status === 'preenchido' ? (
                    <div className="rounded-md border border-green-200 bg-green-50 p-3 space-y-3">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-green-800">Dados transmitidos pelo cliente</p>
                        {proc.formulario_preenchido_em && (
                          <p className="text-xs text-green-700">Em {formatDate(proc.formulario_preenchido_em.split('T')[0])}</p>
                        )}
                      </div>
                      <div className="flex gap-2 flex-wrap pt-1 border-t border-green-200">
                        <Button size="sm" variant="outline" className="gap-1.5 bg-white" onClick={() => reabrirFormulario(proc)}>
                          <Unlock className="h-3.5 w-3.5" /> Reabrir para edição
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1.5 bg-white" onClick={() => abrirLinkDialog(proc)}>
                          <RefreshCw className="h-3.5 w-3.5" /> Gerar Novo Link
                        </Button>
                        <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700 text-white" onClick={() => concluirProcesso(proc)}>
                          <CheckCircle2 className="h-3.5 w-3.5" /> Concluir Alteração
                        </Button>
                      </div>
                    </div>
                  ) : linkUrl ? (
                    <div className="space-y-3">
                      <div className="rounded-md border bg-muted/40 px-3 py-2">
                        <p className="text-xs text-muted-foreground mb-1">Link do formulário</p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono truncate flex-1">{linkUrl}</span>
                          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => copiarLink(proc)}>
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => window.open(linkUrl, '_blank')}>
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Button size="sm" variant="outline" className="gap-1.5 text-green-700 border-green-300 hover:bg-green-50" onClick={() => setWhatsappProc(proc)}>
                          <MessageCircle className="h-3.5 w-3.5" /> Enviar pelo WhatsApp
                        </Button>
                        <Button size="sm" variant="ghost" className="gap-1.5 text-muted-foreground" onClick={() => abrirLinkDialog(proc)}>
                          <RefreshCw className="h-3.5 w-3.5" /> Reconfigurar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Configure os campos desejados e gere um link para o cliente preencher as novas informações.
                      </p>
                      <Button size="sm" onClick={() => abrirLinkDialog(proc)} className="gap-1.5">
                        Configurar e Gerar Link
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}

          {/* Histórico */}
          {historico.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Histórico</p>
              {historico.map((proc) => {
                const stCfg = STATUS_CONFIG[proc.status]
                return (
                  <div key={proc.id} className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3 bg-muted/30">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{TIPO_LABEL[proc.tipo]}</p>
                      <p className="text-xs text-muted-foreground">
                        {proc.concluido_em
                          ? `Concluído em ${formatDate(proc.concluido_em.split('T')[0])}`
                          : formatDate(proc.criado_em.split('T')[0])}
                      </p>
                    </div>
                    <Badge className={`${stCfg.cor} border-transparent text-xs shrink-0`}>{stCfg.label}</Badge>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Dialog: Nova Alteração */}
      <Dialog open={novoDialog} onOpenChange={setNovoDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Nova Solicitação de Alteração</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Tipo de Alteração *</Label>
              <Select
                value={novoForm.tipo || '__none__'}
                onValueChange={(v) => setNovoForm((f) => ({ ...f, tipo: v === '__none__' ? '' : v as TipoAlteracao }))}
              >
                <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(TIPO_LABEL) as [TipoAlteracao, string][]).map(([val, lbl]) => (
                    <SelectItem key={val} value={val}>{lbl}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Descrição (opcional)</Label>
              <Textarea
                rows={3}
                placeholder="Descreva o que precisa ser alterado..."
                value={novoForm.descricao}
                onChange={(e) => setNovoForm((f) => ({ ...f, descricao: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Responsável (opcional)</Label>
              <Select
                value={novoForm.responsavel_id || '__none__'}
                onValueChange={(v) => setNovoForm((f) => ({ ...f, responsavel_id: v === '__none__' ? '' : v }))}
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNovoDialog(false)}>Cancelar</Button>
            <Button onClick={criarProcesso} disabled={!novoForm.tipo || createProcesso.isPending}>
              {createProcesso.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar Processo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Configurar Link */}
      <Dialog open={linkDialog} onOpenChange={setLinkDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Configurar Formulário de Coleta</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <p className="text-sm text-muted-foreground">
              Selecione quais dados serão coletados. Os campos já preenchidos aparecerão pré-preenchidos para o cliente confirmar.
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
                      id={`alt-secao-${secao}`}
                      checked={todasSelecionadas}
                      ref={(el) => { if (el) el.indeterminate = !todasSelecionadas && algumasSelecionadas }}
                      onChange={() => toggleSecao(secao)}
                      className="h-4 w-4 rounded border"
                    />
                    <label htmlFor={`alt-secao-${secao}`} className="text-sm font-semibold cursor-pointer">
                      {SECAO_LABELS[secao]}
                    </label>
                  </div>
                  <div className="ml-6 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {campos.map((campo) => (
                      <div key={campo.key} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`alt-${campo.key}`}
                          checked={camposSelecionados.includes(campo.key)}
                          onChange={() => toggleCampo(campo.key)}
                          className="h-3.5 w-3.5 rounded border"
                        />
                        <label htmlFor={`alt-${campo.key}`} className="text-sm cursor-pointer select-none">
                          {campo.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="border-t pt-3">
            <p className="text-xs text-muted-foreground">{camposSelecionados.length} campo(s) selecionado(s)</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialog(false)}>Cancelar</Button>
            <Button onClick={gerarLink} disabled={camposSelecionados.length === 0 || updateProcesso.isPending}>
              {updateProcesso.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {processoAtivo?.formulario_token ? 'Regenerar Link' : 'Gerar Link'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* WhatsApp */}
      {whatsappProc?.formulario_token && (
        <WhatsAppMessageDialog
          open={!!whatsappProc}
          onClose={() => setWhatsappProc(null)}
          escritorioId={tenantId}
          titulo="Enviar formulário de alteração"
          mensagemInicial={templateFormularioColeta(
            client.razao_social,
            `${window.location.origin}/formulario/${whatsappProc.formulario_token}`,
            'alteracao',
          )}
          contatosDisponiveis={contatosDisponiveis.length > 0 ? contatosDisponiveis : undefined}
          telefoneInicial={client.telefone ?? ''}
        />
      )}
    </div>
  )
}
