import { useState, Fragment } from 'react'
import { Navigate } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import { usePortalAcesso } from '@/data/hooks/usePortalAcesso'
import { differenceInDays, format, parseISO } from 'date-fns'
import { useAuth } from '@/auth/AuthProvider'
import { useClientFolders } from '@/data/hooks/useFolders'
import { useFolderDocuments, useClientDocuments } from '@/data/hooks/useDocuments'
import { useClientInvoices } from '@/data/hooks/useInvoices'
import { useDocumentTypes } from '@/data/hooks/useDocumentTypes'
import { useCreateDocumentEvent } from '@/data/hooks/useDocumentEvents'
import { useBillingPolicy } from '@/data/hooks/useBillingPolicy'
import { obterProvedorStorage } from '@/lib/storage'
import { useUpdateDocument } from '@/data/hooks/useDocuments'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/components/ui/use-toast'
import {
  FolderOpen,
  Download,
  Eye,
  FileText,
  AlertTriangle,
  CreditCard,
  Clock,
  ChevronRight,
} from 'lucide-react'
import type { Document, DocumentType, Folder } from '@/domain/types'
import { formatDate } from '@/lib/utils'
import { calcularEncargos } from '@/domain/financeiro/calcularEncargos'
import { podeBaixar } from '@/domain/documentos/podeBaixar'
import { BloqueioModal } from './BloqueioModal'
import { CobrancaDocumentoModal } from './CobrancaDocumentoModal'
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
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-destructive/10 text-destructive border border-destructive/20 shrink-0">
        <AlertTriangle className="h-3 w-3" /> Vencido
      </span>
    )
  }
  if (dias <= 30) {
    return (
      <span className="doc-validade-badge inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium shrink-0">
        <Clock className="h-3 w-3" /> Vence em {dias}d
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground border shrink-0">
      <Clock className="h-3 w-3" /> Válido até {format(validade, 'dd/MM/yyyy')}
    </span>
  )
}

