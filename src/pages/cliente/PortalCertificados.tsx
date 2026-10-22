import { format, parseISO, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useAuth } from '@/auth/AuthProvider'
import { useCertificadosByCliente, useSolicitarRenovacaoCertificado } from '@/data/hooks/useCertificados'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { ShieldCheck, ShieldAlert, ShieldX, RefreshCw, Loader2 } from 'lucide-react'
import type { CertificadoDigital } from '@/domain/types'

const tipoLabel: Record<string, string> = {
  ecnpj_a1: 'e-CNPJ A1',
  ecnpj_a3: 'e-CNPJ A3',
  ecpf_a1: 'e-CPF A1',
  ecpf_a3: 'e-CPF A3',
  nfe: 'NF-e',
  outro: 'Outro',
}

const statusClass: Record<string, string> = {
  valido: 'bg-green-100 text-green-800 border-transparent',
  vencendo: 'bg-yellow-100 text-yellow-800 border-transparent',
  vencido: 'bg-red-100 text-red-800 border-transparent',
  renovacao_solicitada: 'bg-blue-100 text-blue-800 border-transparent',
}

const statusLabel: Record<string, string> = {
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

export default function PortalCertificados() {
  const { currentUser } = useAuth()
  const tenantId = currentUser?.tenant_id ?? ''
  const clienteId = currentUser?.client_id ?? ''
  const { toast } = useToast()

  const { data: certs = [], isLoading } = useCertificadosByCliente(tenantId, clienteId)
  const solicitarRenovacao = useSolicitarRenovacaoCertificado()

  function handleSolicitar(cert: CertificadoDigital) {
    solicitarRenovacao.mutate(cert, {
      onSuccess: () =>
        toast({
          title: 'Solicitação enviada!',
          description: 'O escritório foi notificado e entrará em contato.',
        }),
      onError: (err) =>
        toast({
          title: String(err instanceof Error ? err.message : 'Erro ao solicitar renovação'),
          variant: 'destructive',
        }),
    })
  }

  if (isLoading) {
    return (
      <div className="p-6 max-w-3xl mx-auto flex items-center gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Carregando...</span>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Certificados Digitais</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Situação dos seus certificados digitais.
        </p>
      </div>

      {certs.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center text-muted-foreground">
          <ShieldCheck className="w-10 h-10 opacity-30" />
          <p className="text-sm">Nenhum certificado registrado.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {certs.map((cert) => {
            const dias = differenceInDays(parseISO(cert.validade), new Date())
            const podeSolicitar = cert.status === 'vencendo' || cert.status === 'vencido'
            const jaSolicitou = cert.status === 'renovacao_solicitada'

            return (
              <div
                key={cert.id}
                className="flex items-start justify-between border rounded-lg px-4 py-3 bg-card gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm">{cert.titular}</p>
                    <Badge variant="outline" className="text-xs">{tipoLabel[cert.tipo] ?? cert.tipo}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {dias < 0
                      ? `Venceu em ${format(parseISO(cert.validade), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`
                      : `Vence em ${format(parseISO(cert.validade), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })} · ${dias}d restante(s)`}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                  <Badge className={`gap-1 text-xs ${statusClass[cert.status] ?? ''}`}>
                    <StatusIcon status={cert.status} />
                    {statusLabel[cert.status] ?? cert.status}
                  </Badge>

                  {podeSolicitar && !jaSolicitou && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSolicitar(cert)}
                      disabled={solicitarRenovacao.isPending}
                    >
                      {solicitarRenovacao.isPending ? (
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                      )}
                      Solicitar Renovação
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
