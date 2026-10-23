import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAppById, useCriarApp, useAtualizarApp } from '@/data/hooks/useApps'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import {
  ArrowLeft, Save, Plus, X, ExternalLink,
  Info, Lightbulb, ArrowRight, CheckCircle2,
  Cpu, Globe, Frame,
} from 'lucide-react'
import { TabTecnico } from './TabTecnico'
import { TabPlanos } from './TabPlanos'
import type { AppStatus, AppTipo } from '@/domain/types'

// ─── Schemas ─────────────────────────────────────────────────────────────────

const geralSchema = z.object({
  nome: z.string().min(2, 'Nome obrigatório'),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, 'Apenas letras minúsculas, números e hífens'),
  tipo: z.enum(['embarcado', 'conectado', 'embed']),
  status: z.enum(['rascunho', 'em_revisao', 'publicado', 'suspenso']),
  icone: z.string().optional(),
  categoria: z.string().optional(),
  desenvolvedor: z.string().optional(),
  site_desenvolvedor: z.string().optional(),
  tags: z.string().optional(),
  destaque: z.boolean().optional(),
  avaliacao: z.number().min(0).max(5).optional(),
  instalacoes_count: z.number().min(0).optional(),
})

const lojaSchema = z.object({
  descricao: z.string().min(5, 'Descrição obrigatória'),
  descricao_longa: z.string().optional(),
  banner_url: z.string().optional(),
  video_url: z.string().optional(),
})

type GeralForm = z.infer<typeof geralSchema>
type LojaForm = z.infer<typeof lojaSchema>

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toSlug(nome: string) {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

const STATUS_LABEL: Record<AppStatus, string> = {
  rascunho: 'Rascunho',
  em_revisao: 'Em revisão',
  publicado: 'Publicado',
  suspenso: 'Suspenso',
}

const STATUS_VARIANT: Record<AppStatus, 'secondary' | 'outline' | 'default' | 'destructive'> = {
  rascunho: 'outline',
  em_revisao: 'secondary',
  publicado: 'default',
  suspenso: 'destructive',
}

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

function FieldHelp({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground mt-1">{children}</p>
}

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
    </div>
  )
}

// ─── Seletor de tipo em cards ─────────────────────────────────────────────────

const TIPO_OPTIONS: {
  value: AppTipo
  icon: React.ElementType
  emoji: string
  label: string
  subtitulo: string
  como: string
  exemplo: string
}[] = [
  {
    value: 'conectado',
    icon: Globe,
    emoji: '🌐',
    label: 'Conectado',
    subtitulo: 'Seu servidor fornece os dados',
    como: 'O VisionBiz consulta uma URL da sua API a cada intervalo configurado e exibe as informações dentro do widget. Você controla o servidor, o VisionBiz controla a exibição.',
    exemplo: 'Ex: painel de situação cadastral, monitoramento de CNPJ, alertas de certificado vencendo.',
  },
  {
    value: 'embed',
    icon: Frame,
    emoji: '🖼️',
    label: 'Embed (iframe)',
    subtitulo: 'Sua aplicação web abre dentro do VisionBiz',
    como: 'Uma URL da sua aplicação é carregada em um iframe seguro, autenticado via JWT. O usuário interage diretamente com a sua interface dentro do VisionBiz.',
    exemplo: 'Ex: portal do parceiro, calculadora interativa, formulário de adesão com design próprio.',
  },
  {
    value: 'embarcado',
    icon: Cpu,
    emoji: '⚙️',
    label: 'Embarcado',
    subtitulo: 'Componente React nativo do VisionBiz',
    como: 'O extensor é um componente React registrado internamente no VisionBiz. Precisa de acesso ao código-fonte para ser adicionado. Usado para funcionalidades profundamente integradas.',
    exemplo: 'Ex: painel de certificados digitais nativo, módulo de assinatura digital.',
  },
]

