import { useState, useRef } from 'react'
import { format, parseISO, addMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ShieldAlert, AlertTriangle } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { useCreateObrigacaoLancamento, useUpdateObrigacaoLancamento } from '@/data/hooks/useObrigacoes'
import { useCreateGuia, useUpdateGuia } from '@/data/hooks/useGuias'
import { extrairTextoPDF, extrairCamposGuia, extrairPixDoQRCode } from '@/lib/pdfExtractor'
import { storageService } from '@/lib/storage'
import type { ObrigacaoConfig, ObrigacaoLancamento, ObrigacaoStatus } from '@/domain/types'
import type { Client } from '@/domain/types'

const TIPO_LABELS: Record<string, string> = {
  darf:               'DARF',
  darf_simples:       'DARF Simples',
  fgts:               'FGTS',
  gnre:               'GNRE',
  iss:                'ISS Municipal',
  dae:                'DAE',
  iptu:               'IPTU',
  bombeiros:          'Taxa de Bombeiros',
  vigilancia_sanitaria: 'Vigilância Sanitária',
  boleto_prefeitura:  'Boleto de Prefeitura',
}

type Row = {
  config: ObrigacaoConfig
  lancamento: ObrigacaoLancamento | null
  cliente: Client | undefined
  statusDisplay: ObrigacaoStatus
}

interface DasDados {
  valor?: number
  vencimento?: string
  codigo_barras?: string
  linha_digitavel?: string
  pix_copia_cola?: string
  tipoDetectado?: string
}

interface Props {
  row: Row
  competencia: string
  tenantId: string
  onClose: () => void
}

function formatCompetencia(comp: string): string {
  try {
    const d = parseISO(comp + '-01')
    const s = format(d, 'MMMM/yyyy', { locale: ptBR })
    return s.charAt(0).toUpperCase() + s.slice(1)
  } catch {
    return comp
  }
}

function parseCurrencyValue(value: string): number {
  return parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0
}

