import { useState, Fragment } from 'react'
import { useSearchParams } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import { format, differenceInDays, parseISO } from 'date-fns'
import { useAuth } from '@/auth/AuthProvider'
import { useClients } from '@/data/hooks/useClients'
import { useFolders, useClientFolders, useCreateFolder } from '@/data/hooks/useFolders'
import { useDocuments, useFolderDocuments, useDeleteDocument, useUpdateDocument } from '@/data/hooks/useDocuments'
import { useClientInvoices, useCreateInvoice } from '@/data/hooks/useInvoices'
import { useDocumentTypes } from '@/data/hooks/useDocumentTypes'
import { useCreateDocumentEvent, useDocumentEvents } from '@/data/hooks/useDocumentEvents'
import { useCreateShareLink, useDocumentShareLinks } from '@/data/hooks/useShareLinks'
import { storageService, obterProvedorStorage } from '@/lib/storage'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/use-toast'
import {
  FolderOpen,
  FolderPlus,
  Upload,
  Download,
  Eye,
  Share2,
  History,
  Trash2,
  FileText,
  PanelLeft,
  AlertTriangle,
  Clock,
  Pencil,
  CreditCard,
  Lock,
  MoreHorizontal,
  ArrowLeft,
  Users,
  ChevronRight,
} from 'lucide-react'
import type { Document, DocumentType, Folder, FolderType } from '@/domain/types'
import { formatDate } from '@/lib/utils'
import { UploadModal } from './UploadModal'
import { UploadEmMassaModal } from './UploadEmMassaModal'
import { DocumentViewerModal } from '@/components/shared/DocumentViewerModal'
import { DocumentThumbnail } from '@/components/shared/DocumentThumbnail'

function ValidadeBadge({ doc, docTypes }: { doc: Document; docTypes: DocumentType[] | undefined }) {
  const tipo = docTypes?.find((dt) => dt.id === doc.type_id)
  if (!tipo?.tem_validade || !doc.data_validade) return null

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const validade = parseISO(doc.data_validade)
  const dias = differenceInDays(validade, hoje)

  if (dias < 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-destructive/10 text-destructive border border-destructive/20">
        <AlertTriangle className="h-3 w-3" /> Vencido
      </span>
    )
  }
  if (dias <= 30) {
    return (
      <span className="doc-validade-badge inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium">
        <Clock className="h-3 w-3" /> Vence em {dias}d
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground border">
      <Clock className="h-3 w-3" /> Válido até {format(validade, 'dd/MM/yyyy')}
    </span>
  )
}

