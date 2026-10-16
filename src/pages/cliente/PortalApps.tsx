import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'
import { useApps, useAppInstallations, useAppVisibility } from '@/data/hooks/useApps'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronRight } from 'lucide-react'

export default function PortalApps() {
  const { currentUser } = useAuth()
  const tenantId = currentUser?.tenant_id ?? ''
  const navigate = useNavigate()

  const { data: apps = [] } = useApps()
  const { data: installations = [] } = useAppInstallations(tenantId)
  const { data: visibility = [] } = useAppVisibility(tenantId)

  const visibleAppIds = new Set(
    visibility.filter((v) => v.visivel).map((v) => v.app_id)
  )
  const installedAppIds = new Set(installations.map((i) => i.app_id))

  const appsVisiveis = apps
    .filter((a) => a.status === 'publicado' && installedAppIds.has(a.id) && visibleAppIds.has(a.id))

  if (appsVisiveis.length === 0) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-1">Aplicativos</h1>
        <p className="text-muted-foreground text-sm">
          Nenhum aplicativo disponível no momento.
        </p>
      </div>
    )
  }

  function getAppAction(appId: string): (() => void) | undefined {
    if (appId === 'app-cert-digital') return () => navigate('/portal/certificados')
    return undefined
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Aplicativos</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Serviços e ferramentas disponibilizados pelo seu escritório.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {appsVisiveis.map((app) => {
          const isDestaque = visibility.find((v) => v.app_id === app.id)?.destaque ?? false
          const action = getAppAction(app.id)
          return (
            <Card key={app.id} className={isDestaque ? 'border-primary/40 shadow-sm' : ''}>
              <CardContent className="pt-4 pb-3 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <span className="text-2xl shrink-0">{app.icone ?? '📦'}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{app.nome}</p>
                      {isDestaque && (
                        <Badge className="text-xs bg-primary/10 text-primary border-transparent">Destaque</Badge>
                      )}
                    </div>
                    {app.descricao && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{app.descricao}</p>
                    )}
                  </div>
                </div>
                {action && (
                  <Button size="sm" variant="ghost" className="shrink-0 text-primary" onClick={action}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
