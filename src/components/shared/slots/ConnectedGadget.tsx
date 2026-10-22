import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, WifiOff } from 'lucide-react'
import type { GadgetContext, GadgetSpec } from '@/domain/types'

const TIMEOUT_MS = 5000

interface ConnectedGadgetProps {
  spec: GadgetSpec
  appNome: string
  context?: GadgetContext | Record<string, unknown>
}

type FetchState = 'idle' | 'loading' | 'ok' | 'error' | 'timeout'

function renderValue(v: unknown): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'number') return v.toLocaleString('pt-BR')
  return String(v)
}

// MVP: simula resposta do endpoint com dados mock baseados no mapeamento
function mockResponse(mapping: Record<string, string>): Record<string, unknown> {
  const keys = Object.keys(mapping)
  const mocked: Record<string, unknown> = {}
  keys.forEach((key, i) => {
    if (i === 0) mocked[key] = Math.floor(Math.random() * 50) + 5
    else if (i === 1) mocked[key] = `R$ ${(Math.random() * 2000 + 200).toFixed(2).replace('.', ',')}`
    else mocked[key] = 'Ativo'
  })
  return mocked
}

export function ConnectedGadget({ spec, appNome, context }: ConnectedGadgetProps) {
  const [fetchState, setFetchState] = useState<FetchState>('idle')
  const [data, setData] = useState<Record<string, unknown>>({})

  const endpoint = spec.dataEndpoint

  useEffect(() => {
    if (!endpoint) return
    const ep = endpoint   // captura para narrowing dentro de closures async
    let cancelled = false

    async function load() {
      setFetchState('loading')

      const timer = window.setTimeout(() => {
        if (!cancelled) setFetchState('timeout')
      }, TIMEOUT_MS)

      try {
        // Em modo MVP (localStorage): simula latência e retorna dados mock
        await new Promise((r) => setTimeout(r, 600 + Math.random() * 400))
        if (cancelled) return
        clearTimeout(timer)
        setData(mockResponse(ep.mapping))
        setFetchState('ok')
      } catch {
        clearTimeout(timer)
        if (!cancelled) setFetchState('error')
      }
    }

    load()

    const intervalId =
      ep.refreshInterval > 0
        ? window.setInterval(load, ep.refreshInterval * 1000)
        : null

    return () => {
      cancelled = true
      if (intervalId !== null) clearInterval(intervalId)
    }
  }, [endpoint?.url])

  if (!endpoint) return null

  if (fetchState === 'idle' || fetchState === 'loading') {
    return (
      <Card>
        <CardContent className="h-24 flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Carregando {appNome}...</span>
        </CardContent>
      </Card>
    )
  }

  if (fetchState === 'timeout' || fetchState === 'error') {
    return (
      <Card>
        <CardContent className="h-24 flex flex-col items-center justify-center gap-1.5 text-muted-foreground">
          <WifiOff className="w-5 h-5" />
          <span className="text-sm">Serviço temporariamente indisponível</span>
        </CardContent>
      </Card>
    )
  }

  const entries = Object.entries(endpoint.mapping).map(([key, label]) => ({
    label,
    value: data[key],
  }))

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span>{appNome}</span>
          <Badge variant="secondary" className="text-xs font-mono">conectado</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
          {entries.map(({ label, value }) => (
            <div key={label}>
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="text-base font-semibold leading-tight">{renderValue(value)}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}
