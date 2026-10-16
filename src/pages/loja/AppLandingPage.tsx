import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useApps, useAppPlans, useAppVersion, useAppInstallacaoByApp } from '@/data/hooks/useApps'
import { useAuth } from '@/auth/AuthProvider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  ChevronLeft, Star, CheckCircle2, ShieldCheck,
  ExternalLink, Download, Store, Play, ArrowRight,
  Users, Clock, Package,
} from 'lucide-react'
import { InstalarAppDialog } from '@/pages/escritorio/AppStore/InstalarAppDialog'
import { formatCurrency } from '@/lib/utils'
import type { AppEscopoSlug, AppPlanTipoCobranca } from '@/domain/types'

const escopoLabels: Record<AppEscopoSlug, string> = {
  'clientes:read': 'Ler dados cadastrais dos clientes',
  'clientes:write': 'Alterar dados cadastrais dos clientes',
  'contratos:read': 'Ler contratos',
  'financeiro:read': 'Ler faturas e saldo financeiro',
  'financeiro:write': 'Gerar cobranças e lançamentos',
  'documentos:read': 'Baixar e visualizar documentos',
  'documentos:write': 'Enviar e organizar documentos',
  'tarefas:write': 'Criar ocorrências e tarefas automaticamente',
  'notificacoes:send': 'Enviar notificações ao cliente (WhatsApp / e-mail)',
}

const tipoCobrancaLabel: Record<AppPlanTipoCobranca, string> = {
  gratuito: 'Gratuito',
  mensal: '/mês',
  anual: '/ano',
  por_uso: 'por uso',
  por_lead: 'por lead',
}

function RatingStars({ avaliacao }: { avaliacao: number }) {
  const full = Math.round(avaliacao)
  return (
    <span className="flex items-center gap-1">
      <span className="text-yellow-400">{'★'.repeat(full)}{'☆'.repeat(5 - full)}</span>
      <span className="text-sm font-semibold">{avaliacao.toFixed(1)}</span>
    </span>
  )
}

function getYouTubeEmbedId(url: string): string | null {
  try {
    const parsed = new URL(url)
    if (parsed.hostname.includes('youtu.be')) return parsed.pathname.slice(1)
    if (parsed.hostname.includes('youtube.com')) {
      if (parsed.pathname.includes('/embed/')) return parsed.pathname.replace('/embed/', '')
      return parsed.searchParams.get('v')
    }
  } catch { /* empty */ }
  return null
}

