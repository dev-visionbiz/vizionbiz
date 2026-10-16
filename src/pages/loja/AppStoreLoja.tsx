import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApps } from '@/data/hooks/useApps'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/auth/AuthProvider'
import {
  Search, Sparkles, ChevronRight, Package, Store,
  LayoutGrid, Star, ArrowRight,
} from 'lucide-react'
import type { App } from '@/domain/types'

const categoriaIcones: Record<string, string> = {
  'Compliance': '🔒',
  'Benefícios': '🎁',
  'Fiscal': '🧾',
  'Societário': '👥',
  'Outros': '📦',
}

function RatingStars({ avaliacao }: { avaliacao: number }) {
  const full = Math.round(avaliacao)
  return (
    <span className="flex items-center gap-1 text-xs">
      <span className="text-yellow-400">{'★'.repeat(full)}{'☆'.repeat(5 - full)}</span>
      <span className="text-muted-foreground">{avaliacao.toFixed(1)}</span>
    </span>
  )
}

function AppCard({ app }: { app: App }) {
  return (
    <Link
      to={`/loja/${app.slug}`}
      className="group flex flex-col rounded-2xl border bg-card hover:shadow-lg hover:border-primary/30 transition-all duration-200 overflow-hidden"
    >
      <div className="h-28 bg-gradient-to-br from-primary/12 via-primary/5 to-muted/30 flex items-center justify-center relative overflow-hidden">
        <span className="text-5xl z-10">{app.icone ?? '📦'}</span>
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-primary/5 transition-opacity" />
      </div>
      <div className="p-4 flex flex-col gap-1.5 flex-1">
        <p className="font-semibold text-sm leading-tight truncate">{app.nome}</p>
        <p className="text-xs text-muted-foreground line-clamp-2 flex-1 leading-relaxed">{app.descricao}</p>
        <div className="flex items-center justify-between pt-1 mt-auto">
          {(app.avaliacao ?? 0) > 0
            ? <RatingStars avaliacao={app.avaliacao!} />
            : <span />}
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>
    </Link>
  )
}

function AppCardDestaque({ app }: { app: App }) {
  return (
    <Link
      to={`/loja/${app.slug}`}
      className="group relative flex flex-col rounded-2xl border bg-gradient-to-br from-primary/12 via-primary/5 to-card overflow-hidden hover:shadow-xl hover:border-primary/40 transition-all duration-300"
    >
      {/* Watermark icon */}
      <div className="absolute inset-0 flex items-end justify-end overflow-hidden pointer-events-none">
        <span className="text-[180px] leading-none opacity-[0.04] select-none translate-x-8 translate-y-4">
          {app.icone ?? '📦'}
        </span>
      </div>

      <div className="relative p-7 flex flex-col min-h-52">
        <div className="flex items-start gap-4 mb-5">
          <div className="w-16 h-16 rounded-2xl bg-background/90 border shadow-sm flex items-center justify-center text-3xl shrink-0">
            {app.icone ?? '📦'}
          </div>
          <div className="pt-0.5">
            {app.categoria && (
              <Badge variant="secondary" className="text-xs mb-1.5 font-medium">
                {categoriaIcones[app.categoria] ?? ''} {app.categoria}
              </Badge>
            )}
            <p className="font-bold text-xl leading-tight">{app.nome}</p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mb-5">
          {app.descricao}
        </p>

        <div className="flex items-center justify-between mt-auto">
          <div className="flex items-center gap-4">
            {(app.avaliacao ?? 0) > 0 && <RatingStars avaliacao={app.avaliacao!} />}
            {(app.instalacoes_count ?? 0) > 0 && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Star className="w-3 h-3" />
                {app.instalacoes_count!.toLocaleString('pt-BR')} escritórios
              </span>
            )}
          </div>
          <Button
            size="sm"
            className="gap-1.5 group-hover:gap-2.5 transition-all"
          >
            Ver aplicativo
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </Link>
  )
}

function AppCardEmBreve({ app }: { app: App }) {
  return (
    <div className="flex flex-col rounded-2xl border border-dashed bg-muted/20 overflow-hidden">
      <div className="h-28 bg-muted/40 flex items-center justify-center">
        <span className="text-5xl opacity-40 grayscale">{app.icone ?? '📦'}</span>
      </div>
      <div className="p-4 flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-sm leading-tight truncate text-muted-foreground">{app.nome}</p>
          <Badge variant="outline" className="text-xs shrink-0 text-muted-foreground">Em breve</Badge>
        </div>
        <p className="text-xs text-muted-foreground/70 line-clamp-2 leading-relaxed">{app.descricao}</p>
      </div>
    </div>
  )
}

