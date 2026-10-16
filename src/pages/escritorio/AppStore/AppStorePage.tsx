import { useState } from 'react'
import { useAuth } from '@/auth/AuthProvider'
import {
  useApps, useAppInstallations, useDesinstalarApp, useSetAppVisibility,
  useAppVisibility,
} from '@/data/hooks/useApps'
import { appVersionRepo } from '@/data/repositories/localStorage/AppVersionRepository'
import { useSubscriptionsByEscritorio } from '@/data/hooks/useSubscriptions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { InstalarAppDialog } from './InstalarAppDialog'
import { AssinarPlanoDialog } from './AssinarPlanoDialog'
import type { App, AppVersion, AppInstallation, Subscription } from '@/domain/types'
import { PackageOpen, CheckCircle2, Trash2, Star, StarOff, CreditCard, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'

function AppCard({
  app,
  instalada,
  subscription,
  destaque,
  visivel,
  escritorioId,
  usuarioId,
  onInstalar,
  onDesinstalar,
  onToggleVisibility,
  onToggleDestaque,
  onAssinar,
}: {
  app: App
  instalada: AppInstallation | undefined
  subscription: Subscription | undefined
  destaque: boolean
  visivel: boolean
  escritorioId: string
  usuarioId: string
  onInstalar: (app: App) => void
  onDesinstalar: (installationId: string) => void
  onToggleVisibility: (appId: string, visivel: boolean, destaque: boolean) => void
  onToggleDestaque: (appId: string, visivel: boolean, destaque: boolean) => void
  onAssinar: (app: App, installation: AppInstallation) => void
}) {
  const isInstalado = !!instalada && instalada.status === 'ativa'

  return (
    <Card className={`flex flex-col ${destaque ? 'ring-2 ring-primary/40' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-3xl">{app.icone ?? '📦'}</span>
            <div>
              <CardTitle className="text-base">{app.nome}</CardTitle>
              {app.categoria && (
                <Badge variant="secondary" className="text-xs mt-0.5">{app.categoria}</Badge>
              )}
            </div>
          </div>
          {isInstalado && (
            <Badge className="bg-green-100 text-green-800 border-transparent text-xs shrink-0">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Instalado
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-3">
        <CardDescription className="text-sm line-clamp-3">{app.descricao}</CardDescription>

        <div className="flex items-center justify-between mt-auto pt-2 border-t gap-2 flex-wrap">
          {isInstalado ? (
            <>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Label htmlFor={`vis-${app.id}`} className="cursor-pointer">Visível para clientes</Label>
                  <Switch
                    id={`vis-${app.id}`}
                    checked={visivel}
                    onCheckedChange={(v) => onToggleVisibility(app.id, v, destaque)}
                    className="scale-75"
                  />
                </span>
                <button
                  title={destaque ? 'Remover destaque' : 'Destacar'}
                  onClick={() => onToggleDestaque(app.id, visivel, !destaque)}
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  {destaque ? <Star className="w-4 h-4 fill-primary text-primary" /> : <StarOff className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onAssinar(app, instalada)}
                >
                  <CreditCard className="w-3.5 h-3.5 mr-1" />
                  {subscription ? 'Plano' : 'Assinar'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => onDesinstalar(instalada.id)}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Desinstalar
                </Button>
              </div>
            </>
          ) : (
            <Button size="sm" onClick={() => onInstalar(app)}>
              <PackageOpen className="w-3.5 h-3.5 mr-1" />
              Instalar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function AppStorePage() {
  const { currentTenant, currentUser } = useAuth()
  const escritorioId = currentTenant?.id ?? ''
  const usuarioId = currentUser?.id ?? ''

  const { data: apps = [] } = useApps()
  const { data: instalacoes = [] } = useAppInstallations(escritorioId)
  const { data: visibilities = [] } = useAppVisibility(escritorioId)
  const { data: subscriptions = [] } = useSubscriptionsByEscritorio(escritorioId)
  const desinstalar = useDesinstalarApp()
  const setVisibility = useSetAppVisibility()
  const { toast } = useToast()

  const [appParaInstalar, setAppParaInstalar] = useState<{ app: App; version: AppVersion } | null>(null)
  const [appParaAssinar, setAppParaAssinar] = useState<{ app: App; installation: AppInstallation } | null>(null)

  const publishedApps = apps.filter((a) => a.status === 'publicado')

  function getInstalacao(appId: string) {
    return instalacoes.find((i) => i.app_id === appId && i.status === 'ativa')
  }

  function getVisibility(appId: string) {
    return visibilities.find((v) => v.app_id === appId)
  }

  async function handleInstalar(app: App) {
    const version = await appVersionRepo.findLatest(app.id)
    if (!version) {
      toast({ title: 'Versão do app não encontrada.', variant: 'destructive' })
      return
    }
    setAppParaInstalar({ app, version })
  }

  function handleDesinstalar(installationId: string) {
    desinstalar.mutate(
      { installationId, escritorioId },
      {
        onSuccess: () => toast({ title: 'App desinstalado.' }),
        onError: () => toast({ title: 'Erro ao desinstalar.', variant: 'destructive' }),
      }
    )
  }

  function handleToggleVisibility(appId: string, visivel: boolean, destaque: boolean) {
    setVisibility.mutate({ escritorioId, appId, visivel, destaque })
  }

  function getSubscription(installationId: string) {
    return subscriptions.find((s) => s.installation_id === installationId && s.status === 'ativa')
  }

  const instaladosIds = new Set(instalacoes.filter((i) => i.status === 'ativa').map((i) => i.app_id))

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Loja de Apps</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Expanda a plataforma com apps prontos para o seu escritório e seus clientes.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to="/loja" target="_blank">
            <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
            Ver página da loja
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="catalogo">
        <TabsList>
          <TabsTrigger value="catalogo">Catálogo</TabsTrigger>
          <TabsTrigger value="instalados">
            Instalados
            {instaladosIds.size > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-xs">{instaladosIds.size}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="catalogo" className="mt-4">
          {publishedApps.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum app disponível no momento.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {publishedApps.map((app) => {
                const vis = getVisibility(app.id)
                return (
                  <AppCard
                    key={app.id}
                    app={app}
                    instalada={getInstalacao(app.id)}
                    subscription={getInstalacao(app.id) ? getSubscription(getInstalacao(app.id)!.id) : undefined}
                    visivel={vis?.visivel ?? true}
                    destaque={vis?.destaque ?? false}
                    escritorioId={escritorioId}
                    usuarioId={usuarioId}
                    onInstalar={handleInstalar}
                    onDesinstalar={handleDesinstalar}
                    onToggleVisibility={handleToggleVisibility}
                    onToggleDestaque={handleToggleVisibility}
                    onAssinar={(a, inst) => setAppParaAssinar({ app: a, installation: inst })}
                  />
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="instalados" className="mt-4">
          {instaladosIds.size === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum app instalado ainda.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {publishedApps.filter((a) => instaladosIds.has(a.id)).map((app) => {
                const vis = getVisibility(app.id)
                return (
                  <AppCard
                    key={app.id}
                    app={app}
                    instalada={getInstalacao(app.id)}
                    subscription={getInstalacao(app.id) ? getSubscription(getInstalacao(app.id)!.id) : undefined}
                    visivel={vis?.visivel ?? true}
                    destaque={vis?.destaque ?? false}
                    escritorioId={escritorioId}
                    usuarioId={usuarioId}
                    onInstalar={handleInstalar}
                    onDesinstalar={handleDesinstalar}
                    onToggleVisibility={handleToggleVisibility}
                    onToggleDestaque={handleToggleVisibility}
                    onAssinar={(a, inst) => setAppParaAssinar({ app: a, installation: inst })}
                  />
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {appParaInstalar && (
        <InstalarAppDialog
          app={appParaInstalar.app}
          version={appParaInstalar.version}
          open
          onClose={() => setAppParaInstalar(null)}
          escritorioId={escritorioId}
          usuarioId={usuarioId}
        />
      )}

      {appParaAssinar && (
        <AssinarPlanoDialog
          app={appParaAssinar.app}
          installation={appParaAssinar.installation}
          subscriptionAtiva={getSubscription(appParaAssinar.installation.id)}
          open
          onClose={() => setAppParaAssinar(null)}
        />
      )}
    </div>
  )
}