const folderTypeLabels: Record<string, string> = {
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

export default function PortalDocumentos() {
  const { secoesPermitidas, isLoading: loadingAcesso } = usePortalAcesso()
  const { currentUser } = useAuth()
  const tenantId = currentUser?.tenant_id ?? ''
  const clientId = currentUser?.client_id ?? ''

  const { data: folders, isLoading: loadingFolders } = useClientFolders(tenantId, clientId)

  // Folder navigation state (Google Drive style)
  const [folderPath, setFolderPath] = useState<Folder[]>([])
  const currentFolder = folderPath.length > 0 ? folderPath[folderPath.length - 1] : null
  const currentFolderId = currentFolder?.id ?? ''

  const { data: folderDocs, isLoading: loadingDocs } = useFolderDocuments(currentFolderId)
  const { data: allClientDocs } = useClientDocuments(tenantId, clientId)
  const { data: invoices } = useClientInvoices(tenantId, clientId)
  const { data: docTypes } = useDocumentTypes(tenantId)
  const { data: policy } = useBillingPolicy(tenantId)
  const createEvent = useCreateDocumentEvent()
  const updateDoc = useUpdateDocument()
  const { toast } = useToast()

  const [filterComp, setFilterComp] = useState('')
  const [bloqueioDoc, setBloqueioDoc] = useState<Document | null>(null)
  const [cobrancaDoc, setCobrancaDoc] = useState<Document | null>(null)
  const [showPendenciaBanner, setShowPendenciaBanner] = useState(false)
  const [viewerDoc, setViewerDoc] = useState<Document | null>(null)
  const [viewerUrl, setViewerUrl] = useState<string | null>(null)

  if (loadingAcesso) return <PageLoader />
  if (!secoesPermitidas.includes('documentos')) return <Navigate to="/portal/inicio" replace />

  const today = new Date()
  const allInvoices = invoices ?? []

  const vencidasForaCarencia = allInvoices.filter(
    (inv) =>
      inv.status === 'vencida' &&
      policy &&
      differenceInDays(today, parseISO(inv.vencimento)) > policy.carencia_dias
  )

  const calculosVencidas = vencidasForaCarencia.map((inv) =>
    calcularEncargos(inv, policy!, today)
  )

  // Folders at the current navigation level
  const currentLevelFolders = (folders ?? []).filter(
    (f) => (f.parent_id ?? null) === (currentFolder?.id ?? null)
  )

  const DIAS_RECENTE = 7
  const folderDocCounts = (folders ?? []).reduce<Record<string, number>>((acc, f) => {
    acc[f.id] = (allClientDocs ?? []).filter((d) => d.folder_id === f.id).length
    return acc
  }, {})
  const folderRecentCounts = (folders ?? []).reduce<Record<string, number>>((acc, f) => {
    acc[f.id] = (allClientDocs ?? []).filter((d) => {
      if (d.folder_id !== f.id) return false
      try { return differenceInDays(new Date(), parseISO(d.criado_em)) <= DIAS_RECENTE } catch { return false }
    }).length
    return acc
  }, {})

  function navigateInto(folder: Folder) {
    setFolderPath((prev) => [...prev, folder])
    setFilterComp('')
  }

  const filteredDocs = folderDocs?.filter((d) => {
    if (filterComp && !d.competencia.includes(filterComp)) return false
    return true
  })

  const docTypeName = (typeId: string) =>
    docTypes?.find((dt) => dt.id === typeId)?.nome ?? typeId

  function getDocInvoice(doc: Document) {
    if (!doc.invoice_id) return null
    return allInvoices.find((inv) => inv.id === doc.invoice_id) ?? null
  }

  async function handleDownload(doc: Document) {
    if (!policy) return
    const docType = docTypes?.find((dt) => dt.id === doc.type_id)
    if (!docType) return

    const result = podeBaixar(doc, docType, vencidasForaCarencia, policy, allInvoices)
    if (!result.permitido) {
      result.motivo === 'cobranca_pendente' ? setCobrancaDoc(doc) : setBloqueioDoc(doc)
      return
    }
    if (result.motivo === 'informativo') setShowPendenciaBanner(true)

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
        toast({ title: 'Arquivo de exemplo — faça upload de um arquivo real para testar o download.', variant: 'destructive' })
      }
      return
    }

    await createEvent.mutateAsync({
      id: uuidv4(),
      document_id: doc.id,
      user_id: currentUser?.id ?? '',
      evento: 'download',
      ip: '127.0.0.1',
      em: new Date().toISOString(),
    })

    const a = window.document.createElement('a')
    a.href = url
    a.download = doc.nome
    a.click()
  }

  async function handleView(doc: Document) {
    if (!policy) return
    const docType = docTypes?.find((dt) => dt.id === doc.type_id)
    if (!docType) return

    const result = podeBaixar(doc, docType, vencidasForaCarencia, policy, allInvoices)
    if (!result.permitido) {
      result.motivo === 'cobranca_pendente' ? setCobrancaDoc(doc) : setBloqueioDoc(doc)
      return
    }

    let url: string | null = null
    try {
      const fileId = doc.provider_file_id ?? doc.storage_key
      const provedor = await obterProvedorStorage(tenantId)
      url = await provedor.baixar(fileId)
      await createEvent.mutateAsync({
        id: uuidv4(),
        document_id: doc.id,
        user_id: currentUser?.id ?? '',
        evento: 'view',
        ip: '127.0.0.1',
        em: new Date().toISOString(),
      })
    } catch (err) {
      if (String(err).includes('arquivo_ausente')) {
        await updateDoc.mutateAsync({ id: doc.id, data: { storage_status: 'arquivo_ausente' } })
        toast({ title: 'Arquivo não encontrado no armazenamento.', variant: 'destructive' })
      }
    }

    setViewerDoc(doc)
    setViewerUrl(url)
  }

  if (loadingFolders) return <PageLoader />

  return (
    <div className="flex flex-col md:h-[calc(100vh-5rem)]">
      <div className="flex flex-col md:flex-row md:flex-1 md:overflow-hidden">

        {/* ── Left panel — desktop only ── */}
        <div className="hidden md:flex flex-col p-3 overflow-y-auto w-56 shrink-0 border-r gap-1">
          <p className="text-xs font-medium text-muted-foreground mb-1 px-1">Pastas</p>
          {!(folders ?? []).filter((f) => f.parent_id === null).length ? (
            <p className="text-xs text-muted-foreground px-2">Nenhuma pasta disponível.</p>
          ) : (
            (folders ?? [])
              .filter((f) => f.parent_id === null)
              .map((folder) => (
                <button
                  key={folder.id}
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
                </button>
              ))
          )}
        </div>

        {/* ── Main area ── */}
        <div className="flex-1 flex flex-col min-w-0 md:overflow-hidden">

          {/* Breadcrumb */}
          <div className="px-3 py-2 border-b flex items-center gap-1 min-w-0 shrink-0 bg-background">
            <button
              onClick={() => setFolderPath([])}
              className={`text-sm shrink-0 transition-colors ${
                folderPath.length === 0
                  ? 'font-medium text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Pastas
            </button>
            {folderPath.map((f, i) => (
              <Fragment key={f.id}>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <button
                  onClick={() => setFolderPath((prev) => prev.slice(0, i + 1))}
                  className={`text-sm transition-colors truncate max-w-30 ${
                    i === folderPath.length - 1
                      ? 'font-medium text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {f.nome}
                </button>
              </Fragment>
            ))}
          </div>

          <div className="overflow-auto md:flex-1">
            {/* Pending info banner */}
            {showPendenciaBanner && currentFolderId && (
              <Alert variant="warning" className="m-3 mb-0 shrink-0">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Você possui faturas em aberto. Regularize para manter o acesso completo.
                </AlertDescription>
              </Alert>
            )}

            {/* ── Pastas neste nível ── */}
            {currentLevelFolders.length > 0 && (
              <div className={`divide-y ${currentFolderId ? 'border-b' : ''}`}>
                {currentLevelFolders.map((folder) => (
                  <button
                    key={folder.id}
                    onClick={() => navigateInto(folder)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 active:bg-muted transition-colors min-h-15 text-left"
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
                        {folderTypeLabels[folder.tipo_padrao] ?? folder.tipo_padrao}
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
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </button>
                ))}
              </div>
            )}

            {/* ── Documentos (somente dentro de uma pasta) ── */}
            {currentFolderId ? (
              <>
                {/* Filter */}
                <div className="p-3 border-b">
                  <Input
                    placeholder="Filtrar por competência (ex: 2025-07)"
                    value={filterComp}
                    onChange={(e) => setFilterComp(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>

                {/* Document cards */}
                <div className="p-3 space-y-2">
                  {loadingDocs ? (
                    <PageLoader />
                  ) : !filteredDocs?.length ? (
                    <EmptyState
                      icon={FileText}
                      title="Nenhum documento"
                      description="Nenhum documento disponível nesta pasta."
                    />
                  ) : (
                    filteredDocs.map((doc) => {
                      const docInvoice = getDocInvoice(doc)
                      const cobrancaPendente =
                        doc.invoice_id &&
                        doc.download_apos_pagamento &&
                        docInvoice?.status !== 'paga'

                      return (
                        <div key={doc.id} className="rounded-lg border bg-card p-4 space-y-3">
                          <div className="flex items-start gap-3">
                            <DocumentThumbnail storageKey={doc.storage_key} />
                            <div className="flex-1 min-w-0 space-y-1">
                              <p className="font-semibold text-sm leading-tight wrap-break-word">{doc.nome}</p>
                              <div className="flex flex-wrap gap-1">
                                <Badge variant="secondary" className="text-xs">{docTypeName(doc.type_id)}</Badge>
                                <ValidadeBadge doc={doc} docTypes={docTypes} />
                                {cobrancaPendente && (
                                  <Badge variant="outline" className="text-xs border-amber-500 text-amber-600 gap-1">
                                    <CreditCard className="h-3 w-3" /> Cobrança pendente
                                  </Badge>
                                )}
                                {doc.invoice_id && docInvoice?.status === 'paga' && (
                                  <Badge variant="outline" className="text-xs border-green-500 text-green-600">
                                    Cobrança paga
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                            <span className="text-muted-foreground">Competência</span>
                            <span className="text-right font-medium">{doc.competencia}</span>
                            <span className="text-muted-foreground">Tamanho</span>
                            <span className="text-right">{formatFileSize(doc.tamanho)}</span>
                            <span className="text-muted-foreground">Enviado em</span>
                            <span className="text-right">{formatDate(doc.criado_em.split('T')[0])}</span>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="flex-1" onClick={() => handleDownload(doc)}>
                              <Download className="mr-1.5 h-3.5 w-3.5" /> Baixar
                            </Button>
                            <Button variant="ghost" size="sm" className="flex-1" onClick={() => handleView(doc)}>
                              <Eye className="mr-1.5 h-3.5 w-3.5" /> Visualizar
                            </Button>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </>
            ) : (
              currentLevelFolders.length === 0 && (
                <div className="flex items-center justify-center py-16">
                  <EmptyState
                    icon={FolderOpen}
                    title="Nenhuma pasta disponível"
                    description="O escritório ainda não criou pastas para sua empresa."
                  />
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {bloqueioDoc && policy && (
        <BloqueioModal
          open={!!bloqueioDoc}
          onClose={() => setBloqueioDoc(null)}
          faturas={vencidasForaCarencia}
          calculos={calculosVencidas}
        />
      )}

      <CobrancaDocumentoModal
        open={!!cobrancaDoc}
        onClose={() => setCobrancaDoc(null)}
        invoice={cobrancaDoc ? getDocInvoice(cobrancaDoc) : null}
        nomeDocumento={cobrancaDoc?.nome ?? ''}
      />

      <DocumentViewerModal
        doc={viewerDoc}
        url={viewerUrl}
        open={!!viewerDoc}
        onClose={() => { setViewerDoc(null); setViewerUrl(null) }}
        onDownload={() => viewerDoc && handleDownload(viewerDoc)}
      />
    </div>
  )
}
