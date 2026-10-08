import { useEffect, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'
import { usePortalAcesso } from '@/data/hooks/usePortalAcesso'
import {
  useGuiasByCliente,
  useEnviarComprovanteGuia,
  useSolicitarSegundaVia,
  derivarStatusGuia,
} from '@/data/hooks/useGuias'
import { useToast } from '@/components/ui/use-toast'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose,
} from '@/components/ui/dialog'
import {
  FileBarChart2, Upload, CheckCircle2, AlertCircle, Clock, X,
  Download, FileText, Loader2, Info, Copy, FileX,
} from 'lucide-react'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { storageService } from '@/lib/storage'
import { contarPaginasPDF } from '@/lib/pdfExtractor'
import type { GuiaRecolhimento, GuiaStatus } from '@/domain/types'
import { TIPO_GUIA_CONFIG, SEGUNDA_VIA_CONFIG } from '../escritorio/Guias/guiasConfig'

type FiltroTab = 'todas' | 'pendentes' | 'pagas'

const STATUS_CONFIG: Record<GuiaStatus, { label: string; className: string; icon: React.ElementType }> = {
  aguardando_emissao: { label: 'Ag. EmissÃ£o',   className: 'bg-zinc-100 text-zinc-600',     icon: Clock },
  emitida:            { label: 'Emitida',        className: 'bg-blue-100 text-blue-700',     icon: FileBarChart2 },
  paga:               { label: 'Paga',           className: 'bg-green-100 text-green-700',   icon: CheckCircle2 },
  vencida:            { label: 'Vencida',        className: 'bg-red-100 text-red-700',       icon: AlertCircle },
  cancelada:          { label: 'Cancelada',      className: 'bg-zinc-100 text-zinc-500',     icon: X },
  em_retificacao:     { label: 'Em RetificaÃ§Ã£o', className: 'bg-orange-100 text-orange-700', icon: Clock },
}