function formatCurrencyInput(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function defaultVencimento(competencia: string): string {
  try {
    const d = parseISO(competencia + '-01')
    const next = addMonths(d, 1)
    return format(new Date(next.getFullYear(), next.getMonth(), 20), 'yyyy-MM-dd')
  } catch {
    return ''
  }
}

async function parseDasPdf(file: File): Promise<Partial<DasDados>> {
  try {
    const [texto, pixQR] = await Promise.all([
      extrairTextoPDF(file),
      extrairPixDoQRCode(file),
    ])
    const campos = extrairCamposGuia(texto)

    const result: Partial<DasDados> = {}
    if (campos.tipo) result.tipoDetectado = campos.tipo
    if (campos.valor != null) result.valor = campos.valor
    if (campos.vencimento) result.vencimento = campos.vencimento
    if (campos.linha_digitavel) result.linha_digitavel = campos.linha_digitavel
    if (campos.codigo_barras) result.codigo_barras = campos.codigo_barras
    const pix = pixQR ?? campos.pix_copia_cola
    if (pix) result.pix_copia_cola = pix

    return result
  } catch {
    return {}
  }
}

export function DasModal({ row, competencia, tenantId, onClose }: Props) {
  const { toast } = useToast()
  const createLancamento = useCreateObrigacaoLancamento()
  const updateLancamento = useUpdateObrigacaoLancamento()
  const createGuia = useCreateGuia()
  const updateGuia = useUpdateGuia()
  const fileRef = useRef<HTMLInputElement>(null)

  const lancamento = row.lancamento

  const [valor, setValor] = useState(() =>
    lancamento?.das_valor != null ? formatCurrencyInput(lancamento.das_valor) : ''
  )
  const [vencimento, setVencimento] = useState(() =>
    lancamento?.das_vencimento ?? defaultVencimento(competencia)
  )
  const [codigoBarras, setCodigoBarras] = useState(lancamento?.codigo_barras ?? '')
  const [linhaDigitavel, setLinhaDigitavel] = useState('')
  const [pixCopiaECola, setPixCopiaECola] = useState('')
  const [protocolo, setProtocolo] = useState(lancamento?.protocolo ?? '')
  const [pdfLoading, setPdfLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [alertaDocumento, setAlertaDocumento] = useState<{ tipoDetectado: string; dados: Partial<DasDados> } | null>(null)
  const isReadonly = row.statusDisplay === 'transmitido'

  function aplicarDadosPdf(dados: Partial<DasDados>) {
    if (dados.valor != null) setValor(formatCurrencyInput(dados.valor))
    if (dados.vencimento) setVencimento(dados.vencimento)
    if (dados.linha_digitavel) setLinhaDigitavel(dados.linha_digitavel)
    if (dados.codigo_barras) setCodigoBarras(dados.codigo_barras)
    if (dados.pix_copia_cola) setPixCopiaECola(dados.pix_copia_cola)
    const extracted = [dados.valor, dados.vencimento, dados.linha_digitavel, dados.codigo_barras, dados.pix_copia_cola].filter(Boolean).length
    if (extracted > 0) {
      toast({ title: `PDF lido — ${extracted} campo${extracted !== 1 ? 's' : ''} preenchido${extracted !== 1 ? 's' : ''}` })
    } else {
      toast({ title: 'Nenhum dado reconhecido no PDF. Preencha manualmente.', variant: 'destructive' })
    }
  }

  async function handleLerPdf() {
    const file = fileRef.current?.files?.[0]
    if (!file) {
      toast({ title: 'Selecione um arquivo PDF primeiro', variant: 'destructive' })
      return
    }
    setPdfLoading(true)
    try {
      const dados = await parseDasPdf(file)
      // Documento identificado positivamente como algo diferente de DAS → rejeitar
      if (dados.tipoDetectado && dados.tipoDetectado !== 'das') {
        setAlertaDocumento({ tipoDetectado: dados.tipoDetectado, dados })
        return
      }
      aplicarDadosPdf(dados)
    } catch {
      toast({ title: 'Não foi possível ler o PDF. Preencha manualmente.', variant: 'destructive' })
    } finally {
      setPdfLoading(false)
    }
  }

  async function handleConfirmar() {
    const dasValor = parseCurrencyValue(valor)
    if (!dasValor || isNaN(dasValor) || dasValor <= 0) {
      toast({ title: 'Informe o valor do DAS', variant: 'destructive' })
      return
    }
    if (!vencimento) {
      toast({ title: 'Informe o vencimento', variant: 'destructive' })
      return
    }

    setLoading(true)
    try {
      const now = new Date().toISOString()
      const descricao = `DAS - Simples Nacional ${formatCompetencia(competencia)}`

      // Salva o PDF no storage se o usuário fez upload
      let pdfKey: string | undefined
      const pdfFile = fileRef.current?.files?.[0]
      if (pdfFile) {
        const { key } = await storageService.salvar(pdfFile, {
          escritorioId: tenantId,
          clienteId: row.config.client_id,
        })
        pdfKey = key
      }

      let guiaId = lancamento?.guia_id

      if (guiaId) {
        await updateGuia.mutateAsync({
          id: guiaId,
          data: {
            valor: dasValor,
            vencimento,
            codigo_barras: codigoBarras || undefined,
            linha_digitavel: linhaDigitavel || undefined,
            pix_copia_cola: pixCopiaECola || undefined,
            status: 'emitida',
            descricao,
            ...(pdfKey && { arquivo_key: pdfKey }),
          },
        })
      } else {
        const guia = await createGuia.mutateAsync({
          tenant_id: tenantId,
          cliente_id: row.config.client_id,
          tipo: 'das',
          descricao,
          competencia,
          vencimento,
          valor: dasValor,
          status: 'emitida',
          origem: 'simples_nacional',
          codigo_barras: codigoBarras || undefined,
          linha_digitavel: linhaDigitavel || undefined,
          pix_copia_cola: pixCopiaECola || undefined,
          arquivo_key: pdfKey,
          segunda_via_status: 'nao_solicitada',
          criado_em: now,
          criado_por: '',
        })
        guiaId = guia.id
      }

      const lancData = {
        das_valor: dasValor,
        das_vencimento: vencimento,
        data_declaracao: now,
        codigo_barras: codigoBarras || undefined,
        protocolo: protocolo || undefined,
        status: 'aberto' as ObrigacaoStatus,
        guia_id: guiaId,
        ...(pdfKey && { pdf_storage_key: pdfKey }),
      }

      if (!lancamento) {
        await createLancamento.mutateAsync({
          tenant_id: tenantId,
          client_id: row.config.client_id,
          tipo: row.config.tipo,
          competencia,
          faturamento: undefined,
          ...lancData,
          criado_em: now,
          atualizado_em: now,
        })
      } else {
        await updateLancamento.mutateAsync({ id: lancamento.id, data: lancData })
      }

      toast({ title: 'DAS confirmado e guia criada com sucesso' })
      onClose()
    } catch {
      toast({ title: 'Erro ao confirmar DAS', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  async function handleEnviar() {
    if (!lancamento) return
    setLoading(true)
    try {
      await updateLancamento.mutateAsync({
        id: lancamento.id,
        data: { status: 'transmitido', protocolo: protocolo || undefined },
      })
      toast({ title: 'Obrigação marcada como transmitida' })
      onClose()
    } catch {
      toast({ title: 'Erro ao transmitir', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const showEnviar = row.statusDisplay === 'aberto' || row.statusDisplay === 'recalcular'

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg flex flex-col" style={{ maxHeight: '90vh' }}>

        {/* ── Tela de rejeição de documento ── */}
        {alertaDocumento && (
          <div className="absolute inset-0 z-50 bg-background/97 rounded-lg flex flex-col items-center justify-center p-8 gap-5 text-center">
            <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
              <ShieldAlert className="h-8 w-8 text-red-600" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">Documento não reconhecido como DAS</h3>
              <p className="text-sm text-muted-foreground">
                Este arquivo foi identificado como{' '}
                <span className="font-semibold text-foreground">
                  {TIPO_LABELS[alertaDocumento.tipoDetectado] ?? alertaDocumento.tipoDetectado.toUpperCase()}
                </span>
                , não como DAS do Simples Nacional.
              </p>
            </div>

            <div className="w-full max-w-sm bg-amber-50 border border-amber-200 rounded-lg p-4 text-left space-y-1">
              <div className="flex items-center gap-2 text-amber-800 font-medium text-sm">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Ao prosseguir por sua conta e risco:
              </div>
              <ul className="text-xs text-amber-700 list-disc pl-5 space-y-0.5">
                <li>Os dados extraídos podem estar incorretos ou incompletos</li>
                <li>Esta guia será vinculada ao lançamento de Simples Nacional</li>
                <li>A responsabilidade pela informação será sua</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setAlertaDocumento(null)}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  aplicarDadosPdf(alertaDocumento.dados)
                  setAlertaDocumento(null)
                }}
              >
                Usar mesmo assim — minha responsabilidade
              </Button>
            </div>
          </div>
        )}

        <DialogHeader className="flex-none">
          <DialogTitle>
            {isReadonly ? 'Detalhes do DAS' : 'Gerar DAS — Simples Nacional'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Cliente</Label>
              <p className="text-sm border rounded px-3 py-2 bg-muted/30">{row.cliente?.fantasia ?? row.cliente?.razao_social ?? '—'}</p>
            </div>
            <div className="space-y-1">
              <Label>Competência</Label>
              <p className="text-sm border rounded px-3 py-2 bg-muted/30">{formatCompetencia(competencia)}</p>
            </div>
          </div>

          {!isReadonly && (
            <div className="border rounded-lg p-3 space-y-2 bg-muted/20">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Upload de PDF (opcional)</p>
              <div className="flex items-center gap-2">
                <Input
                  ref={fileRef}
                  type="file"
                  accept=".pdf"
                  className="text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleLerPdf}
                  disabled={pdfLoading}
                >
                  {pdfLoading ? 'Lendo...' : 'Ler PDF'}
                </Button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="das-valor">Valor DAS (R$) *</Label>
              <Input
                id="das-valor"
                placeholder="0,00"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                readOnly={isReadonly}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="das-vencimento">Vencimento *</Label>
              <Input
                id="das-vencimento"
                type="date"
                value={vencimento}
                onChange={(e) => setVencimento(e.target.value)}
                readOnly={isReadonly}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="das-barras">Código de Barras</Label>
            <Input
              id="das-barras"
              placeholder="Código de barras do DAS"
              value={codigoBarras}
              onChange={(e) => setCodigoBarras(e.target.value)}
              readOnly={isReadonly}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="das-linha">Linha Digitável</Label>
            <Input
              id="das-linha"
              placeholder="Linha digitável do boleto"
              value={linhaDigitavel}
              onChange={(e) => setLinhaDigitavel(e.target.value)}
              readOnly={isReadonly}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="das-pix">PIX Copia e Cola</Label>
            <Textarea
              id="das-pix"
              placeholder="Payload PIX (preenchido automaticamente pelo PDF)"
              value={pixCopiaECola}
              onChange={(e) => setPixCopiaECola(e.target.value)}
              readOnly={isReadonly}
              className="text-xs font-mono resize-none"
              rows={2}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="das-protocolo">Protocolo de Transmissão</Label>
            <Input
              id="das-protocolo"
              placeholder="Número do protocolo (preenchido após transmitir)"
              value={protocolo}
              onChange={(e) => setProtocolo(e.target.value)}
              readOnly={isReadonly}
            />
          </div>
        </div>

        <DialogFooter className="flex-none gap-2 pt-2 border-t">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {isReadonly ? 'Fechar' : 'Cancelar'}
          </Button>
          {!isReadonly && (
            <Button onClick={handleConfirmar} disabled={loading}>
              {loading ? 'Salvando...' : 'Confirmar DAS'}
            </Button>
          )}
          {showEnviar && (
            <Button variant="secondary" onClick={handleEnviar} disabled={loading}>
              {loading ? 'Enviando...' : 'Marcar como Transmitido'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
