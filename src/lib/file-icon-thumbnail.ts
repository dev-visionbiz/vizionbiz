const W = 200
const H = 280

type FileIconConfig = {
  bgColor: string
  label: string
  labelColor: string
  lines?: boolean
  imageFile?: boolean
}

function configFromMime(mime: string, name: string): FileIconConfig {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''

  if (mime.startsWith('image/')) {
    return { bgColor: '#e5e7eb', label: '', labelColor: '', imageFile: true }
  }
  if (
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mime === 'application/msword' ||
    ext === 'doc' ||
    ext === 'docx'
  ) {
    return { bgColor: '#2B579A', label: 'W', labelColor: '#ffffff' }
  }
  if (
    mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mime === 'application/vnd.ms-excel' ||
    ext === 'xls' ||
    ext === 'xlsx' ||
    ext === 'csv'
  ) {
    return { bgColor: '#217346', label: 'X', labelColor: '#ffffff' }
  }
  if (
    mime === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
    mime === 'application/vnd.ms-powerpoint' ||
    ext === 'ppt' ||
    ext === 'pptx'
  ) {
    return { bgColor: '#C43E1C', label: 'P', labelColor: '#ffffff' }
  }
  if (mime === 'text/plain' || ext === 'txt') {
    return { bgColor: '#64748b', label: 'TXT', labelColor: '#ffffff', lines: true }
  }
  if (mime === 'application/zip' || mime === 'application/x-zip-compressed' || ext === 'zip' || ext === 'rar' || ext === '7z') {
    return { bgColor: '#7c3aed', label: 'ZIP', labelColor: '#ffffff' }
  }
  if (mime === 'audio/mpeg' || mime === 'audio/wav' || mime === 'audio/ogg' || ext === 'mp3' || ext === 'wav') {
    return { bgColor: '#0ea5e9', label: '♪', labelColor: '#ffffff' }
  }
  if (mime === 'video/mp4' || mime === 'video/webm' || ext === 'mp4' || ext === 'mov' || ext === 'avi') {
    return { bgColor: '#dc2626', label: '▶', labelColor: '#ffffff' }
  }

  return { bgColor: '#94a3b8', label: ext.toUpperCase() || '?', labelColor: '#ffffff' }
}

function drawFileCard(ctx: CanvasRenderingContext2D, config: FileIconConfig) {
  const { bgColor, label, labelColor, lines } = config
  const radius = 14
  const foldSize = 40

  // sombra
  ctx.shadowColor = 'rgba(0,0,0,0.18)'
  ctx.shadowBlur = 16
  ctx.shadowOffsetY = 4

  // corpo do card
  ctx.fillStyle = '#f8fafc'
  ctx.beginPath()
  ctx.moveTo(radius, 0)
  ctx.lineTo(W - foldSize, 0)
  ctx.lineTo(W, foldSize)
  ctx.lineTo(W, H - radius)
  ctx.arcTo(W, H, W - radius, H, radius)
  ctx.lineTo(radius, H)
  ctx.arcTo(0, H, 0, H - radius, radius)
  ctx.lineTo(0, radius)
  ctx.arcTo(0, 0, radius, 0, radius)
  ctx.closePath()
  ctx.fill()

  ctx.shadowColor = 'transparent'

  // orelha (fold)
  ctx.fillStyle = '#e2e8f0'
  ctx.beginPath()
  ctx.moveTo(W - foldSize, 0)
  ctx.lineTo(W - foldSize, foldSize)
  ctx.lineTo(W, foldSize)
  ctx.closePath()
  ctx.fill()

  // faixa colorida inferior
  const bannerH = 100
  const bannerY = H - bannerH

  ctx.save()
  ctx.beginPath()
  ctx.moveTo(0, bannerY)
  ctx.lineTo(W, bannerY)
  ctx.lineTo(W, H - radius)
  ctx.arcTo(W, H, W - radius, H, radius)
  ctx.lineTo(radius, H)
  ctx.arcTo(0, H, 0, H - radius, radius)
  ctx.lineTo(0, bannerY)
  ctx.closePath()
  ctx.fillStyle = bgColor
  ctx.fill()
  ctx.restore()

  // linhas de texto simuladas (área branca do card)
  if (lines) {
    ctx.fillStyle = '#cbd5e1'
    const lineY = [40, 58, 76, 94, 112, 130]
    lineY.forEach((y, i) => {
      ctx.fillRect(18, y, i % 3 === 2 ? 100 : 164, 8)
    })
  } else {
    ctx.fillStyle = '#e2e8f0'
    ;[40, 60, 80].forEach((y) => ctx.fillRect(18, y, 164, 8))
    ctx.fillRect(18, 100, 100, 8)
  }

  // label
  if (label.length === 1) {
    ctx.font = `bold 62px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
  } else {
    ctx.font = `bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
  }
  ctx.fillStyle = labelColor
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, W / 2, bannerY + bannerH / 2)
}

async function gerarThumbnailImagem(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const scale = W / img.naturalWidth
      canvas.width = W
      canvas.height = Math.min(img.naturalHeight * scale, H)
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.82))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('img load')) }
    img.src = url
  })
}

export async function gerarThumbnailArquivo(file: File): Promise<string> {
  const config = configFromMime(file.type, file.name)

  if (config.imageFile) {
    return gerarThumbnailImagem(file)
  }

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  drawFileCard(ctx, config)
  return canvas.toDataURL('image/png')
}
