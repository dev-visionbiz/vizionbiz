import { useEffect, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { addMonths, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { FileSignature, Loader2, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { useCreateRenegotiation } from '@/data/hooks/useRenegotiations'
import { useUpdateInvoice, useCreateInvoice } from '@/data/hooks/useInvoices'
import {
  LocalClientRepository,
  LocalTenantRepository,
} from '@/data/repositories/localStorage'
import { simularRenegociacao } from '@/domain/financeiro/simularRenegociacao'
import { gerarTermoHTML } from '@/domain/financeiro/gerarTermo'
import type { Invoice, BillingPolicy, Client, Tenant, Renegotiation } from '@/domain/types'
import { formatCurrency } from '@/lib/utils'

const clientRepo = new LocalClientRepository()
const tenantRepo = new LocalTenantRepository()

async function sha256Hex(text: string): Promise<string> {
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

interface PublicTermoAceiteProps {
  invoices: Invoice[]
  policy: BillingPolicy
  tenantId: string
  clientId: string
  onLiberado: () => void
}

export function PublicTermoAceite({
  invoices,
  policy,
  tenantId,
  clientId,
  onLiberado,
}: PublicTermoAceiteProps) {
  const [client, setClient] = useState<Client | null>(null)
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [parcelas, setParcelas] = useState(1)
  const [aceito, setAceito] = useState(false)
  const [termoExpandido, setTermoExpandido] = useState(false)
  const [assinando, setAssinando] = useState(false)
  const [concluido, setConcluido] = useState(false)

  const createReneg = useCreateRenegotiation()
  const updateInvoice = useUpdateInvoice()
  const createInvoice = useCreateInvoice()

  useEffect(() => {
    Promise.all([
      clientRepo.findById(clientId),
      tenantRepo.findById(tenantId),
    ]).then(([c, t]) => {
      // fallback para não bloquear o botão se os registros não carregarem
      setClient(c ?? { id: clientId, tenant_id: tenantId, tipo: 'juridica', razao_social: 'Cliente', regime: '', status: 'ativo' })
      setTenant(t ?? { id: tenantId, nome: 'Escritório', cnpj: '', cor_primaria: '', logo_url: null, dominio: '' })
    })
  }, [clientId, tenantId])

  const hoje = new Date()
  const maxParcelas = Math.min(Math.max(policy.parcelas_max ?? 1, 1), 6)
  const simulacao = simularRenegociacao(invoices, policy, parcelas, hoje)
  const valorParcela = simulacao.valor_parcela

  const vencimentos = Array.from({ length: parcelas }, (_, i) =>
    format(addMonths(hoje, i + 1), 'dd/MM/yyyy', { locale: ptBR })
  )

  async function handleAssinar() {
    if (!aceito || !client || !tenant) return
    setAssinando(true)
    try {
      const renegId = uuidv4()
      const agora = new Date().toISOString()

      const renegBase: Renegotiation = {
        id: renegId,
        tenant_id: tenantId,
        client_id: clientId,
        invoice_ids: simulacao.invoice_ids,
        saldo_principal: simulacao.saldo_principal,
        multa: simulacao.multa,
        juros: simulacao.juros,
        correcao: simulacao.correcao,
        encargo: simulacao.encargo,
        total: simulacao.total,
        parcelas,
        termo_hash: '',
        aceite: { ip: '0.0.0.0', em: agora, user_id: 'publico' },
        status: 'aceita',
      }

      const termoHTML = gerarTermoHTML(renegBase, simulacao, client, tenant)
      const hash = await sha256Hex(termoHTML)
      renegBase.termo_hash = hash

      // Persiste a renegociação
      await createReneg.mutateAsync(renegBase)

      // Marca faturas originais como renegociadas
      for (const invId of simulacao.invoice_ids) {
        await updateInvoice.mutateAsync({
          id: invId,
          data: { status: 'renegociada', renegotiation_id: renegId },
        })
      }

      // Cria novas faturas de parcelas
      for (let i = 0; i < parcelas; i++) {
        const venc = addMonths(hoje, i + 1)
        const vencStr = format(venc, 'yyyy-MM-dd')
        await createInvoice.mutateAsync({
          id: uuidv4(),
          tenant_id: tenantId,
          client_id: clientId,
          competencia: format(venc, 'yyyy-MM'),
          vencimento: vencStr,
          valor_original: valorParcela,
          status: 'aberta',
          origem: 'renegociacao',
          renegotiation_id: renegId,
          permite_renegociacao: false,
        })
      }

      setConcluido(true)
      setTimeout(() => onLiberado(), 1200)
    } finally {
      setAssinando(false)
    }
  }

  if (concluido) {
    return (
      <div className="border rounded-xl p-4 bg-green-50 border-green-200 flex flex-col items-center gap-2">
        <CheckCircle2 className="h-8 w-8 text-green-500" />
        <p className="text-sm font-medium text-green-800">Termo assinado. Liberando documento...</p>
      </div>
    )
  }

  return (
    <div className="border rounded-xl p-4 bg-card space-y-4">
      <div className="flex items-center gap-2">
        <FileSignature className="h-5 w-5 text-primary shrink-0" />
        <div>
          <p className="text-sm font-semibold">Pagar depois</p>
          <p className="text-xs text-muted-foreground">Escolha o prazo e libere o documento agora</p>
        </div>
      </div>

      {/* Resumo financeiro */}
      <div className="rounded-lg bg-muted/40 p-3 space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Principal</span>
          <span>{formatCurrency(simulacao.saldo_principal)}</span>
        </div>
        {simulacao.multa > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Multa</span>
            <span>{formatCurrency(simulacao.multa)}</span>
          </div>
        )}
        {simulacao.juros > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Juros</span>
            <span>{formatCurrency(simulacao.juros)}</span>
          </div>
        )}
        {simulacao.encargo > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Encargo</span>
            <span>{formatCurrency(simulacao.encargo)}</span>
          </div>
        )}
        <div className="flex justify-between border-t pt-1 mt-1 font-semibold text-sm">
          <span>Total</span>
          <span>{formatCurrency(simulacao.total)}</span>
        </div>
      </div>

      {/* Seletor de parcelas */}
      {maxParcelas > 1 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Condição de pagamento</p>
          <div className="grid grid-cols-3 gap-1.5">
            {Array.from({ length: maxParcelas }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => setParcelas(n)}
                className={`rounded-lg border px-2 py-2 text-xs text-center transition-colors ${
                  parcelas === n
                    ? 'border-primary bg-primary text-primary-foreground font-semibold'
                    : 'border-border bg-background hover:border-primary/50'
                }`}
              >
                {n === 1 ? '1× à vista' : `${n}× mensais`}
                <br />
                <span className={parcelas === n ? 'opacity-80' : 'text-muted-foreground'}>
                  {formatCurrency(simulacao.total / n)}
                </span>
              </button>
            ))}
          </div>
          <div className="text-xs text-muted-foreground space-y-0.5">
            {vencimentos.map((v, i) => (
              <div key={i} className="flex justify-between">
                <span>Parcela {i + 1}</span>
                <span className="font-medium">{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {maxParcelas === 1 && (
        <div className="text-xs text-muted-foreground flex justify-between">
          <span>Vencimento</span>
          <span className="font-medium">{vencimentos[0]}</span>
        </div>
      )}

      {/* Cláusulas resumidas (expansível) */}
      <div className="border rounded-lg overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium hover:bg-muted/40 transition-colors"
          onClick={() => setTermoExpandido((v) => !v)}
        >
          <span>Ver cláusulas do acordo</span>
          {termoExpandido ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
        {termoExpandido && (
          <div className="px-3 pb-3 text-xs text-muted-foreground space-y-1.5 border-t">
            <p className="pt-2">1. Confesso dever os valores discriminados acima, resultantes de honorários em atraso.</p>
            <p>2. O pagamento nas datas acordadas implica novação das dívidas originais.</p>
            <p>3. O não pagamento de qualquer parcela vencida implica vencimento antecipado do saldo, acrescido de multa de 2% e juros de 1% a.m.</p>
            <p>4. O aceite eletrônico tem validade jurídica conforme MP 2.200-2/2001 e Lei 14.063/2020.</p>
            <p className="font-medium text-foreground/70">
              Credor: {tenant?.nome ?? '...'} &nbsp;|&nbsp; CNPJ: {tenant?.cnpj ?? '...'}
            </p>
            <p className="font-medium text-foreground/70">
              Devedor: {client?.razao_social ?? '...'} &nbsp;|&nbsp; {client?.cnpj ? `CNPJ: ${client.cnpj}` : `CPF: ${client?.cpf ?? '...'}`}
            </p>
          </div>
        )}
      </div>

      {/* Aceite */}
      <div className="flex items-start gap-3">
        <Checkbox
          id="aceite"
          checked={aceito}
          onCheckedChange={(v) => setAceito(!!v)}
          className="mt-0.5"
        />
        <Label htmlFor="aceite" className="text-xs leading-relaxed cursor-pointer">
          Estou ciente do valor e me comprometo a pagar nas datas indicadas. Entendo que o documento será liberado com base nessa confiança.
        </Label>
      </div>

      <Button
        className="w-full"
        disabled={!aceito || assinando}
        onClick={handleAssinar}
      >
        {assinando ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Registrando compromisso...</>
        ) : (
          <><FileSignature className="mr-2 h-4 w-4" /> Confirmar e liberar documento</>
        )}
      </Button>
    </div>
  )
}
