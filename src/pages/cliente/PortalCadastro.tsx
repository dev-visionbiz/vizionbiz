import { useState } from 'react'
import { useAuth } from '@/auth/AuthProvider'
import { useClient, useUpdateClient } from '@/data/hooks/useClients'
import { useClienteEnderecos, useUpdateClienteEndereco, useCreateClienteEndereco } from '@/data/hooks/useClienteEnderecos'
import { useClienteCnaes, useSyncClienteCnaes } from '@/data/hooks/useClienteCnaes'
import { useClienteContatos } from '@/data/hooks/useClienteContatos'
import { useClientContatos } from '@/data/hooks/usePessoas'
import { useProcessosAlteracao, useCreateProcessoAlteracao } from '@/data/hooks/useProcessoAlteracao'
import { consultarCNPJ, formatarCEP, calcularDivergenciasRF } from '@/lib/brasilApi'
import type { DadosCNPJ, Divergencia } from '@/lib/brasilApi'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Building2, MapPin, Phone, Users, Info, ClipboardEdit,
  CheckCircle2, Clock, AlertCircle, FileText,
  Landmark, Globe, TriangleAlert, ArrowRight,
  Loader2, ExternalLink, ShieldCheck, RefreshCcw, Download,
} from 'lucide-react'
import { formatCNPJ, formatDate } from '@/lib/utils'
import type { ProcessoAlteracao, TipoAlteracao } from '@/domain/types'
import { v4 as uuidv4 } from 'uuid'

// ── helpers ────────────────────────────────────────────────────────────────

const PAPEL_LABEL: Record<string, string> = {
  socio:              'Sócio',
  administrador:      'Administrador',
  procurador:         'Procurador',
  contato_financeiro: 'Contato Financeiro',
  contato_principal:  'Contato Principal',
}

const SECOES_ALTERACAO = [
  { id: 'dados_empresa', label: 'Dados da Empresa',               desc: 'Nome empresarial, nome fantasia, atividades econômicas (CNAEs), contato' },
  { id: 'endereco',      label: 'Endereço Fiscal',                desc: 'CEP, logradouro, número, bairro, cidade, estado' },
  { id: 'socio',         label: 'Sócios e Administradores (QSA)', desc: 'Inclusão, exclusão ou alteração de sócios e administradores' },
  { id: 'complementares',label: 'Informações Complementares',     desc: 'Objeto social, quotas de capital, acordo de sócios, procurações' },
]

const SECAO_LABEL: Record<string, string> = Object.fromEntries(SECOES_ALTERACAO.map((s) => [s.id, s.label]))

function secoesToTipo(ids: string[]): TipoAlteracao {
  if (ids.length === 1) {
    if (ids[0] === 'endereco') return 'endereco'
    if (ids[0] === 'socio') return 'socio'
    return 'dados_empresa'
  }
  return 'multiplos'
}

function formatTelefone(ddd: string): string {
  const d = ddd.replace(/\D/g, '')
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return d || '—'
}

function situacaoBadge(cod: number, descricao: string) {
  const cor =
    cod === 2 ? 'bg-green-100 text-green-700' :
    cod === 3 ? 'bg-amber-100 text-amber-700' :
    cod === 4 ? 'bg-red-100 text-red-700' :
    'bg-slate-100 text-slate-600'
  return (
    <Badge className={`${cor} border-transparent text-xs h-5`}>
      {descricao || 'DESCONHECIDA'}
    </Badge>
  )
}

// ── sub-components ─────────────────────────────────────────────────────────

function FieldBox({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">{label}</p>
      <p className="text-sm font-medium">{value || '—'}</p>
    </div>
  )
}

function SectionLabel({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</span>
    </div>
  )
}