// â”€â”€â”€ PDF Viewer com aÃ§Ãµes integradas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function GuiaPDFDialog({
  guia,
  tenantId,
  clienteId,
  arquivoKey,
  onClose,
}: {
  guia: GuiaRecolhimento
  tenantId: string
  clienteId: string
  arquivoKey: string
  onClose: () => void
}) {
  const { toast } = useToast()
  const enviarComprovante = useEnviarComprovanteGuia()
  const solicitarSegundaVia = useSolicitarSegundaVia()
  const fileRef = useRef<HTMLInputElement>(null)

  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState(false)
  const [detalhesAbertos, setDetalhesAbertos] = useState(false)
  const [uploadando, setUploadando] = useState(false)
  const [numPaginas, setNumPaginas] = useState(1)

  const cfg = TIPO_GUIA_CONFIG[guia.tipo]
  const statusCfg = STATUS_CONFIG[guia.status]
  const StatusIcon = statusCfg.icon

  const podeEnviarComprovante = guia.status === 'emitida' || guia.status === 'vencida'
  const podeSolicitarSegundaVia =
    guia.status !== 'cancelada' &&
    guia.status !== 'aguardando_emissao' &&
    guia.segunda_via_status === 'nao_solicitada'
  const valorTotal = guia.valor + (guia.valor_multa ?? 0) + (guia.valor_juros ?? 0)

  useEffect(() => {
    let objectUrl: string | null = null
    setCarregando(true)
    setErro(false)
    setBlobUrl(null)
    setNumPaginas(1)

    storageService
      .gerarUrlDownload(arquivoKey, 300)
      .then(async (url) => {
        const res = await fetch(url)
        const blob = await res.blob()
        // Conta pÃ¡ginas antes de criar URL para definir parÃ¢metros do viewer
        const n = await contarPaginasPDF(blob)
        setNumPaginas(n)
        objectUrl = URL.createObjectURL(blob)
        setBlobUrl(objectUrl)
      })
      .catch(() => setErro(true))
      .finally(() => setCarregando(false))

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [arquivoKey])

  function baixar() {
    if (!blobUrl) return
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = `guia-${guia.descricao}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  function copiar(text: string, label: string) {
    navigator.clipboard.writeText(text)
    toast({ title: `${label} copiado!` })
  }

  async function handleEnviarComprovante(file: File) {
    setUploadando(true)
    try {
      const { key } = await storageService.salvar(file, { escritorioId: tenantId, clienteId })
      await enviarComprovante.mutateAsync({ id: guia.id, comprovante_storage_key: key })
      toast({ title: 'Comprovante enviado!', description: 'O escritÃ³rio foi notificado.' })
    } catch {
      toast({ title: 'Erro ao enviar comprovante', variant: 'destructive' })
    } finally {
      setUploadando(false)
    }
  }

  async function handleSolicitarSegundaVia() {
    try {
      await solicitarSegundaVia.mutateAsync({ id: guia.id })
      toast({ title: '2Âª via solicitada!', description: 'O escritÃ³rio irÃ¡ disponibilizar em breve.' })
    } catch {
      toast({ title: 'Erro ao solicitar 2Âª via', variant: 'destructive' })
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      {/* [&>button.absolute]:hidden oculta o DialogClose padrÃ£o do shadcn/ui */}
      <DialogContent className="max-w-4xl w-full h-[95dvh] flex flex-col gap-0 p-0 overflow-hidden [&>button.absolute]:hidden">

        {/* Header â€” todos os botÃµes alinhados, sem sobreposiÃ§Ã£o */}
        <DialogHeader className="flex-row items-center shrink-0 px-3 py-2 border-b gap-1.5">
          <div className={cn('h-7 w-7 rounded shrink-0 flex items-center justify-center', cfg.cor)}>
            <cfg.icon className={cn('h-3.5 w-3.5', cfg.corTexto)} />
          </div>
          <DialogTitle className="flex-1 min-w-0 text-sm font-medium truncate">{guia.descricao}</DialogTitle>
          <Badge className={cn('text-xs border-transparent shrink-0 hidden sm:flex', statusCfg.className)}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {statusCfg.label}
          </Badge>
          <Button
            variant={detalhesAbertos ? 'secondary' : 'outline'}
            size="sm"
            className="gap-1.5 text-xs h-8 shrink-0"
            onClick={() => setDetalhesAbertos((v) => !v)}
          >
            <Info className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Detalhes</span>
          </Button>
          {blobUrl && (
            <Button variant="outline" size="sm" onClick={baixar} className="gap-1.5 text-xs h-8 shrink-0">
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Baixar</span>
            </Button>
          )}
          <DialogClose className="h-8 w-8 flex items-center justify-center rounded-sm opacity-70 hover:opacity-100 transition-opacity shrink-0">
            <X className="h-4 w-4" />
            <span className="sr-only">Fechar</span>
          </DialogClose>
        </DialogHeader>

        {/* PDF â€” sidebar oculta para 1 pÃ¡gina, zoom para largura */}
        <div className="flex-1 min-h-0 bg-zinc-100 dark:bg-zinc-900">
          {carregando && (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p className="text-sm">Carregando documento...</p>
            </div>
          )}
          {erro && !carregando && (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <FileX className="h-12 w-12 opacity-40" />
              <p className="text-sm">Arquivo nÃ£o encontrado.</p>
            </div>
          )}
          {blobUrl && !carregando && (
            <iframe
              src={`${blobUrl}#zoom=page-width${numPaginas === 1 ? '&navpanes=0' : ''}`}
              className="w-full h-full border-0"
              title={guia.descricao}
            />
          )}
        </div>

        {/* Bottom action bar */}
        <div className="shrink-0 border-t bg-background">

          {/* Detalhes (expansÃ­vel) */}
          {detalhesAbertos && (
            <div className="px-4 pt-3 pb-0 space-y-2.5 border-b">
              <div className="flex items-center justify-between -mt-0.5 mb-1">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Detalhes da guia</span>
                <button
                  onClick={() => setDetalhesAbertos(false)}
                  className="h-5 w-5 flex items-center justify-center rounded opacity-60 hover:opacity-100 hover:bg-accent transition-opacity"
                  title="Fechar detalhes"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">CompetÃªncia</p>
                  <p className="font-medium mt-0.5">{guia.competencia}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Vencimento</p>
                  <p className={cn('font-medium mt-0.5', guia.status === 'vencida' && 'text-red-600')}>
                    {formatDate(guia.vencimento)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Valor</p>
                  <p className="font-semibold mt-0.5">{formatCurrency(valorTotal)}</p>
                </div>
              </div>

              {guia.status === 'paga' && guia.pago_em && (
                <div className="flex items-center gap-1.5 text-green-700 text-xs pb-1">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  Pago em {formatDate(guia.pago_em)}
                  {guia.pago_valor && ` Â· ${formatCurrency(guia.pago_valor)}`}
                </div>
              )}

              {/* CÃ³digos de pagamento â€” o que o cliente precisa para pagar */}
              {(guia.pix_copia_cola || guia.linha_digitavel || guia.codigo_barras) && (
                <div className="border-t pt-2 space-y-3 pb-1">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Formas de pagamento
                  </p>

                  {/* PIX */}
                  {guia.pix_copia_cola && (
                    <div className="space-y-1.5">
                      <span className="inline-flex items-center text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded uppercase tracking-wide">
                        PIX
                      </span>
                      <CodigoPagamento
                        label="Copia e Cola"
                        valor={guia.pix_copia_cola}
                        onCopiar={() => copiar(guia.pix_copia_cola!, 'PIX Copia e Cola')}
                        destaque
                      />
                    </div>
                  )}

                  {/* Boleto */}
                  {(guia.linha_digitavel || guia.codigo_barras) && (
                    <div className="space-y-1.5">
                      <span className="inline-flex items-center text-[10px] font-bold bg-muted text-muted-foreground px-1.5 py-0.5 rounded uppercase tracking-wide">
                        Boleto
                      </span>
                      {guia.linha_digitavel && (
                        <CodigoPagamento
                          label="Linha DigitÃ¡vel"
                          valor={guia.linha_digitavel}
                          onCopiar={() => copiar(guia.linha_digitavel!, 'Linha digitÃ¡vel')}
                          mono
                        />
                      )}
                      {guia.codigo_barras && (
                        <CodigoPagamento
                          label="CÃ³digo de Barras"
                          valor={guia.codigo_barras}
                          onCopiar={() => copiar(guia.codigo_barras!, 'CÃ³digo de barras')}
                          mono
                        />
                      )}
                    </div>
                  )}
                </div>
              )}

              {guia.segunda_via_status !== 'nao_solicitada' && guia.segunda_via_arquivo_key && (
                <div className="pb-1 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">2Âª via disponÃ­vel</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1.5"
                    onClick={async () => {
                      try {
                        const url = await storageService.gerarUrlDownload(guia.segunda_via_arquivo_key!, 120)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = `segunda-via-${guia.descricao}.pdf`
                        a.click()
                      } catch {
                        toast({ title: 'Arquivo nÃ£o disponÃ­vel', variant: 'destructive' })
                      }
                    }}
                  >
                    <Download className="h-3 w-3" />
                    Baixar 2Âª via
                  </Button>
                </div>
              )}

              <div className="h-1" />
            </div>
          )}

          {/* BotÃµes de aÃ§Ã£o */}
          <div className="flex flex-wrap gap-2 px-4 py-3">
            {podeEnviarComprovante && (
              <>
                {guia.comprovante_storage_key ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs text-green-700 border-green-300 hover:bg-green-50"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploadando}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Comprovante enviado Â· Substituir
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploadando}
                  >
                    {uploadando
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Upload className="h-3.5 w-3.5" />
                    }
                    {uploadando ? 'Enviando...' : 'Enviar comprovante'}
                  </Button>
                )}
              </>
            )}

            {guia.segunda_via_status === 'solicitada' && (
              <Button variant="outline" size="sm" className="gap-1.5 text-xs text-amber-600 border-amber-300" disabled>
                <Clock className="h-3.5 w-3.5" />
                2Âª via solicitada
              </Button>
            )}

            {podeSolicitarSegundaVia && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={handleSolicitarSegundaVia}
                disabled={solicitarSegundaVia.isPending}
              >
                {solicitarSegundaVia.isPending
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <FileText className="h-3.5 w-3.5" />
                }
                Solicitar 2Âª via
              </Button>
            )}
          </div>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleEnviarComprovante(f)
            e.target.value = ''
          }}
        />
      </DialogContent>
    </Dialog>
  )
}