function TipoSelector({
  value,
  onChange,
}: {
  value: AppTipo
  onChange: (v: AppTipo) => void
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {TIPO_OPTIONS.map(({ value: v, icon: Icon, emoji, label, subtitulo, como, exemplo }) => {
        const selected = value === v
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={`text-left rounded-xl border-2 p-4 transition-all hover:shadow-sm ${
              selected
                ? 'border-primary bg-primary/5 shadow-sm'
                : 'border-border hover:border-primary/40 bg-card'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{emoji}</span>
              <div>
                <p className="font-semibold text-sm">{label}</p>
                <p className="text-xs text-muted-foreground">{subtitulo}</p>
              </div>
              {selected && <CheckCircle2 className="h-4 w-4 text-primary ml-auto shrink-0" />}
            </div>
            {selected && (
              <div className="mt-3 pt-3 border-t border-primary/20 space-y-1.5">
                <p className="text-xs text-foreground/80">{como}</p>
                <p className="text-xs text-primary font-medium">{exemplo}</p>
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ─── Fluxo de status ──────────────────────────────────────────────────────────

const STATUS_STEPS: { key: AppStatus; label: string; desc: string }[] = [
  { key: 'rascunho',   label: 'Rascunho',    desc: 'Visível só para você. Use para montar o cadastro com calma.' },
  { key: 'em_revisao', label: 'Em revisão',  desc: 'Aguardando aprovação da equipe VisionBiz antes de publicar.' },
  { key: 'publicado',  label: 'Publicado',   desc: 'Disponível na loja para todos os escritórios instalarem.' },
  { key: 'suspenso',   label: 'Suspenso',    desc: 'Temporariamente indisponível. Escritórios com o extensor instalado continuam usando.' },
]

function StatusFlow({ current }: { current: AppStatus }) {
  const mainFlow = STATUS_STEPS.slice(0, 3)
  const selected = STATUS_STEPS.find((s) => s.key === current)

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1">
        {mainFlow.map((step, i) => {
          const isActive = step.key === current
          const isPast = mainFlow.findIndex((s) => s.key === current) > i
          return (
            <div key={step.key} className="flex items-center gap-1 flex-1">
              <div className={`flex-1 rounded-full py-1.5 px-3 text-center text-xs font-medium transition-all ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : isPast
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground'
              }`}>
                {step.label}
              </div>
              {i < mainFlow.length - 1 && (
                <ArrowRight className={`h-3.5 w-3.5 shrink-0 ${
                  isPast || isActive ? 'text-primary' : 'text-muted-foreground/40'
                }`} />
              )}
            </div>
          )
        })}
      </div>
      {selected && (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{selected.label}: </span>
          {selected.desc}
          {current === 'suspenso' && (
            <span className="text-amber-600"> ⚠️ Status especial — use para manutenção emergencial.</span>
          )}
        </p>
      )}
    </div>
  )
}

// ─── Campo de lista dinâmica ───────────────────────────────────────────────────

function ListField({
  label,
  placeholder,
  help,
  values,
  onChange,
}: {
  label: string
  placeholder: string
  help?: string
  values: string[]
  onChange: (v: string[]) => void
}) {
  function add() { onChange([...values, '']) }
  function update(i: number, v: string) { const n = [...values]; n[i] = v; onChange(n) }
  function remove(i: number) { onChange(values.filter((_, idx) => idx !== i)) }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <button type="button" onClick={add} className="text-xs text-primary flex items-center gap-1 hover:underline">
          <Plus className="h-3 w-3" /> Adicionar linha
        </button>
      </div>
      {help && <FieldHelp>{help}</FieldHelp>}
      {values.length === 0 ? (
        <p className="text-xs text-muted-foreground italic border border-dashed rounded-lg p-3 text-center">
          Nenhum item ainda. Clique em "Adicionar linha".
        </p>
      ) : (
        <div className="space-y-1.5">
          {values.map((v, i) => (
            <div key={i} className="flex gap-2">
              <Input
                value={v}
                onChange={(e) => update(i, e.target.value)}
                placeholder={placeholder}
                className="text-sm"
              />
              <Button
                type="button" size="icon" variant="ghost"
                className="shrink-0 h-9 w-9 text-muted-foreground hover:text-destructive"
                onClick={() => remove(i)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── ExtensorPage ─────────────────────────────────────────────────────────────

export function ExtensorPage() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const isEdit = !!id

  const { data: app, isLoading } = useAppById(id ?? '')
  const criar = useCriarApp()
  const atualizar = useAtualizarApp()

  const [recursos, setRecursos] = useState<string[]>([])
  const [screenshots, setScreenshots] = useState<string[]>([])

  const geralForm = useForm<GeralForm>({
    resolver: zodResolver(geralSchema),
    defaultValues: { tipo: 'conectado', status: 'rascunho', destaque: false },
  })

  const lojaForm = useForm<LojaForm>({
    resolver: zodResolver(lojaSchema),
    defaultValues: { descricao: '' },
  })

  useEffect(() => {
    if (!app) return
    geralForm.reset({
      nome: app.nome, slug: app.slug, tipo: app.tipo, status: app.status,
      icone: app.icone ?? '', categoria: app.categoria ?? '',
      desenvolvedor: app.desenvolvedor ?? '', site_desenvolvedor: app.site_desenvolvedor ?? '',
      tags: app.tags?.join(', ') ?? '', destaque: app.destaque ?? false,
      avaliacao: app.avaliacao, instalacoes_count: app.instalacoes_count,
    })
    lojaForm.reset({
      descricao: app.descricao, descricao_longa: app.descricao_longa ?? '',
      banner_url: app.banner_url ?? '', video_url: app.video_url ?? '',
    })
    setRecursos(app.recursos ?? [])
    setScreenshots(app.screenshots ?? [])
  }, [app]) // eslint-disable-line react-hooks/exhaustive-deps

  const nomeWatch = geralForm.watch('nome')
  useEffect(() => {
    if (!isEdit && nomeWatch) {
      geralForm.setValue('slug', toSlug(nomeWatch), { shouldValidate: false })
    }
  }, [nomeWatch, isEdit]) // eslint-disable-line react-hooks/exhaustive-deps

  async function salvarGeral(data: GeralForm) {
    try {
      const payload = {
        nome: data.nome, slug: data.slug, tipo: data.tipo, status: data.status,
        icone: data.icone || undefined, categoria: data.categoria || undefined,
        desenvolvedor: data.desenvolvedor || undefined,
        site_desenvolvedor: data.site_desenvolvedor || undefined,
        tags: data.tags ? data.tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
        destaque: data.destaque, avaliacao: data.avaliacao,
        instalacoes_count: data.instalacoes_count,
        descricao: lojaForm.getValues('descricao') || '',
      }
      if (isEdit && id) {
        await atualizar.mutateAsync({ id, data: payload })
        toast({ title: 'Informações gerais salvas' })
      } else {
        const novo = await criar.mutateAsync(payload)
        toast({ title: 'Extensor criado! Agora configure as outras abas.' })
        navigate(`/admin/catalogo/${novo.id}`, { replace: true })
      }
    } catch {
      toast({ title: 'Erro ao salvar', variant: 'destructive' })
    }
  }

  async function salvarLoja(data: LojaForm) {
    if (!isEdit || !id) {
      toast({ title: 'Salve as informações gerais primeiro' })
      return
    }
    try {
      await atualizar.mutateAsync({
        id,
        data: {
          descricao: data.descricao,
          descricao_longa: data.descricao_longa || undefined,
          banner_url: data.banner_url || undefined,
          video_url: data.video_url || undefined,
          recursos: recursos.filter(Boolean),
          screenshots: screenshots.filter(Boolean),
        },
      })
      toast({ title: 'Página de vendas salva' })
    } catch {
      toast({ title: 'Erro ao salvar', variant: 'destructive' })
    }
  }

  const status = geralForm.watch('status') as AppStatus | undefined
  const tipo = geralForm.watch('tipo') as AppTipo | undefined
  const slugWatch = geralForm.watch('slug')
  const nomeValue = geralForm.watch('nome')
  const descricaoWatch = lojaForm.watch('descricao') ?? ''

  if (isEdit && isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        Carregando extensor…
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" className="mt-0.5 shrink-0" onClick={() => navigate('/admin/catalogo')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold">{isEdit && app ? app.nome : 'Novo extensor'}</h1>
            {status && <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>}
          </div>
          {isEdit && app && <p className="text-xs text-muted-foreground font-mono mt-0.5">/loja/{app.slug}</p>}
        </div>
        {isEdit && app?.status === 'publicado' && (
          <Button variant="outline" size="sm" className="gap-2 shrink-0" onClick={() => window.open(`/loja/${app.slug}`, '_blank')}>
            <ExternalLink className="h-3.5 w-3.5" />
            Ver na loja
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="geral">
        <TabsList className="w-full justify-start border-b rounded-none bg-transparent h-auto p-0 gap-0">
          {[
            { value: 'geral',   label: '1 · Geral' },
            { value: 'loja',    label: '2 · Página de vendas' },
            { value: 'tecnico', label: '3 · Técnico / Widgets', disabled: !isEdit },
            { value: 'planos',  label: '4 · Planos e preços',   disabled: !isEdit },
          ].map(({ value, label, disabled }) => (
            <TabsTrigger
              key={value} value={value} disabled={disabled}
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2.5 text-sm disabled:opacity-40"
            >
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ════════════════════ TAB GERAL ════════════════════ */}
        <TabsContent value="geral" className="pt-6">
          <form onSubmit={geralForm.handleSubmit(salvarGeral)} className="space-y-8">

            {/* Intro */}
            <InfoBox>
              <p className="font-medium">Identidade do extensor</p>
              <p>Defina aqui o nome, o tipo de integração e o status. Essas informações controlam como o extensor aparece no catálogo e quais recursos técnicos ele usa. Comece pelo tipo — ele determina o que você precisará configurar nas próximas abas.</p>
            </InfoBox>

            {/* — Identidade — */}
            <section className="space-y-4">
              <SectionHeader
                title="Identidade"
                description="Como o extensor é identificado e localizado na plataforma"
              />

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1">
                  <Label>Nome do extensor <span className="text-destructive">*</span></Label>
                  <Input {...geralForm.register('nome')} placeholder="Ex: Certificado Digital Pro" />
                  <FieldHelp>Nome exibido nos cards da loja e no menu dos escritórios. Seja específico e direto.</FieldHelp>
                  {geralForm.formState.errors.nome && (
                    <p className="text-xs text-destructive">{geralForm.formState.errors.nome.message}</p>
                  )}
                </div>

                <div className="col-span-2 space-y-1">
                  <Label>Slug (URL permanente) <span className="text-destructive">*</span></Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-2 rounded-l-md border border-r-0 border-input">/loja/</span>
                    <Input
                      {...geralForm.register('slug')}
                      placeholder="certificado-digital-pro"
                      className="font-mono rounded-l-none"
                    />
                  </div>
                  <FieldHelp>
                    Gerado automaticamente a partir do nome. Apenas letras minúsculas, números e hífens.{' '}
                    <strong>Não altere após publicar</strong> — links externos quebrarão.
                  </FieldHelp>
                  {geralForm.formState.errors.slug && (
                    <p className="text-xs text-destructive">{geralForm.formState.errors.slug.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label>Ícone (emoji)</Label>
                  <Input {...geralForm.register('icone')} placeholder="🔒" maxLength={4} className="text-2xl w-20" />
                  <FieldHelp>Um emoji que represente o extensor. Aparece nos cards da loja e no menu lateral.</FieldHelp>
                </div>

                <div className="space-y-1">
                  <Label>Categoria</Label>
                  <Select
                    value={geralForm.watch('categoria') ?? ''}
                    onValueChange={(v) => geralForm.setValue('categoria', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Compliance">🔒 Compliance</SelectItem>
                      <SelectItem value="Benefícios">🎁 Benefícios</SelectItem>
                      <SelectItem value="Fiscal">🧾 Fiscal</SelectItem>
                      <SelectItem value="Societário">👥 Societário</SelectItem>
                      <SelectItem value="Outros">📦 Outros</SelectItem>
                    </SelectContent>
                  </Select>
                  <FieldHelp>Agrupa extensores na loja e facilita a busca pelos escritórios.</FieldHelp>
                </div>

                <div className="col-span-2 space-y-1">
                  <Label>Tags de busca</Label>
                  <Input {...geralForm.register('tags')} placeholder="certificado, digital, e-cpf, e-cnpj, renovação" />
                  <FieldHelp>Palavras-chave separadas por vírgula. Usadas no campo de busca da loja para encontrar este extensor.</FieldHelp>
                </div>
              </div>
            </section>

            <Separator />

            {/* — Tipo de integração — */}
            <section className="space-y-4">
              <SectionHeader
                title="Tipo de integração"
                description="Define como o extensor se comunica com o VisionBiz. Escolha com cuidado — influencia toda a configuração técnica."
              />
              <TipoSelector
                value={geralForm.watch('tipo')}
                onChange={(v) => geralForm.setValue('tipo', v)}
              />
            </section>

            <Separator />

            {/* — Status de publicação — */}
            <section className="space-y-4">
              <SectionHeader
                title="Status de publicação"
                description="Controla quem pode ver e instalar este extensor"
              />
              <StatusFlow current={(status as AppStatus) ?? 'rascunho'} />
              <div>
                <Label>Status atual</Label>
                <Select
                  value={geralForm.watch('status')}
                  onValueChange={(v) => geralForm.setValue('status', v as AppStatus)}
                >
                  <SelectTrigger className="mt-1.5 max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_STEPS.map((s) => (
                      <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </section>

            <Separator />

            {/* — Desenvolvedor — */}
            <section className="space-y-4">
              <SectionHeader
                title="Desenvolvedor"
                description="Quem criou e mantém este extensor — exibido na página de vendas para transmitir credibilidade"
              />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Nome do desenvolvedor</Label>
                  <Input {...geralForm.register('desenvolvedor')} placeholder="Ex: Certisign Certificadora Digital" />
                </div>
                <div className="space-y-1">
                  <Label>Site oficial</Label>
                  <Input {...geralForm.register('site_desenvolvedor')} placeholder="https://www.certisign.com.br" type="url" />
                  <FieldHelp>Link para o site do desenvolvedor exibido na página de vendas.</FieldHelp>
                </div>
              </div>
            </section>

            <Separator />

            {/* — Métricas e destaque — */}
            <section className="space-y-4">
              <SectionHeader
                title="Métricas e destaque"
                description="Dados exibidos na loja que influenciam a decisão de instalação pelos escritórios"
              />
              <TipBox>
                <p>Avaliação e contagem de instalações são exibidas na página de vendas. Você pode preencher manualmente os valores iniciais — por exemplo, ao migrar de outra plataforma.</p>
              </TipBox>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Avaliação (0 a 5)</Label>
                  <Input
                    type="number" step={0.1} min={0} max={5}
                    {...geralForm.register('avaliacao', { valueAsNumber: true })}
                    placeholder="4.5"
                    className="max-w-28"
                  />
                  <FieldHelp>Exibido como estrelas ★ na loja.</FieldHelp>
                </div>
                <div className="space-y-1">
                  <Label>Contagem de instalações</Label>
                  <Input
                    type="number" min={0}
                    {...geralForm.register('instalacoes_count', { valueAsNumber: true })}
                    placeholder="0"
                    className="max-w-28"
                  />
                  <FieldHelp>Número de escritórios que instalaram este extensor.</FieldHelp>
                </div>
              </div>

              <label className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                geralForm.watch('destaque') ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
              }`}>
                <input
                  type="checkbox"
                  id="destaque"
                  className="accent-primary h-4 w-4 mt-0.5"
                  {...geralForm.register('destaque')}
                />
                <div>
                  <p className="font-medium text-sm">Exibir em destaque na loja ⭐</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    O extensor aparece no banner principal de destaques da loja pública, com visual ampliado e maior visibilidade.
                    Use para extensores de alta relevância ou em lançamento. <strong>Máximo recomendado: 2 a 3 simultâneos.</strong>
                  </p>
                </div>
              </label>
            </section>

            <div className="flex justify-end border-t pt-4">
              <Button type="submit" disabled={criar.isPending || atualizar.isPending} className="gap-2">
                <Save className="h-4 w-4" />
                {criar.isPending || atualizar.isPending
                  ? 'Salvando…'
                  : isEdit ? 'Salvar informações gerais' : 'Criar extensor e continuar'}
              </Button>
            </div>
          </form>
        </TabsContent>

        {/* ════════════════════ TAB LOJA ════════════════════ */}
        <TabsContent value="loja" className="pt-6">
          <form onSubmit={lojaForm.handleSubmit(salvarLoja)} className="space-y-8">

            {!isEdit ? (
              <InfoBox>
                <p className="font-medium">Complete a aba "Geral" primeiro</p>
                <p>Salve as informações gerais para habilitar a edição da página de vendas.</p>
              </InfoBox>
            ) : (
              <InfoBox>
                <p className="font-medium">Página de vendas — o que os escritórios verão na loja</p>
                <p>Estas informações formam a vitrine do extensor em <strong>/loja/{slugWatch}</strong>. Uma página bem preenchida aumenta significativamente a taxa de instalação. Preencha ao menos a descrição curta, a descrição completa e os recursos.</p>
              </InfoBox>
            )}

            {/* — Descrições — */}
            <section className="space-y-4">
              <SectionHeader
                title="Descrições"
                description="O texto que apresenta o extensor para os escritórios"
              />

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label>Descrição curta <span className="text-destructive">*</span></Label>
                  <span className={`text-xs ${descricaoWatch.length > 140 ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                    {descricaoWatch.length}/140
                  </span>
                </div>
                <Textarea
                  {...lojaForm.register('descricao')}
                  rows={2}
                  placeholder="Ex: Gerencie certificados digitais A1 e A3 dos seus clientes direto no VisionBiz — emissão, renovação e monitoramento de vencimento automatizados."
                  disabled={!isEdit}
                />
                <FieldHelp>
                  Exibida nos cards da loja (grade de extensores). Deve comunicar o benefício principal em uma frase.
                  Mantenha abaixo de 140 caracteres para não ser cortada.
                </FieldHelp>
                {lojaForm.formState.errors.descricao && (
                  <p className="text-xs text-destructive">{lojaForm.formState.errors.descricao.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label>Descrição completa</Label>
                <Textarea
                  {...lojaForm.register('descricao_longa')}
                  rows={8}
                  placeholder={
                    'Descreva em detalhes:\n\n' +
                    '— O que o extensor faz e qual problema resolve\n' +
                    '— Como funciona o processo passo a passo\n' +
                    '— Para quem é indicado (porte de escritório, segmento)\n' +
                    '— Quais pré-requisitos técnicos ou contratuais existem\n' +
                    '— Suporte e atendimento disponível'
                  }
                  disabled={!isEdit}
                />
                <FieldHelp>Exibida na página de detalhe do extensor. Quanto mais completa, maior a confiança do escritório para instalar.</FieldHelp>
              </div>
            </section>

            <Separator />

            {/* — Recursos — */}
            <section className="space-y-4">
              <SectionHeader
                title="Recursos e funcionalidades"
                description="Lista de bullets exibida na página de vendas — o que o escritório ganha ao instalar"
              />
              <TipBox>
                <p>Cada linha vira um item de lista na página de vendas. Comece com verbos de ação no presente: "Emite certificados em 3 minutos", "Monitora vencimentos automaticamente", "Integra com a fila de tarefas do escritório".</p>
              </TipBox>
              <ListField
                label="Funcionalidades"
                placeholder="Ex: Monitora vencimentos de certificados e cria tarefas automaticamente"
                values={recursos}
                onChange={setRecursos}
              />
            </section>

            <Separator />

            {/* — Mídia — */}
            <section className="space-y-4">
              <SectionHeader
                title="Mídia"
                description="Imagens e vídeo que ilustram o extensor na página de vendas"
              />
              <TipBox>
                <p>Extensores com banner, vídeo e screenshots têm taxa de instalação até 3× maior. Se possível, inclua pelo menos um screenshot mostrando o widget funcionando dentro do VisionBiz.</p>
              </TipBox>

              <div className="space-y-1">
                <Label>URL do banner principal</Label>
                <Input
                  {...lojaForm.register('banner_url')}
                  placeholder="https://cdn.meusite.com.br/banner-extensor.png"
                  disabled={!isEdit}
                />
                <FieldHelp>
                  Imagem exibida no topo da página de vendas. Tamanho ideal: <strong>1200 × 400 px</strong>, formato PNG ou JPG.
                  Use cores que combinem com a identidade visual do extensor.
                </FieldHelp>
              </div>

              <div className="space-y-1">
                <Label>URL do vídeo de apresentação</Label>
                <Input
                  {...lojaForm.register('video_url')}
                  placeholder="https://www.youtube.com/watch?v=SEU_VIDEO"
                  disabled={!isEdit}
                />
                <FieldHelp>
                  Link do YouTube. O vídeo aparece incorporado na página de vendas.
                  Ideal: 2 a 3 minutos mostrando o extensor em uso real dentro do VisionBiz.
                </FieldHelp>
              </div>

              <ListField
                label="Screenshots (URLs)"
                placeholder="https://cdn.meusite.com.br/screenshot-dashboard.png"
                help="Capturas de tela do extensor em funcionamento. Recomendado: 3 a 5 imagens em 1280×800 px mostrando as principais telas."
                values={screenshots}
                onChange={setScreenshots}
              />
            </section>

            {isEdit && (
              <div className="flex justify-end border-t pt-4">
                <Button type="submit" disabled={atualizar.isPending} className="gap-2">
                  <Save className="h-4 w-4" />
                  {atualizar.isPending ? 'Salvando…' : 'Salvar página de vendas'}
                </Button>
              </div>
            )}
          </form>
        </TabsContent>

        {/* ════════════════════ TAB TÉCNICO ════════════════════ */}
        <TabsContent value="tecnico" className="pt-6">
          {isEdit && id && tipo && (
            <TabTecnico appId={id} tipo={tipo} slug={slugWatch ?? ''} nome={nomeValue ?? ''} />
          )}
        </TabsContent>

        {/* ════════════════════ TAB PLANOS ════════════════════ */}
        <TabsContent value="planos" className="pt-6">
          {isEdit && id
            ? <TabPlanos appId={id} />
            : <TabPlanos appId="" bloqueado />
          }
        </TabsContent>
      </Tabs>
    </div>
  )
}
