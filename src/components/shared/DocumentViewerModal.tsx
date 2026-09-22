import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Download, FileText, Loader2 } from 'lucide-react'
import type { Document } from '@/domain/types'

interface Props {
  doc: Document | null
  url: string | null
  open: boolean
  onClose: () => void
  onDownload?: () => void
}

function dataUrlToArrayBuffer(dataUrl: string): ArrayBuffer {
  const base64 = dataUrl.split(',')[1]
  const binary = atob(base64)
  const buf = new ArrayBuffer(binary.length)
  const view = new Uint8Array(buf)
  for (let i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i)
  return buf
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center h-full gap-2 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span className="text-sm">Carregando...</span>
    </div>
  )
}

function WordViewer({ url }: { url: string }) {
  const [html, setHtml] = useState<string | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const mammoth = await import('mammoth')
        const result = await mammoth.convertToHtml({ arrayBuffer: dataUrlToArrayBuffer(url) })
        if (!cancelled) setHtml(result.value)
      } catch {
        if (!cancelled) setError(true)
      }
    })()
    return () => { cancelled = true }
  }, [url])

  if (!html && !error) return <LoadingState />
  if (error || !html) return (
    <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
      Erro ao renderizar o documento Word.
    </div>
  )

  return (
    <div className="h-full overflow-auto bg-white p-8">
      <style>{`
        .word-content p { margin: 0.4em 0; line-height: 1.6; }
        .word-content h1 { font-size: 1.5em; font-weight: 700; margin: 0.6em 0 0.3em; }
        .word-content h2 { font-size: 1.25em; font-weight: 600; margin: 0.6em 0 0.3em; }
        .word-content h3 { font-size: 1.1em; font-weight: 600; margin: 0.4em 0 0.2em; }
        .word-content ul, .word-content ol { padding-left: 1.5em; margin: 0.4em 0; }
        .word-content li { margin: 0.2em 0; }
        .word-content strong { font-weight: 700; }
        .word-content em { font-style: italic; }
        .word-content table { border-collapse: collapse; margin: 0.5em 0; width: 100%; }
        .word-content td, .word-content th { border: 1px solid #d1d5db; padding: 4px 8px; font-size: 0.875em; }
        .word-content img { max-width: 100%; }
      `}</style>
      <div
        className="max-w-3xl mx-auto word-content text-sm text-gray-900"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}

function ExcelViewer({ url }: { url: string }) {
  const [sheets, setSheets] = useState<{ name: string; rows: string[][] }[]>([])
  const [active, setActive] = useState(0)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const XLSX = await import('xlsx')
        const wb = XLSX.read(dataUrlToArrayBuffer(url), { type: 'array' })
        const result = wb.SheetNames.map((name) => {
          const rows = XLSX.utils.sheet_to_json<string[]>(wb.Sheets[name], {
            header: 1,
            defval: '',
          }) as string[][]
          return { name, rows }
        })
        if (!cancelled) setSheets(result)
      } catch {
        if (!cancelled) setError(true)
      }
    })()
    return () => { cancelled = true }
  }, [url])

  if (!sheets.length && !error) return <LoadingState />
  if (error || !sheets.length) return (
    <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
      Erro ao renderizar a planilha.
    </div>
  )

  const { rows } = sheets[active]
  const headers = rows[0] ?? []
  const dataRows = rows.slice(1)

  return (
    <div className="flex flex-col h-full">
      {sheets.length > 1 && (
        <div className="flex gap-0 px-3 pt-2 border-b bg-muted/30 overflow-x-auto flex-shrink-0">
          {sheets.map((s, i) => (
            <button
              key={s.name}
              onClick={() => setActive(i)}
              className={`px-3 py-1.5 text-xs border-b-2 transition-colors whitespace-nowrap ${
                active === i
                  ? 'border-primary font-medium text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}
      <div className="flex-1 overflow-auto p-3">
        <table className="text-xs border-collapse min-w-max">
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th
                  key={i}
                  className="border border-border bg-muted px-2 py-1 text-left font-medium whitespace-nowrap"
                >
                  {String(h ?? '')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataRows.map((row, ri) => (
              <tr key={ri} className="hover:bg-muted/40">
                {headers.map((_, ci) => (
                  <td key={ci} className="border border-border px-2 py-1 whitespace-nowrap">
                    {String(row[ci] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function DocumentViewerModal({ doc, url, open, onClose, onDownload }: Props) {
  if (!doc) return null

  const { mime } = doc
  const isPdf = mime === 'application/pdf'
  const isImage = mime.startsWith('image/')
  const isText = mime.startsWith('text/')
  const isDocx = mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  const isXlsx =
    mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mime === 'application/vnd.ms-excel'

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl w-full h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="flex-shrink-0 flex flex-row items-center gap-2 px-4 py-3 pr-12 border-b">
          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <DialogTitle className="text-sm font-medium truncate flex-1">{doc.nome}</DialogTitle>
          {onDownload && url && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDownload}
              title="Download"
              className="flex-shrink-0 h-7 px-2"
            >
              <Download className="h-3.5 w-3.5" />
            </Button>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-hidden bg-muted/20">
          {!url ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
              <FileText className="h-10 w-10 opacity-30" />
              <p className="text-sm">Arquivo não disponível para visualização.</p>
              <p className="text-xs opacity-60">Este é um arquivo de seed — faça upload de um arquivo real.</p>
            </div>
          ) : isPdf ? (
            <iframe src={url} className="w-full h-full border-0" title={doc.nome} />
          ) : isImage ? (
            <div className="flex items-center justify-center h-full p-6 overflow-auto">
              <img src={url} alt={doc.nome} className="max-w-full max-h-full object-contain rounded" />
            </div>
          ) : isText ? (
            <iframe src={url} className="w-full h-full border-0 bg-white" title={doc.nome} />
          ) : isDocx ? (
            <WordViewer url={url} />
          ) : isXlsx ? (
            <ExcelViewer url={url} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
              <FileText className="h-12 w-12 opacity-30" />
              <p className="text-sm">Visualização não disponível para este formato.</p>
              <p className="text-xs opacity-60">{mime}</p>
              {onDownload && (
                <Button size="sm" variant="outline" onClick={onDownload}>
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  Baixar arquivo
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
