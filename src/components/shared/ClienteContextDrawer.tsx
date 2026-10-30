import { Link } from 'react-router-dom'
import { X, User, Phone, Mail, FileText, Layers, ExternalLink, PinOff, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePinnedClient } from '@/lib/clientePinado'
import { useAuth } from '@/auth/AuthProvider'
import { useOcorrenciasByCliente } from '@/data/hooks/useOcorrencias'
import { useClientDocuments } from '@/data/hooks/useDocuments'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { format } from 'date-fns'

interface Props {
  open: boolean
  onClose: () => void
}

const ocorrenciaStatusLabel: Record<string, string> = {
  pendente: 'Pendente',
  em_andamento: 'Em andamento',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
}

const ocorrenciaStatusColor: Record<string, string> = {
  pendente: 'bg-blue-100 text-blue-700',
  em_andamento: 'bg-yellow-100 text-yellow-700',
  concluida: 'bg-green-100 text-green-700',
  cancelada: 'bg-gray-100 text-gray-500',
}

export function ClienteContextDrawer({ open, onClose }: Props) {
  const { clientePinado, unpinClient } = usePinnedClient()
  const { currentUser } = useAuth()
  const tenantId = currentUser?.tenant_id ?? ''

  const { data: ocorrencias = [] } = useOcorrenciasByCliente(
    tenantId,
    clientePinado?.id ?? '',
  )

  const { data: documentos = [] } = useClientDocuments(
    tenantId,
    clientePinado?.id ?? '',
  )

  const ocorrenciasAtivas = ocorrencias
    .filter(o => o.status !== 'concluida' && o.status !== 'cancelada')
    .slice(0, 10)

  const docsRecentes = [...documentos]
    .sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime())
    .slice(0, 10)

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Drawer panel */}
      <div
        className={cn(
          'fixed inset-y-0 right-0 z-50 w-80 bg-card border-l flex flex-col shadow-2xl transition-transform duration-200',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Header */}
        <div className="h-14 border-b px-4 flex items-center justify-between shrink-0 bg-card">
          <div className="flex items-center gap-2 min-w-0">
            <Building2 className="h-4 w-4 text-primary shrink-0" />
            <span className="font-semibold text-sm truncate">
              {clientePinado
                ? (clientePinado.fantasia ?? clientePinado.razao_social)
                : 'Contexto do cliente'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        {!clientePinado ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <User className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              Nenhum cliente selecionado.
            </p>
            <p className="text-xs text-muted-foreground/70">
              Acesse a ficha de um cliente e use o botão de fixar para consultá-lo rapidamente aqui.
            </p>
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {/* Quick actions */}
            <div className="px-4 py-3 border-b flex items-center justify-between gap-2 shrink-0">
              <Link
                to={`/escritorio/clientes/${clientePinado.id}`}
                onClick={onClose}
                className="flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Ver ficha completa
              </Link>
              <button
                onClick={() => { unpinClient(); }}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                title="Desafixar cliente"
              >
                <PinOff className="h-3.5 w-3.5" />
                Desafixar
              </button>
            </div>

            <Tabs defaultValue="resumo" className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <TabsList className="mx-4 mt-3 mb-0 shrink-0 w-auto h-8 text-xs">
                <TabsTrigger value="resumo" className="text-xs px-3 h-6">Resumo</TabsTrigger>
                <TabsTrigger value="processos" className="text-xs px-3 h-6">
                  Processos
                  {ocorrenciasAtivas.length > 0 && (
                    <span className="ml-1 bg-primary text-primary-foreground rounded-full text-[10px] w-4 h-4 flex items-center justify-center shrink-0">
                      {ocorrenciasAtivas.length > 9 ? '9+' : ocorrenciasAtivas.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="documentos" className="text-xs px-3 h-6">Docs</TabsTrigger>
              </TabsList>

              {/* Resumo */}
              <TabsContent value="resumo" className="flex-1 overflow-y-auto px-4 py-3 space-y-2 mt-2">
                <InfoRow icon={Building2} label="Razão social" value={clientePinado.razao_social} />
                {clientePinado.fantasia && (
                  <InfoRow icon={Building2} label="Fantasia" value={clientePinado.fantasia} />
                )}
                {clientePinado.cnpj && (
                  <InfoRow icon={FileText} label="CNPJ" value={clientePinado.cnpj} />
                )}
                {clientePinado.cpf && (
                  <InfoRow icon={User} label="CPF" value={clientePinado.cpf} />
                )}
                {clientePinado.telefone && (
                  <InfoRow icon={Phone} label="Telefone" value={clientePinado.telefone} />
                )}
                {clientePinado.email && (
                  <InfoRow icon={Mail} label="E-mail" value={clientePinado.email} />
                )}
                {clientePinado.regime && (
                  <InfoRow icon={FileText} label="Regime" value={clientePinado.regime} />
                )}
              </TabsContent>

              {/* Processos */}
              <TabsContent value="processos" className="flex-1 overflow-y-auto px-4 py-3 mt-2">
                {ocorrenciasAtivas.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">
                    Nenhum processo em aberto.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {ocorrenciasAtivas.map(o => (
                      <Link
                        key={o.id}
                        to={`/escritorio/ocorrencias?id=${o.id}`}
                        onClick={onClose}
                        className="block border rounded-lg px-3 py-2.5 hover:bg-accent transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-medium leading-tight line-clamp-2 flex-1">{o.titulo}</p>
                          <span className={cn(
                            'shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full',
                            ocorrenciaStatusColor[o.status] ?? 'bg-gray-100 text-gray-600',
                          )}>
                            {ocorrenciaStatusLabel[o.status] ?? o.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Prazo: {format(new Date(o.data_prevista + 'T00:00:00'), 'dd/MM/yyyy')}
                        </p>
                      </Link>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Documentos */}
              <TabsContent value="documentos" className="flex-1 overflow-y-auto px-4 py-3 mt-2">
                {docsRecentes.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">
                    Nenhum documento encontrado.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {docsRecentes.map(doc => (
                      <Link
                        key={doc.id}
                        to={`/escritorio/documentos?cliente=${clientePinado.id}`}
                        onClick={onClose}
                        className="flex items-start gap-2 border rounded-lg px-3 py-2.5 hover:bg-accent transition-colors"
                      >
                        <Layers className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{doc.nome}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {format(new Date(doc.criado_em), 'dd/MM/yyyy')}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </>
  )
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground leading-none">{label}</p>
        <p className="text-xs font-medium mt-0.5 break-all">{value}</p>
      </div>
    </div>
  )
}