// â”€â”€â”€ Componente de cÃ³digo copiÃ¡vel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function CodigoPagamento({
  label, valor, onCopiar, mono, destaque,
}: {
  label: string
  valor: string
  onCopiar: () => void
  mono?: boolean
  destaque?: boolean
}) {
  return (
    <div className={cn(
      'rounded-lg px-3 py-2 flex items-start gap-2',
      destaque ? 'bg-green-50 border border-green-200' : 'bg-muted/40 border border-border',
    )}>
      <div className="flex-1 min-w-0">
        <p className={cn('text-[10px] font-semibold mb-0.5', destaque ? 'text-green-700' : 'text-muted-foreground')}>
          {label}
        </p>
        <p className={cn('text-xs break-all leading-relaxed', mono && 'font-mono', destaque && 'text-green-900')}>
          {valor}
        </p>
      </div>
      <button
        onClick={onCopiar}
        className={cn(
          'shrink-0 mt-0.5 p-1.5 rounded transition-colors',
          destaque
            ? 'text-green-700 hover:bg-green-100'
            : 'text-muted-foreground hover:bg-accent',
        )}
        title={`Copiar ${label}`}
      >
        <Copy className="h-4 w-4" />
      </button>
    </div>
  )
}

// â”€â”€â”€ Dialog de detalhe (sem PDF) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function GuiaInfoDialog({
  guia,
  tenantId,
  clienteId,
  onClose,
}: {
  guia: GuiaRecolhimento
  tenantId: string
  clienteId: string
  onClose: () => void
}) {
  const { toast } = useToast()
  const enviarComprovante = useEnviarComprovanteGuia()
  const solicitarSegundaVia = useSolicitarSegundaVia()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploadando, setUploadando] = useState(false)

  const cfg = TIPO_GUIA_CONFIG[guia.tipo]
  const statusCfg = STATUS_CONFIG[guia.status]
  const StatusIcon = statusCfg.icon
  const podeEnviarComprovante = guia.status === 'emitida' || guia.status === 'vencida'
  const podeSolicitarSegundaVia =
    guia.status !== 'cancelada' &&
    guia.status !== 'aguardando_emissao' &&
    guia.segunda_via_status === 'nao_solicitada'
  const valorTotal = guia.valor + (guia.valor_multa ?? 0) + (guia.valor_juros ?? 0)

  async function handleEnviarComprovante(file: File) {
    setUploadando(true)
    try {
      const { key } = await storageService.salvar(file, { escritorioId: tenantId, clienteId })
      await enviarComprovante.mutateAsync({ id: guia.id, comprovante_storage_key: key })
      toast({ title: 'Comprovante enviado!', description: 'O escritÃ³rio foi notificado.' })
    } catch {
      toast({ title: 'Erro ao enviar comprovante', variant: 'destructive' })
    } finally {
      setUploadando(false)
    }
  }

  async function handleSolicitarSegundaVia() {
    try {
      await solicitarSegundaVia.mutateAsync({ id: guia.id })
      toast({ title: '2Âª via solicitada!', description: 'O escritÃ³rio irÃ¡ disponibilizar em breve.' })
    } catch {
      toast({ title: 'Erro ao solicitar 2Âª via', variant: 'destructive' })
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            <div className={cn('h-8 w-8 rounded-md flex items-center justify-center shrink-0', cfg.cor)}>
              <cfg.icon className={cn('h-4 w-4', cfg.corTexto)} />
            </div>
            <div className="min-w-0">
              <p className="font-semibold truncate">{guia.descricao}</p>
              <p className="text-xs text-muted-foreground font-normal">{cfg.label}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Badge className={cn('w-fit text-xs border-transparent', statusCfg.className)}>
          <StatusIcon className="h-3 w-3 mr-1" />
          {statusCfg.label}
        </Badge>

        <div className="grid grid-cols-3 gap-3 rounded-lg border bg-muted/20 p-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">CompetÃªncia</p>
            <p className="font-medium mt-0.5">{guia.competencia}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Vencimento</p>
            <p className={cn('font-medium mt-0.5', guia.status === 'vencida' && 'text-red-600')}>
              {formatDate(guia.vencimento)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Valor</p>
            <p className="font-semibold mt-0.5">{formatCurrency(valorTotal)}</p>
          </div>
        </div>

        {guia.status === 'paga' && guia.pago_em && (
          <div className="rounded-lg border border-green-200 bg-green-50/50 px-3 py-2.5 flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
            <div>
              <p className="font-medium text-green-800">Pago em {formatDate(guia.pago_em)}</p>
              {guia.pago_valor && <p className="text-xs text-green-700">{formatCurrency(guia.pago_valor)}</p>}
            </div>
          </div>
        )}

        <div className="rounded-lg border p-4 flex flex-col items-center gap-2 text-center">
          <FileText className="h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            Documento ainda nÃ£o disponÃ­vel.<br />Aguarde o escritÃ³rio.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          {podeEnviarComprovante && (
            <Button
              className="w-full gap-2"
              variant={guia.comprovante_storage_key ? 'outline' : 'default'}
              onClick={() => fileRef.current?.click()}
              disabled={uploadando}
            >
              {uploadando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {guia.comprovante_storage_key
                ? (uploadando ? 'Enviando...' : 'Substituir comprovante')
                : (uploadando ? 'Enviando...' : 'Enviar comprovante')}
            </Button>
          )}

          {guia.segunda_via_status === 'solicitada' && (
            <Button variant="outline" className="w-full gap-2 text-amber-600 border-amber-300" disabled>
              <Clock className="h-4 w-4" />
              2Âª via solicitada â€” aguardando
            </Button>
          )}

          {guia.segunda_via_arquivo_key && (
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={async () => {
                try {
                  const url = await storageService.gerarUrlDownload(guia.segunda_via_arquivo_key!, 120)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `segunda-via-${guia.descricao}.pdf`
                  a.click()
                } catch {
                  toast({ title: 'Arquivo nÃ£o disponÃ­vel', variant: 'destructive' })
                }
              }}
            >
              <Download className="h-4 w-4" />
              Baixar 2Âª via
            </Button>
          )}

          {podeSolicitarSegundaVia && (
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={handleSolicitarSegundaVia}
              disabled={solicitarSegundaVia.isPending}
            >
              {solicitarSegundaVia.isPending
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <FileText className="h-4 w-4" />}
              {solicitarSegundaVia.isPending ? 'Solicitando...' : 'Solicitar 2Âª via'}
            </Button>
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleEnviarComprovante(f)
            e.target.value = ''
          }}
        />
      </DialogContent>
    </Dialog>
  )
}

