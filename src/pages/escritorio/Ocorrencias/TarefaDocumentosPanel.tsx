import { useState, useRef } from 'react'
import { format } from 'date-fns'
import {
  Paperclip, Upload, Link2, X, FileText,
  CheckCircle2, AlertCircle, ChevronDown, ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/auth/AuthProvider'
import { useTarefaDocumentos, useUploadEVincularDocumento, useVincularDocumento, useDesvincularDocumento } from '@/data/hooks/useOcorrenciaDocumentos'
import { useClientDocuments } from '@/data/hooks/useDocuments'
import { useClientFolders } from '@/data/hooks/useFolders'
import { useDocumentTypes } from '@/data/hooks/useDocumentTypes'
import { storageService } from '@/lib/storage'
import { cn } from '@/lib/utils'
import type { OcorrenciaDocumentoConfig, OcorrenciaDocumentoTipo } from '@/domain/types'

const MAX_SIZE = 2 * 1024 * 1024

const tipoLabel: Record<OcorrenciaDocumentoTipo, string> = {
  entrada:    'Entrada',
  saida:      'Saída',
  referencia: 'Referência',
}

const tipoBadge: Record<OcorrenciaDocumentoTipo, string> = {
  entrada:    'bg-blue-50 text-blue-700 border-blue-200',
  saida:      'bg-green-50 text-green-700 border-green-200',
  referencia: 'bg-gray-100 text-gray-600 border-gray-200',
}

interface Props {
  tenantId: string
  tarefaId: string
  ocorrenciaId: string
  clienteId: string
  documentosConfig?: OcorrenciaDocumentoConfig[]
  readonly?: boolean
}

export function TarefaDocumentosPanel({
  tenantId, tarefaId, ocorrenciaId, clienteId, documentosConfig = [], readonly = false,
}: Props) {
  const { currentUser } = useAuth()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: vinculados = [] }   = useTarefaDocumentos(tenantId, tarefaId)
  const { data: docCliente = [] }   = useClientDocuments(tenantId, clienteId)
  const { data: pastas = [] }       = useClientFolders(tenantId, clienteId)
  const { data: tiposDoc = [] }     = useDocumentTypes(tenantId)

  const uploadEVincular  = useUploadEVincularDocumento()
  const vincular         = useVincularDocumento()
  const desvincular      = useDesvincularDocumento()

  const [expandido, setExpandido]   = useState(true)
  const [modo, setModo]             = useState<'idle' | 'upload' | 'vincular'>('idle')
  const [configSelecionada, setConfigSelecionada] = useState<OcorrenciaDocumentoConfig | null>(null)

  // estado do form de upload
  const [arquivo, setArquivo]       = useState<File | null>(null)
  const [nome, setNome]             = useState('')
  const [folderId, setFolderId]     = useState('')
  const [typeId, setTypeId]         = useState('')
  const [uploading, setUploading]   = useState(false)

  const docsVinculadosIds = new Set(vinculados.map(v => v.document_id).filter(Boolean))

  function abrirUpload(config?: OcorrenciaDocumentoConfig) {
    setConfigSelecionada(config ?? null)
    setFolderId(config?.pasta_padrao_id ?? '')
    setTypeId(config?.tipo_documento_id ?? '')
    setArquivo(null)
    setNome('')
    setModo('upload')
  }

  function abrirVincular(config?: OcorrenciaDocumentoConfig) {
    setConfigSelecionada(config ?? null)
    setModo('vincular')
  }

  function fecharForm() {
    setModo('idle')
    setConfigSelecionada(null)
    setArquivo(null)
    setNome('')
    setFolderId('')
    setTypeId('')
  }

  function handleFile(file: File) {
    if (file.size > MAX_SIZE) {
      toast({ title: 'Arquivo excede o limite de 2 MB', variant: 'destructive' })
      return
    }
    setArquivo(file)
    setNome(file.name)
  }

  async function handleUpload() {
    if (!arquivo || !folderId) {
      toast({ title: 'Selecione um arquivo e uma pasta', variant: 'destructive' })
      return
    }
    if (!clienteId) {
      toast({ title: 'Esta ocorrência não possui cliente vinculado', variant: 'destructive' })
      return
    }
    setUploading(true)
    try {
      await uploadEVincular.mutateAsync({
        arquivo,
        tenantId,
        ocorrenciaId,
        clienteId,
        folderId,
        typeId: typeId || (tiposDoc[0]?.id ?? ''),
        nome: nome || arquivo.name,
        competencia: format(new Date(), 'yyyy-MM'),
        tarefaId,
        configId: configSelecionada?.id,
        tipo: configSelecionada?.tipo ?? 'saida',
        userId: currentUser?.id ?? '',
      })
      toast({ title: 'Documento enviado e vinculado' })
      fecharForm()
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : 'Erro ao enviar', variant: 'destructive' })
    } finally {
      setUploading(false)
    }
  }

  async function handleVincular(documentId: string, docNome: string) {
    if (!clienteId) return
    await vincular.mutateAsync({
      tenantId,
      ocorrenciaId,
      clienteId,
      documentId,
      tarefaId,
      configId: configSelecionada?.id,
      tipo: configSelecionada?.tipo ?? 'referencia',
      nome: docNome,
      userId: currentUser?.id ?? '',
    })
    toast({ title: 'Documento vinculado' })
    fecharForm()
  }

  async function handleDesvincular(vinculoId: string) {
    await desvincular.mutateAsync({ id: vinculoId, tenantId, ocorrenciaId, tarefaId })
    toast({ title: 'Vínculo removido' })
  }

  async function handleDownload(storageKey: string, nomeArq: string) {
    try {
      const url = await storageService.gerarUrlDownload(storageKey, 120)
      const a = document.createElement('a')
      a.href = url
      a.download = nomeArq
      a.click()
    } catch {
      toast({ title: 'Não foi possível baixar o arquivo', variant: 'destructive' })
    }
  }

  const slotsObrigatoriosNaoCumpridos = documentosConfig
    .filter(cfg => cfg.obrigatorio)
    .filter(cfg => !vinculados.some(v => v.config_id === cfg.id))

  const docsDisponiveis = docCliente.filter(d => !docsVinculadosIds.has(d.id))

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header colapsável */}
      <button
        type="button"
        className="w-full flex items-center justify-between px-3 py-2.5 bg-muted/30 hover:bg-muted/50 transition-colors"
        onClick={() => setExpandido(v => !v)}
      >
        <div className="flex items-center gap-2">
          <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium">Documentos</span>
          {vinculados.length > 0 && (
            <Badge variant="outline" className="text-xs px-1.5 py-0 h-4">
              {vinculados.length}
            </Badge>
          )}
          {slotsObrigatoriosNaoCumpridos.length > 0 && (
            <Badge variant="outline" className="text-xs px-1.5 py-0 h-4 bg-red-50 text-red-600 border-red-200">
              {slotsObrigatoriosNaoCumpridos.length} obrigatório{slotsObrigatoriosNaoCumpridos.length > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        {expandido
          ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        }
      </button>

      {expandido && (
        <div className="p-3 space-y-3">

          {/* Slots configurados */}
          {documentosConfig.length > 0 && (
            <div className="space-y-1.5">
              {documentosConfig.map(cfg => {
                const cumprido = vinculados.some(v => v.config_id === cfg.id)
                return (
                  <div
                    key={cfg.id}
                    className={cn(
                      'flex items-center justify-between rounded-md border px-2.5 py-2 gap-2',
                      cumprido
                        ? 'bg-green-50/60 border-green-200'
                        : cfg.obrigatorio
                          ? 'bg-red-50/40 border-red-200'
                          : 'bg-muted/20 border-dashed'
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {cumprido
                        ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                        : cfg.obrigatorio
                          ? <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                          : <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      }
                      <span className="text-xs font-medium truncate">{cfg.label}</span>
                      <Badge variant="outline" className={`text-xs px-1 py-0 h-4 shrink-0 ${tipoBadge[cfg.tipo]}`}>
                        {tipoLabel[cfg.tipo]}
                      </Badge>
                      {cfg.obrigatorio && !cumprido && (
                        <span className="text-xs text-red-500 shrink-0">obrigatório</span>
                      )}
                    </div>
                    {!cumprido && !readonly && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="sm" variant="ghost"
                          className="h-6 px-2 text-xs gap-1"
                          onClick={() => abrirUpload(cfg)}
                        >
                          <Upload className="h-3 w-3" /> Upload
                        </Button>
                        <Button
                          size="sm" variant="ghost"
                          className="h-6 px-2 text-xs gap-1"
                          onClick={() => abrirVincular(cfg)}
                        >
                          <Link2 className="h-3 w-3" /> Vincular
                        </Button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Documentos já vinculados */}
          {vinculados.length > 0 && (
            <div className="space-y-1">
              {vinculados.map(v => {
                const cfgDoc = docCliente.find(d => d.id === v.document_id)
                const storageKey = cfgDoc?.storage_key ?? v.storage_key
                return (
                  <div
                    key={v.id}
                    className="flex items-center justify-between rounded-md border px-2.5 py-2 bg-background gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <button
                        type="button"
                        className="text-xs font-medium truncate hover:underline text-left"
                        onClick={() => storageKey && handleDownload(storageKey, v.nome)}
                        disabled={!storageKey}
                      >
                        {v.nome}
                      </button>
                      <Badge variant="outline" className={`text-xs px-1 py-0 h-4 shrink-0 ${tipoBadge[v.tipo]}`}>
                        {tipoLabel[v.tipo]}
                      </Badge>
                    </div>
                    {!readonly && (
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                        onClick={() => handleDesvincular(v.id)}
                        disabled={desvincular.isPending}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Botões livres (sem slot) */}
          {!readonly && modo === 'idle' && (
            <div className="flex gap-2">
              <Button
                size="sm" variant="outline"
                className="h-7 text-xs gap-1.5 flex-1"
                onClick={() => abrirUpload()}
              >
                <Upload className="h-3.5 w-3.5" /> Fazer upload
              </Button>
              <Button
                size="sm" variant="outline"
                className="h-7 text-xs gap-1.5 flex-1"
                onClick={() => abrirVincular()}
              >
                <Link2 className="h-3.5 w-3.5" /> Vincular existente
              </Button>
            </div>
          )}

          {/* Form de upload inline */}
          {modo === 'upload' && (
            <div className="border rounded-lg p-3 space-y-3 bg-muted/10">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium">
                  {configSelecionada ? `Upload: ${configSelecionada.label}` : 'Novo upload'}
                </p>
                <button type="button" onClick={fecharForm} className="text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Área de arquivo */}
              <div
                className={cn(
                  'border-2 border-dashed rounded-md p-3 text-center cursor-pointer hover:bg-muted/30 transition-colors text-xs',
                  arquivo && 'border-green-300 bg-green-50/40'
                )}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
              >
                {arquivo
                  ? <span className="text-green-700 font-medium">{arquivo.name}</span>
                  : <span className="text-muted-foreground">Clique ou arraste o arquivo (máx. 2 MB)</span>
                }
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
                />
              </div>

              {arquivo && (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs">Nome do documento</Label>
                    <Input
                      value={nome}
                      onChange={e => setNome(e.target.value)}
                      className="h-7 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">
                      Pasta <span className="text-red-500">*</span>
                    </Label>
                    <Select value={folderId} onValueChange={setFolderId}>
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue placeholder="Selecionar pasta..." />
                      </SelectTrigger>
                      <SelectContent>
                        {pastas.map(p => (
                          <SelectItem key={p.id} value={p.id} className="text-xs">
                            {p.nome}
                          </SelectItem>
                        ))}
                        {pastas.length === 0 && (
                          <SelectItem value="_none" disabled className="text-xs text-muted-foreground">
                            Nenhuma pasta cadastrada
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {tiposDoc.length > 0 && (
                    <div className="space-y-1">
                      <Label className="text-xs">Tipo de documento</Label>
                      <Select value={typeId} onValueChange={setTypeId}>
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue placeholder="Selecionar tipo..." />
                        </SelectTrigger>
                        <SelectContent>
                          {tiposDoc.map(t => (
                            <SelectItem key={t.id} value={t.id} className="text-xs">{t.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={fecharForm}>Cancelar</Button>
                    <Button
                      size="sm" className="h-7 text-xs"
                      onClick={handleUpload}
                      disabled={uploading || !folderId}
                    >
                      {uploading ? 'Enviando...' : 'Enviar e vincular'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Form de vincular existente */}
          {modo === 'vincular' && (
            <div className="border rounded-lg p-3 space-y-2 bg-muted/10">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium">
                  {configSelecionada ? `Vincular: ${configSelecionada.label}` : 'Vincular documento existente'}
                </p>
                <button type="button" onClick={fecharForm} className="text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {docsDisponiveis.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">
                  Nenhum documento disponível para vincular
                </p>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {docsDisponiveis.map(d => (
                    <button
                      key={d.id}
                      type="button"
                      className="w-full text-left flex items-center gap-2 rounded-md border px-2.5 py-2 hover:bg-accent/40 transition-colors"
                      onClick={() => handleVincular(d.id, d.nome)}
                      disabled={vincular.isPending}
                    >
                      <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{d.nome}</p>
                        <p className="text-xs text-muted-foreground">{d.competencia}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
