import { differenceInDays, parseISO, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'
import { useCertificadosVencendo } from '@/data/hooks/useCertificados'
import { useClients } from '@/data/hooks/useClients'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ShieldAlert } from 'lucide-react'

function urgenciaBadge(dias: number) {
  if (dias < 0) return <Badge className="bg-red-100 text-red-800 border-transparent text-xs">Vencido</Badge>
  if (dias <= 30) return <Badge className="bg-red-100 text-red-800 border-transparent text-xs">{dias}d</Badge>
  if (dias <= 60) return <Badge className="bg-orange-100 text-orange-800 border-transparent text-xs">{dias}d</Badge>
  return <Badge className="bg-yellow-100 text-yellow-800 border-transparent text-xs">{dias}d</Badge>
}

export function CertificadosDashboardCard() {
  const { currentTenant } = useAuth()
  const tenantId = currentTenant?.id ?? ''
  const navigate = useNavigate()

  const { data: certs = [] } = useCertificadosVencendo(tenantId, 90)
  const { data: clients = [] } = useClients(tenantId)

  if (certs.length === 0) return null

  const sorted = [...certs].sort((a, b) => a.validade.localeCompare(b.validade))

  function nomeCliente(clienteId: string) {
    const c = clients.find((cl) => cl.id === clienteId)
    return c?.fantasia ?? c?.razao_social ?? clienteId
  }

  return (
    <Card className="border-orange-200 bg-orange-50/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-orange-600" />
          Certificados vencendo (90 dias)
          <Badge variant="secondary" className="text-xs ml-auto">{certs.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5 pb-3">
        {sorted.slice(0, 6).map((cert) => {
          const dias = differenceInDays(parseISO(cert.validade), new Date())
          return (
            <button
              key={cert.id}
              className="w-full flex items-center justify-between text-xs hover:bg-orange-100/60 rounded px-1 py-0.5 transition-colors text-left"
              onClick={() => navigate(`/escritorio/clientes/${cert.cliente_id}`)}
            >
              <span className="truncate">
                <span className="font-medium">{cert.titular}</span>
                <span className="text-muted-foreground ml-1">· {nomeCliente(cert.cliente_id)}</span>
              </span>
              <span className="shrink-0 ml-2 flex items-center gap-1">
                {urgenciaBadge(dias)}
                <span className="text-muted-foreground hidden sm:inline">
                  {format(parseISO(cert.validade), 'dd/MM/yy', { locale: ptBR })}
                </span>
              </span>
            </button>
          )
        })}
        {sorted.length > 6 && (
          <p className="text-xs text-muted-foreground text-center pt-1">
            +{sorted.length - 6} certificado(s)
          </p>
        )}
      </CardContent>
    </Card>
  )
}