// â”€â”€â”€ Card da guia â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function GuiaCard({
  guia,
  onClick,
}: {
  guia: GuiaRecolhimento
  onClick: () => void
}) {
  const cfg = TIPO_GUIA_CONFIG[guia.tipo]
  const statusCfg = STATUS_CONFIG[guia.status]
  const StatusIcon = statusCfg.icon
  const temPDF = !!guia.arquivo_key

  return (
    <div
      onClick={onClick}
      className="rounded-lg border bg-card overflow-hidden cursor-pointer hover:shadow-sm transition-all active:scale-[0.99]"
    >
      <div className="px-4 py-3 flex items-start gap-3">
        <div className={cn('h-8 w-8 rounded-md flex items-center justify-center shrink-0 mt-0.5', cfg.cor)}>
          <cfg.icon className={cn('h-4 w-4', cfg.corTexto)} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
            <span className={cn('text-xs font-semibold px-1.5 py-0.5 rounded', cfg.cor, cfg.corTexto)}>
              {cfg.labelCurto}
            </span>
            <Badge className={cn('text-xs border-transparent', statusCfg.className)}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {statusCfg.label}
            </Badge>
          </div>
          <p className="text-sm font-medium truncate">{guia.descricao}</p>
          <div className="flex flex-wrap gap-x-3 mt-0.5 text-xs text-muted-foreground">
            <span>{guia.competencia}</span>
            <span>Venc. {formatDate(guia.vencimento)}</span>
          </div>
        </div>

        <div className="shrink-0 text-right mt-0.5">
          <p className="font-semibold text-sm">{formatCurrency(guia.valor)}</p>
          {guia.pago_em && (
            <p className="text-xs text-green-600 mt-0.5">Pago {formatDate(guia.pago_em)}</p>
          )}
        </div>
      </div>

      {/* CTA principal */}
      {(temPDF || (guia.status !== 'cancelada' && guia.status !== 'paga')) && (
        <div className="px-4 pb-3 flex justify-end">
          {temPDF ? (
            <div className="bg-green-500 hover:bg-green-600 text-white rounded-lg px-5 py-2 text-sm font-semibold transition-colors select-none">
              Emitir
            </div>
          ) : (
            <div className="bg-muted text-muted-foreground rounded-lg px-4 py-1.5 text-xs select-none">
              Aguardando emissÃ£o
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// â”€â”€â”€ PÃ¡gina â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function PortalGuias() {
  const { currentUser } = useAuth()
  const { secoesPermitidas } = usePortalAcesso()

  const tenantId = currentUser?.tenant_id ?? ''
  const clienteId = currentUser?.client_id ?? ''

  const { data: guiasRaw = [], isLoading } = useGuiasByCliente(tenantId, clienteId)
  const guias = guiasRaw.map(derivarStatusGuia)

  const [filtro, setFiltro] = useState<FiltroTab>('todas')
  const [guiaSelecionada, setGuiaSelecionada] = useState<GuiaRecolhimento | null>(null)

  if (!secoesPermitidas.includes('guias')) {
    return <Navigate to="/portal/inicio" replace />
  }

  if (isLoading) return <PageLoader />

  const guiasFiltradas = guias.filter((g) => {
    if (filtro === 'pendentes') return g.status === 'emitida' || g.status === 'vencida'
    if (filtro === 'pagas') return g.status === 'paga'
    return true
  })

  const totalPendente = guias.filter((g) => g.status === 'emitida' || g.status === 'vencida').length
  const totalVencida = guias.filter((g) => g.status === 'vencida').length

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Guias e Recolhimentos</h2>
        <p className="text-sm text-muted-foreground">
          Visualize, baixe e envie comprovantes das suas guias.
        </p>
      </div>

      {totalVencida > 0 && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>
            {totalVencida === 1 ? '1 guia estÃ¡ vencida.' : `${totalVencida} guias estÃ£o vencidas.`}
            {' '}Entre em contato com o escritÃ³rio.
          </span>
        </div>
      )}

      <div className="flex gap-1 bg-muted/50 p-1 rounded-lg w-fit">
        {(
          [
            { key: 'todas',     label: 'Todas' },
            { key: 'pendentes', label: `Pendentes${totalPendente > 0 ? ` (${totalPendente})` : ''}` },
            { key: 'pagas',     label: 'Pagas' },
          ] as { key: FiltroTab; label: string }[]
        ).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFiltro(key)}
            className={cn(
              'px-3 py-1.5 text-sm rounded-md font-medium transition-colors',
              filtro === key
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {guiasFiltradas.length === 0 ? (
        <EmptyState
          icon={FileBarChart2}
          title={
            filtro === 'todas' ? 'Nenhuma guia' :
            filtro === 'pendentes' ? 'Nenhuma guia pendente' :
            'Nenhuma guia paga'
          }
          description={
            filtro === 'todas'
              ? 'Seu escritÃ³rio ainda nÃ£o emitiu guias para sua empresa.'
              : undefined
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {guiasFiltradas.map((g) => (
            <GuiaCard key={g.id} guia={g} onClick={() => setGuiaSelecionada(g)} />
          ))}
        </div>
      )}

      {guiaSelecionada && (
        guiaSelecionada.arquivo_key ? (
          <GuiaPDFDialog
            guia={guiaSelecionada}
            tenantId={tenantId}
            clienteId={clienteId}
            arquivoKey={guiaSelecionada.arquivo_key}
            onClose={() => setGuiaSelecionada(null)}
          />
        ) : (
          <GuiaInfoDialog
            guia={guiaSelecionada}
            tenantId={tenantId}
            clienteId={clienteId}
            onClose={() => setGuiaSelecionada(null)}
          />
        )
      )}

      <div className="h-16 rounded-xl border border-dashed border-border/40 bg-muted/20" />
    </div>
  )
}
