import { useNavigate } from 'react-router-dom'
import { differenceInDays, parseISO, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useAuth } from '@/auth/AuthProvider'
import { useCertificadosByCliente, useSolicitarRenovacaoCertificado } from '@/data/hooks/useCertificados'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { ShieldCheck, ShieldAlert, ShieldX, RefreshCw } from 'lucide-react'
import type { CertificadoDigital, GadgetContext } from '@/domain/types'

const statusClass = {
  valido: 'bg-green-100 text-green-800 border-transparent',
  vencendo: 'bg-yellow-100 text-yellow-800 border-transparent',
  vencido: 'bg-red-100 text-red-800 border-transparent',
  renovacao_solicitada: 'bg-blue-100 text-blue-800 border-transparent',
}

const statusLabel = {
  valido: 'Válido',
  vencendo: 'Vencendo',
  vencido: 'Vencido',
  renovacao_solicitada: 'Renovação solicitada',
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'vencido') return <ShieldX className="w-3.5 h-3.5" />
  if (status === 'vencendo') return <ShieldAlert className="w-3.5 h-3.5" />
  return <ShieldCheck className="w-3.5 h-3.5" />
}

interface Props {
  context?: GadgetContext | Record<string, unknown>
}

export function CertificadosPortalCard({ context: _context }: Props) {
  const { currentUser } = useAuth()
  const tenantId = currentUser?.tenant_id ?? ''
  const clienteId = currentUser?.client_id ?? ''
  const navigate = useNavigate()
  const { toast } = useToast()

  const { data: certs = [] } = useCertificadosByCliente(tenantId, clienteId)
  const solicitarRenovacao = useSolicitarRenovacaoCertificado()

  // Mostra apenas certs não-válidos (que requerem atenção) ou todos se não houver alertas
  const certsPendentes = certs.filter((c) =>
    c.status === 'vencendo' || c.status === 'vencido'
  )

  if (certs.length === 0) return null

  const certsParaMostrar = certsPendentes.length > 0 ? certsPendentes : certs.slice(0, 3)

  function handleSolicitar(cert: CertificadoDigital) {
    solicitarRenovacao.mutate(cert, {
      onSuccess: () =>
        toast({ title: 'Solicitação enviada!', description: 'O escritório foi notificado.' }),
      onError: (err) =>
        toast({ title: String(err instanceof Error ? err.message : 'Erro ao solicitar'), variant: 'destructive' }),
    })
  }

  return (
    <Card className={certsPendentes.length > 0 ? 'border-yellow-300 bg-yellow-50/30' : ''}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-primary" />
            Certificados Digitais
          </span>
          {certsPendentes.length > 0 && (
            <Badge className="bg-yellow-100 text-yellow-800 border-transparent text-xs">
              {certsPendentes.length} em alerta
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pb-3">
        {certsParaMostrar.map((cert) => {
          const dias = differenceInDays(parseISO(cert.validade), new Date())
          const podeSolicitar = cert.status === 'vencendo' || cert.status === 'vencido'

          return (
            <div key={cert.id} className="flex items-center justify-between gap-2 text-sm">
              <div className="min-w-0">
                <p className="font-medium truncate">{cert.titular}</p>
                <p className="text-xs text-muted-foreground">
                  {dias < 0
                    ? `Venceu em ${format(parseISO(cert.validade), 'dd/MM/yy', { locale: ptBR })}`
                    : `Vence em ${dias}d · ${format(parseISO(cert.validade), 'dd/MM/yy', { locale: ptBR })}`}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Badge className={`text-xs gap-1 ${statusClass[cert.status]}`}>
                  <StatusIcon status={cert.status} />
                  {statusLabel[cert.status] ?? cert.status}
                </Badge>
                {podeSolicitar && cert.status !== 'renovacao_solicitada' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-xs px-2"
                    onClick={() => handleSolicitar(cert)}
                    disabled={solicitarRenovacao.isPending}
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Renovar
                  </Button>
                )}
              </div>
            </div>
          )
        })}

        <Button
          variant="link"
          className="h-auto p-0 text-xs mt-1"
          onClick={() => navigate('/portal/certificados')}
        >
          Ver todos os certificados →
        </Button>
      </CardContent>
    </Card>
  )
}
