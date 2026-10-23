import { useNavigate } from 'react-router-dom'
import { useApps, useAtualizarApp } from '@/data/hooks/useApps'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/components/ui/use-toast'
import { Plus, Pencil, ExternalLink, MoreHorizontal, Package, ChevronDown } from 'lucide-react'
import type { App, AppStatus, AppTipo } from '@/domain/types'

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

const TIPO_LABEL: Record<AppTipo, string> = {
  embarcado: 'Embarcado',
  conectado: 'Conectado',
  embed: 'Embed',
}

const STATUS_FLOW: AppStatus[] = ['rascunho', 'em_revisao', 'publicado', 'suspenso']

export function CatalogoPage() {
  const navigate = useNavigate()
  const { data: apps = [] } = useApps()
  const atualizar = useAtualizarApp()
  const { toast } = useToast()

  const sorted = [...apps].sort(
    (a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime()
  )

  const publicados = apps.filter((a) => a.status === 'publicado').length
  const rascunhos = apps.filter((a) => a.status === 'rascunho').length
  const revisao = apps.filter((a) => a.status === 'em_revisao').length

  async function mudarStatus(app: App, status: AppStatus) {
    try {
      await atualizar.mutateAsync({ id: app.id, data: { status } })
      toast({ title: `Status alterado para "${STATUS_LABEL[status]}"` })
    } catch {
      toast({ title: 'Erro ao alterar status', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Catálogo de Extensores</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Extensores disponíveis na plataforma VisionBiz
          </p>
        </div>
        <Button onClick={() => navigate('/admin/catalogo/novo')} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo extensor
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total', value: apps.length, color: 'text-foreground' },
          { label: 'Publicados', value: publicados, color: 'text-green-600' },
          { label: 'Em revisão', value: revisao, color: 'text-yellow-600' },
          { label: 'Rascunhos', value: rascunhos, color: 'text-muted-foreground' },
        ].map(({ label, value, color }) => (
          <div key={label} className="border rounded-xl p-4 bg-card">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={`text-2xl font-bold mt-0.5 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground border rounded-xl bg-muted/20">
          <Package className="h-12 w-12 mb-4 opacity-20" />
          <p className="text-lg font-medium">Nenhum extensor cadastrado</p>
          <p className="text-sm mt-1">Clique em "Novo extensor" para começar.</p>
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Extensor</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground w-28">Tipo</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground w-32">Categoria</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground w-28">Instalações</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground w-36">Status</th>
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {sorted.map((app) => (
                <tr key={app.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl shrink-0">{app.icone ?? '📦'}</span>
                      <div>
                        <p className="font-medium">{app.nome}</p>
                        <p className="text-xs text-muted-foreground font-mono">{app.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{TIPO_LABEL[app.tipo]}</td>
                  <td className="px-4 py-3 text-muted-foreground">{app.categoria ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {app.instalacoes_count != null ? app.instalacoes_count.toLocaleString('pt-BR') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
                          <Badge variant={STATUS_VARIANT[app.status]}>
                            {STATUS_LABEL[app.status]}
                          </Badge>
                          <ChevronDown className="h-3 w-3 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        {STATUS_FLOW.filter((s) => s !== app.status).map((s) => (
                          <DropdownMenuItem key={s} onClick={() => mudarStatus(app, s)}>
                            {STATUS_LABEL[s]}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                  <td className="px-4 py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-7 w-7">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/admin/catalogo/${app.id}`)}>
                          <Pencil className="h-3.5 w-3.5 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        {app.status === 'publicado' && (
                          <DropdownMenuItem
                            onClick={() => window.open(`/loja/${app.slug}`, '_blank')}
                          >
                            <ExternalLink className="h-3.5 w-3.5 mr-2" />
                            Ver na loja
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
