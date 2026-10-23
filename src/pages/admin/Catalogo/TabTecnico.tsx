import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAppVersion, useCriarAppVersion, useAtualizarAppVersion } from '@/data/hooks/useApps'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import {
  Save, ChevronDown, ChevronRight,
  LayoutDashboard, Users, Home, Globe,
  Info, Lightbulb, ShieldCheck, ExternalLink,
} from 'lucide-react'
import type { AppEscopoSlug, AppSlotSlug, AppEventoTipo, AppTipo, AppManifesto, GadgetSpec } from '@/domain/types'

// ─── UI auxiliares ────────────────────────────────────────────────────────────

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
      <Info className="h-4 w-4 mt-0.5 shrink-0" />
      <div className="space-y-1">{children}</div>
    </div>
  )
}

function TipBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <Lightbulb className="h-4 w-4 mt-0.5 shrink-0" />
      <div className="space-y-1">{children}</div>
    </div>
  )
}

function WarnBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
      <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0" />
      <div className="space-y-1">{children}</div>
    </div>
  )
}

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold">{title}</h3>
      {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
    </div>
  )
}

// ─── Dados de referência ─────────────────────────────────────────────────────

const ESCOPOS: {
  slug: AppEscopoSlug
  label: string
  desc: string
  exemplo: string
  risco: 'baixo' | 'medio' | 'alto'
}[] = [
  {
    slug: 'clientes:read',
    label: 'Clientes — Leitura',
    desc: 'Acessa nome, CNPJ, e-mail, telefone e status dos clientes do escritório.',
    exemplo: 'Necessário para exibir o nome do cliente no widget ou personalizar experiências.',
    risco: 'baixo',
  },
  {
    slug: 'clientes:write',
    label: 'Clientes — Escrita',
    desc: 'Pode criar e editar dados cadastrais dos clientes.',
    exemplo: 'Usar apenas se o extensor atualiza dados do cliente (ex: sincroniza informações com outro sistema).',
    risco: 'alto',
  },
  {
    slug: 'contratos:read',
    label: 'Contratos — Leitura',
    desc: 'Acessa contratos ativos, serviços contratados e valores.',
    exemplo: 'Necessário se o extensor precisa saber quais serviços o cliente já tem contratado.',
    risco: 'baixo',
  },
  {
    slug: 'financeiro:read',
    label: 'Financeiro — Leitura',
    desc: 'Acessa cobranças, faturas emitidas e histórico de pagamentos.',
    exemplo: 'Para exibir situação financeira do cliente ou condicionar acesso por adimplência.',
    risco: 'medio',
  },
  {
    slug: 'financeiro:write',
    label: 'Financeiro — Escrita',
    desc: 'Pode criar cobranças e registrar pagamentos.',
    exemplo: 'Usar somente se o extensor gera cobranças diretamente (ex: cobrança por uso de serviço).',
    risco: 'alto',
  },
  {
    slug: 'documentos:read',
    label: 'Documentos — Leitura',
    desc: 'Acessa e baixa documentos armazenados no VisionBiz.',
    exemplo: 'Para processar documentos do cliente (ex: leitura de declaração para preenchimento automático).',
    risco: 'medio',
  },
  {
    slug: 'documentos:write',
    label: 'Documentos — Escrita',
    desc: 'Pode enviar e atualizar documentos no VisionBiz.',
    exemplo: 'Para salvar documentos gerados pelo extensor (ex: certificado emitido, relatório produzido).',
    risco: 'medio',
  },
  {
    slug: 'tarefas:write',
    label: 'Tarefas — Escrita',
    desc: 'Pode criar tarefas e ocorrências no VisionBiz.',
    exemplo: 'Para alertar o escritório sobre pendências (ex: "Certificado vence em 30 dias → criar tarefa").',
    risco: 'baixo',
  },
  {
    slug: 'notificacoes:send',
    label: 'Notificações — Envio',
    desc: 'Pode enviar mensagens para clientes via WhatsApp e e-mail.',
    exemplo: 'Para comunicar eventos ao cliente (ex: "Seu certificado foi emitido com sucesso").',
    risco: 'medio',
  },
]

