import { useState, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/auth/AuthProvider'
import { useCreateDocument } from '@/data/hooks/useDocuments'
import { useCreateDocumentEvent } from '@/data/hooks/useDocumentEvents'
import { useClientInvoices, useCreateInvoice } from '@/data/hooks/useInvoices'
import { useRegistrarLogAtividade } from '@/data/hooks/useLogAtividadeCliente'
import { storageService, obterProvedorStorage } from '@/lib/storage'
import { gerarThumbnailPdf } from '@/lib/pdf-thumbnail'
import { gerarThumbnailArquivo } from '@/lib/file-icon-thumbnail'
import type { DocumentType } from '@/domain/types'
import { AlertCircle, CreditCard, Clock } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

const MAX_SIZE = 2 * 1024 * 1024

interface FileEntry {
  file: File
  nome: string
  type_id: string
  competencia: string
  versao: string
  sizeOk: boolean
  progress: number
  done: boolean
  error?: string
  data_validade: string
  // cobrança vinculada
  vincularCobranca: boolean
  tipoVinculo: 'existente' | 'nova'
  invoiceId: string
  novaDesc: string
  novaValor: string
  novaVenc: string
  downloadAposPagamento: boolean
}

interface UploadModalProps {
  open: boolean
  onClose: () => void
  tenantId: string
  clientId: string
  folderId: string
  userId: string
  documentTypes: DocumentType[]
}

function defaultComp(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function defaultVenc(): string {
  const d = new Date()
  d.setDate(d.getDate() + 30)
  return d.toISOString().split('T')[0]
}

export function UploadModal({ open, onClose, tenantId, clientId, folderId, userId, documentTypes }: UploadModalProps) {
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const { currentUser } = useAuth()
  const createDoc = useCreateDocument()
  const createEvent = useCreateDocumentEvent()
  const createInvoice = useCreateInvoice()
  const registrarLog = useRegistrarLogAtividade()
  const { data: clientInvoices } = useClientInvoices(tenantId, clientId)

  const openInvoices = (clientInvoices ?? []).filter(
    (inv) => inv.status === 'aberta' || inv.status === 'vencida'
  )

  function handleFiles(files: FileList | null) {
    if (!files) return
    const newEntries: FileEntry[] = Array.from(files).map((f) => ({
      file: f,
      nome: f.name,
      type_id: documentTypes[0]?.id ?? '',
      competencia: defaultComp(),
      versao: '1',
      sizeOk: f.size <= MAX_SIZE,
      progress: 0,
      done: false,
      data_validade: '',
      vincularCobranca: false,
      tipoVinculo: 'existente',
      invoiceId: '',
      novaDesc: defaultComp(),
      novaValor: '',
      novaVenc: defaultVenc(),
      downloadAposPagamento: false,
    }))
    setEntries((prev) => [...prev, ...newEntries])
  }

  function updateEntry(index: number, partial: Partial<FileEntry>) {
    setEntries((prev) => prev.map((e, i) => (i === index ? { ...e, ...partial } : e)))
  }

  function removeEntry(index: number) {
    setEntries((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleUpload() {
    const valid = entries.filter((e) => e.sizeOk && !e.done)
    if (!valid.length) return
    setUploading(true)

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]
      if (!entry.sizeOk || entry.done) continue

      updateEntry(i, { progress: 30 })
      await new Promise((r) => setTimeout(r, 100))
      updateEntry(i, { progress: 60 })

      try {
        // Cria fatura nova se necessário
        let resolvedInvoiceId: string | undefined
        if (entry.vincularCobranca) {
          if (entry.tipoVinculo === 'nova') {
            const valor = parseFloat(entry.novaValor.replace(',', '.'))
            if (!valor || isNaN(valor)) {
              updateEntry(i, { progress: 0, error: 'Informe um valor válido para a cobrança.' })
              continue
            }
            const newInvId = uuidv4()
            await createInvoice.mutateAsync({
              id: newInvId,
              tenant_id: tenantId,
              client_id: clientId,
              competencia: entry.novaDesc || entry.competencia,
              vencimento: entry.novaVenc,
              valor_original: valor,
              status: 'aberta',
              origem: 'avulsa',
            })
            resolvedInvoiceId = newInvId
          } else if (entry.invoiceId) {
            resolvedInvoiceId = entry.invoiceId
          }
        }

        const provedor = await obterProvedorStorage(tenantId)
        const result = await provedor.enviar(entry.file, {
          escritorioId: tenantId,
          clienteId: clientId,
          nomeCliente: clientId,
          ano: new Date().getFullYear(),
          tipoDoc: entry.type_id,
        })
        updateEntry(i, { progress: 85 })

        try {
          const thumb = entry.file.type === 'application/pdf'
            ? await gerarThumbnailPdf(entry.file)
            : await gerarThumbnailArquivo(entry.file)
          await storageService.salvarThumbnail(result.provider_file_id, thumb)
        } catch {
          // thumbnail é opcional
        }

        updateEntry(i, { progress: 90 })

        const docId = uuidv4()
        await createDoc.mutateAsync({
          id: docId,
          tenant_id: tenantId,
          client_id: clientId,
          folder_id: folderId,
          type_id: entry.type_id,
          nome: entry.nome,
          competencia: entry.competencia,
          versao: parseInt(entry.versao) || 1,
          storage_key: result.provider_file_id,
          tamanho: result.tamanho_bytes,
          mime: result.mime_type,
          criado_por: userId,
          criado_em: new Date().toISOString(),
          invoice_id: resolvedInvoiceId,
          download_apos_pagamento: resolvedInvoiceId ? entry.downloadAposPagamento : undefined,
          data_validade: entry.data_validade || undefined,
          provider: 'local',
          provider_file_id: result.provider_file_id,
          storage_status: 'ok',
        })

        await createEvent.mutateAsync({
          id: uuidv4(),
          document_id: docId,
          user_id: userId,
          evento: 'upload',
          ip: '127.0.0.1',
          em: new Date().toISOString(),
        })

        registrarLog.mutate({
          tenantId,
          clientId,
          acao: 'documento_enviado',
          descricao: `Documento enviado: "${entry.nome}" (competência ${entry.competencia})`,
          usuarioId: currentUser?.id ?? userId,
          usuarioNome: currentUser?.nome ?? 'Sistema',
        })
        updateEntry(i, { progress: 100, done: true })
        toast({ title: `"${entry.nome}" enviado com sucesso!` })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro ao enviar'
        updateEntry(i, { progress: 0, error: msg })
        toast({ title: `Erro: ${msg}`, variant: 'destructive' })
      }
    }

    setUploading(false)
    const allDone = entries.every((e) => !e.sizeOk || e.done || e.error)
    if (allDone) {
      setTimeout(() => {
        setEntries([])
        onClose()
      }, 800)
    }
  }

  function handleClose() {
    if (!uploading) {
      setEntries([])
      onClose()
    }
  }

  const hasValid = entries.some((e) => e.sizeOk && !e.done)

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload de Documentos</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div
            className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              handleFiles(e.dataTransfer.files)
            }}
          >
            <p className="text-sm text-muted-foreground">
              Clique ou arraste arquivos aqui (limite 2 MB por arquivo)
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>

          {entries.map((entry, i) => (
            <div key={i} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{entry.file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(entry.file.size / 1024).toFixed(0)} KB
                  </p>
                </div>
                {!entry.done && !uploading && (
                  <Button variant="ghost" size="sm" onClick={() => removeEntry(i)}>
                    &times;
                  </Button>
                )}
                {!entry.sizeOk && (
                  <span className="flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle className="h-3 w-3" /> Muito grande
                  </span>
                )}
              </div>

              {entry.sizeOk && !entry.done && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Nome</Label>
                      <Input
                        value={entry.nome}
                        onChange={(e) => updateEntry(i, { nome: e.target.value })}
                        disabled={uploading}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Tipo</Label>
                      <Select
                        value={entry.type_id}
                        onValueChange={(v) => updateEntry(i, { type_id: v, data_validade: '' })}
                        disabled={uploading}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {documentTypes.map((dt) => (
                            <SelectItem key={dt.id} value={dt.id}>
                              {dt.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Competência</Label>
                      <Input
                        value={entry.competencia}
                        onChange={(e) => updateEntry(i, { competencia: e.target.value })}
                        placeholder="AAAA-MM"
                        disabled={uploading}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Versão</Label>
                      <Input
                        type="number"
                        min="1"
                        value={entry.versao}
                        onChange={(e) => updateEntry(i, { versao: e.target.value })}
                        disabled={uploading}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>

                  {documentTypes.find((dt) => dt.id === entry.type_id)?.tem_validade && (
                    <div className="doc-validade-container flex items-end gap-2 rounded-md px-3 py-2">
                      <Clock className="doc-validade-text h-3.5 w-3.5 shrink-0 mb-1.5" />
                      <div className="space-y-1 flex-1">
                        <Label className="doc-validade-text text-xs font-medium">Data de validade do documento</Label>
                        <Input
                          type="date"
                          value={entry.data_validade}
                          onChange={(e) => updateEntry(i, { data_validade: e.target.value })}
                          disabled={uploading}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  )}

                  {/* Seção de cobrança vinculada */}
                  <div className="border rounded-md p-3 space-y-3 bg-muted/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                        <Label className="text-xs font-medium">Vincular cobrança extra</Label>
                      </div>
                      <Switch
                        checked={entry.vincularCobranca}
                        onCheckedChange={(v) =>
                          updateEntry(i, { vincularCobranca: v, downloadAposPagamento: false })
                        }
                        disabled={uploading}
                      />
                    </div>

                    {entry.vincularCobranca && (
                      <>
                        <div className="flex gap-1 rounded-md border p-0.5 w-fit bg-background">
                          <button
                            type="button"
                            className={`px-3 py-1 text-xs rounded transition-colors ${
                              entry.tipoVinculo === 'existente'
                                ? 'bg-primary text-primary-foreground'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                            onClick={() => updateEntry(i, { tipoVinculo: 'existente', invoiceId: '' })}
                            disabled={uploading}
                          >
                            Fatura existente
                          </button>
                          <button
                            type="button"
                            className={`px-3 py-1 text-xs rounded transition-colors ${
                              entry.tipoVinculo === 'nova'
                                ? 'bg-primary text-primary-foreground'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                            onClick={() => updateEntry(i, { tipoVinculo: 'nova' })}
                            disabled={uploading}
                          >
                            Nova cobrança
                          </button>
                        </div>

                        {entry.tipoVinculo === 'existente' ? (
                          openInvoices.length === 0 ? (
                            <p className="text-xs text-muted-foreground">
                              Nenhuma fatura aberta ou vencida para este cliente.
                            </p>
                          ) : (
                            <div className="space-y-1">
                              <Label className="text-xs">Fatura</Label>
                              <Select
                                value={entry.invoiceId}
                                onValueChange={(v) => updateEntry(i, { invoiceId: v })}
                                disabled={uploading}
                              >
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue placeholder="Selecionar fatura..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {openInvoices.map((inv) => (
                                    <SelectItem key={inv.id} value={inv.id}>
                                      {inv.competencia} — {formatCurrency(inv.valor_original)} ({inv.status})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Descrição (competência)</Label>
                              <Input
                                value={entry.novaDesc}
                                onChange={(e) => updateEntry(i, { novaDesc: e.target.value })}
                                placeholder="AAAA-MM"
                                disabled={uploading}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Valor (R$)</Label>
                              <Input
                                value={entry.novaValor}
                                onChange={(e) => updateEntry(i, { novaValor: e.target.value })}
                                placeholder="0,00"
                                disabled={uploading}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="space-y-1 col-span-2">
                              <Label className="text-xs">Vencimento</Label>
                              <Input
                                type="date"
                                value={entry.novaVenc}
                                onChange={(e) => updateEntry(i, { novaVenc: e.target.value })}
                                disabled={uploading}
                                className="h-8 text-sm"
                              />
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-1 border-t">
                          <Label className="text-xs text-muted-foreground">
                            Liberar download somente após pagamento
                          </Label>
                          <Switch
                            checked={entry.downloadAposPagamento}
                            onCheckedChange={(v) => updateEntry(i, { downloadAposPagamento: v })}
                            disabled={uploading}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}

              {entry.progress > 0 && !entry.done && (
                <Progress value={entry.progress} className="h-2" />
              )}

              {entry.done && (
                <p className="text-xs text-green-600 font-medium">Enviado com sucesso!</p>
              )}

              {entry.error && (
                <p className="text-xs text-destructive">{entry.error}</p>
              )}
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={uploading}>
            Cancelar
          </Button>
          <Button onClick={handleUpload} disabled={!hasValid || uploading}>
            {uploading ? 'Enviando...' : `Enviar ${entries.filter((e) => e.sizeOk && !e.done).length} arquivo(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