const folderTypeLabels: Record<FolderType, string> = {
  fiscal: 'Fiscal',
  dp: 'Dep. Pessoal',
  contabil: 'Contábil',
  societario: 'Societário',
  outros: 'Outros',
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

// ---- History Dialog ----
function HistoricoDialog({ doc, open, onClose }: { doc: Document; open: boolean; onClose: () => void }) {
  const { data: events } = useDocumentEvents(doc.id)
  const eventLabels: Record<string, string> = {
    upload: 'Upload',
    download: 'Download',
    view: 'Visualização',
    share: 'Compartilhamento',
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Histórico — {doc.nome}</DialogTitle>
        </DialogHeader>
        <div className="max-h-80 overflow-y-auto space-y-2">
          {!events?.length ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum evento registrado.</p>
          ) : (
            events.map((ev) => (
              <div key={ev.id} className="flex items-center justify-between text-sm border-b pb-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{eventLabels[ev.evento] ?? ev.evento}</Badge>
                  <span className="text-muted-foreground text-xs">{ev.user_id}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(ev.em), 'dd/MM/yyyy HH:mm')}
                </span>
              </div>
            ))
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---- Share Dialog ----
function ShareDialog({ doc, open, onClose, tenantId }: { doc: Document; open: boolean; onClose: () => void; tenantId: string }) {
  const { data: links, isLoading } = useDocumentShareLinks(doc.id)
  const createLink = useCreateShareLink()
  const [expireDays, setExpireDays] = useState('7')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const { toast } = useToast()

  async function handleCreate() {
    const token = uuidv4().replace(/-/g, '')
    const expira = new Date()
    expira.setDate(expira.getDate() + parseInt(expireDays || '7'))
    await createLink.mutateAsync({
      id: uuidv4(),
      document_id: doc.id,
      token,
      expira_em: expira.toISOString(),
    })
    toast({ title: 'Link criado!' })
  }

  function copyLink(token: string, id: string) {
    navigator.clipboard.writeText(`${window.location.origin}/share/${token}`)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Compartilhar — {doc.nome}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-end gap-2">
            <div className="space-y-1 flex-1">
              <Label className="text-xs">Validade (dias)</Label>
              <Input
                type="number"
                min="1"
                value={expireDays}
                onChange={(e) => setExpireDays(e.target.value)}
                className="h-8"
              />
            </div>
            <Button size="sm" onClick={handleCreate} disabled={createLink.isPending}>
              Gerar link
            </Button>
          </div>

          {isLoading ? (
            <p className="text-xs text-muted-foreground">Carregando...</p>
          ) : links?.length ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {links.map((lnk) => (
                <div key={lnk.id} className="flex items-center justify-between border rounded p-2 text-xs">
                  <div>
                    <p className="font-mono truncate w-48">{lnk.token}</p>
                    <p className="text-muted-foreground">Expira: {format(new Date(lnk.expira_em), 'dd/MM/yyyy')}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyLink(lnk.token, lnk.id)}
                  >
                    {copiedId === lnk.id ? 'Copiado!' : 'Copiar'}
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Nenhum link gerado.</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---- New Folder Dialog ----
function NewFolderDialog({
  open,
  onClose,
  tenantId,
  clientId,
  parentId = null,
}: {
  open: boolean
  onClose: () => void
  tenantId: string
  clientId: string
  parentId?: string | null
}) {
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState<FolderType>('outros')
  const createFolder = useCreateFolder()
  const { toast } = useToast()

  async function handle() {
    if (!nome.trim()) return
    await createFolder.mutateAsync({
      id: uuidv4(),
      tenant_id: tenantId,
      client_id: clientId,
      parent_id: parentId,
      nome: nome.trim(),
      tipo_padrao: tipo,
      sistema: false,
    })
    toast({ title: 'Pasta criada!' })
    setNome('')
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Nova Pasta</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label>Nome</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Guias 2025" />
          </div>
          <div className="space-y-1">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as FolderType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(folderTypeLabels) as FolderType[]).map((k) => (
                  <SelectItem key={k} value={k}>{folderTypeLabels[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handle} disabled={!nome.trim() || createFolder.isPending}>
            Criar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---- Edit Document Dialog ----
function EditDocumentDialog({
  doc,
  docTypes,
  tenantId,
  open,
  onClose,
}: {
  doc: Document
  docTypes: DocumentType[] | undefined
  tenantId: string
  open: boolean
  onClose: () => void
}) {
  const updateDoc = useUpdateDocument()
  const createInvoice = useCreateInvoice()
  const { data: clientInvoices } = useClientInvoices(tenantId, doc.client_id)
  const { toast } = useToast()

  const [nome, setNome] = useState(doc.nome)
  const [typeId, setTypeId] = useState(doc.type_id)
  const [competencia, setCompetencia] = useState(doc.competencia)
  const [versao, setVersao] = useState(String(doc.versao))
  const [dataValidade, setDataValidade] = useState(doc.data_validade ?? '')
  const [vincularCobranca, setVincularCobranca] = useState(!!doc.invoice_id)
  const [tipoVinculo, setTipoVinculo] = useState<'existente' | 'nova'>(doc.invoice_id ? 'existente' : 'existente')
  const [invoiceId, setInvoiceId] = useState(doc.invoice_id ?? '')
  const [novaDesc, setNovaDesc] = useState(doc.competencia)
  const [novaValor, setNovaValor] = useState('')
  const [novaVenc, setNovaVenc] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().split('T')[0]
  })
  const [downloadAposPagamento, setDownloadAposPagamento] = useState(doc.download_apos_pagamento ?? false)

  const selectedType = docTypes?.find((dt) => dt.id === typeId)
  const openInvoices = (clientInvoices ?? []).filter((inv) => inv.status === 'aberta' || inv.status === 'vencida')

  async function handleSave() {
    try {
      let resolvedInvoiceId: string | undefined
      if (vincularCobranca) {
        if (tipoVinculo === 'nova') {
          const valor = parseFloat(novaValor.replace(',', '.'))
          if (!valor || isNaN(valor)) {
            toast({ title: 'Informe um valor válido para a cobrança.', variant: 'destructive' })
            return
          }
          const newInvId = uuidv4()
          await createInvoice.mutateAsync({
            id: newInvId,
            tenant_id: tenantId,
            client_id: doc.client_id,
            competencia: novaDesc || competencia,
            vencimento: novaVenc,
            valor_original: valor,
            status: 'aberta',
            origem: 'avulsa',
          })
          resolvedInvoiceId = newInvId
        } else {
          resolvedInvoiceId = invoiceId || undefined
        }
      }

      await updateDoc.mutateAsync({
        id: doc.id,
        data: {
          nome: nome.trim() || doc.nome,
          type_id: typeId,
          competencia,
          versao: parseInt(versao) || doc.versao,
          data_validade: dataValidade || undefined,
          invoice_id: resolvedInvoiceId,
          download_apos_pagamento: resolvedInvoiceId ? downloadAposPagamento : undefined,
        },
      })
      toast({ title: 'Documento atualizado.' })
      onClose()
    } catch {
      toast({ title: 'Erro ao atualizar', variant: 'destructive' })
    }
  }

  const isSaving = updateDoc.isPending || createInvoice.isPending

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Documento</DialogTitle>
        </DialogHeader>

        <div className="border rounded-lg p-4 space-y-3">
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{doc.nome}</p>
              <p className="text-xs text-muted-foreground">{(doc.tamanho / 1024).toFixed(0)} KB</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Nome</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tipo</Label>
              <Select value={typeId} onValueChange={(v) => { setTypeId(v); setDataValidade('') }}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {docTypes?.map((dt) => (
                    <SelectItem key={dt.id} value={dt.id}>{dt.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Competência</Label>
              <Input
                value={competencia}
                onChange={(e) => setCompetencia(e.target.value)}
                placeholder="AAAA-MM"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Versão</Label>
              <Input
                type="number"
                min="1"
                value={versao}
                onChange={(e) => setVersao(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          </div>

          {selectedType?.tem_validade && (
            <div className="doc-validade-container flex items-end gap-2 rounded-md px-3 py-2">
              <Clock className="doc-validade-text h-3.5 w-3.5 shrink-0 mb-1.5" />
              <div className="space-y-1 flex-1">
                <Label className="doc-validade-text text-xs font-medium">Data de validade do documento</Label>
                <Input
                  type="date"
                  value={dataValidade}
                  onChange={(e) => setDataValidade(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              {dataValidade && (
                <button
                  type="button"
                  className="doc-validade-text text-xs underline mb-1 hover:opacity-75"
                  onClick={() => setDataValidade('')}
                >
                  Remover
                </button>
              )}
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
                checked={vincularCobranca}
                onCheckedChange={(v) => setVincularCobranca(v)}
              />
            </div>

            {vincularCobranca && (
              <>
                <div className="flex gap-1 rounded-md border p-0.5 w-fit bg-background">
                  <button
                    type="button"
                    className={`px-3 py-1 text-xs rounded transition-colors ${tipoVinculo === 'existente' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    onClick={() => setTipoVinculo('existente')}
                  >
                    Fatura existente
                  </button>
                  <button
                    type="button"
                    className={`px-3 py-1 text-xs rounded transition-colors ${tipoVinculo === 'nova' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    onClick={() => setTipoVinculo('nova')}
                  >
                    Nova cobrança
                  </button>
                </div>

                {tipoVinculo === 'existente' ? (
                  openInvoices.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Nenhuma fatura aberta ou vencida para este cliente.</p>
                  ) : (
                    <div className="space-y-1">
                      <Label className="text-xs">Fatura</Label>
                      <Select value={invoiceId} onValueChange={setInvoiceId}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Selecionar fatura..." />
                        </SelectTrigger>
                        <SelectContent>
                          {openInvoices.map((inv) => (
                            <SelectItem key={inv.id} value={inv.id}>
                              {inv.competencia} — {inv.valor_original.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} ({inv.status})
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
                      <Input value={novaDesc} onChange={(e) => setNovaDesc(e.target.value)} placeholder="AAAA-MM" className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Valor (R$)</Label>
                      <Input value={novaValor} onChange={(e) => setNovaValor(e.target.value)} placeholder="0,00" className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1 col-span-2">
                      <Label className="text-xs">Vencimento</Label>
                      <Input type="date" value={novaVenc} onChange={(e) => setNovaVenc(e.target.value)} className="h-8 text-sm" />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1 border-t">
                  <Label className="text-xs text-muted-foreground">Liberar download somente após pagamento</Label>
                  <Switch checked={downloadAposPagamento} onCheckedChange={setDownloadAposPagamento} />
                </div>
              </>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!nome.trim() || isSaving}>
            {isSaving ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---- Document Row Actions ----
function DocActions({
  doc,
  userId,
  tenantId,
  onHistorico,
  onShare,
  onView,
  onEdit,
  onDelete,
}: {
  doc: Document
  userId: string
  tenantId: string
  onHistorico: () => void
  onShare: () => void
  onView: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const createEvent = useCreateDocumentEvent()
  const updateDoc = useUpdateDocument()
  const { toast } = useToast()

  async function handleDownload() {
    let url: string
    try {
      const fileId = doc.provider_file_id ?? doc.storage_key
      const provedor = await obterProvedorStorage(tenantId)
      url = await provedor.baixar(fileId)
    } catch (err) {
      if (String(err).includes('arquivo_ausente')) {
        await updateDoc.mutateAsync({ id: doc.id, data: { storage_status: 'arquivo_ausente' } })
        toast({ title: 'Arquivo não encontrado no armazenamento.', variant: 'destructive' })
      } else {
        toast({
          title: 'Arquivo de exemplo — faça upload de um arquivo real para testar o download.',
          variant: 'destructive',
        })
      }
      return
    }

    await createEvent.mutateAsync({
      id: uuidv4(),
      document_id: doc.id,
      user_id: userId,
      evento: 'download',
      ip: '127.0.0.1',
      em: new Date().toISOString(),
    })

    const a = window.document.createElement('a')
    a.href = url
    a.download = doc.nome
    a.click()
  }

  return (
    <>
      {/* Mobile: Download em destaque + menu "..." para o restante */}
      <div className="sm:hidden flex gap-2">
        <Button variant="outline" size="sm" className="flex-1 h-9" onClick={handleDownload}>
          <Download className="mr-1.5 h-4 w-4" /> Baixar
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onView}>
              <Eye className="mr-2 h-4 w-4" /> Visualizar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="mr-2 h-4 w-4" /> Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onShare}>
              <Share2 className="mr-2 h-4 w-4" /> Compartilhar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onHistorico}>
              <History className="mr-2 h-4 w-4" /> Histórico
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
              <Trash2 className="mr-2 h-4 w-4" /> Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Desktop: 6 botões de ícone */}
      <div className="hidden sm:flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-7 w-7" title="Download" onClick={handleDownload}>
          <Download className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" title="Visualizar" onClick={onView}>
          <Eye className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" title="Editar" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" title="Compartilhar" onClick={onShare}>
          <Share2 className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" title="Histórico" onClick={onHistorico}>
          <History className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          title="Excluir"
          onClick={onDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </>
  )
}

// ---- Main Page ----
export default function DocumentosPage() {
  const { currentUser } = useAuth()
  const tenantId = currentUser?.tenant_id ?? ''
  const [searchParams] = useSearchParams()

  // View mode
  const [viewMode, setViewMode] = useState<'cliente' | 'tipo'>('cliente')

  // "Por Cliente" state
  const { data: clients, isLoading: loadingClients } = useClients(tenantId)
  const [selectedClientId, setSelectedClientId] = useState(() => searchParams.get('cliente') ?? '')
  const [folderPath, setFolderPath] = useState<Folder[]>([])
  const { data: folders } = useClientFolders(tenantId, selectedClientId)
  const currentFolder = folderPath.length > 0 ? folderPath[folderPath.length - 1] : null
  const currentFolderId = currentFolder?.id ?? ''
  const { data: folderDocs, isLoading: loadingDocs } = useFolderDocuments(currentFolderId)

  // "Por Tipo" state
  const [selectedFolderType, setSelectedFolderType] = useState<FolderType | ''>('')
  const [filterClientTipo, setFilterClientTipo] = useState('')
  const { data: allFolders } = useFolders(tenantId)
  const { data: allDocs, isLoading: loadingAllDocs } = useDocuments(tenantId)

  // Shared
  const { data: docTypes } = useDocumentTypes(tenantId)
  const deleteDoc = useDeleteDocument()
  const updateDoc = useUpdateDocument()
  const { toast } = useToast()

  const [filterComp, setFilterComp] = useState('')
  const [filterDocType, setFilterDocType] = useState('')
  const [search, setSearch] = useState('')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploadMassaOpen, setUploadMassaOpen] = useState(false)
  const [newFolderOpen, setNewFolderOpen] = useState(false)

  const [leftPanelOpen, setLeftPanelOpen] = useState(() => window.innerWidth >= 768)

  const [historicoDoc, setHistoricoDoc] = useState<Document | null>(null)
  const [shareDoc, setShareDoc] = useState<Document | null>(null)
  const [editDoc, setEditDoc] = useState<Document | null>(null)
  const [viewerDoc, setViewerDoc] = useState<Document | null>(null)
  const [viewerUrl, setViewerUrl] = useState<string | null>(null)

  const activeClients = clients?.filter((c) => c.status === 'ativo') ?? []

  // Folders at the current navigation level
  const currentLevelFolders = (folders ?? []).filter(
    (f) => (f.parent_id ?? null) === (currentFolder?.id ?? null)
  )

  function navigateInto(folder: Folder) {
    setFolderPath((prev) => [...prev, folder])
  }

  async function handleOpenViewer(doc: Document) {
    let url: string | null = null
    try {
      const fileId = doc.provider_file_id ?? doc.storage_key
      const provedor = await obterProvedorStorage(tenantId)
      url = await provedor.baixar(fileId)
    } catch (err) {
      if (String(err).includes('arquivo_ausente')) {
        await updateDoc.mutateAsync({ id: doc.id, data: { storage_status: 'arquivo_ausente' } })
        toast({ title: 'Arquivo não encontrado no armazenamento.', variant: 'destructive' })
      }
      // arquivo de seed sem conteúdo real — abre viewer sem URL
    }
    setViewerDoc(doc)
    setViewerUrl(url)
  }

  function handleClientChange(clientId: string) {
    setSelectedClientId(clientId)
    setFolderPath([])
  }

  const activeDocTypeFilter = filterDocType && filterDocType !== '__all__' ? filterDocType : ''
  const activeClientTipoFilter = filterClientTipo && filterClientTipo !== '__all__' ? filterClientTipo : ''

  // "Por Cliente" filtered docs
  const filteredDocs = folderDocs?.filter((d) => {
    if (filterComp && !d.competencia.includes(filterComp)) return false
    if (activeDocTypeFilter && d.type_id !== activeDocTypeFilter) return false
    if (search && !d.nome.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  // "Por Tipo" computed data
  const tipoModeDocs = allDocs?.filter((doc) => {
    const folder = allFolders?.find((f) => f.id === doc.folder_id)
    if (selectedFolderType && folder?.tipo_padrao !== selectedFolderType) return false
    if (activeClientTipoFilter && doc.client_id !== activeClientTipoFilter) return false
    if (activeDocTypeFilter && doc.type_id !== activeDocTypeFilter) return false
    if (filterComp && !doc.competencia.includes(filterComp)) return false
    if (search && !doc.nome.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  // Count docs per folder type for sidebar badges
  const folderTypeCounts = (Object.keys(folderTypeLabels) as FolderType[]).reduce(
    (acc, type) => {
      acc[type] =
        allDocs?.filter((doc) => {
          const f = allFolders?.find((f) => f.id === doc.folder_id)
          return f?.tipo_padrao === type
        }).length ?? 0
      return acc
    },
    {} as Record<FolderType, number>,
  )

  const DIAS_RECENTE = 7
  const folderDocCounts = (folders ?? []).reduce<Record<string, number>>((acc, f) => {
    acc[f.id] = (allDocs ?? []).filter((d) => d.folder_id === f.id).length
    return acc
  }, {})
  const folderRecentCounts = (folders ?? []).reduce<Record<string, number>>((acc, f) => {
    acc[f.id] = (allDocs ?? []).filter((d) => {
      if (d.folder_id !== f.id) return false
      try { return differenceInDays(new Date(), parseISO(d.criado_em)) <= DIAS_RECENTE } catch { return false }
    }).length
    return acc
  }, {})
  const folderTypeRecentCounts = (Object.keys(folderTypeLabels) as FolderType[]).reduce<Record<FolderType, number>>(
    (acc, type) => {
      acc[type] = (allDocs ?? []).filter((d) => {
        const f = allFolders?.find((fol) => fol.id === d.folder_id)
        if (f?.tipo_padrao !== type) return false
        try { return differenceInDays(new Date(), parseISO(d.criado_em)) <= DIAS_RECENTE } catch { return false }
      }).length
      return acc
    },
    {} as Record<FolderType, number>,
  )

  const docTypeName = (typeId: string) =>
    docTypes?.find((dt) => dt.id === typeId)?.nome ?? typeId

  const clientName = (clientId: string) =>
    clients?.find((c) => c.id === clientId)?.razao_social ?? clientId

  const folderName = (folderId: string) =>
    allFolders?.find((f) => f.id === folderId)?.nome ?? folderId

  async function handleDelete(doc: Document) {
    if (!confirm(`Excluir "${doc.nome}"?`)) return
    try {
      const fileId = doc.provider_file_id ?? doc.storage_key
      const provedor = await obterProvedorStorage(tenantId)
      await provedor.excluir(fileId)
      await storageService.excluirThumbnail(fileId)
      await deleteDoc.mutateAsync(doc.id)
      toast({ title: 'Documento excluído.' })
    } catch {
      toast({ title: 'Erro ao excluir', variant: 'destructive' })
    }
  }

  if (loadingClients) return <PageLoader />

  return (
    <div className="flex flex-col md:h-[calc(100vh-5rem)]">
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30 shrink-0 gap-2">
        <div className="flex items-center gap-2">
          {/* Panel toggle — desktop only */}
          <Button
            variant="ghost"
            size="sm"
            className="hidden md:inline-flex h-8 w-8 p-0 shrink-0"
            onClick={() => setLeftPanelOpen((o) => !o)}
            title={leftPanelOpen ? 'Ocultar painel' : 'Mostrar painel'}
          >
            <PanelLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-1 bg-muted rounded-md p-0.5">
            <button
              className={`px-3 py-1 text-sm rounded transition-colors ${
                viewMode === 'cliente'
                  ? 'bg-background shadow-sm font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setViewMode('cliente')}
            >
              Por Cliente
            </button>
            <button
              className={`px-3 py-1 text-sm rounded transition-colors ${
                viewMode === 'tipo'
                  ? 'bg-background shadow-sm font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setViewMode('tipo')}
            >
              Por Tipo
            </button>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setUploadMassaOpen(true)} className="gap-1.5 shrink-0">
          <Upload className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Upload em Massa</span>
        </Button>
      </div>

      {/* ── Mobile context selectors (hidden on md+) ── */}
      {viewMode === 'cliente' && folderPath.length === 0 && (
        <div className="md:hidden p-3 border-b shrink-0 bg-background">
          <Select value={selectedClientId} onValueChange={handleClientChange}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Selecionar cliente..." />
            </SelectTrigger>
            <SelectContent>
              {activeClients.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.razao_social}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {viewMode === 'tipo' && (
        <div className="md:hidden p-3 border-b shrink-0 bg-background">
          <Select
            value={selectedFolderType || '__all__'}
            onValueChange={(v) => setSelectedFolderType(v === '__all__' ? '' : v as FolderType)}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Todas as categorias" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas as categorias ({allDocs?.length ?? 0})</SelectItem>
              {(Object.keys(folderTypeLabels) as FolderType[]).map((type) => (
                <SelectItem key={type} value={type}>
                  {folderTypeLabels[type]} ({folderTypeCounts[type]})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* ── Main content: side-by-side on desktop, stacked on mobile ── */}
      <div className="flex flex-col md:flex-row md:flex-1 md:overflow-hidden">

        {/* ====== LEFT PANEL — desktop only ====== */}
        {leftPanelOpen && (viewMode === 'cliente' ? (
          <div className="hidden md:flex flex-col gap-3 p-3 overflow-y-auto w-56 shrink-0 border-r">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Cliente</Label>
              <Select value={selectedClientId} onValueChange={handleClientChange}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  {activeClients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.razao_social}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedClientId && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Pastas</span>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" title="Nova pasta" onClick={() => setNewFolderOpen(true)}>
                    <FolderPlus className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {!(folders ?? []).filter((f) => f.parent_id === null).length ? (
                  <p className="text-xs text-muted-foreground">Nenhuma pasta.</p>
                ) : (
                  <ul className="space-y-0.5">
                    {(folders ?? [])
                      .filter((f) => f.parent_id === null)
                      .map((folder) => (
                        <li key={folder.id}>
                          <button
                            className={`w-full text-left flex items-center gap-2 rounded px-2 py-1.5 text-sm transition-colors ${
                              folderPath[0]?.id === folder.id
                                ? 'bg-primary text-primary-foreground'
                                : 'hover:bg-muted'
                            }`}
                            onClick={() => setFolderPath([folder])}
                          >
                            <FolderOpen className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate flex-1">{folder.nome}</span>
                            {(folderRecentCounts[folder.id] ?? 0) > 0 && (
                              <span
                                className={`h-1.5 w-1.5 rounded-full shrink-0 ${folderPath[0]?.id === folder.id ? 'bg-primary-foreground/80' : 'bg-blue-500'}`}
                                title={`${folderRecentCounts[folder.id]} arquivo(s) recente(s)`}
                              />
                            )}
                            {(folderDocCounts[folder.id] ?? 0) > 0 && (
                              <span className={`text-xs shrink-0 tabular-nums ${folderPath[0]?.id === folder.id ? 'opacity-70' : 'text-muted-foreground'}`}>
                                {folderDocCounts[folder.id]}
                              </span>
                            )}
                            {folder.sistema && (
                              <Lock className="h-3 w-3 shrink-0 opacity-40" aria-label="Pasta padrão" />
                            )}
                          </button>
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="hidden md:flex flex-col gap-2 p-3 overflow-y-auto w-56 shrink-0 border-r">
            <p className="text-xs font-medium text-muted-foreground mb-1">Categoria</p>
            <ul className="space-y-0.5">
              <li>
                <button
                  className={`w-full text-left flex items-center justify-between rounded px-2 py-1.5 text-sm transition-colors ${
                    selectedFolderType === '' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                  }`}
                  onClick={() => setSelectedFolderType('')}
                >
                  <span>Todos</span>
                  <span className="text-xs opacity-70">{allDocs?.length ?? 0}</span>
                </button>
              </li>
              {(Object.keys(folderTypeLabels) as FolderType[]).map((type) => (
                <li key={type}>
                  <button
                    className={`w-full text-left flex items-center justify-between rounded px-2 py-1.5 text-sm transition-colors ${
                      selectedFolderType === type ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                    }`}
                    onClick={() => setSelectedFolderType(type)}
                  >
                    <span className="flex items-center gap-1.5">
                      {(folderTypeRecentCounts[type] ?? 0) > 0 && (
                        <span
                          className={`h-1.5 w-1.5 rounded-full shrink-0 ${selectedFolderType === type ? 'bg-primary-foreground/80' : 'bg-blue-500'}`}
                          title={`${folderTypeRecentCounts[type]} arquivo(s) recente(s)`}
                        />
                      )}
                      {folderTypeLabels[type]}
                    </span>
                    <span className="text-xs opacity-70 ml-2">{folderTypeCounts[type]}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {/* ====== RIGHT PANEL ====== */}
        <div className="flex-1 flex flex-col min-w-0 md:overflow-hidden">
          {viewMode === 'cliente' ? (
            !selectedClientId ? (
              <div className="flex items-center justify-center py-16 md:flex-1">
                <EmptyState
                  icon={Users}
                  title="Selecione um cliente"
                  description="Escolha um cliente para navegar pelas pastas e documentos."
                />
              </div>
            ) : (
              <div className="flex flex-col md:flex-1 md:overflow-hidden">
                {/* ── Breadcrumb ── */}
                <div className="px-3 py-2 border-b flex items-center gap-1 min-w-0 shrink-0">
                  <button
                    onClick={() => setFolderPath([])}
                    className={`text-sm shrink-0 transition-colors ${folderPath.length === 0 ? 'font-medium text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    Pastas
                  </button>
                  {folderPath.map((f, i) => (
                    <Fragment key={f.id}>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <button
                        onClick={() => setFolderPath((prev) => prev.slice(0, i + 1))}
                        className={`text-sm transition-colors truncate max-w-[120px] ${
                          i === folderPath.length - 1
                            ? 'font-medium text-foreground'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {f.nome}
                      </button>
                    </Fragment>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 ml-auto shrink-0 text-xs"
                    onClick={() => setNewFolderOpen(true)}
                  >
                    <FolderPlus className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Nova Pasta</span>
                  </Button>
                </div>

                <div className="overflow-auto md:flex-1">
                  {/* ── Pastas neste nível ── */}
                  {currentLevelFolders.length > 0 && (
                    <div className={currentFolderId ? 'border-b' : ''}>
                      {currentLevelFolders.map((folder) => (
                        <button
                          key={folder.id}
                          onClick={() => navigateInto(folder)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 active:bg-muted transition-colors border-b last:border-b-0 min-h-[60px] text-left"
                        >
                          <div className="relative shrink-0">
                            <FolderOpen className="h-9 w-9 text-primary/50" />
                            {(folderRecentCounts[folder.id] ?? 0) > 0 && (
                              <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-blue-500 border-2 border-background" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{folder.nome}</p>
                            <p className="text-xs text-muted-foreground">
                              {folderTypeLabels[folder.tipo_padrao]}
                              {(folderDocCounts[folder.id] ?? 0) > 0 && (
                                <span className="ml-1">· {folderDocCounts[folder.id]} {folderDocCounts[folder.id] === 1 ? 'arquivo' : 'arquivos'}</span>
                              )}
                            </p>
                          </div>
                          {(folderRecentCounts[folder.id] ?? 0) > 0 && (
                            <Badge variant="outline" className="text-xs shrink-0 border-blue-500/30 text-blue-600 bg-blue-500/10 dark:text-blue-400">
                              {folderRecentCounts[folder.id]} novo{folderRecentCounts[folder.id] > 1 ? 's' : ''}
                            </Badge>
                          )}
                          {folder.sistema && (
                            <Lock className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                          )}
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* ── Documentos (somente dentro de uma pasta) ── */}
                  {currentFolderId ? (
                    <>
                      <div className="p-3 border-b space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Documentos{filteredDocs?.length ? ` (${filteredDocs.length})` : ''}
                          </span>
                          <Button size="sm" onClick={() => setUploadOpen(true)} className="h-8 gap-1.5">
                            <Upload className="h-3.5 w-3.5" /> Upload
                          </Button>
                        </div>
                        <Input placeholder="Buscar por nome..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 text-sm" />
                        <div className="flex gap-2">
                          <Input placeholder="Competência" value={filterComp} onChange={(e) => setFilterComp(e.target.value)} className="h-8 text-sm flex-1" />
                          <Select value={filterDocType} onValueChange={setFilterDocType}>
                            <SelectTrigger className="h-8 text-sm flex-1"><SelectValue placeholder="Tipo" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__all__">Todos os tipos</SelectItem>
                              {docTypes?.map((dt) => <SelectItem key={dt.id} value={dt.id}>{dt.nome}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="p-3 space-y-2">
                        {loadingDocs ? (
                          <PageLoader />
                        ) : !filteredDocs?.length ? (
                          <EmptyState
                            icon={FileText}
                            title="Nenhum documento"
                            description="Faça upload de documentos para esta pasta."
                            action={<Button size="sm" onClick={() => setUploadOpen(true)}><Upload className="mr-1.5 h-3.5 w-3.5" /> Upload</Button>}
                          />
                        ) : (
                          filteredDocs.map((doc) => (
                            <div key={doc.id} className="rounded-lg border bg-card p-3 space-y-2">
                              <div className="flex items-start gap-3">
                                <DocumentThumbnail storageKey={doc.storage_key} />
                                <div className="flex-1 min-w-0 space-y-1">
                                  <p className="font-semibold text-sm leading-tight wrap-break-word">{doc.nome}</p>
                                  <div className="flex flex-wrap gap-1">
                                    <Badge variant="secondary" className="text-xs">{docTypeName(doc.type_id)}</Badge>
                                    <ValidadeBadge doc={doc} docTypes={docTypes} />
                                  </div>
                                </div>
                                <div className="hidden sm:block shrink-0">
                                  <DocActions doc={doc} userId={currentUser?.id ?? ''} tenantId={tenantId} onHistorico={() => setHistoricoDoc(doc)} onShare={() => setShareDoc(doc)} onView={() => handleOpenViewer(doc)} onEdit={() => setEditDoc(doc)} onDelete={() => handleDelete(doc)} />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
                                <span className="text-muted-foreground">Competência</span>
                                <span className="text-right font-medium">{doc.competencia}</span>
                                <span className="text-muted-foreground">Versão</span>
                                <span className="text-right">v{doc.versao}</span>
                                <span className="text-muted-foreground">Tamanho</span>
                                <span className="text-right">{formatFileSize(doc.tamanho)}</span>
                                <span className="text-muted-foreground">Enviado em</span>
                                <span className="text-right">{formatDate(doc.criado_em.split('T')[0])}</span>
                              </div>
                              <div className="sm:hidden">
                                <DocActions doc={doc} userId={currentUser?.id ?? ''} tenantId={tenantId} onHistorico={() => setHistoricoDoc(doc)} onShare={() => setShareDoc(doc)} onView={() => handleOpenViewer(doc)} onEdit={() => setEditDoc(doc)} onDelete={() => handleDelete(doc)} />
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </>
                  ) : (
                    currentLevelFolders.length === 0 && (
                      <div className="flex items-center justify-center py-12">
                        <EmptyState
                          icon={FolderOpen}
                          title="Nenhuma pasta"
                          description="Crie uma pasta para organizar os documentos deste cliente."
                          action={
                            <Button size="sm" onClick={() => setNewFolderOpen(true)}>
                              <FolderPlus className="mr-1.5 h-3.5 w-3.5" /> Nova Pasta
                            </Button>
                          }
                        />
                      </div>
                    )
                  )}
                </div>
              </div>
            )
          ) : (
            /* Por Tipo right panel */
            <>
              {/* Filter bar */}
              <div className="p-3 border-b space-y-2 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">
                    {selectedFolderType ? folderTypeLabels[selectedFolderType] : 'Todos os documentos'}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {tipoModeDocs?.length ?? 0} doc{tipoModeDocs?.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
                <div className="space-y-1.5">
                  <Input placeholder="Buscar por nome..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 text-sm" />
                  <div className="flex gap-2">
                    <Select value={filterClientTipo} onValueChange={setFilterClientTipo}>
                      <SelectTrigger className="h-8 text-sm flex-1"><SelectValue placeholder="Cliente" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">Todos os clientes</SelectItem>
                        {activeClients.map((c) => <SelectItem key={c.id} value={c.id}>{c.razao_social}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={filterDocType} onValueChange={setFilterDocType}>
                      <SelectTrigger className="h-8 text-sm flex-1"><SelectValue placeholder="Tipo" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">Todos os tipos</SelectItem>
                        {docTypes?.map((dt) => <SelectItem key={dt.id} value={dt.id}>{dt.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Input placeholder="Competência (ex: 2025-07)" value={filterComp} onChange={(e) => setFilterComp(e.target.value)} className="h-8 text-sm" />
                </div>
              </div>
              {/* Documents */}
              <div className="overflow-auto p-3 md:flex-1">
                {loadingAllDocs ? (
                  <PageLoader />
                ) : !tipoModeDocs?.length ? (
                  <EmptyState icon={FileText} title="Nenhum documento encontrado" description="Ajuste os filtros ou faça upload via Upload em Massa." />
                ) : (
                  <div className="flex flex-col gap-2">
                    {tipoModeDocs.map((doc) => (
                      <div key={doc.id} className="rounded-lg border bg-card p-3 space-y-2">
                        <div className="flex items-start gap-3">
                          <DocumentThumbnail storageKey={doc.storage_key} />
                          <div className="flex-1 min-w-0 space-y-1">
                            <p className="font-semibold text-sm leading-tight wrap-break-word">{doc.nome}</p>
                            <div className="flex flex-wrap gap-1">
                              <Badge variant="secondary" className="text-xs">{docTypeName(doc.type_id)}</Badge>
                              <ValidadeBadge doc={doc} docTypes={docTypes} />
                            </div>
                          </div>
                          {/* Desktop: ícones no canto superior direito */}
                          <div className="hidden sm:block shrink-0">
                            <DocActions doc={doc} userId={currentUser?.id ?? ''} tenantId={tenantId} onHistorico={() => setHistoricoDoc(doc)} onShare={() => setShareDoc(doc)} onView={() => handleOpenViewer(doc)} onEdit={() => setEditDoc(doc)} onDelete={() => handleDelete(doc)} />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
                          <span className="text-muted-foreground">Cliente</span>
                          <span className="text-right font-medium truncate">{clientName(doc.client_id)}</span>
                          <span className="text-muted-foreground">Pasta</span>
                          <span className="text-right truncate">{folderName(doc.folder_id)}</span>
                          <span className="text-muted-foreground">Competência</span>
                          <span className="text-right">{doc.competencia}</span>
                          <span className="text-muted-foreground">Tamanho</span>
                          <span className="text-right">{formatFileSize(doc.tamanho)}</span>
                          <span className="text-muted-foreground">Enviado em</span>
                          <span className="text-right">{formatDate(doc.criado_em.split('T')[0])}</span>
                        </div>
                        {/* Mobile: barra de ações no rodapé */}
                        <div className="sm:hidden">
                          <DocActions doc={doc} userId={currentUser?.id ?? ''} tenantId={tenantId} onHistorico={() => setHistoricoDoc(doc)} onShare={() => setShareDoc(doc)} onView={() => handleOpenViewer(doc)} onEdit={() => setEditDoc(doc)} onDelete={() => handleDelete(doc)} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      {uploadOpen && currentFolderId && selectedClientId && (
        <UploadModal
          open={uploadOpen}
          onClose={() => setUploadOpen(false)}
          tenantId={tenantId}
          clientId={selectedClientId}
          folderId={currentFolderId}
          userId={currentUser?.id ?? ''}
          documentTypes={docTypes ?? []}
        />
      )}

      <NewFolderDialog
        open={newFolderOpen}
        onClose={() => setNewFolderOpen(false)}
        tenantId={tenantId}
        clientId={selectedClientId}
        parentId={currentFolderId || null}
      />

      {editDoc && (
        <EditDocumentDialog
          doc={editDoc}
          docTypes={docTypes}
          tenantId={tenantId}
          open={!!editDoc}
          onClose={() => setEditDoc(null)}
        />
      )}

      {historicoDoc && (
        <HistoricoDialog
          doc={historicoDoc}
          open={!!historicoDoc}
          onClose={() => setHistoricoDoc(null)}
        />
      )}

      {shareDoc && (
        <ShareDialog
          doc={shareDoc}
          open={!!shareDoc}
          onClose={() => setShareDoc(null)}
          tenantId={tenantId}
        />
      )}

      <UploadEmMassaModal
        open={uploadMassaOpen}
        onClose={() => setUploadMassaOpen(false)}
      />

      <DocumentViewerModal
        doc={viewerDoc}
        url={viewerUrl}
        open={!!viewerDoc}
        onClose={() => { setViewerDoc(null); setViewerUrl(null) }}
        onDownload={() => {
          if (!viewerUrl || !viewerDoc) return
          const a = window.document.createElement('a')
          a.href = viewerUrl
          a.download = viewerDoc.nome
          a.click()
        }}
      />
    </div>
  )
}
