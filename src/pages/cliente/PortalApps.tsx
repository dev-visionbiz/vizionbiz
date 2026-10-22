import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'
import {
  useApps, useAppVisibility,
  useAppInstallationsByCliente, useDesconectarAppCliente,
} from '@/data/hooks/useApps'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import { ConectarServicoDialog } from './ConectarServicoDialog'
import { CheckCircle2, ChevronRight, Plug, Unplug, Package } from 'lucide-react'
import type { App, AppInstallation } from '@/domain/types'

function AppActionTarget(appId: string): string | undefined {
  if (appId === 'app-cert-digital') return '/portal/certificados'
  return undefined
}

function CatalogCard({
  app,
  instalacao,
  destaque,
  onConectar,
  onDesconectar,
  onAcessar,
}: {
  app: App
  instalacao: AppInstallation | undefined
  destaque: boolean
  onConectar: () => void
  onDesconectar: () => void
  onAcessar: (() => void) | undefined
}) {
  const conectado = !!instalacao

  return (
    <Card className={destaque ? 'border-primary/40 shadow-sm' : ''}>
      <CardContent className="pt-4 pb-3 flex items-start justify-between gap-3">
        <Link
          to={`/loja/${app.slug}`}
          className="flex items-start gap-3 min-w-0 flex-1 hover:opacity-80 transition-opacity"
        >
          <span className="text-2xl shrink-0">{app.icone ?? '📦'}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-sm">{app.nome}</p>
              {conectado && (
                <Badge className="text-xs bg-green-100 text-green-800 border-transparent">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Conectado
                </Badge>
              )}
              {destaque && !conectado && (
                <Badge className="text-xs bg-primary/10 text-primary border-transparent">Destaque</Badge>
              )}
            </div>
            {app.descricao && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{app.descricao}</p>
            )}
          </div>
        </Link>

        <div className="flex items-center gap-1 shrink-0">
          {conectado ? (
            <>
              {onAcessar && (
                <Button size="sm" variant="ghost" className="text-primary" onClick={onAcessar}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={onDesconectar}
              >
                <Unplug className="w-3.5 h-3.5" />
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={onConectar}>
              <Plug className="w-3.5 h-3.5 mr-1.5" />
              Conectar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default function PortalApps() {
  const { currentUser } = useAuth()
  const tenantId = currentUser?.tenant_id ?? ''
  const clienteId = currentUser?.client_id ?? ''
  const navigate = useNavigate()
  const { toast } = useToast()

  const { data: apps = [] } = useApps()
  const { data: visibility = [] } = useAppVisibility(tenantId)
  const { data: minhasInstalacoes = [] } = useAppInstallationsByCliente(tenantId, clienteId)
  const desconectar = useDesconectarAppCliente()

  const [appParaConectar, setAppParaConectar] = useState<App | null>(null)

  const visiveisIds = new Set(visibility.filter((v) => v.visivel).map((v) => v.app_id))

  const catalogo = apps.filter((a) => a.status === 'publicado' && visiveisIds.has(a.id))

  const minhasIds = new Set(minhasInstalacoes.map((i) => i.app_id))
  const meusServicos = catalogo.filter((a) => minhasIds.has(a.id))

  function getInstalacao(appId: string) {
    return minhasInstalacoes.find((i) => i.app_id === appId)
  }

  function getDestaque(appId: string) {
    return visibility.find((v) => v.app_id === appId)?.destaque ?? false
  }

  function handleDesconectar(app: App) {
    const inst = getInstalacao(app.id)
    if (!inst) return
    desconectar.mutate(
      { installationId: inst.id, escritorioId: tenantId, clienteId },
      {
        onSuccess: () => toast({ title: `${app.nome} desconectado.` }),
        onError: () => toast({ title: 'Erro ao desconectar.', variant: 'destructive' }),
      }
    )
  }

  if (catalogo.length === 0) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-1">Conexões</h1>
        <p className="text-muted-foreground text-sm">
          Nenhum serviço disponível no momento.
        </p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Conexões</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Serviços disponíveis para a sua empresa.
        </p>
      </div>

      <Tabs defaultValue="catalogo">
        <TabsList>
          <TabsTrigger value="catalogo">
            Catálogo
            <Badge variant="secondary" className="ml-1.5 text-xs">{catalogo.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="meus">
            Meus Serviços
            {meusServicos.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-xs">{meusServicos.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="catalogo" className="mt-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {catalogo.map((app) => (
              <CatalogCard
                key={app.id}
                app={app}
                instalacao={getInstalacao(app.id)}
                destaque={getDestaque(app.id)}
                onConectar={() => setAppParaConectar(app)}
                onDesconectar={() => handleDesconectar(app)}
                onAcessar={AppActionTarget(app.id) ? () => navigate(AppActionTarget(app.id)!) : undefined}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="meus" className="mt-4">
          {meusServicos.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Você ainda não conectou nenhum serviço.</p>
              <p className="text-xs mt-1">Explore o catálogo e conecte os que precisar.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {meusServicos.map((app) => (
                <CatalogCard
                  key={app.id}
                  app={app}
                  instalacao={getInstalacao(app.id)}
                  destaque={getDestaque(app.id)}
                  onConectar={() => setAppParaConectar(app)}
                  onDesconectar={() => handleDesconectar(app)}
                  onAcessar={AppActionTarget(app.id) ? () => navigate(AppActionTarget(app.id)!) : undefined}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {appParaConectar && (
        <ConectarServicoDialog
          app={appParaConectar}
          escritorioId={tenantId}
          clienteId={clienteId}
          usuarioId={currentUser?.id ?? ''}
          open
          onClose={() => setAppParaConectar(null)}
        />
      )}
    </div>
  )
}
