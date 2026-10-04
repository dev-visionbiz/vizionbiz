import { useState, useRef, useCallback, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { v4 as uuid } from 'uuid'
import { format, lastDayOfMonth, parseISO } from 'date-fns'
import {
  Upload, FolderOpen, CheckCircle2, AlertCircle, Clock, Loader2, X, FileText,
  ChevronRight, SkipForward, AlertTriangle, Users, FileX, Copy, ArrowLeft,
} from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useCreateGuia } from '@/data/hooks/useGuias'
import { useCriarLoteComGuias } from '@/data/hooks/useLoteImportacao'
import { guiaRepo } from '@/data/repositories/localStorage/GuiaRepository'
import { extrairTextoPDF, extrairCamposGuia, extrairPixDoQRCode } from '@/lib/pdfExtractor'
import { storageService } from '@/lib/storage'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import type { Client, TipoGuia, GuiaRecolhimento } from '@/domain/types'
import { TIPO_GUIA_CONFIG, TIPOS_GUIA_ORDENADOS } from './guiasConfig'

// ─── Types ────────────────────────────────────────────────────────────────────

type ArquivoStatus = 'na_fila' | 'lendo' | 'classificado' | 'precisa_revisao' | 'erro' | 'duplicata'

interface GuiaRascunho {
  cliente_id: string
  tipo: TipoGuia
  descricao: string
  competencia: string
  vencimento: string
  valor: number
  codigo_barras?: string
  linha_digitavel?: string
  pix_copia_cola?: string
  observacoes?: string
}

interface ArquivoItem {
  id: string
  file: File
  sha256: string
  status: ArquivoStatus
  cnpjDetectado?: string
  cnpjBaseDetectado?: string
  razaoSocialDetectada?: string
  erroMsg?: string
  rascunho: Partial<GuiaRascunho>
}

type Step = 'upload' | 'processando' | 'resumo' | 'revisao'

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function computeSHA256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const hash = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

function extrairDoNome(
  filename: string,
  clientes: Client[],
): { tipo?: TipoGuia; competencia?: string; cnpjDetectado?: string; clienteId?: string } {
  const upper = filename.toUpperCase()

  let tipo: TipoGuia | undefined
  if (/\bDARF[\s_-]?SIMPLES\b/.test(upper)) tipo = 'darf_simples'
  else if (/\bDARF\b/.test(upper)) tipo = 'darf'
  else if (/\bDAS\b/.test(upper)) tipo = 'das'
  else if (/\bDAE\b/.test(upper)) tipo = 'dae'
  else if (/\bFGTS\b/.test(upper)) tipo = 'fgts'
  else if (/\bGNRE\b/.test(upper)) tipo = 'gnre'
  else if (/\bIPTU\b/.test(upper)) tipo = 'iptu'
  else if (/\bISS\b/.test(upper)) tipo = 'iss'
  else if (/\bBOMBEIR/.test(upper) || /\bCBM\b/.test(upper)) tipo = 'bombeiros'
  else if (/\bVISA\b/.test(upper) || /\bVIGIL/.test(upper)) tipo = 'vigilancia_sanitaria'
  else if (/\bBOLETO\b/.test(upper) || /\bPREFEIT/.test(upper)) tipo = 'boleto_prefeitura'

  let competencia: string | undefined
  const m = filename.match(/(\d{4})[-_\/](\d{2})(?!\d)/)
  if (m) {
    const year = parseInt(m[1]), month = parseInt(m[2])
    if (year >= 2020 && year <= 2030 && month >= 1 && month <= 12) {
      competencia = `${m[1]}-${m[2]}`
    }
  }

  const digits = filename.replace(/\D/g, '')
  const cnpjMatch = digits.match(/(\d{14})/)
  const cnpjDetectado = cnpjMatch?.[1]

  let clienteId: string | undefined
  if (cnpjDetectado) {
    const found = clientes.find(
      (c) => c.cnpj?.replace(/\D/g, '') === cnpjDetectado,
    )
    if (found) clienteId = found.id
  }

  return { tipo, competencia, cnpjDetectado, clienteId }
}