export function AppLandingPage() {
  const { slug } = useParams<{ slug: string }>()
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const tenantId = currentUser?.tenant_id ?? ''

  const { data: apps = [] } = useApps()
  const app = apps.find((a) => a.slug === slug)

  const { data: version } = useAppVersion(app?.id ?? '')
  const { data: plans = [] } = useAppPlans(app?.id ?? '')
  const { data: installation } = useAppInstallacaoByApp(tenantId, app?.id ?? '')

  const [installOpen, setInstallOpen] = useState(false)
  const [selectedScreenshot, setSelectedScreenshot] = useState<number | null>(null)

  const isAdmin = currentUser?.papel === 'escritorio_admin'
  const isInstalled = !!installation

  const videoId = app?.video_url ? getYouTubeEmbedId(app.video_url) : null
  const screenshots = app?.screenshots ?? []
  const hasMedia = videoId || screenshots.length > 0

  if (!app) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-muted-foreground">
        <Package className="w-14 h-14 opacity-20" />
        <p className="text-lg font-medium">Aplicativo não encontrado</p>
        <Button variant="outline" asChild>
          <Link to="/loja"><ChevronLeft className="w-4 h-4 mr-1" />Voltar à loja</Link>
        </Button>
      </div>
    )
  }

  function InstallButton({ size = 'default' }: { size?: 'default' | 'lg' }) {
    if (isInstalled) {
      return (
        <div className="flex items-center gap-2">
          <Badge className="bg-green-100 text-green-800 border-transparent px-3 py-1.5 text-sm font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
            Instalado
          </Badge>
          <Button variant="outline" size="sm" onClick={() => navigate('/escritorio/apps')}>
            Gerenciar
          </Button>
        </div>
      )
    }

    if (!currentUser) {
      return (
        <Button size={size} asChild>
          <Link to="/login">
            <Download className="w-4 h-4 mr-2" />
            Entrar para instalar
          </Link>
        </Button>
      )
    }

    if (!isAdmin) {
      return (
        <Button size={size} variant="outline" disabled>
          <Download className="w-4 h-4 mr-2" />
          Solicite ao administrador
        </Button>
      )
    }

    if (!version) {
      return (
        <Button size={size} disabled>
          <Download className="w-4 h-4 mr-2" />
          Instalar
        </Button>
      )
    }

    return (
      <Button size={size} onClick={() => setInstallOpen(true)}>
        <Download className="w-4 h-4 mr-2" />
        Instalar gratuitamente
      </Button>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky header */}
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/loja" className="text-muted-foreground">
              <ChevronLeft className="w-4 h-4 mr-1" />
              Loja de Apps
            </Link>
          </Button>
          <div className="hidden sm:flex items-center gap-2 min-w-0">
            <span className="text-lg">{app.icone ?? '📦'}</span>
            <span className="font-semibold text-sm truncate">{app.nome}</span>
          </div>
          <InstallButton size="default" />
        </div>
      </header>

      {/* Hero banner */}
      <div
        className="relative h-52 sm:h-72 overflow-hidden"
        style={{
          background: app.banner_url
            ? `url(${app.banner_url}) center/cover no-repeat`
            : undefined,
        }}
      >
        {!app.banner_url && (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-background" />
        )}
        {/* Large watermark icon */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-[180px] opacity-[0.06] select-none">{app.icone ?? '📦'}</span>
        </div>
      </div>

      {/* App identity section */}
      <div className="max-w-5xl mx-auto px-6">
        <div className="flex flex-col sm:flex-row sm:items-end gap-6 -mt-10 mb-8">
          {/* App icon — overlaps hero */}
          <div className="w-24 h-24 rounded-3xl bg-card border-4 border-background shadow-xl flex items-center justify-center text-5xl shrink-0 z-10">
            {app.icone ?? '📦'}
          </div>

          <div className="flex flex-1 flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pb-1">
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                {app.categoria && (
                  <Badge variant="secondary" className="text-xs">
                    {app.categoria}
                  </Badge>
                )}
                <Badge
                  variant="outline"
                  className="text-xs"
                >
                  {app.tipo === 'embarcado' ? 'Nativo VisionBiz' : 'Integração externa'}
                </Badge>
              </div>
              <h1 className="text-3xl font-bold leading-tight">{app.nome}</h1>
              {app.desenvolvedor && (
                <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                  Por {app.desenvolvedor}
                  {app.site_desenvolvedor && (
                    <a
                      href={app.site_desenvolvedor}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-0.5"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </p>
              )}
            </div>
            <div className="hidden sm:block">
              <InstallButton size="lg" />
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-6 pb-6 border-b flex-wrap">
          {(app.avaliacao ?? 0) > 0 && (
            <div className="flex flex-col items-center">
              <RatingStars avaliacao={app.avaliacao!} />
              <span className="text-xs text-muted-foreground mt-0.5">Avaliação</span>
            </div>
          )}
          {(app.instalacoes_count ?? 0) > 0 && (
            <div className="flex flex-col items-center">
              <span className="flex items-center gap-1 font-semibold">
                <Users className="w-4 h-4" />
                {app.instalacoes_count!.toLocaleString('pt-BR')}
              </span>
              <span className="text-xs text-muted-foreground mt-0.5">Escritórios</span>
            </div>
          )}
          {plans.length > 0 && (
            <div className="flex flex-col items-center">
              <span className="font-semibold">
                {plans.some((p) => p.tipo_cobranca === 'gratuito' && p.valor === 0)
                  ? 'Gratuito'
                  : plans[0].valor
                    ? formatCurrency(typeof plans[0].valor === 'number' ? plans[0].valor : 0)
                    : 'Sob consulta'}
              </span>
              <span className="text-xs text-muted-foreground mt-0.5">
                {plans.some((p) => p.tipo_cobranca === 'gratuito') ? 'Plano disponível' : 'A partir de'}
              </span>
            </div>
          )}
          {app.tags && app.tags.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {app.tags.slice(0, 4).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs text-muted-foreground">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Short description */}
        <p className="py-6 text-muted-foreground leading-relaxed border-b">{app.descricao}</p>

        {/* Mobile install button */}
        <div className="py-4 sm:hidden">
          <InstallButton size="lg" />
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-14">

        {/* Media section */}
        {hasMedia && (
          <section>
            <h2 className="text-2xl font-bold mb-6">Visão geral</h2>

            <div className="space-y-4">
              {/* Video embed */}
              {videoId && (
                <div className="relative aspect-video rounded-2xl overflow-hidden border bg-black">
                  <iframe
                    src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
                    title={`${app.nome} — demonstração`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute inset-0 w-full h-full"
                  />
                </div>
              )}

              {/* Screenshots */}
              {screenshots.length > 0 && (
                <div className="space-y-3">
                  {/* Thumbnail strip */}
                  <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
                    {screenshots.map((url, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedScreenshot(selectedScreenshot === i ? null : i)}
                        className={`relative shrink-0 w-48 aspect-video rounded-xl overflow-hidden border transition-all hover:scale-105 ${
                          selectedScreenshot === i ? 'ring-2 ring-primary ring-offset-2' : ''
                        }`}
                      >
                        <img
                          src={url}
                          alt={`Screenshot ${i + 1}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        {!videoId && i === 0 && selectedScreenshot === null && (
                          <div className="absolute inset-0 bg-primary/5 flex items-center justify-center">
                            <Play className="w-6 h-6 text-primary/60" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                  {/* Expanded screenshot */}
                  {selectedScreenshot !== null && (
                    <div className="rounded-2xl overflow-hidden border bg-muted">
                      <img
                        src={screenshots[selectedScreenshot]}
                        alt={`Screenshot ${selectedScreenshot + 1}`}
                        className="w-full object-cover max-h-[500px]"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Long description */}
        {app.descricao_longa && (
          <section>
            <h2 className="text-2xl font-bold mb-5">Sobre este aplicativo</h2>
            <div className="prose prose-sm max-w-none text-muted-foreground space-y-3">
              {app.descricao_longa.split('\n\n').map((paragraph, i) => (
                <p key={i} className="leading-relaxed">{paragraph}</p>
              ))}
            </div>
          </section>
        )}

        {/* Key features */}
        {(app.recursos ?? []).length > 0 && (
          <section>
            <h2 className="text-2xl font-bold mb-6">O que você pode fazer</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {app.recursos!.map((recurso, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-4 rounded-xl border bg-card hover:bg-muted/30 transition-colors"
                >
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-sm leading-snug">{recurso}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Pricing plans */}
        {plans.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold mb-2">Planos</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Escolha o plano que melhor atende às suas necessidades. Você pode mudar a qualquer momento.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {plans.map((plan, i) => {
                const isGratuito = plan.tipo_cobranca === 'gratuito' || plan.valor === 0
                const isPorUso = plan.valor === null
                const isFeatured = i === 1 && plans.length > 1
                return (
                  <Card
                    key={plan.id}
                    className={`relative overflow-hidden ${isFeatured ? 'border-primary shadow-md' : ''}`}
                  >
                    {isFeatured && (
                      <div className="absolute top-0 inset-x-0 h-1 bg-primary" />
                    )}
                    <CardContent className="pt-6 pb-5">
                      {isFeatured && (
                        <Badge className="text-xs mb-3 bg-primary/10 text-primary border-transparent">
                          Mais popular
                        </Badge>
                      )}
                      <p className="font-bold text-lg mb-1">{plan.nome}</p>
                      <div className="flex items-end gap-1 mb-4">
                        {isGratuito ? (
                          <span className="text-3xl font-bold">Gratuito</span>
                        ) : isPorUso ? (
                          <span className="text-2xl font-bold">Sob demanda</span>
                        ) : (
                          <>
                            <span className="text-3xl font-bold">
                              {formatCurrency(typeof plan.valor === 'number' ? plan.valor : 0)}
                            </span>
                            <span className="text-muted-foreground text-sm pb-0.5">
                              {tipoCobrancaLabel[plan.tipo_cobranca]}
                            </span>
                          </>
                        )}
                      </div>
                      {isPorUso && (
                        <p className="text-xs text-muted-foreground -mt-3 mb-4">
                          Cobrança definida no momento da utilização.
                        </p>
                      )}
                      <Button
                        className="w-full"
                        variant={isFeatured ? 'default' : 'outline'}
                        onClick={() => {
                          if (!currentUser) navigate('/login')
                          else if (isAdmin && !isInstalled && version) setInstallOpen(true)
                          else if (isAdmin && isInstalled) navigate('/escritorio/apps')
                        }}
                      >
                        {isInstalled ? 'Gerenciar plano' : isGratuito ? 'Instalar gratuitamente' : 'Instalar e assinar'}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </section>
        )}

        {/* Permissions */}
        {version && version.manifesto.escopos.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold mb-2">Permissões solicitadas</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Ao instalar este app, o seu escritório concede as seguintes permissões de acesso aos dados.
            </p>
            <div className="space-y-2">
              {version.manifesto.escopos.map((escopo) => (
                <div
                  key={escopo}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-card"
                >
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs font-mono text-muted-foreground">{escopo}</p>
                    <p className="text-sm font-medium">{escopoLabels[escopo] ?? escopo}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Developer info */}
        {app.desenvolvedor && (
          <section>
            <Separator className="mb-10" />
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0">
                <Store className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Desenvolvido por</p>
                <p className="font-bold text-lg">{app.desenvolvedor}</p>
                {app.site_desenvolvedor && (
                  <a
                    href={app.site_desenvolvedor}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1 mt-1"
                  >
                    {app.site_desenvolvedor}
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          </section>
        )}

        {/* CTA bottom */}
        <div className="rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-card border p-8 text-center">
          <p className="text-2xl font-bold mb-2">Pronto para começar?</p>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Instale o {app.nome} agora e transforme a gestão do seu escritório.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <InstallButton size="lg" />
            <Button variant="outline" size="lg" asChild>
              <Link to="/loja">
                Ver outros apps
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t mt-10 py-8">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
              <Store className="w-3 h-3 text-primary" />
            </div>
            <span>VisionBiz App Store</span>
          </div>
          <Link to="/loja" className="hover:text-foreground flex items-center gap-1">
            <ChevronLeft className="w-3.5 h-3.5" />
            Voltar à loja
          </Link>
        </div>
      </footer>

      {/* Install dialog */}
      {installOpen && version && (
        <InstalarAppDialog
          app={app}
          version={version}
          open={installOpen}
          onClose={() => setInstallOpen(false)}
          escritorioId={tenantId}
          usuarioId={currentUser?.id ?? ''}
        />
      )}
    </div>
  )
}
