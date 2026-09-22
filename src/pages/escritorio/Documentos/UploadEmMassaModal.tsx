import { useState, useRef, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { format } from 'date-fns'
import { useAuth } from '@/auth/AuthProvider'
import { useClients } from '@/data/hooks/useClients'
import { useFolders } from '@/data/hooks/useFolders'
import { useDocumentTypes } from '@/data/hooks/useDocumentTypes'
import { useCreateDocument } from '@/data/hooks/useDocuments'
import { useCreateDocumentEvent } from '@/data/hooks/useDocumentEvents'
import { storageService, obterProvedorStorage } from '@/lib/storage'
import { gerarThumbnailPdf } from '@/lib/pdf-thumbnail'
import { gerarThumbnailArquivo } from '@/lib/file-icon-thumbnail'
import { DocumentViewerModal } from '@/components/shared/DocumentViewerModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
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
import {
  UploadCloud,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
  Users,
  Eye,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Document } from '@/domain/types'

const MAX_SIZE = 2 * 1024 * 1024

type FileStatus = 'pending' | 'uploading' | 'done' | 'error'

interface StagedFile {
  id: string
  file: File
  nome: string
  client_id: string
  folder_id: string
  type_id: string
  competencia: string
  vencimento: string
  versao: number
  sizeOk: boolean
  status: FileStatus
  progress: number
  error?: string
}

function defaultComp(): string {
  return format(new Date(), 'yyyy-MM')
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

interface Props {
  open: boolean
  onClose: () => void
}

export function UploadEmMassaModal({ open, onClose }: Props) {
  const { currentUser } = useAuth()
  const tenantId = currentUser?.tenant_id ?? ''

  const { data: clients } = useClients(tenantId)
  const { data: allFolders } = useFolders(tenantId)
  const { data: docTypes } = useDocumentTypes(tenantId)
  const createDoc = useCreateDocument()
  const createEvent = useCreateDocumentEvent()
  const { toast } = useToast()

  const [files, setFiles] = useState<StagedFile[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Bulk assignment bar state
  const [bulkClient, setBulkClient] = useState('')
  const [bulkFolder, setBulkFolder] = useState('')
  const [bulkType, setBulkType] = useState('')
  const [bulkComp, setBulkComp] = useState(defaultComp())
  const [bulkVencimento, setBulkVencimento] = useState('')

  // Preview state
  const [previewEntry, setPreviewEntry] = useState<StagedFile | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const activeClients = clients?.filter((c) => c.status === 'ativo') ?? []
  const foldersForClient = (clientId: string) =>
    allFolders?.filter((f) => f.client_id === clientId) ?? []
  const bulkFolders = foldersForClient(bulkClient)

  // ── File staging ───────────────────────────────────────────────────────────

  const addFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList) return
      const firstTypeId = docTypes?.[0]?.id ?? ''
      const newEntries: StagedFile[] = Array.from(fileList).map((f) => ({
        id: uuidv4(),
        file: f,
        nome: f.name,
        client_id: '',
        folder_id: '',
        type_id: firstTypeId,
        competencia: defaultComp(),
        vencimento: '',
        versao: 1,
        sizeOk: f.size <= MAX_SIZE,
        status: 'pending',
        progress: 0,
      }))
      setFiles((prev) => [...prev, ...newEntries])
    },
    [docTypes]
  )

  function removeFile(id: string) {
    setFiles((prev) => prev.filter((f) => f.id !== id))
    setSelected((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  function updateFile(id: string, patch: Partial<StagedFile>) {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)))
  }

  // ── Selection ──────────────────────────────────────────────────────────────

  const allIds = files.map((f) => f.id)
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id))

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(allIds))
    }
  }

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // ── Bulk apply ─────────────────────────────────────────────────────────────

  function applyBulk() {
    setFiles((prev) =>
      prev.map((f) => {
        if (!selected.has(f.id)) return f
        const patch: Partial<StagedFile> = {}
        if (bulkClient) {
          patch.client_id = bulkClient
          if (bulkClient !== f.client_id) patch.folder_id = ''
        }
        if (bulkFolder) patch.folder_id = bulkFolder
        if (bulkType) patch.type_id = bulkType
        if (bulkComp) patch.competencia = bulkComp
        if (bulkVencimento) patch.vencimento = bulkVencimento
        return { ...f, ...patch }
      })
    )
    toast({ title: `Aplicado a ${selected.size} arquivo(s).` })
  }

  function openPreview(entry: StagedFile) {
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string)
      setPreviewEntry(entry)
    }
    reader.readAsDataURL(entry.file)
  }

  function closePreview() {
    setPreviewEntry(null)
    setPreviewUrl(null)
  }

  // ── Drag & drop ────────────────────────────────────────────────────────────

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }
  function handleDragLeave() {
    setIsDragging(false)
  }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    addFiles(e.dataTransfer.files)
  }

  // ── Upload ─────────────────────────────────────────────────────────────────

  const readyFiles = files.filter(
    (f) => f.sizeOk && f.client_id && f.folder_id && f.type_id && f.status === 'pending'
  )

  async function handleUpload() {
    if (!readyFiles.length) return
    setUploading(true)

    for (const entry of readyFiles) {
      updateFile(entry.id, { status: 'uploading', progress: 20 })
      await new Promise((r) => setTimeout(r, 60))
      updateFile(entry.id, { progress: 50 })

      try {
        const provedor = await obterProvedorStorage(tenantId)
        const result = await provedor.enviar(entry.file, {
          escritorioId: tenantId,
          clienteId: entry.client_id,
          nomeCliente: entry.client_id,
          ano: new Date().getFullYear(),
          tipoDoc: entry.type_id,
        })
        updateFile(entry.id, { progress: 75 })

        try {
          const thumb = entry.file.type === 'application/pdf'
            ? await gerarThumbnailPdf(entry.file)
            : await gerarThumbnailArquivo(entry.file)
          await storageService.salvarThumbnail(result.provider_file_id, thumb)
        } catch {
          // thumbnail é opcional
        }

        updateFile(entry.id, { progress: 80 })

        const docId = uuidv4()
        await createDoc.mutateAsync({
          id: docId,
          tenant_id: tenantId,
          client_id: entry.client_id,
          folder_id: entry.folder_id,
          type_id: entry.type_id,
          nome: entry.nome,
          competencia: entry.competencia,
          versao: entry.versao,
          storage_key: result.provider_file_id,
          tamanho: result.tamanho_bytes,
          mime: result.mime_type,
          criado_por: currentUser?.id ?? '',
          criado_em: new Date().toISOString(),
          provider: 'local',
          provider_file_id: result.provider_file_id,
          storage_status: 'ok',
          ...(entry.vencimento ? { data_validade: entry.vencimento } : {}),
        })

        await createEvent.mutateAsync({
          id: uuidv4(),
          document_id: docId,
          user_id: currentUser?.id ?? '',
          evento: 'upload',
          ip: '127.0.0.1',
          em: new Date().toISOString(),
        })

        updateFile(entry.id, { status: 'done', progress: 100 })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro ao enviar'
        updateFile(entry.id, { status: 'error', progress: 0, error: msg })
      }
    }

    setUploading(false)
    const doneCount = files.filter((f) => f.status === 'done').length + readyFiles.length
    toast({ title: `${doneCount} documento(s) enviado(s) com sucesso!` })

    // Se todos concluídos, fechar após breve pausa
    const remaining = files.filter(
      (f) => f.status === 'pending' && f.sizeOk && f.client_id && f.folder_id
    )
    if (!remaining.length) {
      setTimeout(() => {
        setFiles([])
        setSelected(new Set())
        onClose()
      }, 900)
    }
  }

  function handleClose() {
    if (uploading) return
    setFiles([])
    setSelected(new Set())
    setBulkClient('')
    setBulkFolder('')
    setBulkType('')
    setBulkComp(defaultComp())
    setBulkVencimento('')
    closePreview()
    onClose()
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const hasAnyFile = files.length > 0
  const pendingCount = readyFiles.length
  const errorCount = files.filter((f) => f.status === 'error').length
  const doneCount = files.filter((f) => f.status === 'done').length
  const missingAttrib = files.filter(
    (f) => f.sizeOk && f.status === 'pending' && (!f.client_id || !f.folder_id || !f.type_id)
  ).length

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-5 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2">
            <UploadCloud className="h-5 w-5 text-primary" />
            Upload em Massa
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto px-6 py-4 space-y-4">
          {/* Drop zone — compacto quando já há arquivos */}
          <div
            className={cn(
              'border-2 border-dashed rounded-lg transition-colors cursor-pointer',
              isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/40',
              hasAnyFile ? 'p-3' : 'p-12'
            )}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {hasAnyFile ? (
              <p className="text-xs text-muted-foreground text-center">
                + Arraste mais arquivos ou clique para adicionar (máx. 2 MB cada)
              </p>
            ) : (
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <UploadCloud className="h-12 w-12 opacity-40" />
                <p className="text-base font-medium">Arraste os arquivos aqui</p>
                <p className="text-sm">ou clique para selecionar — múltiplos arquivos suportados</p>
                <p className="text-xs opacity-60">Limite de 2 MB por arquivo</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => addFiles(e.target.files)}
            />
          </div>

          {/* Resumo de status */}
          {hasAnyFile && (
            <div className="flex items-center gap-4 text-sm flex-wrap">
              <span className="text-muted-foreground">{files.length} arquivo(s) adicionado(s)</span>
              {pendingCount > 0 && (
                <Badge variant="secondary">{pendingCount} pronto(s) para envio</Badge>
              )}
              {missingAttrib > 0 && (
                <Badge variant="warning" className="gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {missingAttrib} sem atribuição
                </Badge>
              )}
              {doneCount > 0 && (
                <Badge variant="success" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {doneCount} enviado(s)
                </Badge>
              )}
              {errorCount > 0 && (
                <Badge variant="destructive">{errorCount} com erro</Badge>
              )}
            </div>
          )}

          {/* Barra de ação em lote — só aparece quando há selecionados */}
          {selected.size > 0 && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex flex-wrap items-end gap-3">
              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                <Users className="h-4 w-4" />
                {selected.size} selecionado(s) — aplicar a todos:
              </div>

              <div className="flex flex-wrap items-end gap-2 flex-1">
                {/* Cliente bulk */}
                <div className="space-y-0.5 min-w-[160px]">
                  <Label className="text-xs text-muted-foreground">Cliente</Label>
                  <Select
                    value={bulkClient}
                    onValueChange={(v) => { setBulkClient(v); setBulkFolder('') }}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Selecionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {activeClients.map((c) => (
                        <SelectItem key={c.id} value={c.id} className="text-xs">
                          {c.razao_social}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Pasta bulk */}
                <div className="space-y-0.5 min-w-[140px]">
                  <Label className="text-xs text-muted-foreground">Pasta</Label>
                  <Select
                    value={bulkFolder}
                    onValueChange={setBulkFolder}
                    disabled={!bulkClient || !bulkFolders.length}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder={bulkClient ? 'Selecionar...' : 'Escolha o cliente'} />
                    </SelectTrigger>
                    <SelectContent>
                      {bulkFolders.map((f) => (
                        <SelectItem key={f.id} value={f.id} className="text-xs">
                          {f.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Tipo bulk */}
                <div className="space-y-0.5 min-w-[130px]">
                  <Label className="text-xs text-muted-foreground">Tipo</Label>
                  <Select value={bulkType} onValueChange={setBulkType}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Selecionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {docTypes?.map((dt) => (
                        <SelectItem key={dt.id} value={dt.id} className="text-xs">
                          {dt.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Competência bulk */}
                <div className="space-y-0.5">
                  <Label className="text-xs text-muted-foreground">Competência</Label>
                  <Input
                    value={bulkComp}
                    onChange={(e) => setBulkComp(e.target.value)}
                    placeholder="AAAA-MM"
                    className="h-8 text-xs w-28"
                  />
                </div>

                {/* Vencimento bulk */}
                <div className="space-y-0.5">
                  <Label className="text-xs text-muted-foreground">Vencimento</Label>
                  <Input
                    type="date"
                    value={bulkVencimento}
                    onChange={(e) => setBulkVencimento(e.target.value)}
                    className="h-8 text-xs w-32"
                  />
                </div>

                <Button
                  size="sm"
                  onClick={applyBulk}
                  className="h-8 self-end"
                  disabled={!bulkClient && !bulkFolder && !bulkType && !bulkComp && !bulkVencimento}
                >
                  Aplicar
                </Button>
              </div>
            </div>
          )}

          {/* Tabela de atribuição */}
          {hasAnyFile && (
            <div className="border rounded-lg overflow-hidden">
              {/* Cabeçalho da tabela */}
              <div className="bg-muted/50 grid grid-cols-[32px_1fr_68px_150px_130px_120px_96px_100px_32px_32px] gap-2 px-3 py-2 text-xs font-medium text-muted-foreground border-b">
                <div className="flex items-center justify-center">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleAll}
                    aria-label="Selecionar todos"
                  />
                </div>
                <span>Arquivo</span>
                <span>Tamanho</span>
                <span>Cliente *</span>
                <span>Pasta *</span>
                <span>Tipo *</span>
                <span>Competência</span>
                <span>Vencimento</span>
                <span />
                <span />
              </div>

              {/* Linhas */}
              <div className="divide-y max-h-72 overflow-y-auto">
                {files.map((entry) => {
                  const rowFolders = foldersForClient(entry.client_id)
                  const isSelected = selected.has(entry.id)
                  const isBusy = entry.status === 'uploading'
                  const isDone = entry.status === 'done'
                  const isError = entry.status === 'error'
                  const isMissing =
                    entry.sizeOk &&
                    entry.status === 'pending' &&
                    (!entry.client_id || !entry.folder_id || !entry.type_id)

                  return (
                    <div
                      key={entry.id}
                      className={cn(
                        'grid grid-cols-[32px_1fr_68px_150px_130px_120px_96px_100px_32px_32px] gap-2 px-3 py-2 text-xs items-center',
                        isSelected && 'bg-primary/5',
                        isDone && 'opacity-60',
                        isMissing && 'bg-yellow-50/50 dark:bg-yellow-950/20'
                      )}
                    >
                      {/* Checkbox */}
                      <div className="flex items-center justify-center">
                        {!isDone && !isBusy ? (
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleRow(entry.id)}
                          />
                        ) : isDone ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        )}
                      </div>

                      {/* Nome */}
                      <div className="min-w-0">
                        <p className="truncate font-medium">{entry.nome}</p>
                        {!entry.sizeOk && (
                          <p className="text-destructive flex items-center gap-0.5 mt-0.5">
                            <AlertCircle className="h-3 w-3" /> Muito grande (máx. 2 MB)
                          </p>
                        )}
                        {isError && (
                          <p className="text-destructive truncate mt-0.5">{entry.error}</p>
                        )}
                        {isBusy && (
                          <Progress value={entry.progress} className="h-1 mt-1" />
                        )}
                      </div>

                      {/* Tamanho */}
                      <span className="text-muted-foreground">{formatSize(entry.file.size)}</span>

                      {/* Cliente */}
                      <Select
                        value={entry.client_id}
                        onValueChange={(v) =>
                          updateFile(entry.id, { client_id: v, folder_id: '' })
                        }
                        disabled={isBusy || isDone || !entry.sizeOk}
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue placeholder="Selecionar..." />
                        </SelectTrigger>
                        <SelectContent>
                          {activeClients.map((c) => (
                            <SelectItem key={c.id} value={c.id} className="text-xs">
                              {c.razao_social}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Pasta */}
                      <Select
                        value={entry.folder_id}
                        onValueChange={(v) => updateFile(entry.id, { folder_id: v })}
                        disabled={isBusy || isDone || !entry.client_id || !entry.sizeOk}
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue
                            placeholder={entry.client_id ? 'Selecionar...' : '—'}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {rowFolders.map((f) => (
                            <SelectItem key={f.id} value={f.id} className="text-xs">
                              {f.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Tipo */}
                      <Select
                        value={entry.type_id}
                        onValueChange={(v) => updateFile(entry.id, { type_id: v })}
                        disabled={isBusy || isDone || !entry.sizeOk}
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue placeholder="Selecionar..." />
                        </SelectTrigger>
                        <SelectContent>
                          {docTypes?.map((dt) => (
                            <SelectItem key={dt.id} value={dt.id} className="text-xs">
                              {dt.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Competência */}
                      <Input
                        value={entry.competencia}
                        onChange={(e) => updateFile(entry.id, { competencia: e.target.value })}
                        placeholder="AAAA-MM"
                        disabled={isBusy || isDone || !entry.sizeOk}
                        className="h-7 text-xs px-2"
                      />

                      {/* Vencimento */}
                      <Input
                        type="date"
                        value={entry.vencimento}
                        onChange={(e) => updateFile(entry.id, { vencimento: e.target.value })}
                        disabled={isBusy || isDone || !entry.sizeOk}
                        className="h-7 text-xs px-2"
                      />

                      {/* Visualizar */}
                      <button
                        onClick={() => openPreview(entry)}
                        disabled={isBusy || !entry.sizeOk}
                        className="flex items-center justify-center rounded hover:bg-muted p-1 text-muted-foreground hover:text-primary disabled:opacity-30"
                        title="Visualizar"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>

                      {/* Remover */}
                      <button
                        onClick={() => removeFile(entry.id)}
                        disabled={isBusy || isDone}
                        className="flex items-center justify-center rounded hover:bg-muted p-1 text-muted-foreground hover:text-destructive disabled:opacity-30"
                        title="Remover"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-muted/30 flex-row items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            {missingAttrib > 0 && (
              <span className="text-yellow-600">
                {missingAttrib} arquivo(s) ainda sem cliente/pasta/tipo — não serão enviados.
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose} disabled={uploading}>
              {doneCount > 0 && pendingCount === 0 ? 'Fechar' : 'Cancelar'}
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!pendingCount || uploading}
              className="min-w-[160px]"
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <UploadCloud className="mr-2 h-4 w-4" />
                  Confirmar Upload ({pendingCount})
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>

      {previewEntry && (
        <DocumentViewerModal
          open={!!previewEntry}
          doc={{
            id: previewEntry.id,
            tenant_id: tenantId,
            client_id: previewEntry.client_id,
            folder_id: previewEntry.folder_id,
            type_id: previewEntry.type_id,
            nome: previewEntry.nome,
            competencia: previewEntry.competencia,
            versao: previewEntry.versao,
            storage_key: '',
            tamanho: previewEntry.file.size,
            mime: previewEntry.file.type || 'application/octet-stream',
            criado_por: currentUser?.id ?? '',
            criado_em: new Date().toISOString(),
            ...(previewEntry.vencimento ? { data_validade: previewEntry.vencimento } : {}),
          } as Document}
          url={previewUrl}
          onClose={closePreview}
        />
      )}
    </Dialog>
  )
}
