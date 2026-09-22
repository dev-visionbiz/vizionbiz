import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErro('')
    setCarregando(true)
    const result = await login(email.trim(), senha)
    setCarregando(false)
    if (!result.ok) {
      setErro(result.erro ?? 'Erro ao fazer login.')
      return
    }
    navigate(result.papel === 'cliente' ? '/portal/inicio' : '/escritorio/dashboard', { replace: true })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold tracking-tight">VisionBiz</h1>
          <p className="text-sm text-muted-foreground">Entre com suas credenciais</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {erro && (
            <Alert variant="destructive" className="flex items-center gap-2 py-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="text-sm">{erro}</span>
            </Alert>
          )}

          <div className="space-y-1">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="senha">Senha</Label>
            <Input
              id="senha"
              type="password"
              autoComplete="current-password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <Button type="submit" className="w-full" disabled={carregando}>
            {carregando ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          MVP — senha padrão: <span className="font-mono font-semibold">senha123</span>
        </p>
      </div>
    </div>
  )
}
