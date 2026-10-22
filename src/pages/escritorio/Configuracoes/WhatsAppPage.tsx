import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/auth/AuthProvider'
import { whatsappService, type WhatsAppStatus } from '@/lib/whatsapp/whatsappService'
import { useTenant, useUpdateTenant } from '@/data/hooks/useTenant'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  MessageCircle,
  Wifi,
  WifiOff,
  Loader2,
  CheckCircle2,
  Smartphone,
  MoreVertical,
  ScanLine,
  RotateCcw,
  Info,
  Link,
  X,
  Eye,
  EyeOff,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  DEFAULT_TEMPLATE_GUIA,
  DEFAULT_TEMPLATE_DOCUMENTO,
  VARS_GUIA,
  VARS_DOCUMENTO,
} from '@/lib/whatsapp/templates'

function mascaraTelefone(phone: string): string {
  if (phone.length <= 6) return `+${phone}`
  const pais = phone.slice(0, 2)
  const ultimos4 = phone.slice(-4)
  const asteriscos = '*'.repeat(phone.length - 6)
  return `+${pais} ${asteriscos}${ultimos4}`
}

const INSTRUCOES = [
  { icon: Smartphone,    texto: 'Abra o WhatsApp no celular do escritório' },
  { icon: MoreVertical,  texto: 'Toque em Mais opções ⋮ ou Configurações' },
  { icon: ScanLine,      texto: 'Selecione "Aparelhos conectados" e depois "Conectar aparelho"' },
  { icon: ScanLine,      texto: 'Aponte a câmera para o QR Code abaixo' },
]

// ---- Editor de template individual ----
function TemplateEditor({
  label,
  value,
  onChange,
  defaultValue,
  vars,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  defaultValue: string
  vars: { chave: string; descricao: string }[]
}) {
  const [showVars, setShowVars] = useState(false)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setShowVars((s) => !s)}
          >
            <Info className="h-3.5 w-3.5" />
            {showVars ? 'Ocultar variáveis' : 'Ver variáveis'}
          </button>
          {value !== defaultValue && (
            <button
              type="button"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
              onClick={() => onChange(defaultValue)}
              title="Restaurar padrão"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restaurar padrão
            </button>
          )}
        </div>
      </div>

      {showVars && (
        <div className="rounded-md border bg-muted/30 p-3 space-y-1">
          <p className="text-xs font-medium text-muted-foreground mb-2">Variáveis disponíveis:</p>
          {vars.map(({ chave, descricao }) => (
            <div key={chave} className="flex items-baseline gap-2 text-xs">
              <code
                className="font-mono text-primary bg-primary/8 px-1 rounded cursor-pointer hover:bg-primary/15 select-all shrink-0"
                title="Clique para copiar"
                onClick={() => navigator.clipboard.writeText(chave)}
              >
                {chave}
              </code>
              <span className="text-muted-foreground">{descricao}</span>
            </div>
          ))}
        </div>
      )}

      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={10}
        className="font-mono text-xs resize-y"
        placeholder="Digite o template da mensagem..."
      />
      <p className="text-xs text-muted-foreground text-right">{value.length} caracteres</p>
    </div>
  )
}

