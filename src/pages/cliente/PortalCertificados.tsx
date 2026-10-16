import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useAuth } from '@/auth/AuthProvider'
import { useCertificadosByCliente } from '@/data/hooks/useCertificados'
import { Badge } from '@/components/ui/badge'
import { ShieldCheck } from 'lucide-react'

const statusLabel: Record<string, string> = {
  valido: 'Válido',
  vencendo: 'Vencendo',
  vencido: 'Vencido',
}

const statusClass: Record<string, string> = {
  valido: 'bg-green-100 text-green-800 border-transparent',
  vencendo: 'bg-yellow-100 text-yellow-800 border-transparent',
  vencido: 'bg-red-100 text-red-800 border-transparent',
}

const tipoLabel: Record<string, string> = {
  a1: 'A1',
  a3: 'A3',
  nfe: 'NF-e',
  ecnpj: 'e-CNPJ',
  ecpf: 'e-CPF',
}

export default function PortalCertificados() {
  const { currentUser } = useAuth()
  const tenantId = currentUser?.tenant_id ?? ''
  const clienteId = currentUser?.client_id ?? ''

  const { data: certs = [], isLoading } = useCertificadosByCliente(tenantId, clienteId)

  if (isLoading) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <p className="text-sm text-muted-foreground">Carregando...</p>
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
          {certs.map((cert) => (
            <div
              key={cert.id}
              className="flex items-center justify-between border rounded-lg px-4 py-3 bg-card text-sm"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium">{cert.titular}</p>
                  <Badge variant="outline" className="text-xs">{tipoLabel[cert.tipo] ?? cert.tipo}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Vence em {format(parseISO(cert.validade), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              </div>
              <Badge className={statusClass[cert.status] ?? ''}>
                {statusLabel[cert.status] ?? cert.status}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
