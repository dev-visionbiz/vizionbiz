import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/auth/AuthProvider'
import { useTenant, useUpdateTenant } from '@/data/hooks/useTenant'
import { useToast } from '@/components/ui/use-toast'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
}

function hslToHex(hsl: string): string {
  const parts = hsl.replace(/%/g, '').split(/\s+/)
  if (parts.length < 3) return '#3b82f6'

  const h = parseFloat(parts[0]) / 360
  const s = parseFloat(parts[1]) / 100
  const l = parseFloat(parts[2]) / 100

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1/6) return p + (q - p) * 6 * t
    if (t < 1/2) return q
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
    return p
  }

  let r: number, g: number, b: number
  if (s === 0) {
    r = g = b = l
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1/3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1/3)
  }

  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export default function Branding() {
  const { currentUser } = useAuth()
  const tenantId = currentUser?.tenant_id ?? ''
  const { data: tenant, isLoading } = useTenant(tenantId)
  const updateTenant = useUpdateTenant()
  const { toast } = useToast()

  const [hexColor, setHexColor] = useState('#3b82f6')
  const [hslColor, setHslColor] = useState('217 91% 60%')
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoBase64, setLogoBase64] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (tenant) {
      const hex = hslToHex(tenant.cor_primaria)
      setHexColor(hex)
      setHslColor(tenant.cor_primaria)
      if (tenant.logo_url) setLogoPreview(tenant.logo_url)
    }
  }, [tenant])

  const handleHexChange = (hex: string) => {
    setHexColor(hex)
    const hsl = hexToHsl(hex)
    setHslColor(hsl)
    document.documentElement.style.setProperty('--primary', hsl)
  }

  const handleHslChange = (hsl: string) => {
    setHslColor(hsl)
    try {
      const hex = hslToHex(hsl)
      setHexColor(hex)
      document.documentElement.style.setProperty('--primary', hsl)
    } catch { /* ignore parse errors while typing */ }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const result = ev.target?.result as string
      setLogoPreview(result)
      setLogoBase64(result)
    }
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    if (!tenant) return
    try {
      await updateTenant.mutateAsync({
        id: tenant.id,
        data: {
          cor_primaria: hslColor,
          logo_url: logoBase64 ?? tenant.logo_url,
        },
      })
      toast({ title: 'Branding salvo', description: 'Identidade visual atualizada com sucesso.' })
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível salvar.', variant: 'destructive' })
    }
  }

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Logo</CardTitle>
          <CardDescription>Imagem exibida no topo do menu lateral (sidebar).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {logoPreview && (
            <img src={logoPreview} alt="Logo preview" className="h-16 object-contain rounded border p-1" />
          )}
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              {logoPreview ? 'Trocar logo' : 'Carregar logo'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cor Primária</CardTitle>
          <CardDescription>Cor usada em botões, badges e destaques do sistema.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="space-y-1">
              <Label htmlFor="color-picker">Seletor de Cor</Label>
              <input
                id="color-picker"
                type="color"
                value={hexColor}
                onChange={(e) => handleHexChange(e.target.value)}
                className="h-10 w-20 cursor-pointer rounded border p-1"
              />
            </div>
            <div className="flex-1 space-y-1">
              <Label htmlFor="hsl-input">Valor HSL</Label>
              <Input
                id="hsl-input"
                value={hslColor}
                onChange={(e) => handleHslChange(e.target.value)}
                placeholder="217 91% 60%"
              />
              <p className="text-xs text-muted-foreground">Formato: H S% L% (ex: 217 91% 60%)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          <CardDescription>Como os componentes ficarão com a cor escolhida.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Button style={{ backgroundColor: hexColor, color: '#fff', borderColor: hexColor }}>
              Botão Primário
            </Button>
            <Badge style={{ backgroundColor: hexColor, color: '#fff' }}>
              Badge
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Cor atual: <code className="rounded bg-muted px-1 py-0.5 text-xs">{hslColor}</code>
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={updateTenant.isPending}>
          {updateTenant.isPending ? 'Salvando...' : 'Salvar Branding'}
        </Button>
      </div>
    </div>
  )
}