// ---- Página principal ----
export default function WhatsAppPage() {
  const { currentUser } = useAuth()
  const tenantId = currentUser?.tenant_id ?? ''
  const escritorioId = tenantId

  const { data: tenant } = useTenant(tenantId)
  const updateTenant = useUpdateTenant()
  const { toast } = useToast()

  const [status, setStatus] = useState<WhatsAppStatus>('disconnected')
  const [phone, setPhone] = useState<string | null>(null)
  const [qr, setQr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [modalAberto, setModalAberto] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [mostrarTelefone, setMostrarTelefone] = useState(false)

  const [tmplGuia, setTmplGuia] = useState(DEFAULT_TEMPLATE_GUIA)
  const [tmplDoc, setTmplDoc] = useState(DEFAULT_TEMPLATE_DOCUMENTO)
  const [salvando, setSalvando] = useState(false)

  const [urlServidor, setUrlServidor] = useState(() => whatsappService.getUrl())
  const [urlInput, setUrlInput] = useState(() => whatsappService.isUrlCustomizada() ? whatsappService.getUrl() : '')
  const [salvandoUrl, setSalvandoUrl] = useState(false)

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const apiConfigurada = !!whatsappService.getUrl()

  // Carrega os templates salvos quando o tenant chegar
  useEffect(() => {
    if (!tenant) return
    setTmplGuia(tenant.template_whatsapp_guia ?? DEFAULT_TEMPLATE_GUIA)
    setTmplDoc(tenant.template_whatsapp_documento ?? DEFAULT_TEMPLATE_DOCUMENTO)
  }, [tenant])

  async function fetchStatus() {
    if (!escritorioId || !whatsappService.getUrl()) return
    const res = await whatsappService.obterStatus(escritorioId)
    setStatus(res.status)
    setPhone(res.phone)

    if (res.status === 'connecting') {
      const qrData = await whatsappService.obterQR(escritorioId)
      setQr(qrData)
    } else {
      setQr(null)
    }
  }

  function startPolling() {
    if (pollRef.current) return
    pollRef.current = setInterval(fetchStatus, 3000)
  }

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  function startCountdown() {
    setCountdown(3)
    countRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(countRef.current!)
          countRef.current = null
          setModalAberto(false)
          return null
        }
        return prev - 1
      })
    }, 1000)
  }

  useEffect(() => {
    fetchStatus()
    return () => {
      stopPolling()
      if (countRef.current) clearInterval(countRef.current)
    }
  }, [escritorioId])

  useEffect(() => {
    if (status === 'connecting') {
      startPolling()
    } else if (status === 'connected') {
      stopPolling()
      if (modalAberto) startCountdown()
    } else {
      stopPolling()
    }
  }, [status])

  const handleSalvarUrl = useCallback(async () => {
    setSalvandoUrl(true)
    whatsappService.setUrl(urlInput)
    setUrlServidor(whatsappService.getUrl())
    toast({ title: 'URL atualizada. Verificando conexão...' })
    await fetchStatus()
    setSalvandoUrl(false)
  }, [urlInput, toast])

  const handleLimparUrl = useCallback(() => {
    whatsappService.clearUrl()
    setUrlInput('')
    setUrlServidor(whatsappService.getUrl())
    toast({ title: 'URL redefinida para o padrão do .env.' })
  }, [toast])

  async function handleConectar() {
    setLoading(true)
    try {
      await whatsappService.conectar(escritorioId)
      setModalAberto(true)
      setStatus('connecting')
      await fetchStatus()
      startPolling()
    } finally {
      setLoading(false)
    }
  }

  async function handleDesconectar() {
    setLoading(true)
    try {
      await whatsappService.desconectar(escritorioId)
      setStatus('disconnected')
      setPhone(null)
      setQr(null)
    } finally {
      setLoading(false)
    }
  }

  function handleFecharModal() {
    setModalAberto(false)
    stopPolling()
    if (countRef.current) {
      clearInterval(countRef.current)
      countRef.current = null
      setCountdown(null)
    }
  }

  async function handleSalvarTemplates() {
    setSalvando(true)
    try {
      await updateTenant.mutateAsync({
        id: tenantId,
        data: {
          template_whatsapp_guia: tmplGuia === DEFAULT_TEMPLATE_GUIA ? undefined : tmplGuia,
          template_whatsapp_documento: tmplDoc === DEFAULT_TEMPLATE_DOCUMENTO ? undefined : tmplDoc,
        },
      })
      toast({ title: 'Templates salvos com sucesso.' })
    } catch {
      toast({ title: 'Erro ao salvar templates.', variant: 'destructive' })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="space-y-6 py-2">
      {!apiConfigurada && (
        <div className="p-4 rounded-lg border border-amber-200 bg-amber-50 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          Nenhuma URL configurada. Cole o endereço do seu servidor Cloudflare Tunnel no campo abaixo.
        </div>
      )}
      {/* Barra de status */}
      <div className="flex items-center gap-3 rounded-lg border p-4">
        {status === 'connected' && <Wifi className="h-5 w-5 text-green-500 shrink-0" />}
        {status === 'connecting' && <Loader2 className="h-5 w-5 text-amber-500 shrink-0 animate-spin" />}
        {status === 'disconnected' && <WifiOff className="h-5 w-5 text-muted-foreground shrink-0" />}

        <div className="flex-1 min-w-0">
          {status === 'connected' && (
            <>
              <p className="font-medium text-sm">Conectado</p>
              {phone && (
                <div className="flex items-center gap-1">
                  <p className="text-xs text-muted-foreground font-mono">
                    {mostrarTelefone ? `+${phone}` : mascaraTelefone(phone)}
                  </p>
                  <button
                    type="button"
                    onClick={() => setMostrarTelefone(v => !v)}
                    className="text-muted-foreground hover:text-foreground"
                    title={mostrarTelefone ? 'Ocultar número' : 'Revelar número'}
                  >
                    {mostrarTelefone
                      ? <EyeOff className="h-3 w-3" />
                      : <Eye className="h-3 w-3" />}
                  </button>
                </div>
              )}
            </>
          )}
          {status === 'connecting' && (
            <p className="font-medium text-sm">Aguardando escaneamento do QR Code...</p>
          )}
          {status === 'disconnected' && (
            <p className="font-medium text-sm text-muted-foreground">Desconectado</p>
          )}
        </div>

        <div className="shrink-0">
          {status === 'disconnected' && (
            <Button size="sm" onClick={handleConectar} disabled={loading} className="gap-1.5">
              {loading
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <MessageCircle className="h-3.5 w-3.5" />}
              Conectar
            </Button>
          )}
          {status === 'connecting' && (
            <Button size="sm" variant="outline" onClick={() => setModalAberto(true)}>
              Ver QR Code
            </Button>
          )}
          {status === 'connected' && (
            <Button size="sm" variant="destructive" onClick={handleDesconectar} disabled={loading}>
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Desconectar'}
            </Button>
          )}
        </div>
      </div>

      {status === 'connected' && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800 dark:border-green-800 dark:bg-green-950/40 dark:text-green-300">
          WhatsApp conectado. As mensagens enviadas aos clientes usarão este número.
        </div>
      )}

      {/* URL do servidor */}
      <div className="rounded-lg border p-4 space-y-3">
        <div>
          <p className="font-semibold text-sm flex items-center gap-1.5">
            <Link className="h-4 w-4" />
            URL do servidor WhatsApp
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cole aqui a URL do Cloudflare Tunnel sempre que ela mudar. Não é necessário redeploy.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://xyz.trycloudflare.com"
              className="font-mono text-xs pr-8"
            />
            {urlInput && (
              <button
                type="button"
                onClick={() => setUrlInput('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Button size="sm" onClick={handleSalvarUrl} disabled={salvandoUrl || !urlInput.trim()}>
            Salvar
          </Button>
          {whatsappService.isUrlCustomizada() && (
            <Button size="sm" variant="ghost" onClick={handleLimparUrl} title="Usar URL do .env">
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          URL ativa:{' '}
          <code className="font-mono">
            {urlServidor || <span className="italic">não configurada</span>}
          </code>
          {whatsappService.isUrlCustomizada() && (
            <span className="ml-2 text-amber-600 dark:text-amber-400">(personalizada)</span>
          )}
        </p>
      </div>

      {/* Templates de mensagem */}
      <div className="rounded-lg border p-4 space-y-5">
        <div>
          <p className="font-semibold text-sm">Templates de mensagem</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Texto padrão pré-preenchido ao enviar via WhatsApp. Use as variáveis para incluir dados
            do documento ou guia. O texto ainda pode ser editado antes de cada envio.
          </p>
        </div>

        <TemplateEditor
          label="Guias de recolhimento"
          value={tmplGuia}
          onChange={setTmplGuia}
          defaultValue={DEFAULT_TEMPLATE_GUIA}
          vars={VARS_GUIA}
        />

        <TemplateEditor
          label="Documentos"
          value={tmplDoc}
          onChange={setTmplDoc}
          defaultValue={DEFAULT_TEMPLATE_DOCUMENTO}
          vars={VARS_DOCUMENTO}
        />

        <div className="flex justify-end">
          <Button size="sm" onClick={handleSalvarTemplates} disabled={salvando} className="gap-1.5">
            {salvando && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Salvar templates
          </Button>
        </div>
      </div>

      {/* Modal de conexão */}
      <Dialog open={modalAberto} onOpenChange={handleFecharModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-green-600" />
              Conectar WhatsApp
            </DialogTitle>
          </DialogHeader>

          {status === 'connected' ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-950">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <p className="font-semibold text-green-700 dark:text-green-400">WhatsApp conectado!</p>
              {phone && (
                <div className="flex items-center gap-1.5">
                  <p className="text-sm text-muted-foreground font-mono">
                    {mostrarTelefone ? `+${phone}` : mascaraTelefone(phone)}
                  </p>
                  <button
                    type="button"
                    onClick={() => setMostrarTelefone(v => !v)}
                    className="text-muted-foreground hover:text-foreground"
                    title={mostrarTelefone ? 'Ocultar número' : 'Revelar número'}
                  >
                    {mostrarTelefone
                      ? <EyeOff className="h-3.5 w-3.5" />
                      : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Fechando automaticamente em {countdown}s...
              </p>
            </div>
          ) : (
            <div className="space-y-5 py-1">
              <ol className="space-y-2">
                {INSTRUCOES.map(({ texto }, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {i + 1}
                    </span>
                    <span className="text-muted-foreground leading-5">{texto}</span>
                  </li>
                ))}
              </ol>

              <div className="flex flex-col items-center gap-3 rounded-lg border bg-muted/30 p-4">
                {qr ? (
                  <img
                    src={qr}
                    alt="QR Code WhatsApp"
                    className="w-52 h-52 rounded-lg"
                  />
                ) : (
                  <div className="flex h-52 w-52 items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Gerando QR Code...
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  O QR Code é atualizado automaticamente.
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
