import { useEffect, useRef } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { useNavigate } from 'react-router-dom'
import type { GadgetContext, GadgetSpec } from '@/domain/types'

interface EmbedGadgetProps {
  spec: GadgetSpec
  context?: GadgetContext | Record<string, unknown>
}

type EmbedMessageIn =
  | { type: 'resize'; height: number }
  | { type: 'navigate'; path: string }
  | { type: 'toast'; message: string; variant?: 'default' | 'destructive' }

type EmbedMessageOut =
  | { type: 'context'; tenant: object; user: object; cliente?: object }
  | { type: 'theme'; mode: 'light' | 'dark'; primaryColor: string }

function buildToken(context?: GadgetContext | Record<string, unknown>): string {
  const payload = {
    tenant: (context as GadgetContext)?.tenant ?? { id: 'demo', nome: 'VisionBiz Demo' },
    user: (context as GadgetContext)?.user ?? { id: 'demo', papel: 'cliente' },
    cliente: (context as GadgetContext)?.cliente,
    scope: [(context as GadgetContext)?.scope ?? 'portal'],
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  }
  const header = btoa(JSON.stringify({ typ: 'JWT', alg: 'none' }))
  const body = btoa(JSON.stringify(payload))
  return `${header}.${body}.`
}

export function EmbedGadget({ spec, context }: EmbedGadgetProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()
  const navigate = useNavigate()

  // useEffect antes de qualquer return condicional (regra dos hooks)
  useEffect(() => {
    const url = spec.embedUrl
    if (!url) return

    // Pré-computa origem no escopo já estreitado — TypeScript sabe que url é string aqui
    let embedOrigin: string
    try {
      embedOrigin = new URL(url).origin
    } catch {
      return
    }

    function handleMessage(event: MessageEvent) {
      if (event.origin !== embedOrigin) return

      const data = event.data as EmbedMessageIn
      if (!data?.type) return

      if (data.type === 'resize') {
        const container = containerRef.current
        if (container) container.style.height = `${Math.min(data.height, 800)}px`
      } else if (data.type === 'navigate') {
        navigate(data.path)
      } else if (data.type === 'toast') {
        toast({ title: data.message, variant: data.variant })
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [spec.embedUrl, navigate, toast])

  const embedUrl = spec.embedUrl
  if (!embedUrl) return null

  // Pré-computa origem e src após o guard — TypeScript sabe que embedUrl é string aqui
  const embedOrigin = new URL(embedUrl).origin
  const token = buildToken(context)
  const src = `${embedUrl}${embedUrl.includes('?') ? '&' : '?'}token=${token}`

  function handleLoad() {
    const iframe = iframeRef.current
    if (!iframe?.contentWindow) return

    const msg: EmbedMessageOut = {
      type: 'context',
      tenant: (context as GadgetContext)?.tenant ?? {},
      user: (context as GadgetContext)?.user ?? {},
      cliente: (context as GadgetContext)?.cliente,
    }
    iframe.contentWindow.postMessage(msg, embedOrigin)

    const theme: EmbedMessageOut = {
      type: 'theme',
      mode: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
      primaryColor: getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim(),
    }
    iframe.contentWindow.postMessage(theme, embedOrigin)
  }

  const heightClass =
    spec.tamanho === 'grande' ? 'h-[480px]' :
    spec.tamanho === 'medio' ? 'h-72' :
    'h-48'

  return (
    <div ref={containerRef} className={`w-full overflow-hidden rounded-xl border bg-card ${heightClass} transition-[height]`}>
      <iframe
        ref={iframeRef}
        src={src}
        onLoad={handleLoad}
        sandbox="allow-scripts allow-same-origin allow-forms"
        className="w-full h-full border-0"
        title="Gadget embed"
      />
    </div>
  )
}