function DadosReceitaCard({ dados }: { dados: DadosCNPJ }) {
  const enderecoLinha1 = [dados.logradouro, dados.numero, dados.complemento].filter(Boolean).join(', ')
  const enderecoLinha2 = [dados.bairro, dados.municipio && dados.uf ? `${dados.municipio}/${dados.uf}` : ''].filter(Boolean).join(' — ')
  const cnae = dados.cnae_fiscal ? `${dados.cnae_fiscal} — ${dados.cnae_fiscal_descricao}` : '—'

  return (
    <div className="rounded-lg border bg-muted/20 text-sm divide-y">
      <div className="px-4 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Receita Federal</span>
        </div>
        <div className="flex items-center gap-2">
          {situacaoBadge(dados.situacao_cadastral, dados.descricao_situacao_cadastral)}
          {dados.data_situacao_cadastral && (
            <span className="text-[10px] text-muted-foreground hidden sm:block">
              desde {formatDate(dados.data_situacao_cadastral)}
            </span>
          )}
        </div>
      </div>

      <div className="px-4 py-3 space-y-1">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Identificação</p>
        <p className="font-semibold leading-tight">{dados.razao_social || '—'}</p>
        {dados.nome_fantasia && <p className="text-muted-foreground text-xs">{dados.nome_fantasia}</p>}
        <p className="font-mono text-xs text-muted-foreground">{formatCNPJ(dados.cnpj)}</p>
      </div>

      <div className="px-4 py-3 space-y-1.5">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Atividade Principal</p>
        <p className="text-xs leading-snug">{cnae}</p>
        {dados.cnaes_secundarios && dados.cnaes_secundarios.length > 0 && (
          <div className="mt-2 space-y-1">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Atividades Secundárias</p>
            {dados.cnaes_secundarios.slice(0, 5).map((c, i) => (
              <p key={i} className="text-xs text-muted-foreground leading-snug">
                {c.codigo} — {c.descricao}
              </p>
            ))}
            {dados.cnaes_secundarios.length > 5 && (
              <p className="text-xs text-muted-foreground italic">
                + {dados.cnaes_secundarios.length - 5} atividades secundárias
              </p>
            )}
          </div>
        )}
      </div>

      {(enderecoLinha1 || enderecoLinha2) && (
        <div className="px-4 py-3 space-y-1">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Endereço</p>
          {enderecoLinha1 && <p className="text-xs">{enderecoLinha1}</p>}
          {enderecoLinha2 && <p className="text-xs text-muted-foreground">{enderecoLinha2}</p>}
          {dados.cep && <p className="text-xs text-muted-foreground">CEP: {formatarCEP(dados.cep)}</p>}
        </div>
      )}

      {(dados.ddd_telefone_1 || dados.email) && (
        <div className="px-4 py-3 space-y-1">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Contato</p>
          {dados.ddd_telefone_1 && <p className="text-xs">{formatTelefone(dados.ddd_telefone_1)}</p>}
          {dados.email && <p className="text-xs text-muted-foreground">{dados.email}</p>}
        </div>
      )}

      {dados.qsa && dados.qsa.length > 0 && (
        <div className="px-4 py-3 space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
            Sócios e Administradores (QSA)
          </p>
          {dados.qsa.map((s, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <span className="text-muted-foreground mt-0.5">·</span>
              <div>
                <p className="text-xs font-medium leading-tight">{s.nome_socio}</p>
                <p className="text-[11px] text-muted-foreground">{s.qualificacao_socio}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── main component ─────────────────────────────────────────────────────────

type EtapaDialog = 'consultando' | 'dados_receita' | 'api_erro' | 'info' | 'form' | 'enviado' | 'ja_ativo'

export default function PortalCadastro() {
  const { currentUser } = useAuth()
  const tenantId = currentUser?.tenant_id ?? ''
  const clientId = currentUser?.client_id ?? ''

  const { data: client, isLoading: loadingClient } = useClient(clientId)
  const { data: enderecos } = useClienteEnderecos(tenantId, clientId)
  const { data: cnaes } = useClienteCnaes(tenantId, clientId)
  const { data: contatosTelefone } = useClienteContatos(tenantId, clientId)
  const { data: socios } = useClientContatos(tenantId, clientId)
  const { data: processos } = useProcessosAlteracao(tenantId, clientId)

  const createProcesso = useCreateProcessoAlteracao()
  const updateClient = useUpdateClient()
  const updateEndereco = useUpdateClienteEndereco()
  const createEndereco = useCreateClienteEndereco()
  const syncCnaes = useSyncClienteCnaes()

  // ── dialog state ──────────────────────────────────────────────────────────
  const [dialogOpen, setDialogOpen] = useState(false)
  const [etapa, setEtapa] = useState<EtapaDialog>('consultando')
  const [dadosReceita, setDadosReceita] = useState<DadosCNPJ | null>(null)
  const [divergencias, setDivergencias] = useState<Divergencia[]>([])
  const [erroConsulta, setErroConsulta] = useState<string | null>(null)
  const [atualizandoCadastro, setAtualizandoCadastro] = useState(false)
  const [cadastroAtualizado, setCadastroAtualizado] = useState(false)
  const [aceitouTermos, setAceitouTermos] = useState(false)
  const [secoesSelected, setSecoesSelected] = useState<string[]>([])
  const [descricao, setDescricao] = useState('')
  const [salvando, setSalvando] = useState(false)

  const processoAtivo = processos?.find(
    (p) => p.status !== 'concluido' && p.status !== 'cancelado'
  ) ?? null

  function toggleSecao(id: string) {
    setSecoesSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    )
  }

  function abrirDialog() {
    if (processoAtivo) { setEtapa('ja_ativo'); setDialogOpen(true); return }

    setSecoesSelected([])
    setDescricao('')
    setAceitouTermos(false)
    setDadosReceita(null)
    setDivergencias([])
    setErroConsulta(null)
    setCadastroAtualizado(false)
    setEtapa('info')
    setDialogOpen(true)
  }

  function fecharDialog() { setDialogOpen(false) }

  function iniciarConsulta() {
    const cnpjDigs = client?.cnpj?.replace(/\D/g, '')
    if (!cnpjDigs || cnpjDigs.length !== 14) {
      setEtapa('form'); return
    }
    setEtapa('consultando')
    consultarCNPJ(cnpjDigs)
      .then((data) => {
        setDadosReceita(data)
        setDivergencias(calcularDivergenciasRF(client!, enderecos, cnaes, data))
        setEtapa('dados_receita')
      })
      .catch((err) => { setErroConsulta(err instanceof Error ? err.message : 'Serviço indisponível.'); setEtapa('api_erro') })
  }

  async function atualizarCadastroComRF() {
    if (!dadosReceita || !clientId) return
    setAtualizandoCadastro(true)
    try {
      await updateClient.mutateAsync({
        id: clientId,
        data: {
          ...(dadosReceita.razao_social ? { razao_social: dadosReceita.razao_social } : {}),
          ...(dadosReceita.nome_fantasia !== undefined ? { fantasia: dadosReceita.nome_fantasia } : {}),
          ...(dadosReceita.ddd_telefone_1 ? { telefone: formatTelefone(dadosReceita.ddd_telefone_1) } : {}),
          ...(dadosReceita.email ? { email: dadosReceita.email } : {}),
        },
      })

      if (dadosReceita.logradouro) {
        const enderecoFiscalAtual = enderecos?.find((e) => e.tipo === 'fiscal' && e.principal)
          ?? enderecos?.find((e) => e.tipo === 'fiscal')
        const cepFormatted = dadosReceita.cep ? formatarCEP(dadosReceita.cep) : ''
        const endDelta = {
          logradouro: dadosReceita.logradouro,
          numero: dadosReceita.numero,
          complemento: dadosReceita.complemento || undefined,
          bairro: dadosReceita.bairro,
          cidade: dadosReceita.municipio,
          estado: dadosReceita.uf,
          cep: cepFormatted,
        }
        if (enderecoFiscalAtual) {
          await updateEndereco.mutateAsync({ id: enderecoFiscalAtual.id, data: endDelta })
        } else {
          await createEndereco.mutateAsync({
            id: uuidv4(), tenant_id: tenantId, cliente_id: clientId,
            tipo: 'fiscal', principal: true,
            logradouro: endDelta.logradouro, numero: endDelta.numero,
            complemento: endDelta.complemento, bairro: endDelta.bairro,
            cidade: endDelta.cidade, estado: endDelta.estado, cep: endDelta.cep,
          })
        }
      }

      if (dadosReceita.cnae_fiscal) {
        const novosCnaes = [
          { id: uuidv4(), tenant_id: tenantId, cliente_id: clientId, codigo: String(dadosReceita.cnae_fiscal), descricao: dadosReceita.cnae_fiscal_descricao, principal: true },
          ...(dadosReceita.cnaes_secundarios ?? []).map((c) => ({
            id: uuidv4(), tenant_id: tenantId, cliente_id: clientId,
            codigo: String(c.codigo), descricao: c.descricao, principal: false,
          })),
        ]
        await syncCnaes.mutateAsync({ tenantId, clienteId: clientId, cnaes: novosCnaes })
      }

      setCadastroAtualizado(true)
    } catch (err) {
      console.error(err)
    } finally {
      setAtualizandoCadastro(false)
    }
  }

  async function enviarSolicitacao() {
    setSalvando(true)
    try {
      const novo: ProcessoAlteracao = {
        id: uuidv4(),
        tenant_id: tenantId,
        client_id: clientId,
        tipo: secoesToTipo(secoesSelected),
        descricao: descricao.trim() || undefined,
        formulario_campos: secoesSelected,
        status: 'aguardando_envio',
        solicitado_por: 'cliente',
        criado_por: currentUser?.id ?? 'cliente',
        criado_em: new Date().toISOString(),
      }
      await createProcesso.mutateAsync(novo)
      setEtapa('enviado')
    } catch (err) {
      console.error(err)
    } finally {
      setSalvando(false)
    }
  }

  if (loadingClient) return <PageLoader />
  if (!client) return null

  const enderecoFiscal = enderecos?.find((e) => e.tipo === 'fiscal' && e.principal)
    ?? enderecos?.find((e) => e.tipo === 'fiscal')
    ?? enderecos?.[0]

  const cnaeP = cnaes?.find((c) => c.principal)
  const cnaesSecundarios = cnaes?.filter((c) => !c.principal) ?? []
  const telefonesPrincipais = contatosTelefone?.filter((c) => c.telefone) ?? []
  const sociosList = socios?.filter((s) => s.papel === 'socio' || s.papel === 'administrador') ?? []

  const cnpjDigits = client.cnpj?.replace(/\D/g, '') ?? ''
  const linkReceitaFederal = cnpjDigits
    ? `https://solucoes.receita.fazenda.gov.br/Servicos/cnpjreva/Cnpjreva_Solicitacao2.aspx?cnpj=${cnpjDigits}`
    : 'https://www.gov.br/receitafederal/pt-br'

  function ProcessoStatus() {
    if (!processoAtivo) return null
    const preenchido = processoAtivo.formulario_status === 'preenchido'
    const aguardandoForm = processoAtivo.formulario_status === 'enviado'
    if (preenchido) return (
      <Badge className="bg-green-100 text-green-700 border-transparent text-xs h-5">
        <CheckCircle2 className="h-3 w-3 mr-1" /> Dados transmitidos
      </Badge>
    )
    if (aguardandoForm) return (
      <Badge className="bg-blue-100 text-blue-700 border-transparent text-xs h-5">
        <AlertCircle className="h-3 w-3 mr-1" /> Formulário disponível
      </Badge>
    )
    return (
      <Badge className="bg-amber-100 text-amber-700 border-transparent text-xs h-5">
        <Clock className="h-3 w-3 mr-1" /> Aguardando escritório
      </Badge>
    )
  }

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto space-y-4">

      {/* ── Barra de ação — topo da página ── */}
      <div className="rounded-xl border bg-card px-5 py-4">
        {processoAtivo ? (
          <div className="flex items-center justify-between gap-3 cursor-pointer" onClick={abrirDialog}>
            <div className="min-w-0">
              <p className="text-sm font-medium">Solicitação em andamento</p>
              <p className="text-xs text-muted-foreground truncate">
                {processoAtivo.formulario_campos?.map((id) => SECAO_LABEL[id] ?? id).join(', ')
                  || 'Alterar dados cadastrais'}
                {' · '}{formatDate(processoAtivo.criado_em.split('T')[0])}
              </p>
            </div>
            <ProcessoStatus />
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold">Precisa alterar dados cadastrais?</p>
              <p className="text-xs text-muted-foreground">
                Consultamos a Receita Federal e iniciamos o processo junto ao escritório.
              </p>
            </div>
            <Button size="sm" className="shrink-0 gap-1.5" onClick={abrirDialog}>
              <ClipboardEdit className="h-3.5 w-3.5" />
              Solicitar Alteração
            </Button>
          </div>
        )}
      </div>

      {/* ── Cartão Cadastral ── */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">

        <div className="bg-muted/50 border-b px-5 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Dados Cadastrais</p>
              <p className="text-xs text-muted-foreground">Cadastro Nacional da Pessoa Jurídica</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">CNPJ</p>
            <p className="text-sm font-mono font-semibold">
              {client.cnpj ? formatCNPJ(client.cnpj) : '— em abertura —'}
            </p>
          </div>
        </div>

        <div className="px-5 py-4 border-b space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Identificação</span>
            <Badge className={`text-xs h-5 border-transparent ${
              client.status === 'ativo' ? 'bg-green-100 text-green-700' :
              client.status === 'em_abertura' ? 'bg-amber-100 text-amber-700' :
              'bg-slate-100 text-slate-600'
            }`}>
              {client.status === 'ativo' ? 'ATIVA' : client.status === 'em_abertura' ? 'EM ABERTURA' : 'INATIVA'}
            </Badge>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <FieldBox label="Nome Empresarial" value={client.razao_social} />
            {client.fantasia && <FieldBox label="Nome Fantasia" value={client.fantasia} />}
          </div>
        </div>

        <div className="px-5 py-4 border-b">
          <SectionLabel icon={Info} title="Atividades Econômicas (CNAEs)" />
          {!cnaes?.length ? (
            <p className="text-sm text-muted-foreground italic">Não informado</p>
          ) : (
            <div className="space-y-2">
              {cnaeP && (
                <div className="rounded-md bg-muted/50 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-0.5">Principal</p>
                  <p className="text-sm font-medium">{cnaeP.codigo} — {cnaeP.descricao}</p>
                </div>
              )}
              {cnaesSecundarios.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Secundárias</p>
                  {cnaesSecundarios.map((c) => (
                    <p key={c.id} className="text-sm text-muted-foreground">{c.codigo} — {c.descricao}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-b">
          <div className="mb-3">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Constituição</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <FieldBox label="Regime Tributário" value={client.regime || '—'} />
            <FieldBox label="Inscrição Estadual" value={client.inscricao_estadual || '—'} />
            <FieldBox label="Inscrição Municipal" value={client.inscricao_municipal || '—'} />
          </div>
        </div>

        <div className="px-5 py-4 border-b">
          <SectionLabel icon={MapPin} title="Endereço Fiscal" />
          {!enderecoFiscal ? (
            <p className="text-sm text-muted-foreground italic">Endereço não cadastrado</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FieldBox
                label="Logradouro"
                value={`${enderecoFiscal.logradouro}, ${enderecoFiscal.numero}${enderecoFiscal.complemento ? ` — ${enderecoFiscal.complemento}` : ''}`}
              />
              <FieldBox label="Bairro" value={enderecoFiscal.bairro} />
              <FieldBox label="Município / UF" value={`${enderecoFiscal.cidade} — ${enderecoFiscal.estado}`} />
              <FieldBox label="CEP" value={enderecoFiscal.cep} />
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-b">
          <SectionLabel icon={Phone} title="Contato" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FieldBox label="Telefone / WhatsApp" value={client.telefone || telefonesPrincipais[0]?.telefone || '—'} />
            <FieldBox label="E-mail" value={client.email || '—'} />
          </div>
        </div>

        <div className="px-5 py-4 border-b">
          <SectionLabel icon={Users} title="Sócios e Administradores (QSA)" />
          {sociosList.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Nenhum sócio/administrador cadastrado</p>
          ) : (
            <div className="space-y-2">
              {sociosList.map((s) => (
                <div key={s.id} className="rounded-md border bg-muted/30 px-3 py-2">
                  <p className="text-sm font-medium">{s.pessoa.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {PAPEL_LABEL[s.papel] ?? s.papel}
                    {s.principal && ' · Principal'}
                    {s.pessoa.cpf && ` · CPF: ${s.pessoa.cpf}`}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-5 py-4">
          <SectionLabel icon={ClipboardEdit} title="Informações Complementares" />
          <p className="text-sm text-muted-foreground">
            Objeto social, quotas de capital, acordo entre sócios, procurações e demais documentos societários.
          </p>
        </div>
      </div>

      {/* ── Dialog multi-etapa ── */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) fecharDialog() }}>
        <DialogContent className="sm:max-w-lg">

          {/* Já existe processo ativo */}
          {etapa === 'ja_ativo' && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                  Solicitação em andamento
                </DialogTitle>
              </DialogHeader>
              <div className="py-2 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Você já possui uma solicitação de alteração cadastral em andamento.
                  Não é possível abrir uma nova enquanto a anterior não for concluída.
                </p>
                {processoAtivo && (
                  <div className="rounded-lg border bg-muted/40 px-4 py-3 space-y-2">
                    {processoAtivo.formulario_campos?.length ? (
                      <div className="flex flex-wrap gap-1.5">
                        {processoAtivo.formulario_campos.map((id) => (
                          <Badge key={id} variant="secondary" className="text-xs">{SECAO_LABEL[id] ?? id}</Badge>
                        ))}
                      </div>
                    ) : null}
                    {processoAtivo.descricao && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{processoAtivo.descricao}</p>
                    )}
                    <ProcessoStatus />
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Entre em contato com o escritório se precisar de mais informações sobre o andamento.
                </p>
              </div>
              <DialogFooter><Button onClick={fecharDialog}>Entendi</Button></DialogFooter>
            </>
          )}

          {/* Etapa 2: Consultando */}
          {etapa === 'consultando' && (
            <>
              <DialogHeader><DialogTitle>Consultando a Receita Federal…</DialogTitle></DialogHeader>
              <div className="py-8 flex flex-col items-center gap-4 text-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Buscando os dados atuais da sua empresa</p>
                  <p className="text-xs text-muted-foreground max-w-xs">
                    Aguarde enquanto verificamos o que está registrado hoje na Receita Federal.
                  </p>
                </div>
              </div>
              <DialogFooter><Button variant="outline" onClick={fecharDialog}>Cancelar</Button></DialogFooter>
            </>
          )}

          {/* Etapa 3a: Dados da Receita Federal */}
          {etapa === 'dados_receita' && dadosReceita && (
            <>
              <DialogHeader><DialogTitle>Dados na Receita Federal</DialogTitle></DialogHeader>
              <div className="space-y-3 py-2">
                <p className="text-sm text-muted-foreground">
                  Veja abaixo o que está registrado hoje na Receita Federal para a sua empresa.
                </p>
                <div className="max-h-[42vh] overflow-y-auto rounded-lg">
                  <DadosReceitaCard dados={dadosReceita} />
                </div>

                {cadastroAtualizado ? (
                  <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
                    <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                    <p className="text-sm text-green-800 font-medium">
                      Cadastro do portal atualizado com os dados da Receita Federal.
                    </p>
                  </div>
                ) : divergencias.length === 0 ? (
                  <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
                    <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                    <p className="text-sm text-green-800 font-medium">
                      Cadastro em dia — os dados do portal estão iguais à Receita Federal.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 space-y-2">
                    <p className="text-xs font-semibold text-amber-800">
                      {divergencias.length} divergência(s) entre o portal e a Receita Federal:
                    </p>
                    <div className="space-y-2">
                      {divergencias.map((d) => (
                        <div key={d.campo} className="text-xs space-y-0.5">
                          <p className="font-medium text-amber-900">{d.campo}</p>
                          <p className="text-muted-foreground">Portal: <span className="line-through">{d.atual}</span></p>
                          <p className="text-green-700">Receita: <span className="font-medium">{d.receita}</span></p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
                {!cadastroAtualizado && divergencias.length > 0 && (
                  <>
                    <Button variant="ghost" size="sm" onClick={fecharDialog}>Fechar — dados ok</Button>
                    <Button
                      variant="outline" size="sm" className="gap-1.5"
                      disabled={atualizandoCadastro}
                      onClick={atualizarCadastroComRF}
                    >
                      {atualizandoCadastro
                        ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Atualizando…</>
                        : <><Download className="h-3.5 w-3.5" /> Atualizar portal</>
                      }
                    </Button>
                  </>
                )}
                {(cadastroAtualizado || divergencias.length === 0) && (
                  <Button variant="ghost" size="sm" onClick={fecharDialog}>Fechar</Button>
                )}
                <Button onClick={() => setEtapa('form')} className="gap-1.5">
                  Solicitar Alteração <ArrowRight className="h-4 w-4" />
                </Button>
              </DialogFooter>
            </>
          )}

          {/* Etapa 3b: Erro na consulta */}
          {etapa === 'api_erro' && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                  Não conseguimos consultar a Receita Federal
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <p className="text-sm text-muted-foreground">
                  {erroConsulta && erroConsulta !== 'unavailable' && erroConsulta !== 'network'
                    ? erroConsulta
                    : 'Houve uma instabilidade temporária no serviço. Isso não impede você de prosseguir.'}
                </p>
                <div className="rounded-lg border bg-muted/40 p-4 space-y-3">
                  <p className="text-sm font-semibold">Consulte seus dados manualmente</p>
                  <p className="text-xs text-muted-foreground">
                    Acesse o site oficial da Receita Federal.
                    {cnpjDigits && ' O CNPJ já estará preenchido no campo de busca.'}
                  </p>
                  <Button
                    variant="outline" size="sm" className="gap-2 w-full"
                    onClick={() => window.open(linkReceitaFederal, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Abrir site da Receita Federal
                  </Button>
                  <p className="text-[11px] text-muted-foreground">
                    Verifique: situação cadastral, nome empresarial, endereço e quadro de sócios (QSA).
                  </p>
                </div>
              </div>
              <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
                <Button variant="ghost" size="sm" onClick={fecharDialog}>Cancelar</Button>
                <Button
                  variant="outline" size="sm" className="gap-1.5"
                  onClick={() => {
                    setEtapa('consultando')
                    consultarCNPJ(cnpjDigits)
                      .then((data) => {
                        setDadosReceita(data)
                        setDivergencias(calcularDivergenciasRF(client!, enderecos, cnaes, data))
                        setEtapa('dados_receita')
                      })
                      .catch((err) => { setErroConsulta(err instanceof Error ? err.message : ''); setEtapa('api_erro') })
                  }}
                >
                  <RefreshCcw className="h-3.5 w-3.5" /> Tentar novamente
                </Button>
                <Button onClick={() => setEtapa('form')} className="gap-1.5">
                  Continuar sem consulta <ArrowRight className="h-4 w-4" />
                </Button>
              </DialogFooter>
            </>
          )}

          {/* Etapa 1: Como funciona */}
          {etapa === 'info' && (
            <>
              <DialogHeader><DialogTitle>Como funciona uma alteração cadastral?</DialogTitle></DialogHeader>
              <div className="py-2 space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                <p className="text-sm text-muted-foreground">
                  Alterar os dados de uma empresa é um processo formal que envolve diferentes órgãos:
                </p>
                <div className="space-y-3">
                  {[
                    { Icon: FileText,  title: 'Elaboração do instrumento',  desc: 'O escritório elabora o Aditamento ao Contrato Social com as novas informações, conforme a legislação vigente.' },
                    { Icon: Landmark,  title: 'Registro na Junta Comercial', desc: 'O documento é registrado na Junta Comercial do seu estado. O prazo varia entre 3 e 15 dias úteis.' },
                    { Icon: Building2, title: 'Atualização do CNPJ',         desc: 'Após o registro na Junta, as novas informações são comunicadas à Receita Federal.' },
                    { Icon: Globe,     title: 'Outros órgãos (se necessário)', desc: 'Dependendo da alteração, pode ser necessário atualizar IE, IM, alvarás ou outros cadastros.' },
                  ].map(({ Icon, title, desc }) => (
                    <div key={title} className="flex gap-3">
                      <div className="mt-0.5 h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex gap-2.5">
                  <TriangleAlert className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Este processo tem custos</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Há taxas de registro na Junta Comercial e honorários do escritório.
                      O contador preparará um orçamento antes de iniciar qualquer procedimento.
                    </p>
                  </div>
                </div>
                <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 flex gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-blue-700">
                    Ao continuar, o sistema realizará uma consulta automática na Receita Federal para exibir o cadastro atual da empresa e atualizar os dados do portal.
                  </p>
                </div>
                <div
                  className="flex items-start gap-3 rounded-lg border bg-muted/30 px-4 py-3 cursor-pointer"
                  onClick={() => setAceitouTermos((v) => !v)}
                >
                  <Checkbox id="aceite" checked={aceitouTermos} onCheckedChange={(v) => setAceitouTermos(!!v)} className="mt-0.5" />
                  <label htmlFor="aceite" className="text-sm cursor-pointer select-none">
                    Entendi como funciona e desejo solicitar um orçamento ao escritório.
                  </label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={fecharDialog}>Cancelar</Button>
                <Button disabled={!aceitouTermos} onClick={iniciarConsulta} className="gap-1.5">
                  Iniciar Consulta <ArrowRight className="h-4 w-4" />
                </Button>
              </DialogFooter>
            </>
          )}

          {/* Etapa 4: O que alterar */}
          {etapa === 'form' && (
            <>
              <DialogHeader><DialogTitle>O que precisa ser alterado?</DialogTitle></DialogHeader>
              <div className="space-y-4 py-2">
                <p className="text-sm text-muted-foreground">
                  Selecione tudo que precisa mudar — pode marcar mais de uma opção.
                </p>
                <div className="space-y-2">
                  <Label>Áreas a alterar *</Label>
                  <div className="space-y-2">
                    {SECOES_ALTERACAO.map((secao) => (
                      <div
                        key={secao.id}
                        className="flex items-start gap-3 rounded-lg border px-4 py-3 cursor-pointer hover:bg-muted/40 transition-colors"
                        onClick={() => toggleSecao(secao.id)}
                      >
                        <Checkbox id={secao.id} checked={secoesSelected.includes(secao.id)} onCheckedChange={() => toggleSecao(secao.id)} className="mt-0.5" />
                        <div className="min-w-0">
                          <label htmlFor={secao.id} className="text-sm font-medium cursor-pointer">{secao.label}</label>
                          <p className="text-xs text-muted-foreground mt-0.5">{secao.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Descreva o que precisa mudar <span className="text-muted-foreground font-normal">(opcional)</span></Label>
                  <Textarea
                    rows={3}
                    placeholder="Ex: Vamos mudar o endereço para Rua das Flores, 100. Também precisamos incluir um novo sócio…"
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEtapa(dadosReceita ? 'dados_receita' : erroConsulta ? 'api_erro' : 'info')}>Voltar</Button>
                <Button onClick={enviarSolicitacao} disabled={secoesSelected.length === 0 || salvando} className="gap-1.5">
                  {salvando ? 'Enviando…' : 'Solicitar Orçamento'}
                </Button>
              </DialogFooter>
            </>
          )}

          {/* Etapa 5: Confirmação — enviada */}
          {etapa === 'enviado' && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Solicitação enviada!
                </DialogTitle>
              </DialogHeader>
              <div className="py-2 space-y-3">
                {secoesSelected.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {secoesSelected.map((id) => (
                      <Badge key={id} variant="secondary" className="text-xs">{SECAO_LABEL[id] ?? id}</Badge>
                    ))}
                  </div>
                )}
                <p className="text-sm text-muted-foreground">Sua solicitação foi recebida. Os próximos passos:</p>
                <ol className="space-y-2 text-sm">
                  <li className="flex gap-2"><span className="font-semibold text-primary shrink-0">1.</span>O contador avaliará e preparará um orçamento.</li>
                  <li className="flex gap-2"><span className="font-semibold text-primary shrink-0">2.</span>Você receberá um retorno com valor e prazo estimado.</li>
                  <li className="flex gap-2"><span className="font-semibold text-primary shrink-0">3.</span>Após aprovação, o escritório inicia o processo junto aos órgãos.</li>
                  <li className="flex gap-2"><span className="font-semibold text-primary shrink-0">4.</span>Você acompanha o andamento aqui neste portal.</li>
                </ol>
              </div>
              <DialogFooter><Button onClick={fecharDialog}>Fechar</Button></DialogFooter>
            </>
          )}

        </DialogContent>
      </Dialog>
    </div>
  )
}
