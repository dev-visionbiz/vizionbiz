import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Download, FileWarning, Clock, FileCheck, FileText,
  ArrowRight, AlertTriangle, HandshakeIcon, CreditCard, FileSignature,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  LocalShareLinkRepository,
  LocalDocumentRepository,
  LocalDocumentTypeRepository,
  LocalBillingPolicyRepository,
  LocalInvoiceRepository,
  LocalTenantRepository,
} from '@/data/repositories/localStorage'
import { obterProvedorStorage } from '@/lib/storage/factory'
import { podeBaixar } from '@/domain/documentos/podeBaixar'
import { calcularEncargos } from '@/domain/financeiro/calcularEncargos'
import { PublicCheckout } from './PublicCheckout'
import { PublicTermoAceite } from './PublicTermoAceite'
import type { ShareLink, Document, Invoice, BillingPolicy, Tenant } from '@/domain/types'
import { differenceInDays, format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { formatCurrency, formatDate } from '@/lib/utils'

type Estado = 'carregando' | 'expirado' | 'nao_encontrado' | 'aguardando_pagamento' | 'pronto' | 'erro'
type AcaoFatura = 'checkout' | 'termo' | null

interface InvoiceComValor {
  invoice: Invoice
  valorAtualizado: number
}

const shareLinkRepo = new LocalShareLinkRepository()
const docRepo = new LocalDocumentRepository()
const docTypeRepo = new LocalDocumentTypeRepository()
const billingPolicyRepo = new LocalBillingPolicyRepository()
const invoiceRepo = new LocalInvoiceRepository()
const tenantRepo = new LocalTenantRepository()

export default function ShareDocumentoPage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [estado, setEstado] = useState<Estado>('carregando')
  const [link, setLink] = useState<ShareLink | null>(null)
  const [doc, setDoc] = useState<Document | null>(null)
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [policy, setPolicy] = useState<BillingPolicy | null>(null)
  const [invoicesPendentes, setInvoicesPendentes] = useState<InvoiceComValor[]>([])
  const [avisoFinanceiro, setAvisoFinanceiro] = useState('')
  const [acaoFatura, setAcaoFatura] = useState<Record<string, AcaoFatura>>({})
  const [baixando, setBaixando] = useState(false)
  const [erroBaixar, setErroBaixar] = useState('')

  const verificarAcesso = useCallback(async (documento: Document, lnk: ShareLink) => {
    const [docType, pol, allInvoices] = await Promise.all([
      docTypeRepo.findById(documento.type_id),
      billingPolicyRepo.findByTenant(documento.tenant_id),
      invoiceRepo.findByClient(documento.tenant_id, documento.client_id),
    ])

    if (!docType || !pol) {
      setLink(lnk)
      setDoc(documento)
      setEstado('pronto')
      return
    }

    setPolicy(pol)
    const today = new Date()
    const vencidasForaCarencia = allInvoices.filter(
      (inv) =>
        inv.status === 'vencida' &&
        differenceInDays(today, parseISO(inv.vencimento)) > pol.carencia_dias
    )

    const resultado = podeBaixar(documento, docType, vencidasForaCarencia, pol, allInvoices)

    if (!resultado.permitido) {
      let pendentes: Invoice[] = []
      if (resultado.motivo === 'cobranca_pendente' && resultado.invoice_id) {
        const inv = allInvoices.find((i) => i.id === resultado.invoice_id)
        if (inv) pendentes = [inv]
      } else {
        pendentes = vencidasForaCarencia
      }

      const comValor: InvoiceComValor[] = pendentes.map((inv) => ({
        invoice: inv,
        valorAtualizado: calcularEncargos(inv, pol, today).total,
      }))

      setInvoicesPendentes(comValor)
      setAcaoFatura({})
      setLink(lnk)
      setDoc(documento)
      setEstado('aguardando_pagamento')
      return
    }

    if (resultado.motivo === 'informativo' && resultado.mensagem) {
      setAvisoFinanceiro(resultado.mensagem)
    }

    setLink(lnk)
    setDoc(documento)
    setEstado('pronto')
  }, [])

  useEffect(() => {
    if (!token) { setEstado('nao_encontrado'); return }

    shareLinkRepo.findByToken(token).then(async (lnk) => {
      if (!lnk) { setEstado('nao_encontrado'); return }

      if (new Date(lnk.expira_em) < new Date()) {
        setLink(lnk)
        setEstado('expirado')
        return
      }

      const documento = await docRepo.findById(lnk.document_id)
      if (!documento) { setEstado('nao_encontrado'); return }

      const t = await tenantRepo.findById(documento.tenant_id)
      setTenant(t)

      await verificarAcesso(documento, lnk)
    }).catch(() => setEstado('erro'))
  }, [token, verificarAcesso])

  async function handlePago() {
    if (!doc || !link) return
    setAcaoFatura({})
    setEstado('carregando')
    await verificarAcesso(doc, link)
  }

  function setAcao(invoiceId: string, acao: AcaoFatura) {
    setAcaoFatura((prev) => ({
      ...Object.fromEntries(Object.keys(prev).map((k) => [k, null])), // fecha os demais
      [invoiceId]: acao,
    }))
  }

  async function handleDownload() {
    if (!doc) return
    setBaixando(true)
    setErroBaixar('')
    try {
      const fileId = doc.provider_file_id ?? doc.storage_key
      const provedor = await obterProvedorStorage(doc.tenant_id)
      const url = await provedor.baixar(fileId)
      const a = window.document.createElement('a')
      a.href = url
      a.download = doc.nome
      a.click()
    } catch {
      setErroBaixar('Não foi possível baixar o arquivo. Tente novamente ou contate o escritório.')
    } finally {
      setBaixando(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 gap-6">

      {/* Header do escritório */}
      <div className="flex flex-col items-center gap-2 text-center">
        {tenant?.logo_url ? (
          <img
            src={tenant.logo_url}
            alt={tenant.nome}
            className="h-12 max-w-[160px] object-contain"
          />
        ) : (
          <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground text-xl font-bold select-none">
            {(tenant?.nome ?? 'E').charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <p className="font-semibold text-base leading-tight">{tenant?.nome ?? ''}</p>
          <p className="text-xs text-muted-foreground">Documento compartilhado</p>
        </div>
      </div>

      {/* ── Carregando ── */}
      {estado === 'carregando' && (
        <Card className="max-w-sm w-full">
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">Verificando link...</p>
          </CardContent>
        </Card>
      )}

      {/* ── Não encontrado ── */}
      {estado === 'nao_encontrado' && (
        <Card className="max-w-sm w-full">
          <CardHeader className="items-center pb-2">
            <FileWarning className="h-10 w-10 text-muted-foreground mb-1" />
            <CardTitle className="text-base">Link não encontrado</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground">
              Este link não existe ou foi removido pelo escritório.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Expirado ── */}
      {estado === 'expirado' && (
        <Card className="max-w-sm w-full">
          <CardHeader className="items-center pb-2">
            <Clock className="h-10 w-10 text-muted-foreground mb-1" />
            <CardTitle className="text-base">Link expirado</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-1">
            <p className="text-sm text-muted-foreground">
              Este link expirou em{' '}
              {link && format(new Date(link.expira_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}.
            </p>
            <p className="text-sm text-muted-foreground">
              Solicite um novo link ao escritório.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Aguardando pagamento — jornada de liberação ── */}
      {estado === 'aguardando_pagamento' && doc && (
        <Card className="max-w-sm w-full">
          <CardHeader className="items-center pb-3">
            <FileText className="h-10 w-10 text-primary mb-1" />
            <CardTitle className="text-base text-center">Seu documento está pronto</CardTitle>
            <p className="text-sm text-muted-foreground text-center leading-snug">
              Regularize o pagamento abaixo para liberar o download.
            </p>
          </CardHeader>
          <CardContent className="space-y-5">

            {/* Info do documento */}
            <div className="border rounded-lg p-3 bg-muted/30 space-y-0.5">
              <p className="font-medium text-sm truncate">{doc.nome}</p>
              {doc.competencia && (
                <p className="text-xs text-muted-foreground">Competência: {doc.competencia}</p>
              )}
            </div>

            {/* Uma seção por fatura pendente */}
            {invoicesPendentes.map(({ invoice, valorAtualizado }) => {
              const permiteReneg = invoice.permite_renegociacao !== false
              const acao = acaoFatura[invoice.id] ?? null

              return (
                <div key={invoice.id} className="space-y-3">
                  {/* Cabeçalho da fatura */}
                  <div className="flex items-center justify-between rounded-lg border bg-card p-3">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">{invoice.competencia}</p>
                      <p className="text-xs text-muted-foreground">
                        Venc. {formatDate(invoice.vencimento)}
                      </p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-sm font-bold">{formatCurrency(valorAtualizado)}</p>
                      {valorAtualizado > invoice.valor_original && (
                        <p className="text-xs text-muted-foreground line-through">
                          {formatCurrency(invoice.valor_original)}
                        </p>
                      )}
                      {!permiteReneg && (
                        <Badge variant="outline" className="text-xs text-destructive border-destructive/30">
                          Quitação obrigatória
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Ação ativa inline */}
                  {acao === 'checkout' && (
                    <PublicCheckout
                      invoice={invoice}
                      valorAtualizado={valorAtualizado}
                      onPago={handlePago}
                    />
                  )}

                  {acao === 'termo' && policy && (
                    <PublicTermoAceite
                      invoices={[invoice]}
                      policy={policy}
                      tenantId={doc.tenant_id}
                      clientId={doc.client_id}
                      onLiberado={handlePago}
                    />
                  )}

                  {/* Botões de ação */}
                  {acao === null && (
                    <div className={`grid gap-2 ${permiteReneg ? 'grid-cols-2' : 'grid-cols-1'}`}>
                      <Button
                        className="w-full"
                        onClick={() => setAcao(invoice.id, 'checkout')}
                      >
                        <CreditCard className="h-4 w-4 mr-1.5" />
                        Pagar agora
                      </Button>

                      {permiteReneg && (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => setAcao(invoice.id, 'termo')}
                        >
                          <FileSignature className="h-4 w-4 mr-1.5" />
                          Pagar depois
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Cancelar ação aberta */}
                  {acao !== null && (
                    <button
                      className="text-xs text-muted-foreground underline-offset-2 hover:underline w-full text-center"
                      onClick={() => setAcao(invoice.id, null)}
                    >
                      Voltar às opções
                    </button>
                  )}
                </div>
              )
            })}

            {/* Acesso ao portal para renegociação completa */}
            <div className="border-t pt-3">
              <button
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto"
                onClick={() => navigate('/login?redirect=' + encodeURIComponent('/portal/financeiro?acao=renegociar'))}
              >
                <HandshakeIcon className="h-3.5 w-3.5" />
                Negociar parcelamento no portal
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>

          </CardContent>
        </Card>
      )}

      {/* ── Erro ── */}
      {estado === 'erro' && (
        <Card className="max-w-sm w-full">
          <CardHeader className="items-center pb-2">
            <FileWarning className="h-10 w-10 text-destructive mb-1" />
            <CardTitle className="text-base">Erro ao carregar</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground">
              Ocorreu um erro inesperado. Tente novamente mais tarde.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Pronto para download ── */}
      {estado === 'pronto' && doc && (
        <Card className="max-w-sm w-full">
          <CardHeader className="items-center pb-2">
            <FileCheck className="h-10 w-10 text-green-500 mb-1" />
            <CardTitle className="text-base">Documento disponível</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border rounded-lg p-3 space-y-1 bg-muted/30">
              <p className="font-medium text-sm truncate">{doc.nome}</p>
              {doc.competencia && (
                <p className="text-xs text-muted-foreground">Competência: {doc.competencia}</p>
              )}
              {doc.tamanho > 0 && (
                <p className="text-xs text-muted-foreground">
                  Tamanho: {(doc.tamanho / 1024).toFixed(1)} KB
                </p>
              )}
            </div>

            {avisoFinanceiro && (
              <Alert className="py-2 border-amber-200 bg-amber-50 text-amber-800">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <AlertDescription className="text-xs">{avisoFinanceiro}</AlertDescription>
              </Alert>
            )}

            {link && (
              <p className="text-xs text-muted-foreground text-center">
                Válido até {format(new Date(link.expira_em), 'dd/MM/yyyy', { locale: ptBR })}
              </p>
            )}

            {erroBaixar && (
              <p className="text-xs text-destructive text-center">{erroBaixar}</p>
            )}

            <Button className="w-full" onClick={handleDownload} disabled={baixando}>
              <Download className="mr-2 h-4 w-4" />
              {baixando ? 'Baixando...' : 'Baixar documento'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Rodapé discreto */}
      <p className="text-[10px] text-muted-foreground/50 select-none">
        Powered by VisionBiz
      </p>

    </div>
  )
}
