import { useNavigate } from 'react-router-dom'
import { differenceInDays, format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useAuth } from '@/auth/AuthProvider'
import { useClientInvoices } from '@/data/hooks/useInvoices'
import { useClientDocuments } from '@/data/hooks/useDocuments'
import { useClientFolders } from '@/data/hooks/useFolders'
import { useBillingPolicy } from '@/data/hooks/useBillingPolicy'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

import { FileText, CreditCard, Calendar, AlertCircle, AlertTriangle } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { calcularEncargos } from '@/domain/financeiro/calcularEncargos'

export default function PortalInicio() {
  const { currentUser, currentTenant } = useAuth()
  const tenantId = currentUser?.tenant_id ?? ''
  const clientId = currentUser?.client_id ?? ''
  const navigate = useNavigate()

  const { data: invoices, isLoading: loadingInv } = useClientInvoices(tenantId, clientId)
  const { data: documents, isLoading: loadingDocs } = useClientDocuments(tenantId, clientId)
  const { data: folders } = useClientFolders(tenantId, clientId)
  const { data: policy } = useBillingPolicy(tenantId)

  if (loadingInv || loadingDocs) return <PageLoader />

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  const allInvoices = invoices ?? []
  const allDocs = documents ?? []

  // Vencidas fora da carência
  const vencidas = allInvoices.filter(
    (inv) =>
      inv.status === 'vencida' &&
      policy &&
      differenceInDays(today, parseISO(inv.vencimento)) > policy.carencia_dias
  )

  // Abertas (não vencidas)
  const abertas = allInvoices.filter((inv) => inv.status === 'aberta' || inv.status === 'vencida')

  // Total em aberto
  const totalAberto = abertas.reduce((s, inv) => {
    if (inv.status === 'vencida' && policy) {
      return s + calcularEncargos(inv, policy, today).total
    }
    return s + inv.valor_original
  }, 0)

  // Próximo vencimento (faturas abertas)
  const abertasOrdenadas = allInvoices
    .filter((inv) => inv.status === 'aberta')
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento))
  const proximaFatura = abertasOrdenadas[0]
  const diasParaVencer = proximaFatura
    ? differenceInDays(parseISO(proximaFatura.vencimento), today)
    : null

  // Últimos 3 documentos
  const recentDocs = [...allDocs]
    .sort((a, b) => b.criado_em.localeCompare(a.criado_em))
    .slice(0, 3)

  const folderName = (folderId: string) =>
    folders?.find((f) => f.id === folderId)?.nome ?? folderId

  const clientName = currentUser?.nome ?? 'Cliente'
  const razaoSocial = currentTenant?.nome ?? ''

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold">Olá, {clientName}!</h1>
        <p className="text-muted-foreground">Bem-vindo ao portal da {razaoSocial}</p>
      </div>

      {/* Pending banner */}
      {vencidas.length > 0 && (
        <Alert variant={policy?.modo_acesso === 'total' ? 'destructive' : 'warning'}>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Pendência financeira</AlertTitle>
          <AlertDescription>
            Você possui {vencidas.length} fatura(s) vencida(s). Regularize para manter acesso completo aos documentos.{' '}
            <Button variant="link" className="h-auto p-0 text-sm" onClick={() => navigate('/portal/financeiro')}>
              Ver faturas
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Documentos Recentes */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4 text-green-600" />
              Documentos Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!recentDocs.length ? (
              <p className="text-sm text-muted-foreground">Nenhum documento disponível.</p>
            ) : (
              <ul className="space-y-2">
                {recentDocs.map((doc) => (
                  <li key={doc.id} className="text-sm">
                    <p className="font-medium truncate">{doc.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {folderName(doc.folder_id)} — {formatDate(doc.criado_em.split('T')[0])}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <Button
              variant="link"
              className="h-auto p-0 mt-2 text-xs"
              onClick={() => navigate('/portal/documentos')}
            >
              Ver todos
            </Button>
          </CardContent>
        </Card>

        {/* Faturas em Aberto */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-blue-600" />
              Faturas em Aberto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{abertas.length}</span>
              {vencidas.length > 0 && (
                <Badge className="bg-red-100 text-red-800 border-transparent">
                  {vencidas.length} vencida(s)
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Total: {formatCurrency(totalAberto)}
            </p>
            <Button
              variant="link"
              className="h-auto p-0 mt-2 text-xs"
              onClick={() => navigate('/portal/financeiro')}
            >
              Ver financeiro
            </Button>
          </CardContent>
        </Card>

        {/* Próximo Vencimento */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4 text-orange-600" />
              Próximo Vencimento
            </CardTitle>
          </CardHeader>
          <CardContent>
            {proximaFatura ? (
              <>
                <p className="text-2xl font-bold">{formatDate(proximaFatura.vencimento)}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {diasParaVencer !== null && diasParaVencer >= 0
                    ? `vence em ${diasParaVencer} dia(s)`
                    : 'vencida'}
                </p>
                <p className="text-sm font-medium mt-1">{formatCurrency(proximaFatura.valor_original)}</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma fatura aberta.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Vencidas table */}
      {vencidas.length > 0 && policy && (
        <div className="space-y-2">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            Faturas Vencidas
          </h2>
          <div className="flex flex-col gap-2">
            {vencidas.map((inv) => {
              const calc = calcularEncargos(inv, policy, today)
              return (
                <div key={inv.id} className="rounded-lg border bg-card p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-sm">Competência {inv.competencia}</p>
                    <Badge className="bg-red-100 text-red-800 border-transparent text-xs shrink-0">{calc.dias_atraso}d atraso</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <span className="text-muted-foreground">Vencimento</span>
                    <span className="text-right font-medium">{formatDate(inv.vencimento)}</span>
                    <span className="text-muted-foreground">Valor atualizado</span>
                    <span className="text-right font-semibold text-destructive">{formatCurrency(calc.total)}</span>
                  </div>
                  <Button size="sm" variant="outline" className="w-full" onClick={() => navigate('/portal/financeiro')}>
                    Pagar / Regularizar
                  </Button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