const RISCO_BADGE: Record<'baixo' | 'medio' | 'alto', { label: string; class: string }> = {
  baixo:  { label: 'Baixo risco',  class: 'bg-green-100 text-green-700 border-green-200' },
  medio:  { label: 'Médio risco',  class: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  alto:   { label: 'Alto risco',   class: 'bg-red-100 text-red-700 border-red-200' },
}

type SlotGroup = {
  title: string
  subtitle: string
  icon: React.ElementType
  context: 'escritorio' | 'portal'
  contextLabel: string
  descricaoArea: string
  slots: { slug: AppSlotSlug; label: string; desc: string; ondeAparece: string }[]
}

const SLOT_GROUPS: SlotGroup[] = [
  {
    title: 'Dashboard do escritório',
    subtitle: 'Tela principal que o colaborador vê ao entrar no sistema',
    icon: LayoutDashboard,
    context: 'escritorio',
    contextLabel: 'Interno',
    descricaoArea: 'O dashboard é a primeira tela que o colaborador do escritório vê ao fazer login. Widgets aqui têm alta visibilidade e são acessados com frequência.',
    slots: [
      {
        slug: 'escritorio.dashboard.widget',
        label: 'Widget / Card',
        desc: 'Um card de métricas, ações rápidas ou informações relevantes.',
        ondeAparece: 'Grade de cards no centro do dashboard. O colaborador vê todos os widgets instalados.',
      },
      {
        slug: 'escritorio.dashboard.alerta',
        label: 'Banner de alerta',
        desc: 'Mensagem de atenção destacada no topo ou em área de destaque.',
        ondeAparece: 'Área de alertas no topo do dashboard. Use apenas para informações urgentes ou pendências críticas.',
      },
    ],
  },
  {
    title: 'Ficha do cliente',
    subtitle: 'Tela detalhada aberta ao clicar em um cliente específico',
    icon: Users,
    context: 'escritorio',
    contextLabel: 'Interno',
    descricaoArea: 'A ficha do cliente é a tela mais usada pelo escritório. Extensores aqui ficam contextualizados ao cliente selecionado — o widget sabe exatamente para qual CNPJ está exibindo informações.',
    slots: [
      {
        slug: 'escritorio.cliente.aba',
        label: 'Nova aba',
        desc: 'Uma aba completa dedicada ao extensor dentro da ficha do cliente.',
        ondeAparece: 'Barra de abas da ficha do cliente (ao lado de Dados, Financeiro, Documentos…). O colaborador clica para abrir.',
      },
      {
        slug: 'escritorio.cliente.card',
        label: 'Card lateral',
        desc: 'Um card informativo exibido na coluna lateral da ficha.',
        ondeAparece: 'Sidebar direita da ficha do cliente. Exibido junto com outros cards de contexto do cliente.',
      },
    ],
  },
  {
    title: 'Portal do cliente — Página inicial',
    subtitle: 'Tela inicial que o cliente final vê ao acessar o portal',
    icon: Home,
    context: 'portal',
    contextLabel: 'Portal',
    descricaoArea: 'O portal é acessado pelo cliente final (empresas atendidas pelo escritório). Extensores aqui são mostrados ao cliente, não ao colaborador. O escritório pode controlar quais clientes veem cada extensor.',
    slots: [
      {
        slug: 'portal.inicio.servico',
        label: 'Serviço / Ação',
        desc: 'Botão ou card de serviço adicional na tela inicial do portal.',
        ondeAparece: 'Grade de serviços na tela inicial do portal. O cliente clica para acessar o extensor.',
      },
      {
        slug: 'portal.inicio.alerta',
        label: 'Banner de alerta',
        desc: 'Aviso ou notificação exibido para o cliente no portal.',
        ondeAparece: 'Área de alertas da tela inicial do portal. Use para informações urgentes ao cliente (ex: "Seu certificado vence em 5 dias").',
      },
    ],
  },
  {
    title: 'Portal do cliente — Página própria',
    subtitle: 'Uma rota dedicada para o extensor dentro do portal',
    icon: Globe,
    context: 'portal',
    contextLabel: 'Portal',
    descricaoArea: 'O extensor ganha uma rota própria no portal (/portal/nome-extensor). Ideal para extensores com interface completa que precisam de uma tela inteira.',
    slots: [
      {
        slug: 'portal.pagina',
        label: 'Página inteira',
        desc: 'O extensor ocupa uma página completa dentro do portal do cliente.',
        ondeAparece: 'Rota dedicada no portal. O cliente acessa via menu ou via botão de serviço na tela inicial.',
      },
    ],
  },
]

const EVENTOS: { slug: AppEventoTipo; label: string; desc: string }[] = [
  { slug: 'cliente.criado',    label: 'Cliente criado',    desc: 'Disparado quando um novo cliente é cadastrado no escritório.' },
  { slug: 'documento.baixado', label: 'Documento baixado', desc: 'Disparado quando um cliente ou colaborador baixa um documento.' },
  { slug: 'cobranca.vencida',  label: 'Cobrança vencida',  desc: 'Disparado quando uma cobrança passa da data de vencimento sem pagamento.' },
  { slug: 'cobranca.paga',     label: 'Cobrança paga',     desc: 'Disparado quando um pagamento é confirmado.' },
  { slug: 'contrato.criado',   label: 'Contrato criado',   desc: 'Disparado quando um novo contrato é cadastrado para um cliente.' },
  { slug: 'app.instalado',     label: 'App instalado',     desc: 'Disparado quando o escritório instala este extensor.' },
  { slug: 'app.desinstalado',  label: 'App desinstalado',  desc: 'Disparado quando o escritório desinstala ou revoga o extensor.' },
]

const TAMANHO_OPTS = [
  { value: 'pequeno', label: 'Pequeno',  desc: '1 coluna — informação compacta' },
  { value: 'medio',   label: 'Médio',    desc: '2 colunas — padrão para a maioria dos casos' },
  { value: 'grande',  label: 'Grande',   desc: '3 colunas — gráficos ou tabelas' },
]

const SCOPE_OPTS = [
  { value: 'escritorio', label: 'Apenas escritório',      desc: 'Visível somente para colaboradores internos' },
  { value: 'portal',     label: 'Apenas portal',          desc: 'Visível somente para clientes no portal' },
  { value: 'ambos',      label: 'Escritório e portal',    desc: 'Visível em ambos os contextos' },
]

// ─── GadgetConfig ──────────────────────────────────────────────────────────────

function GadgetConfig({
  slot, tipo, spec, onChange,
}: {
  slot: AppSlotSlug
  tipo: AppTipo
  spec: Partial<GadgetSpec>
  onChange: (s: Partial<GadgetSpec>) => void
}) {
  function updateEndpoint(patch: Partial<GadgetSpec['dataEndpoint'] & object>) {
    onChange({
      ...spec, slot,
      dataEndpoint: {
        url: spec.dataEndpoint?.url ?? '',
        method: spec.dataEndpoint?.method ?? 'GET',
        authHeader: spec.dataEndpoint?.authHeader ?? '',
        refreshInterval: spec.dataEndpoint?.refreshInterval ?? 300,
        mapping: spec.dataEndpoint?.mapping ?? {},
        ...patch,
      },
    })
  }

  return (
    <div className="mt-3 pl-4 border-l-2 border-primary/20 space-y-4">

      {/* Tamanho e scope */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs font-medium">Tamanho do widget</Label>
          <Select
            value={spec.tamanho ?? 'medio'}
            onValueChange={(v) => onChange({ ...spec, slot, tamanho: v as GadgetSpec['tamanho'] })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TAMANHO_OPTS.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-xs">
                  <span className="font-medium">{o.label}</span>
                  <span className="text-muted-foreground ml-1">— {o.desc}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Controla quantas colunas o widget ocupa na grade.</p>
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-medium">Visibilidade</Label>
          <Select
            value={spec.scope ?? 'ambos'}
            onValueChange={(v) => onChange({ ...spec, slot, scope: v as GadgetSpec['scope'] })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SCOPE_OPTS.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-xs">
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Quem pode ver este widget neste slot.</p>
        </div>
      </div>

      {/* Configuração específica por tipo */}
      {tipo === 'embarcado' && (
        <div className="space-y-1">
          <Label className="text-xs font-medium">Nome do componente React</Label>
          <Input
            className="h-8 text-xs font-mono"
            placeholder="Ex: CertificadosDashboardCard"
            value={spec.component ?? ''}
            onChange={(e) => onChange({ ...spec, slot, component: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Nome exato do componente registrado no registry interno do VisionBiz (case-sensitive).
            Contate a equipe de engenharia para registrar o componente antes de publicar.
          </p>
        </div>
      )}

      {tipo === 'embed' && (
        <div className="space-y-1">
          <Label className="text-xs font-medium">URL do iframe</Label>
          <Input
            className="h-8 text-xs font-mono"
            placeholder="https://app.meusite.com.br/widget?token={token}"
            value={spec.embedUrl ?? ''}
            onChange={(e) => onChange({ ...spec, slot, embedUrl: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            URL da sua aplicação que será carregada no iframe. Use <code className="bg-muted px-1 rounded">{'{token}'}</code> como
            placeholder — o VisionBiz substitui por um JWT assinado contendo o contexto do usuário (escritório, cliente, papel).
            Valide o JWT no seu servidor antes de exibir dados sensíveis.
          </p>
        </div>
      )}

      {tipo === 'conectado' && (
        <div className="space-y-4">
          <div className="rounded-lg bg-muted/50 border px-3 py-2 text-xs text-muted-foreground">
            O VisionBiz chamará este endpoint a cada intervalo configurado e renderizará os dados retornados no widget.
            O endpoint deve retornar um JSON com os campos mapeados abaixo.
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium">URL do endpoint</Label>
            <Input
              className="h-8 text-xs font-mono"
              placeholder="https://api.meusite.com.br/gadget/dashboard"
              value={spec.dataEndpoint?.url ?? ''}
              onChange={(e) => updateEndpoint({ url: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">URL completa que o VisionBiz chamará. Deve suportar HTTPS e CORS.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Método HTTP</Label>
              <Select
                value={spec.dataEndpoint?.method ?? 'GET'}
                onValueChange={(v) => updateEndpoint({ method: v as 'GET' | 'POST' })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET"  className="text-xs">GET — sem corpo</SelectItem>
                  <SelectItem value="POST" className="text-xs">POST — com payload JSON</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Intervalo de atualização (segundos)</Label>
              <Input
                type="number" min={30} step={30}
                className="h-8 text-xs"
                value={spec.dataEndpoint?.refreshInterval ?? 300}
                onChange={(e) => updateEndpoint({ refreshInterval: Number(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">Mínimo 30 s. Padrão recomendado: 300 s (5 min).</p>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-medium">Header de autenticação</Label>
            <Input
              className="h-8 text-xs font-mono"
              placeholder="Authorization: Bearer {token}"
              value={spec.dataEndpoint?.authHeader ?? ''}
              onChange={(e) => updateEndpoint({ authHeader: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Header enviado em todas as requisições ao endpoint. Use <code className="bg-muted px-1 rounded">{'{token}'}</code> como
              placeholder para o JWT do VisionBiz — assim seu servidor valida que a chamada é legítima.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Chip toggle ───────────────────────────────────────────────────────────────

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
        active
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-background text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground'
      }`}
    >
      {children}
    </button>
  )
}

// ─── TabTecnico ────────────────────────────────────────────────────────────────

interface TabTecnicoProps {
  appId: string
  tipo: AppTipo
  slug: string
  nome: string
}

export function TabTecnico({ appId, tipo, slug, nome }: TabTecnicoProps) {
  const { data: versao } = useAppVersion(appId)
  const criarVersao = useCriarAppVersion()
  const atualizarVersao = useAtualizarAppVersion()
  const { toast } = useToast()

  const [versaoStr, setVersaoStr] = useState('1.0.0')
  const [escopos, setEscopos] = useState<Set<AppEscopoSlug>>(new Set())
  const [slots, setSlots] = useState<Set<AppSlotSlug>>(new Set())
  const [gadgets, setGadgets] = useState<Record<AppSlotSlug, Partial<GadgetSpec>>>({} as Record<AppSlotSlug, Partial<GadgetSpec>>)
  const [eventos, setEventos] = useState<Set<AppEventoTipo>>(new Set())
  const [expandedSlots, setExpandedSlots] = useState<Set<AppSlotSlug>>(new Set())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!versao) return
    setVersaoStr(versao.versao)
    setEscopos(new Set(versao.manifesto.escopos))
    setSlots(new Set(versao.manifesto.slots))
    setEventos(new Set(versao.manifesto.eventos_assinados))
    const map: Record<string, Partial<GadgetSpec>> = {}
    versao.manifesto.gadgets?.forEach((g) => { map[g.slot] = g })
    setGadgets(map as Record<AppSlotSlug, Partial<GadgetSpec>>)
  }, [versao])

  function toggleEscopo(s: AppEscopoSlug) {
    setEscopos((prev) => { const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n })
  }

  function toggleSlot(s: AppSlotSlug) {
    setSlots((prev) => {
      const n = new Set(prev)
      if (n.has(s)) {
        n.delete(s)
        setExpandedSlots((e) => { const ne = new Set(e); ne.delete(s); return ne })
      } else {
        n.add(s)
        setExpandedSlots((e) => new Set([...e, s]))
      }
      return n
    })
  }

  function toggleEvento(s: AppEventoTipo) {
    setEventos((prev) => { const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n })
  }

  function toggleExpand(s: AppSlotSlug) {
    setExpandedSlots((prev) => { const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n })
  }

  async function salvar() {
    setSaving(true)
    try {
      const manifesto: AppManifesto = {
        slug, nome, tipo, versao: versaoStr, descricao: '',
        escopos: [...escopos],
        slots: [...slots],
        gadgets: [...slots].map((s) => ({
          slot: s,
          scope: gadgets[s]?.scope ?? 'ambos',
          tamanho: gadgets[s]?.tamanho ?? 'medio',
          component: gadgets[s]?.component,
          embedUrl: gadgets[s]?.embedUrl,
          dataEndpoint: gadgets[s]?.dataEndpoint,
        } as GadgetSpec)),
        eventos_assinados: [...eventos],
        planos: [],
      }
      if (versao) {
        await atualizarVersao.mutateAsync({ id: versao.id, appId, data: { versao: versaoStr, manifesto } })
      } else {
        await criarVersao.mutateAsync({ appId, versao: versaoStr, manifesto })
      }
      toast({ title: 'Configuração técnica salva' })
    } catch {
      toast({ title: 'Erro ao salvar', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8">

      {/* Intro */}
      <InfoBox>
        <p className="font-medium">O que é o manifesto técnico?</p>
        <p>
          O manifesto é o contrato entre o extensor e o VisionBiz. Ele declara:
          quais dados do escritório o extensor pode acessar <em>(escopos)</em>,
          em quais telas ele aparece <em>(slots)</em>,
          como cada widget é configurado <em>(gadgets)</em>,
          e quais eventos geram webhooks para o seu sistema.
        </p>
        <p>
          Quando um escritório instala o extensor, o VisionBiz usa exatamente este manifesto para
          solicitar aprovação das permissões e montar a interface nos locais corretos.
        </p>
        <p>
          <Link
            to="/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium underline underline-offset-2 hover:opacity-80"
          >
            Ver documentação completa para desenvolvedores <ExternalLink className="h-3 w-3" />
          </Link>
        </p>
      </InfoBox>

      {/* — Versão — */}
      <section className="space-y-3">
        <SectionHeader
          title="Versão do manifesto"
          description="Use versionamento semântico: MAJOR.MINOR.PATCH (ex: 1.0.0, 1.2.3, 2.0.0)"
        />
        <TipBox>
          <p>
            Aumente o número de versão sempre que fizer mudanças nas permissões ou slots.
            Escritórios que já instalaram o extensor precisarão aceitar as novas permissões ao atualizar.
            Mudanças só de texto ou URL não precisam de nova versão.
          </p>
        </TipBox>
        <div className="flex items-center gap-3">
          <Input
            value={versaoStr}
            onChange={(e) => setVersaoStr(e.target.value)}
            className="w-32 font-mono"
            placeholder="1.0.0"
          />
          {versao && (
            <span className="text-xs text-muted-foreground">
              Versão atual: <strong className="text-foreground">{versao.versao}</strong>
              {' · '}publicada em {versao.publicado_em}
            </span>
          )}
        </div>
      </section>

      <Separator />

      {/* — Escopos — */}
      <section className="space-y-4">
        <SectionHeader
          title="Permissões (escopos)"
          description="Quais dados do escritório este extensor pode acessar"
        />

        <WarnBox>
          <p className="font-medium">Princípio do mínimo privilégio</p>
          <p>
            Solicite apenas as permissões <strong>estritamente necessárias</strong> para o funcionamento do extensor.
            Permissões desnecessárias geram desconfiança e reduzem a taxa de instalação.
            Cada escopo marcado aparece na tela de instalação pedindo aprovação explícita do administrador do escritório.
          </p>
        </WarnBox>

        <div className="space-y-2">
          {ESCOPOS.map(({ slug: s, label, desc, exemplo, risco }) => (
            <label
              key={s}
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                escopos.has(s) ? 'border-primary/40 bg-primary/5' : 'border-border hover:bg-muted/30'
              }`}
            >
              <input
                type="checkbox"
                className="mt-1 accent-primary shrink-0"
                checked={escopos.has(s)}
                onChange={() => toggleEscopo(s)}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium">{label}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${RISCO_BADGE[risco].class}`}>
                    {RISCO_BADGE[risco].label}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                {escopos.has(s) && (
                  <p className="text-xs text-primary mt-1.5 flex items-start gap-1">
                    <Lightbulb className="h-3 w-3 mt-0.5 shrink-0" />
                    {exemplo}
                  </p>
                )}
              </div>
            </label>
          ))}
        </div>

        {escopos.size > 0 && (
          <div className="rounded-lg bg-muted/50 border px-3 py-2 text-xs text-muted-foreground">
            <strong className="text-foreground">{escopos.size} permissão(ões) selecionada(s).</strong>{' '}
            {[...escopos].filter((e) => ESCOPOS.find((s) => s.slug === e)?.risco === 'alto').length > 0
              ? `⚠️ ${[...escopos].filter((e) => ESCOPOS.find((s) => s.slug === e)?.risco === 'alto').length} de alto risco — revise se são realmente necessárias.`
              : '✅ Nenhuma permissão de alto risco selecionada.'}
          </div>
        )}
      </section>

      <Separator />

      {/* — Slots / Locais do widget — */}
      <section className="space-y-4">
        <SectionHeader
          title="Locais de instalação dos widgets"
          description="Onde o extensor aparece na interface do VisionBiz"
        />

        <InfoBox>
          <p className="font-medium">Como funciona a instalação dos widgets</p>
          <p>
            Cada slot marcado cria um widget que aparece automaticamente na tela correspondente
            para todos os escritórios que instalarem o extensor. Ao marcar um slot, configure
            como o widget se comporta naquele local específico.
          </p>
          <p>
            O tipo do extensor <strong>({tipo})</strong> determina quais campos de configuração aparecem:
            {tipo === 'conectado' && ' você define o endpoint que o VisionBiz consultará para obter os dados.'}
            {tipo === 'embed' && ' você define a URL do iframe que será carregado no widget.'}
            {tipo === 'embarcado' && ' você define o nome do componente React registrado no VisionBiz.'}
          </p>
        </InfoBox>

        <div className="space-y-4">
          {SLOT_GROUPS.map((group) => (
            <div key={group.title} className="border rounded-xl overflow-hidden">
              {/* Group header */}
              <div className={`px-4 py-3 border-b ${
                group.context === 'escritorio'
                  ? 'bg-blue-50 border-blue-100'
                  : 'bg-emerald-50 border-emerald-100'
              }`}>
                <div className="flex items-center gap-2.5">
                  <group.icon className={`h-4 w-4 shrink-0 ${
                    group.context === 'escritorio' ? 'text-blue-600' : 'text-emerald-600'
                  }`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-semibold ${
                        group.context === 'escritorio' ? 'text-blue-800' : 'text-emerald-800'
                      }`}>{group.title}</p>
                      <Badge variant="outline" className={`text-xs font-normal ${
                        group.context === 'escritorio'
                          ? 'border-blue-200 text-blue-600'
                          : 'border-emerald-200 text-emerald-600'
                      }`}>{group.contextLabel}</Badge>
                    </div>
                    <p className={`text-xs mt-0.5 ${
                      group.context === 'escritorio' ? 'text-blue-600' : 'text-emerald-600'
                    }`}>{group.subtitle}</p>
                  </div>
                </div>
                <p className={`text-xs mt-2 leading-relaxed ${
                  group.context === 'escritorio' ? 'text-blue-700' : 'text-emerald-700'
                }`}>{group.descricaoArea}</p>
              </div>

              {/* Slots */}
              <div className="divide-y">
                {group.slots.map(({ slug: sSlug, label, desc, ondeAparece }) => {
                  const active = slots.has(sSlug)
                  const expanded = expandedSlots.has(sSlug)
                  return (
                    <div key={sSlug} className={active ? 'bg-primary/3' : 'bg-card'}>
                      <div className="flex items-start gap-3 px-4 py-3">
                        <input
                          type="checkbox"
                          className="accent-primary shrink-0 mt-0.5"
                          checked={active}
                          onChange={() => toggleSlot(sSlug)}
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{label}</p>
                          <p className="text-xs text-muted-foreground">{desc}</p>
                          <p className="text-xs text-muted-foreground/70 mt-0.5 italic">{ondeAparece}</p>
                          <p className="text-xs text-muted-foreground font-mono opacity-50 mt-0.5">{sSlug}</p>
                        </div>
                        {active && (
                          <button
                            type="button"
                            className="flex items-center gap-1 text-xs text-primary hover:underline shrink-0 mt-0.5"
                            onClick={() => toggleExpand(sSlug)}
                          >
                            {expanded ? 'Ocultar config' : 'Configurar widget'}
                            {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                          </button>
                        )}
                      </div>

                      {active && expanded && (
                        <div className="px-4 pb-4">
                          <GadgetConfig
                            slot={sSlug} tipo={tipo}
                            spec={gadgets[sSlug] ?? {}}
                            onChange={(s) => setGadgets((prev) => ({ ...prev, [sSlug]: s }))}
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <Separator />

      {/* — Eventos webhook — */}
      <section className="space-y-4">
        <SectionHeader
          title="Eventos webhook"
          description="O VisionBiz enviará uma notificação HTTP (POST) ao seu servidor quando estes eventos ocorrerem"
        />

        <TipBox>
          <p className="font-medium">Para que servem os webhooks?</p>
          <p>
            Quando um evento ocorre no VisionBiz (ex: uma cobrança é paga), o VisionBiz envia um POST para o seu servidor
            com os dados do evento. Isso permite que seu sistema reaja em tempo real — sem precisar ficar consultando
            a API periodicamente. Configure a URL de destino dos webhooks no painel do desenvolvedor após publicar o extensor.
          </p>
        </TipBox>

        <div className="space-y-1.5">
          {EVENTOS.map(({ slug: eSlug, label, desc }) => (
            <label
              key={eSlug}
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                eventos.has(eSlug) ? 'border-primary/40 bg-primary/5' : 'border-border hover:bg-muted/30'
              }`}
            >
              <input
                type="checkbox"
                className="mt-0.5 accent-primary shrink-0"
                checked={eventos.has(eSlug)}
                onChange={() => toggleEvento(eSlug)}
              />
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            </label>
          ))}
        </div>
      </section>

      {/* Save */}
      <div className="flex justify-end pt-2 border-t">
        <Button onClick={salvar} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? 'Salvando…' : 'Salvar configuração técnica'}
        </Button>
      </div>
    </div>
  )
}
