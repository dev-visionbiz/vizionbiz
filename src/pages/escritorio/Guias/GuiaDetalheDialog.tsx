import { useState, useRef } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useUpdateGuia, useCancelarGuia } from '@/data/hooks/useGuias'
import { storageService } from '@/lib/storage'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import type { GuiaRecolhimento } from '@/domain/types'
import { TIPO_GUIA_CONFIG, STATUS_GUIA_CONFIG } from './guiasConfig'
import {
  CheckCircle2, FileText, Pencil, X, Download,
  Eye, Upload, Loader2, ChevronDown, ChevronUp, Copy,
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { VisualizarGuiaPDFDialog } from './VisualizarGuiaPDFDialog'

interface Props {
  guia: GuiaRecolhimento
  tenantId: string
  open: boolean
  onClose: () => void
  nomeCliente: string
  onBaixar: () => void
  onEditar: () => void
  onSegundaVia: () => void
  onBaixarArquivo: (key: string, nome: string) => void
}

export function GuiaDetalheDialog({
  guia, tenantId, open, onClose, nomeCliente,
  onBaixar, onEditar, onSegundaVia, onBaixarArquivo,
}: Props) {
  const tipoConfig = TIPO_GUIA_CONFIG[guia.tipo]
  const statusConfig = STATUS_GUIA_CONFIG[guia.status]
  const TipoIcon = tipoConfig.icon
  const { toast } = useToast()
  const { mutate: cancelar, isPending: cancelando } = useCancelarGuia()
  const { mutateAsync: updateGuia } = useUpdateGuia()

  const [verPDF, setVerPDF] = useState(false)
  const [verPDFKey, setVerPDFKey] = useState<string>('')
  const [uploadando, setUploadando] = useState(false)
  const [detalhesAbertos, setDetalhesAbertos] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const valorTotal = guia.valor + (guia.valor_multa ?? 0) + (guia.valor_juros ?? 0)
  const temEncargos = !!(guia.valor_multa || guia.valor_juros)
  const podeBaixar = guia.status === 'emitida' || guia.status === 'vencida'
  const podeEditar = guia.status !== 'paga' && guia.status !== 'cancelada'
  const podeSegundaVia = guia.status !== 'cancelada' && guia.status !== 'aguardando_emissao'
  const podeCancelar = guia.status !== 'paga' && guia.status !== 'cancelada'

  const arquivoGuia = guia.arquivo_key
  const arquivoComprovante = guia.comprovante_storage_key
  const arquivoSegundaVia = guia.segunda_via_arquivo_key

  const temDadosTecnicos = !!(
    guia.pix_copia_cola || guia.codigo_barras || guia.linha_digitavel ||
    guia.numero_documento || guia.codigo_receita || guia.periodo_apuracao ||
    guia.numero_referencia
  )

  function abrirPDF(key: string) {
    setVerPDFKey(key)
    setVerPDF(true)
  }

  function copiar(text: string, label: string) {
    navigator.clipboard.writeText(text)
    toast({ title: `${label} copiado!` })
  }

  function handleCancelar() {
    if (!confirm('Cancelar esta guia? Esta ação não pode ser desfeita.')) return
    cancelar(guia.id, {
      onSuccess: () => { toast({ title: 'Guia cancelada.' }); onClose() },
    })
  }

  async function handleAnexarArquivo(file: File) {
    setUploadando(true)
    try {
      const { key } = await storageService.salvar(file, {
        escritorioId: tenantId,
        clienteId: guia.cliente_id,
      })
      await updateGuia({ id: guia.id, data: { arquivo_key: key } })
      toast({ title: 'Arquivo anexado com sucesso!' })
    } catch (e) {
      toast({ title: 'Erro ao anexar arquivo', description: String(e), variant: 'destructive' })
    } finally {
      setUploadando(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-md max-h-[92vh] overflow-y-auto">

          {/* Header */}
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <div className={cn('h-8 w-8 rounded-md flex items-center justify-center shrink-0', tipoConfig.cor)}>
                <TipoIcon className={cn('h-4 w-4', tipoConfig.corTexto)} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-base leading-tight truncate">{guia.descricao}</p>
                <p className="text-xs text-muted-foreground font-normal truncate">{nomeCliente}</p>
              </div>
            </DialogTitle>
          </DialogHeader>

          {/* Status */}
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline" className={cn('text-xs', tipoConfig.cor, tipoConfig.corTexto, tipoConfig.corBorda)}>
              {tipoConfig.label}
            </Badge>
            <Badge variant="outline" className={cn('text-xs', statusConfig.cor, statusConfig.corTexto)}>
              {statusConfig.label}
            </Badge>
          </div>

          {/* Dados principais — compactos */}
          <div className="grid grid-cols-3 gap-3 rounded-lg border bg-muted/20 p-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Competência</p>
              <p className="font-medium mt-0.5">{guia.competencia}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Vencimento</p>
              <p className={cn(
                'font-medium mt-0.5',
                guia.status === 'vencida' ? 'text-red-600' : '',
              )}>
                {formatDate(guia.vencimento)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{temEncargos ? 'Total' : 'Valor'}</p>
              <p className="font-semibold mt-0.5">{formatCurrency(valorTotal)}</p>
              {temEncargos && (
                <p className="text-xs text-red-500">
                  +{formatCurrency((guia.valor_multa ?? 0) + (guia.valor_juros ?? 0))} enc.
                </p>
              )}
            </div>
          </div>

          {/* ── Pagamento registrado ── */}
          {guia.status === 'paga' && guia.pago_em && (
            <div className="rounded-lg border border-green-200 bg-green-50/50 px-3 py-2.5 flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
              <div>
                <p className="font-medium text-green-800">Pago em {formatDate(guia.pago_em)}</p>
                {guia.pago_valor && (
                  <p className="text-xs text-green-700">{formatCurrency(guia.pago_valor)}</p>
                )}
              </div>
            </div>
          )}

          {/* ── Arquivo da guia (zona principal) ── */}
          <div className="rounded-lg border overflow-hidden">
            <div className="px-3 py-2 bg-muted/30 border-b">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Documento da Guia
              </p>
            </div>

            {arquivoGuia ? (
              <div className="p-3 flex gap-2">
                <Button
                  className="flex-1 gap-2"
                  onClick={() => abrirPDF(arquivoGuia)}
                >
                  <Eye className="h-4 w-4" />
                  Visualizar PDF
                </Button>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => onBaixarArquivo(arquivoGuia, `guia-${guia.descricao}.pdf`)}
                >
                  <Download className="h-4 w-4" />
                  Baixar
                </Button>
              </div>
            ) : (
              <div className="p-3 flex flex-col items-center gap-2 text-center py-5">
                <FileText className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Nenhum arquivo anexado</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadando}
                >
                  {uploadando
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Upload className="h-3.5 w-3.5" />
                  }
                  {uploadando ? 'Enviando...' : 'Anexar PDF da guia'}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleAnexarArquivo(f)
                    e.target.value = ''
                  }}
                />
              </div>
            )}
          </div>

          {/* ── Comprovante / Segunda via (se existirem) ── */}
          {(arquivoComprovante || arquivoSegundaVia) && (
            <div className="space-y-2">
              {arquivoComprovante && (
                <div className="rounded-lg border p-3 flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">Comprovante de pagamento</p>
                  <div className="flex gap-1.5 shrink-0">
                    <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs"
                      onClick={() => abrirPDF(arquivoComprovante)}>
                      <Eye className="h-3.5 w-3.5" /> Ver
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs"
                      onClick={() => onBaixarArquivo(arquivoComprovante, `comprovante-${guia.descricao}.pdf`)}>
                      <Download className="h-3.5 w-3.5" /> Baixar
                    </Button>
                  </div>
                </div>
              )}
              {arquivoSegundaVia && (
                <div className="rounded-lg border p-3 flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">Segunda via</p>
                  <div className="flex gap-1.5 shrink-0">
                    <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs"
                      onClick={() => abrirPDF(arquivoSegundaVia)}>
                      <Eye className="h-3.5 w-3.5" /> Ver
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs"
                      onClick={() => onBaixarArquivo(arquivoSegundaVia, `segunda-via-${guia.descricao}.pdf`)}>
                      <Download className="h-3.5 w-3.5" /> Baixar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Observações ── */}
          {guia.observacoes && (
            <div className="rounded-lg border p-3 text-sm">
              <p className="text-xs font-medium text-muted-foreground mb-1">Observações</p>
              <p className="text-foreground whitespace-pre-line">{guia.observacoes}</p>
            </div>
          )}

          {/* ── Dados técnicos (colapsável) ── */}
          {temDadosTecnicos && (
            <div className="rounded-lg border overflow-hidden">
              <button
                type="button"
                className="w-full flex items-center justify-between px-3 py-2.5 text-sm text-muted-foreground hover:bg-accent/40 transition-colors"
                onClick={() => setDetalhesAbertos((v) => !v)}
              >
                <span className="text-xs font-medium uppercase tracking-wide">Dados técnicos</span>
                {detalhesAbertos
                  ? <ChevronUp className="h-3.5 w-3.5" />
                  : <ChevronDown className="h-3.5 w-3.5" />
                }
              </button>
              {detalhesAbertos && (
                <div className="divide-y border-t text-sm">
                  {guia.pix_copia_cola && (
                    <TechRow label="PIX Copia e Cola" value={guia.pix_copia_cola}
                      onCopy={() => copiar(guia.pix_copia_cola!, 'PIX Copia e Cola')} />
                  )}
                  {guia.numero_documento && (
                    <TechRow label="Nº Documento" value={guia.numero_documento}
                      onCopy={() => copiar(guia.numero_documento!, 'Número')} />
                  )}
                  {guia.codigo_receita && (
                    <TechRow label="Código de Receita" value={guia.codigo_receita} />
                  )}
                  {guia.periodo_apuracao && (
                    <TechRow label="Período de Apuração" value={guia.periodo_apuracao} />
                  )}
                  {guia.numero_referencia && (
                    <TechRow label="Número de Referência" value={guia.numero_referencia} />
                  )}
                  {guia.linha_digitavel && (
                    <TechRow label="Linha Digitável" value={guia.linha_digitavel} mono
                      onCopy={() => copiar(guia.linha_digitavel!, 'Linha digitável')} />
                  )}
                  {guia.codigo_barras && (
                    <TechRow label="Cód. de Barras" value={guia.codigo_barras} mono
                      onCopy={() => copiar(guia.codigo_barras!, 'Código de barras')} />
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Ações ── */}
          <div className="flex flex-wrap gap-2 pt-1 border-t">
            {podeBaixar && (
              <Button onClick={onBaixar} className="gap-2 flex-1">
                <CheckCircle2 className="h-4 w-4" />
                Registrar Pagamento
              </Button>
            )}
            {podeEditar && (
              <Button variant="outline" onClick={onEditar} className="gap-2">
                <Pencil className="h-4 w-4" />
                Editar
              </Button>
            )}
            {podeSegundaVia && (
              <Button variant="outline" onClick={onSegundaVia} className="gap-2">
                <FileText className="h-4 w-4" />
                2ª via
              </Button>
            )}
            {podeCancelar && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive gap-1.5 ml-auto"
                onClick={handleCancelar}
                disabled={cancelando}
              >
                <X className="h-4 w-4" />
                Cancelar
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {verPDF && verPDFKey && (
        <VisualizarGuiaPDFDialog
          open={verPDF}
          onClose={() => { setVerPDF(false); setVerPDFKey('') }}
          guia={guia}
          arquivoKey={verPDFKey}
          titulo={guia.descricao}
        />
      )}
    </>
  )
}

function TechRow({
  label, value, mono, onCopy,
}: {
  label: string
  value: string
  mono?: boolean
  onCopy?: () => void
}) {
  return (
    <div className="px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2 mt-0.5">
        <span className={cn('flex-1 text-xs break-all', mono && 'font-mono')}>{value}</span>
        {onCopy && (
          <button
            onClick={onCopy}
            className="shrink-0 p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            title="Copiar"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}
