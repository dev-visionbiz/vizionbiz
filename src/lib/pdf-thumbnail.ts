import * as pdfjs from 'pdfjs-dist'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).href

const THUMBNAIL_WIDTH = 200

export async function gerarThumbnailPdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) })
  const pdf = await loadingTask.promise
  const page = await pdf.getPage(1)

  const viewport = page.getViewport({ scale: 1.0 })
  const scale = THUMBNAIL_WIDTH / viewport.width
  const scaledViewport = page.getViewport({ scale })

  const canvas = document.createElement('canvas')
  canvas.width = scaledViewport.width
  canvas.height = scaledViewport.height

  await page.render({ canvas, viewport: scaledViewport }).promise

  const dataUrl = canvas.toDataURL('image/jpeg', 0.82)
  await loadingTask.destroy()
  return dataUrl
}