export function AppStoreLoja() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const { data: apps = [] } = useApps()
  const [search, setSearch] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState<string | null>(null)

  const publicados = apps.filter((a) => a.status === 'publicado')
  const emBreve = apps.filter((a) => a.status === 'em_revisao')
  const destaques = publicados.filter((a) => a.destaque)

  const categorias = useMemo(() => {
    return [...new Set(publicados.map((a) => a.categoria).filter(Boolean))] as string[]
  }, [publicados])

  const filtrados = useMemo(() => {
    return publicados.filter((a) => {
      if (categoriaFiltro && a.categoria !== categoriaFiltro) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          a.nome.toLowerCase().includes(q) ||
          a.descricao.toLowerCase().includes(q) ||
          (a.tags ?? []).some((t) => t.toLowerCase().includes(q)) ||
          (a.categoria ?? '').toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [publicados, search, categoriaFiltro])

  const porCategoria = useMemo(() => {
    if (categoriaFiltro) return { [categoriaFiltro]: filtrados }
    const groups: Record<string, App[]> = {}
    filtrados.forEach((a) => {
      const cat = a.categoria ?? 'Outros'
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(a)
    })
    return groups
  }, [filtrados, categoriaFiltro])

  const isAdmin = currentUser?.papel === 'escritorio_admin'
  const hasFilter = !!search || !!categoriaFiltro

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky header */}
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <Store className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="font-bold text-sm">VisionBiz</span>
            <span className="text-muted-foreground text-sm hidden sm:inline">/ Loja de Apps</span>
          </Link>

          <div className="relative flex-1 max-w-sm hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-8 text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            {currentUser ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(isAdmin ? '/escritorio/apps' : '/portal/apps')}
              >
                Meus apps
              </Button>
            ) : (
              <Button size="sm" asChild>
                <Link to="/login">Entrar</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/4 to-background border-b">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-primary/8 rounded-full blur-2xl" />
        </div>
        <div className="relative max-w-6xl mx-auto px-6 py-20 text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-semibold mb-6 border border-primary/20">
            <Sparkles className="w-3.5 h-3.5" />
            {publicados.length} aplicativos disponíveis
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-5 tracking-tight">
            Loja de Aplicativos
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Estenda o poder do seu escritório com apps integrados ao VisionBiz —
            instale em minutos, sem configurações complexas.
          </p>
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, categoria ou funcionalidade..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 h-13 text-base rounded-2xl bg-card shadow-md border-border/60 focus:shadow-lg transition-shadow"
            />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10 space-y-14">
        {/* Category filter pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none flex-wrap sm:flex-nowrap">
          <button
            onClick={() => setCategoriaFiltro(null)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap shrink-0 border ${
              !categoriaFiltro
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'bg-card border-border text-muted-foreground hover:text-foreground hover:border-foreground/20'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Todos os apps
          </button>
          {categorias.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoriaFiltro(cat === categoriaFiltro ? null : cat)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap shrink-0 border ${
                categoriaFiltro === cat
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-card border-border text-muted-foreground hover:text-foreground hover:border-foreground/20'
              }`}
            >
              <span>{categoriaIcones[cat] ?? '📦'}</span>
              {cat}
            </button>
          ))}
        </div>

        {/* Featured section */}
        {!hasFilter && destaques.length > 0 && (
          <section>
            <div className="flex items-center gap-2.5 mb-6">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">Em Destaque</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {destaques.map((app) => (
                <AppCardDestaque key={app.id} app={app} />
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {search && filtrados.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            <Package className="w-14 h-14 mx-auto mb-5 opacity-15" />
            <p className="text-xl font-semibold mb-2">Nenhum app encontrado</p>
            <p className="text-sm">Tente outros termos ou navegue pelas categorias acima.</p>
          </div>
        )}

        {/* Category sections */}
        {Object.entries(porCategoria).map(([cat, catApps]) => (
          <section key={cat}>
            <div className="flex items-center gap-3 mb-6">
              <span className="text-2xl">{categoriaIcones[cat] ?? '📦'}</span>
              <h2 className="text-2xl font-bold">{cat}</h2>
              <span className="text-muted-foreground text-sm font-normal">
                {catApps.length} app{catApps.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {catApps.map((app) => (
                <AppCard key={app.id} app={app} />
              ))}
            </div>
          </section>
        ))}

        {/* Em breve section */}
        {!hasFilter && emBreve.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-6">
              <span className="text-2xl">🚀</span>
              <h2 className="text-2xl font-bold">Em breve</h2>
              <span className="text-muted-foreground text-sm font-normal">chegando em breve</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {emBreve.map((app) => (
                <AppCardEmBreve key={app.id} app={app} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t mt-10 py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
              <Store className="w-3 h-3 text-primary" />
            </div>
            <span>VisionBiz App Store · Para escritórios contábeis</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="hover:text-foreground transition-colors">Entrar</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
