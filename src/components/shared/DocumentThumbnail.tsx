import { useEffect, useState } from 'react'
import { FileText } from 'lucide-react'
import { storageService } from '@/lib/storage'

interface DocumentThumbnailProps {
  storageKey: string
  className?: string
}

export function DocumentThumbnail({ storageKey, className }: DocumentThumbnailProps) {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    storageService.obterThumbnail(storageKey).then((url) => {
      if (!cancelled) setSrc(url)
    })
    return () => { cancelled = true }
  }, [storageKey])

  if (!src) {
    return (
      <div className={`flex items-center justify-center rounded border bg-muted/40 shrink-0 ${className ?? 'w-10 h-14'}`}>
        <FileText className="h-5 w-5 text-muted-foreground/60" />
      </div>
    )
  }

  return (
    <img
      src={src}
      alt="Preview"
      className={`rounded border object-cover shrink-0 ${className ?? 'w-10 h-14'}`}
    />
  )
}
