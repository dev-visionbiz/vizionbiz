import { useState, useEffect } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Download, Loader2, FileX, X, Info, CheckCircle2, Copy } from 'lucide-react'
import { storageService } from '@/lib/storage'
import { contarPaginasPDF } from '@/lib/pdfExtractor'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'
import type { GuiaRecolhimento } from '@/domain/types'

interface Props {
  guia: GuiaRecolhimento
  arquivoKey: string
  titulo: string
  open: boolean
  onClose: () => void
}

export function VisualizarGuiaPDFDialog({ guia, arquivoKey, titulo, open, onClose }: Props) {
  const { toast } = useToast()
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState(false)
  const [numPaginas, setNumPaginas] = useState(1)
  const [detalhesAbertos, setDetalhesAbertos] = useState(false)

  const valorTotal = guia.valor + (guia.valor_multa ?? 0) + (guia.valor_juros ?? 0)
  const temPagamento = !!(guia.pix_copia_cola || guia.linha_digitavel || guia.codigo_barras)

  useEffect(() => {
    if (!open || !arquivoKey) return

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
  }, [open, arquivoKey])

  useEffect(() => {
    if (!open && blobUrl) {
      URL.revokeObjectURL(blobUrl)
      setBlobUrl(null)
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  function baixar() {
    if (!blobUrl) return
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = titulo.endsWith('.pdf') ? titulo : `${titulo}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  function copiar(text: string, label: string) {
    navigator.clipboard.writeText(text)
    toast({ title: `${label} copiado!` })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl w-full h-[90vh] flex flex-col gap-0 p-0 overflow-hidden [&>button.absolute]:hidden">

        {/* Header */}
        <DialogHeader className="flex-row items-center px-3 py-2 border-b shrink-0 gap-2">
          <DialogTitle className="flex-1 min-w-0 truncate text-sm font-medium">{titulo}</DialogTitle>
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
              <span className="hidden sm:inline">Baixar PDF</span>
            </Button>
          )}
          <DialogClose className="h-8 w-8 flex items-center justify-center rounded-sm opacity-70 hover:opacity-100 transition-opacity shrink-0">
            <X className="h-4 w-4" />
            <span className="sr-only">Fechar</span>
          </DialogClose>
        </DialogHeader>

        {/* PDF */}
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
              <p className="text-sm">Arquivo não encontrado ou indisponível.</p>
              <p className="text-xs opacity-60">O arquivo pode ter sido removido ou o espaço local está cheio.</p>
            </div>
          )}
          {blobUrl && !carregando && (
            <iframe
              src={`${blobUrl}#zoom=page-width${numPaginas === 1 ? '&navpanes=0' : ''}`}
              className="w-full h-full border-0"
              title={titulo}
            />
          )}
        </div>

        {/* Painel de detalhes (expansível na base) */}
        {detalhesAbertos && (
          <div className="shrink-0 border-t bg-background px-4 pt-3 pb-3 space-y-2.5">
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Competência</p>
                <p className="font-medium mt-0.5">{guia.competencia}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Vencimento</p>
                <p className={cn('font-medium mt-0.5', guia.status === 'vencida' && 'text-red-600')}>
                  {formatDate(guia.vencimento)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Valor total</p>
                <p className="font-semibold mt-0.5">{formatCurrency(valorTotal)}</p>
              </div>
            </div>

            {guia.status === 'paga' && guia.pago_em && (
              <div className="flex items-center gap-1.5 text-green-700 text-xs">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                Pago em {formatDate(guia.pago_em)}
                {guia.pago_valor && ` · ${formatCurrency(guia.pago_valor)}`}
              </div>
            )}

            {temPagamento && (
              <div className="border-t pt-2.5 space-y-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Formas de pagamento
                </p>

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

                {(guia.linha_digitavel || guia.codigo_barras) && (
                  <div className="space-y-1.5">
                    <span className="inline-flex items-center text-[10px] font-bold bg-muted text-muted-foreground px-1.5 py-0.5 rounded uppercase tracking-wide">
                      Boleto
                    </span>
                    {guia.linha_digitavel && (
                      <CodigoPagamento
                        label="Linha Digitável"
                        valor={guia.linha_digitavel}
                        onCopiar={() => copiar(guia.linha_digitavel!, 'Linha digitável')}
                        mono
                      />
                    )}
                    {guia.codigo_barras && (
                      <CodigoPagamento
                        label="Código de Barras"
                        valor={guia.codigo_barras}
                        onCopiar={() => copiar(guia.codigo_barras!, 'Código de barras')}
                        mono
                      />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

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
          destaque ? 'text-green-700 hover:bg-green-100' : 'text-muted-foreground hover:bg-accent',
        )}
        title={`Copiar ${label}`}
      >
        <Copy className="h-4 w-4" />
      </button>
    </div>
  )
}
