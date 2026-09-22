import { useEffect, useRef, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useAuth } from '@/auth/AuthProvider'
import { useStorageConnection, useSalvarStorageConnection, useRemoverStorageConnection } from '@/data/hooks/useStorageConnection'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import {
  HardDrive,
  Globe,
  Cloud,
  Archive,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Plug,
  PlugZap,
  Loader2,
} from 'lucide-react'
import { obterProvedorStorage } from '@/lib/storage'
import type { StorageProviderType } from '@/domain/types'

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? ''
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? ''

interface CartaoProvedor {
  id: StorageProviderType
  nome: string
  descricao: string
  icon: React.ComponentType<{ className?: string }>
  disponivel: boolean
}

const provedores: CartaoProvedor[] = [
  {
    id: 'local',
    nome: 'VizionBiz Padrão',
    descricao: 'Armazenamento gerenciado pelo VizionBiz. Sem configuração adicional.',
    icon: HardDrive,
    disponivel: true,
  },
  {
    id: 'google_drive',
    nome: 'Google Drive',
    descricao: 'Armazene os documentos diretamente no Google Drive do escritório.',
    icon: Globe,
    disponivel: true,
  },
  {
    id: 'onedrive',
    nome: 'OneDrive',
    descricao: 'Integração com Microsoft OneDrive.',
    icon: Cloud,
    disponivel: false,
  },
  {
    id: 'dropbox',
    nome: 'Dropbox',
    descricao: 'Integração com Dropbox.',
    icon: Archive,
    disponivel: false,
  },
]

function statusBadge(status: string) {
  if (status === 'conectado') return <Badge variant="success" className="gap-1"><CheckCircle2 className="h-3 w-3" />Conectado</Badge>
  if (status === 'reconectar') return <Badge variant="warning" className="gap-1"><AlertCircle className="h-3 w-3" />Reconectar</Badge>
  return <Badge variant="secondary" className="gap-1"><PlugZap className="h-3 w-3" />Desconectado</Badge>
}