function ultimoDiaCompetencia(competencia: string): string {
  try {
    const ultimo = lastDayOfMonth(parseISO(`${competencia}-01`))
    return format(ultimo, 'yyyy-MM-dd')
  } catch {
    return ''
  }
}

// ─── Review form schema ────────────────────────────────────────────────────────

const revisaoSchema = z.object({
  cliente_id: z.string().min(1, 'Selecione o cliente'),
  tipo: z.string().min(1, 'Selecione o tipo'),
  descricao: z.string().min(3, 'Informe a descrição'),
  competencia: z.string().regex(/^\d{4}-\d{2}$/, 'Use AAAA-MM'),
  vencimento: z.string().min(1, 'Informe o vencimento'),
  valor: z.coerce.number().min(0, 'Valor inválido'),
  linha_digitavel: z.string().optional(),
  observacoes: z.string().optional(),
})
type RevisaoForm = z.infer<typeof revisaoSchema>

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onClose: () => void
  tenantId: string
  userId: string
  clientes: Client[]
}

export function ImportarGuiasDialog({ open, onClose, tenantId, userId, clientes }: Props) {
  const [step, setStep] = useState<Step>('upload')
  const [arquivos, setArquivos] = useState<ArquivoItem[]>([])
  const [indexRevisao, setIndexRevisao] = useState(0)
  const [confirmando, setConfirmando] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [objetoURL, setObjetoURL] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const processingRef = useRef(false)

  const { mutateAsync: createGuia } = useCreateGuia()
  const { mutateAsync: criarLote } = useCriarLoteComGuias()
  const { toast } = useToast()

  // Cleanup object URL
  useEffect(() => {
    return () => {
      if (objetoURL) URL.revokeObjectURL(objetoURL)
    }
  }, [objetoURL])

  // Refresh object URL when switching review items
  const paraRevisar = arquivos.filter((a) => a.status === 'precisa_revisao')
  const classificados = arquivos.filter((a) => a.status === 'classificado')
  const comErro = arquivos.filter((a) => a.status === 'erro')
  const duplicatas = arquivos.filter((a) => a.status === 'duplicata')
  const itemRevisaoAtual = paraRevisar[indexRevisao]

  useEffect(() => {
    if (objetoURL) URL.revokeObjectURL(objetoURL)
    if (itemRevisaoAtual?.file.type === 'application/pdf') {
      setObjetoURL(URL.createObjectURL(itemRevisaoAtual.file))
    } else {
      setObjetoURL(null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indexRevisao, step])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset: resetForm,
    formState: { errors },
  } = useForm<RevisaoForm>({ resolver: zodResolver(revisaoSchema) })

  // Pre-fill form when switching review item
  useEffect(() => {
    if (!itemRevisaoAtual) return
    const r = itemRevisaoAtual.rascunho
    resetForm({
      cliente_id: r.cliente_id ?? '',
      tipo: (r.tipo as string) ?? '',
      descricao: r.descricao ?? '',
      competencia: r.competencia ?? '',
      vencimento: r.vencimento ?? '',
      valor: r.valor ?? 0,
      linha_digitavel: r.linha_digitavel ?? '',
      observacoes: r.observacoes ?? '',
    })
  }, [indexRevisao, itemRevisaoAtual, resetForm])

  // ─── File ingestion ──────────────────────────────────────────────────────

  function coletarArquivos(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return
    const files = Array.from(fileList).filter((f) =>
      ['application/pdf', 'text/xml', 'application/xml'].includes(f.type) ||
      f.name.toLowerCase().endsWith('.pdf') ||
      f.name.toLowerCase().endsWith('.xml'),
    )
    if (files.length === 0) {
      toast({ title: 'Nenhum arquivo válido', description: 'Envie arquivos PDF ou XML.' })
      return
    }
    iniciarProcessamento(files)
  }

  const iniciarProcessamento = useCallback(
    async (files: File[]) => {
      if (processingRef.current) return
      processingRef.current = true
      setStep('processando')

      const items: ArquivoItem[] = files.map((f) => ({
        id: uuid(),
        file: f,
        sha256: '',
        status: 'na_fila' as ArquivoStatus,
        rascunho: {},
      }))
      setArquivos([...items])

      // Load existing SHA-256s for duplicate detection
      const existentes = await guiaRepo.findAll(tenantId)
      const sha256sExistentes = new Set(
        existentes.filter((g) => g.lote_arquivo_sha256).map((g) => g.lote_arquivo_sha256!),
      )
      const sha256sLote = new Set<string>()

      for (let i = 0; i < items.length; i++) {
        items[i] = { ...items[i], status: 'lendo' }
        setArquivos([...items])

        await delay(120 + Math.random() * 180)

        const sha256 = await computeSHA256(items[i].file)
        items[i] = { ...items[i], sha256 }

        // Duplicate check
        if (sha256sExistentes.has(sha256) || sha256sLote.has(sha256)) {
          items[i] = { ...items[i], status: 'duplicata', erroMsg: 'Já importado anteriormente' }
          setArquivos([...items])
          continue
        }
        sha256sLote.add(sha256)

        // Size check
        if (items[i].file.size < 512) {
          items[i] = { ...items[i], status: 'erro', erroMsg: 'Arquivo vazio ou corrompido' }
          setArquivos([...items])
          continue
        }

        // Extração de conteúdo PDF (com fallback por nome de arquivo)
        const ehPDF =
          items[i].file.type === 'application/pdf' ||
          items[i].file.name.toLowerCase().endsWith('.pdf')

        let campos = ehPDF
          ? await extrairTextoPDF(items[i].file)
              .then((txt) => (txt.trim() ? extrairCamposGuia(txt) : null))
              .catch(() => null)
          : null

        // QR scan para PIX (DAS/PGDAS e INSS embeds QR como imagem, não texto)
        if (ehPDF && !campos?.pix_copia_cola) {
          const pixDoQR = await extrairPixDoQRCode(items[i].file).catch(() => null)
          if (pixDoQR) {
            campos = campos
              ? { ...campos, pix_copia_cola: pixDoQR }
              : { pix_copia_cola: pixDoQR, confianca: 'baixa' as const }
          }
        }

        // Fallback por nome de arquivo para campos não encontrados no conteúdo
        const daNome = extrairDoNome(items[i].file.name, clientes)

        const tipo = campos?.tipo ?? daNome.tipo
        const competencia = campos?.competencia ?? daNome.competencia
        const cnpjDetectado = campos?.cnpj ?? daNome.cnpjDetectado
        const cnpjBase = campos?.cnpj_base
        const razaoSocialDetectada = campos?.razao_social

        // 1. Match por CNPJ completo (14 dígitos)
        let clienteId = daNome.clienteId
        if (!clienteId && cnpjDetectado) {
          const found = clientes.find(
            (c) => c.cnpj?.replace(/\D/g, '') === cnpjDetectado,
          )
          if (found) clienteId = found.id
        }

        // 2. Match por CNPJ base (8 dígitos — FGTS Digital e outras guias truncadas)
        if (!clienteId && cnpjBase) {
          const found = clientes.find(
            (c) => (c.cnpj?.replace(/\D/g, '') ?? '').startsWith(cnpjBase),
          )
          if (found) clienteId = found.id
        }

        // 3. Match por razão social (fallback quando CNPJ não foi extraído)
        if (!clienteId && razaoSocialDetectada) {
          const rsNorm = razaoSocialDetectada.toUpperCase().trim()
          const found = clientes.find((c) => {
            const clienteRS = (c.razao_social ?? '').toUpperCase().trim()
            return clienteRS.length > 3 && (rsNorm.includes(clienteRS) || clienteRS.includes(rsNorm))
          })
          if (found) clienteId = found.id
        }

        const rascunho: Partial<GuiaRascunho> = {
          cliente_id: clienteId ?? '',
          tipo: tipo ?? undefined,
          competencia: competencia ?? '',
          descricao: tipo
            ? `${TIPO_GUIA_CONFIG[tipo].label}${competencia ? ` ${competencia}` : ''}`
            : items[i].file.name.replace(/\.[^.]+$/, ''),
          vencimento:
            campos?.vencimento ??
            (competencia ? ultimoDiaCompetencia(competencia) : ''),
          valor: campos?.valor ?? 0,
          codigo_barras: campos?.codigo_barras,
          linha_digitavel: campos?.linha_digitavel,
          pix_copia_cola: campos?.pix_copia_cola,
        }

        // Classificado se tiver tipo + competência + cliente identificados
        const isClassificado = !!(tipo && competencia && clienteId)

        items[i] = {
          ...items[i],
          status: isClassificado ? 'classificado' : 'precisa_revisao',
          cnpjDetectado,
          cnpjBaseDetectado: cnpjBase,
          razaoSocialDetectada,
          rascunho,
        }
        setArquivos([...items])
      }

      processingRef.current = false
      setStep('resumo')
    },
    [tenantId, clientes],
  )

  // ─── Drag & drop ─────────────────────────────────────────────────────────

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    coletarArquivos(e.dataTransfer.files)
  }

  // ─── Review actions ───────────────────────────────────────────────────────

  function confirmarRevisao(data: RevisaoForm) {
    setArquivos((prev) =>
      prev.map((a) =>
        a.id === itemRevisaoAtual.id
          ? {
              ...a,
              status: 'classificado' as ArquivoStatus,
              rascunho: { ...a.rascunho, ...data, tipo: data.tipo as TipoGuia },
            }
          : a,
      ),
    )
    avancarRevisao()
  }

  function pularRevisao() {
    avancarRevisao()
  }

  function naoEGuia() {
    setArquivos((prev) =>
      prev.map((a) =>
        a.id === itemRevisaoAtual.id
          ? { ...a, status: 'erro', erroMsg: 'Marcado como não-guia' }
          : a,
      ),
    )
    avancarRevisao()
  }

  function avancarRevisao() {
    const restantes = paraRevisar.filter((_, idx) => idx > indexRevisao)
    if (restantes.length > 0) {
      setIndexRevisao((i) => i + 1)
    } else {
      setStep('resumo')
      setIndexRevisao(0)
    }
  }

  // ─── Final confirmation ───────────────────────────────────────────────────

  async function confirmarImportacao() {
    setConfirmando(true)
    try {
      const paraImportar = arquivos.filter((a) => a.status === 'classificado')
      const agora = format(new Date(), 'yyyy-MM-dd')

      const lote = await criarLote({
        tenantId,
        userId,
        totalArquivos: arquivos.length,
        organizados: paraImportar.length,
        paraRevisar: 0,
        comErro: comErro.length,
        duplicatasIgnoradas: duplicatas.length,
      })

      for (const item of paraImportar) {
        const r = item.rascunho as GuiaRascunho
        if (!r.cliente_id || !r.competencia || !r.tipo) continue

        // Salva o arquivo PDF no storage e vincula à guia
        let arquivoKey: string | undefined
        const ehPDF =
          item.file.type === 'application/pdf' ||
          item.file.name.toLowerCase().endsWith('.pdf')
        if (ehPDF) {
          try {
            const { key } = await storageService.salvar(item.file, {
              escritorioId: tenantId,
              clienteId: r.cliente_id,
            })
            arquivoKey = key
          } catch {
            // Não bloqueia a importação se o upload falhar
          }
        }

        const guia: Omit<GuiaRecolhimento, 'id'> = {
          tenant_id: tenantId,
          criado_por: userId,
          criado_em: agora,
          segunda_via_status: 'nao_solicitada',
          origem: 'manual',
          status: arquivoKey ? 'emitida' : 'aguardando_emissao',
          lote_id: lote.id,
          lote_arquivo_sha256: item.sha256,
          lote_arquivo_original: item.file.name,
          cliente_id: r.cliente_id,
          tipo: r.tipo,
          descricao: r.descricao,
          competencia: r.competencia,
          vencimento: r.vencimento || ultimoDiaCompetencia(r.competencia),
          valor: r.valor ?? 0,
          arquivo_key: arquivoKey,
          codigo_barras: r.codigo_barras,
          linha_digitavel: r.linha_digitavel,
          pix_copia_cola: r.pix_copia_cola,
          observacoes: r.observacoes,
        }
        await createGuia(guia)
      }

      toast({
        title: 'Importação concluída',
        description: `${paraImportar.length} guia(s) criada(s) com sucesso.`,
      })
      handleClose()
    } catch (e) {
      toast({ title: 'Erro na importação', description: String(e), variant: 'destructive' })
    } finally {
      setConfirmando(false)
    }
  }

  // ─── Close / reset ────────────────────────────────────────────────────────

  function handleClose() {
    setStep('upload')
    setArquivos([])
    setIndexRevisao(0)
    setConfirmando(false)
    processingRef.current = false
    onClose()
  }

  // ─── Progress ─────────────────────────────────────────────────────────────

  const processados = arquivos.filter((a) => a.status !== 'na_fila' && a.status !== 'lendo').length
  const progressoPercent = arquivos.length > 0 ? Math.round((processados / arquivos.length) * 100) : 0

  // ─── Identificadores sem cliente ──────────────────────────────────────────

  const cnpjsSemCliente = Array.from(
    new Set(
      arquivos
        .filter((a) => !a.rascunho.cliente_id && (a.cnpjDetectado || a.cnpjBaseDetectado || a.razaoSocialDetectada))
        .map((a) => a.cnpjDetectado ?? a.cnpjBaseDetectado ?? a.razaoSocialDetectada!),
    ),
  )

  // ─── Render ───────────────────────────────────────────────────────────────

  const dialogSize =
    step === 'revisao'
      ? 'max-w-5xl'
      : step === 'resumo'
        ? 'max-w-4xl'
        : 'max-w-lg'

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className={cn('w-full transition-all duration-200', dialogSize)}>

        {/* ── Step: Upload ── */}
        {step === 'upload' && (
          <>
            <DialogHeader>
              <DialogTitle>Importar Guias</DialogTitle>
            </DialogHeader>

            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={cn(
                'border-2 border-dashed rounded-xl p-10 flex flex-col items-center gap-4 cursor-pointer transition-colors',
                dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/30 hover:border-primary/50',
              )}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
                <FolderOpen className="h-7 w-7 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="font-medium">Arraste arquivos ou pastas aqui</p>
                <p className="text-sm text-muted-foreground mt-1">PDF, XML — múltiplos arquivos aceitos</p>
              </div>
              <Button type="button" variant="outline" size="sm" className="gap-2">
                <Upload className="h-4 w-4" />
                Selecionar arquivos
              </Button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.xml"
              className="hidden"
              onChange={(e) => coletarArquivos(e.target.files)}
            />

            <DialogFooter>
              <Button variant="ghost" onClick={handleClose}>Cancelar</Button>
            </DialogFooter>
          </>
        )}

        {/* ── Step: Processando ── */}
        {step === 'processando' && (
          <>
            <DialogHeader>
              <DialogTitle>Processando arquivos</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {processados} de {arquivos.length} lidos
                  </span>
                  <span className="font-medium">{progressoPercent}%</span>
                </div>
                <Progress value={progressoPercent} className="h-2" />
              </div>

              <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
                {arquivos.map((a) => (
                  <ArquivoStatusRow key={a.id} arquivo={a} />
                ))}
              </div>

              {duplicatas.length > 0 && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Copy className="h-3.5 w-3.5" />
                  {duplicatas.length} duplicata(s) ignorada(s)
                </p>
              )}
            </div>
          </>
        )}

        {/* ── Step: Resumo ── */}
        {step === 'resumo' && (
          <>
            <DialogHeader>
              <DialogTitle>Resumo da importação</DialogTitle>
            </DialogHeader>

            {/* Stat cards */}
            <div className="grid grid-cols-3 gap-3">
              <StatCard
                count={classificados.length}
                label="Organizados automaticamente"
                color="green"
              />
              <StatCard
                count={paraRevisar.length}
                label="Precisam de revisão"
                color="amber"
              />
              <StatCard
                count={comErro.length}
                label="Com erros"
                color="red"
              />
            </div>

            <div className="flex gap-4 min-h-0">
              {/* Tabela de classificados */}
              <div className="flex-1 min-w-0">
                {classificados.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Guias organizadas
                    </div>
                    <div className="max-h-52 overflow-y-auto divide-y">
                      {classificados.map((a) => {
                        const tipo = a.rascunho.tipo
                        const cfg = tipo ? TIPO_GUIA_CONFIG[tipo] : null
                        const nomeCliente = clientes.find((c) => c.id === a.rascunho.cliente_id)
                        return (
                          <div key={a.id} className="px-3 py-2 flex items-center gap-3 text-sm">
                            {cfg && (
                              <Badge variant="outline" className={cn('text-xs shrink-0', cfg.cor, cfg.corTexto, cfg.corBorda)}>
                                {cfg.labelCurto}
                              </Badge>
                            )}
                            <span className="truncate text-muted-foreground text-xs flex-1">
                              {nomeCliente?.fantasia ?? nomeCliente?.razao_social ?? '—'}
                            </span>
                            <span className="text-xs shrink-0">{a.rascunho.competencia}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="border rounded-lg p-6 text-center text-sm text-muted-foreground">
                    Nenhuma guia classificada automaticamente.
                    {paraRevisar.length > 0 && ' Revise os arquivos pendentes.'}
                  </div>
                )}
              </div>

              {/* Alertas */}
              {(cnpjsSemCliente.length > 0 || comErro.length > 0 || duplicatas.length > 0) && (
                <div className="w-56 shrink-0 space-y-2">
                  {cnpjsSemCliente.length > 0 && (
                    <AlertBox
                      icon={<Users className="h-3.5 w-3.5" />}
                      color="amber"
                      title={`${cnpjsSemCliente.length} sem cliente`}
                      items={cnpjsSemCliente.map((c) =>
                        c.length === 14
                          ? c.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
                          : c.length === 8
                            ? `${c.slice(0,2)}.${c.slice(2,5)}.${c.slice(5,8)} (parcial)`
                            : c,
                      )}
                    />
                  )}
                  {comErro.length > 0 && (
                    <AlertBox
                      icon={<FileX className="h-3.5 w-3.5" />}
                      color="red"
                      title={`${comErro.length} arquivo(s) com erro`}
                      items={comErro.map((a) => a.file.name)}
                    />
                  )}
                  {duplicatas.length > 0 && (
                    <AlertBox
                      icon={<Copy className="h-3.5 w-3.5" />}
                      color="zinc"
                      title={`${duplicatas.length} duplicata(s) ignorada(s)`}
                      items={duplicatas.map((a) => a.file.name)}
                    />
                  )}
                </div>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={handleClose}>Cancelar</Button>
              {paraRevisar.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => { setIndexRevisao(0); setStep('revisao') }}
                  className="gap-2"
                >
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Revisar {paraRevisar.length} arquivo(s)
                </Button>
              )}
              {classificados.length > 0 && (
                <Button onClick={confirmarImportacao} disabled={confirmando} className="gap-2">
                  {confirmando && <Loader2 className="h-4 w-4 animate-spin" />}
                  Confirmar importação
                </Button>
              )}
            </DialogFooter>
          </>
        )}

        {/* ── Step: Revisão ── */}
        {step === 'revisao' && itemRevisaoAtual && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => setStep('resumo')}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <DialogTitle>Revisão — {indexRevisao + 1} de {paraRevisar.length}</DialogTitle>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs">
                    {itemRevisaoAtual.file.name}
                  </p>
                </div>
              </div>
            </DialogHeader>

            <div className="flex gap-4 min-h-0">
              {/* Preview */}
              <div className="w-80 shrink-0 border rounded-lg overflow-hidden bg-muted/30 flex flex-col">
                {objetoURL ? (
                  <iframe
                    src={objetoURL}
                    className="flex-1 min-h-96"
                    title="preview"
                  />
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
                    <FileText className="h-12 w-12 text-muted-foreground/40" />
                    <div>
                      <p className="font-medium text-sm">{itemRevisaoAtual.file.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {(itemRevisaoAtual.file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    {itemRevisaoAtual.cnpjDetectado && (
                      <p className="text-xs bg-muted rounded px-2 py-1">
                        CNPJ:{' '}
                        <span className="font-mono">
                          {itemRevisaoAtual.cnpjDetectado.replace(
                            /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5',
                          )}
                        </span>
                      </p>
                    )}
                    {!itemRevisaoAtual.cnpjDetectado && itemRevisaoAtual.cnpjBaseDetectado && (
                      <p className="text-xs bg-amber-50 border border-amber-200 rounded px-2 py-1">
                        CNPJ base (parcial):{' '}
                        <span className="font-mono">{itemRevisaoAtual.cnpjBaseDetectado}</span>
                      </p>
                    )}
                    {itemRevisaoAtual.razaoSocialDetectada && (
                      <p className="text-xs bg-muted rounded px-2 py-1 truncate">
                        Empresa: <span className="font-medium">{itemRevisaoAtual.razaoSocialDetectada}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Form */}
              <form
                id="form-revisao"
                onSubmit={handleSubmit(confirmarRevisao)}
                className="flex-1 min-w-0 space-y-3 overflow-y-auto pr-1"
              >
                <div className="grid grid-cols-2 gap-3">
                  {/* Cliente */}
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Cliente <span className="text-red-500">*</span></Label>
                    <Select
                      value={watch('cliente_id')}
                      onValueChange={(v) => setValue('cliente_id', v, { shouldValidate: true })}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {clientes.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.fantasia ?? c.razao_social}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.cliente_id && (
                      <p className="text-xs text-red-500">{errors.cliente_id.message}</p>
                    )}
                  </div>

                  {/* Tipo */}
                  <div className="space-y-1">
                    <Label className="text-xs">Tipo <span className="text-red-500">*</span></Label>
                    <Select
                      value={watch('tipo')}
                      onValueChange={(v) => setValue('tipo', v, { shouldValidate: true })}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIPOS_GUIA_ORDENADOS.map((t) => (
                          <SelectItem key={t} value={t}>{TIPO_GUIA_CONFIG[t].label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.tipo && <p className="text-xs text-red-500">{errors.tipo.message}</p>}
                  </div>

                  {/* Competência */}
                  <div className="space-y-1">
                    <Label className="text-xs">Competência <span className="text-red-500">*</span></Label>
                    <Input
                      {...register('competencia')}
                      placeholder="AAAA-MM"
                      maxLength={7}
                      className="h-9"
                    />
                    {errors.competencia && (
                      <p className="text-xs text-red-500">{errors.competencia.message}</p>
                    )}
                  </div>

                  {/* Descrição */}
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Descrição <span className="text-red-500">*</span></Label>
                    <Input {...register('descricao')} className="h-9" />
                    {errors.descricao && (
                      <p className="text-xs text-red-500">{errors.descricao.message}</p>
                    )}
                  </div>

                  {/* Vencimento */}
                  <div className="space-y-1">
                    <Label className="text-xs">Vencimento <span className="text-red-500">*</span></Label>
                    <Input {...register('vencimento')} type="date" className="h-9" />
                    {errors.vencimento && (
                      <p className="text-xs text-red-500">{errors.vencimento.message}</p>
                    )}
                  </div>

                  {/* Valor */}
                  <div className="space-y-1">
                    <Label className="text-xs">Valor (R$) <span className="text-red-500">*</span></Label>
                    <Input
                      {...register('valor')}
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0,00"
                      className="h-9"
                    />
                    {errors.valor && (
                      <p className="text-xs text-red-500">{errors.valor.message}</p>
                    )}
                  </div>

                  {/* Linha digitável */}
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Linha digitável</Label>
                    <Input {...register('linha_digitavel')} className="h-9 font-mono text-xs" />
                  </div>

                  {/* Observações */}
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs">Observações</Label>
                    <Textarea {...register('observacoes')} rows={2} className="resize-none text-sm" />
                  </div>
                </div>
              </form>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="ghost" size="sm" onClick={naoEGuia} className="gap-1.5 mr-auto text-muted-foreground">
                <X className="h-3.5 w-3.5" />
                Não é guia
              </Button>
              <Button variant="ghost" size="sm" onClick={pularRevisao} className="gap-1.5">
                <SkipForward className="h-3.5 w-3.5" />
                Pular
              </Button>
              <Button type="submit" form="form-revisao" size="sm" className="gap-1.5">
                <ChevronRight className="h-3.5 w-3.5" />
                Confirmar e próximo
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ArquivoStatusRow({ arquivo }: { arquivo: ArquivoItem }) {
  const { status, file, erroMsg } = arquivo

  const iconMap: Record<ArquivoStatus, React.ReactNode> = {
    na_fila: <Clock className="h-3.5 w-3.5 text-muted-foreground" />,
    lendo: <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin" />,
    classificado: <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />,
    precisa_revisao: <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />,
    erro: <AlertCircle className="h-3.5 w-3.5 text-red-500" />,
    duplicata: <Copy className="h-3.5 w-3.5 text-zinc-400" />,
  }

  const labelMap: Record<ArquivoStatus, string> = {
    na_fila: 'Na fila',
    lendo: 'Lendo...',
    classificado: 'Classificado',
    precisa_revisao: 'Precisa de revisão',
    erro: erroMsg ?? 'Erro',
    duplicata: 'Duplicata ignorada',
  }

  return (
    <div className="flex items-center gap-2.5 py-1.5 px-2 rounded-md hover:bg-muted/40">
      <span className="shrink-0">{iconMap[status]}</span>
      <span className="flex-1 text-xs truncate">{file.name}</span>
      <span className={cn(
        'text-xs shrink-0',
        status === 'classificado' && 'text-green-600',
        status === 'precisa_revisao' && 'text-amber-600',
        status === 'erro' && 'text-red-500',
        status === 'duplicata' && 'text-zinc-400',
        status === 'lendo' && 'text-blue-500',
        status === 'na_fila' && 'text-muted-foreground',
      )}>
        {labelMap[status]}
      </span>
    </div>
  )
}

function StatCard({ count, label, color }: { count: number; label: string; color: 'green' | 'amber' | 'red' }) {
  const colors = {
    green: 'bg-green-50 border-green-200 text-green-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    red: 'bg-red-50 border-red-200 text-red-700',
  }
  return (
    <div className={cn('border rounded-lg p-3 text-center', colors[color])}>
      <p className="text-2xl font-bold">{count}</p>
      <p className="text-xs mt-0.5 leading-tight">{label}</p>
    </div>
  )
}

function AlertBox({
  icon, color, title, items,
}: {
  icon: React.ReactNode
  color: 'amber' | 'red' | 'zinc'
  title: string
  items: string[]
}) {
  const colors = {
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    zinc: 'bg-zinc-50 border-zinc-200 text-zinc-600',
  }
  return (
    <div className={cn('border rounded-lg p-2.5 text-xs', colors[color])}>
      <div className="flex items-center gap-1.5 font-medium mb-1.5">
        {icon}
        {title}
      </div>
      <ul className="space-y-0.5">
        {items.slice(0, 5).map((item, i) => (
          <li key={i} className="truncate opacity-80">{item}</li>
        ))}
        {items.length > 5 && (
          <li className="opacity-60">+{items.length - 5} mais...</li>
        )}
      </ul>
    </div>
  )
}