export default function Armazenamento() {
  const { currentUser } = useAuth()
  const escritorioId = currentUser?.tenant_id ?? ''

  const { data: conn, isLoading } = useStorageConnection(escritorioId)
  const salvar = useSalvarStorageConnection()
  const remover = useRemoverStorageConnection()
  const { toast } = useToast()

  const [testando, setTestando] = useState(false)
  const [conectando, setConectando] = useState(false)
  const oauthProcessed = useRef(false)

  // Handle OAuth callback URL params on mount
  useEffect(() => {
    if (oauthProcessed.current) return
    const params = new URLSearchParams(window.location.search)
    const provedor = params.get('armazenamento')
    if (!provedor) return
    oauthProcessed.current = true

    const status = params.get('status')
    const email = params.get('email')

    // Clean URL params immediately
    params.delete('armazenamento')
    params.delete('status')
    params.delete('email')
    const cleanSearch = params.toString()
    window.history.replaceState(
      {},
      '',
      window.location.pathname + (cleanSearch ? `?${cleanSearch}` : ''),
    )

    if (provedor === 'google_drive' && status === 'conectado' && email) {
      salvar.mutateAsync({
        id: uuidv4(),
        escritorio_id: escritorioId,
        provider: 'google_drive',
        status: 'conectado',
        conta_email: email,
        conectado_por: currentUser?.id ?? '',
        conectado_em: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).then(() => {
        toast({ title: 'Google Drive conectado!', description: `Conta: ${email}` })
      }).catch(() => {
        toast({ title: 'Erro ao salvar conexão', variant: 'destructive' })
      })
    } else if (status === 'erro') {
      toast({ title: 'Falha ao conectar Google Drive', variant: 'destructive' })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const provedorAtivo = conn?.provider ?? 'local'

  async function handleTestar() {
    setTestando(true)
    try {
      const provedor = await obterProvedorStorage(escritorioId)
      const resultado = await provedor.testarConexao()
      toast({
        title: resultado.ok ? 'Conexão OK' : 'Falha na conexão',
        description: resultado.mensagem,
        variant: resultado.ok ? 'default' : 'destructive',
      })
    } catch (err) {
      toast({ title: 'Erro ao testar', description: String(err), variant: 'destructive' })
    } finally {
      setTestando(false)
    }
  }

  async function handleConectarGoogle() {
    if (!escritorioId) return
    setConectando(true)
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/storage-oauth-start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY,
          'x-escritorio-id': escritorioId,
        },
        body: JSON.stringify({ escritorioId, redirectTo: window.location.href }),
      })
      if (!res.ok) throw new Error('Falha ao iniciar OAuth')
      const data = await res.json() as { url: string }
      window.location.href = data.url
    } catch (err) {
      toast({ title: 'Erro ao conectar', description: String(err), variant: 'destructive' })
      setConectando(false)
    }
  }

  async function handleDesconectar() {
    if (!confirm('Desconectar o armazenamento atual? Os documentos existentes continuarão acessíveis pelo provedor original.')) return

    if (conn?.provider === 'google_drive') {
      try {
        await fetch(`${SUPABASE_URL}/functions/v1/storage-disconnect`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_ANON_KEY,
            'x-escritorio-id': escritorioId,
          },
          body: JSON.stringify({ escritorioId }),
        })
      } catch {
        // best-effort — prossegue com limpeza local
      }
    }

    await remover.mutateAsync(escritorioId)
    toast({ title: 'Armazenamento desconectado. Usando VizionBiz Padrão.' })
  }

  if (isLoading) return <PageLoader />

  return (
    <div className="p-4 space-y-4">
      <p className="text-sm text-muted-foreground">
        Escolha onde os documentos do escritório serão armazenados. A configuração vale para todos os
        colaboradores. Documentos já enviados continuam acessíveis pelo provedor original.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {provedores.map((p) => {
          const Icon = p.icon
          const ativo = provedorAtivo === p.id && !!conn

          return (
            <div
              key={p.id}
              className={`border rounded-lg p-4 space-y-3 transition-colors ${
                ativo ? 'border-primary bg-primary/5' : 'bg-card'
              } ${!p.disponivel ? 'opacity-50' : ''}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0">
                    <Icon className="size-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{p.nome}</p>
                    {!p.disponivel && (
                      <Badge variant="secondary" className="text-xs mt-0.5">Em breve</Badge>
                    )}
                  </div>
                </div>
                {ativo && conn && statusBadge(conn.status)}
              </div>

              <p className="text-xs text-muted-foreground">{p.descricao}</p>

              {ativo && conn && (
                <div className="space-y-1">
                  {conn.conta_email && (
                    <p className="text-xs text-muted-foreground">
                      Conta: <span className="text-foreground font-medium">{conn.conta_email}</span>
                    </p>
                  )}
                  {conn.status === 'reconectar' && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Token expirado — reconecte o Drive para restaurar o acesso.
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-2 flex-wrap">
                {ativo ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1"
                      onClick={handleTestar}
                      disabled={testando}
                    >
                      {testando ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3 w-3" />
                      )}
                      Testar conexão
                    </Button>
                    {p.id !== 'local' && (
                      <>
                        {conn.status === 'reconectar' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1"
                            onClick={handleConectarGoogle}
                            disabled={conectando}
                          >
                            {conectando ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <PlugZap className="h-3 w-3" />
                            )}
                            Reconectar
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-destructive hover:text-destructive gap-1"
                          onClick={handleDesconectar}
                          disabled={remover.isPending}
                        >
                          <Plug className="h-3 w-3" />
                          Desconectar
                        </Button>
                      </>
                    )}
                  </>
                ) : p.disponivel ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    onClick={p.id === 'google_drive' ? handleConectarGoogle : undefined}
                    disabled={conectando}
                  >
                    {conectando && p.id === 'google_drive' ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <PlugZap className="h-3 w-3" />
                    )}
                    Conectar
                  </Button>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
