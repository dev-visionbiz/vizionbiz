import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/auth/AuthProvider'
import { useBillingPolicy, useUpsertBillingPolicy } from '@/data/hooks/useBillingPolicy'
import { useToast } from '@/components/ui/use-toast'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import type { BillingPolicy } from '@/domain/types'
import { v4 as uuidv4 } from 'uuid'

const schema = z.object({
  multa_pct: z.coerce.number().min(0).max(10),
  juros_mes_pct: z.coerce.number().min(0).max(5),
  carencia_dias: z.coerce.number().int().min(0).max(30),
  indice_correcao: z.enum(['ipca', 'nenhum']),
  parcelas_max: z.coerce.number().int().min(1).max(24),
  desconto_avista_encargos_pct: z.coerce.number().min(0).max(100),
  encargo_renegociacao_tipo: z.enum(['fixo', 'pct', 'nenhum']),
  encargo_renegociacao_valor: z.coerce.number().min(0),
  encargo_teto: z.coerce.number().min(0),
  modo_acesso: z.enum(['informativo', 'parcial', 'total']),
  descricao_cobranca_padrao: z.string().max(250).optional(),
})

type FormData = z.infer<typeof schema>

export default function PoliticaCobranca() {
  const { currentUser } = useAuth()
  const tenantId = currentUser?.tenant_id ?? ''
  const { data: policy, isLoading } = useBillingPolicy(tenantId)
  const upsert = useUpsertBillingPolicy()
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      multa_pct: 2,
      juros_mes_pct: 1,
      carencia_dias: 3,
      indice_correcao: 'nenhum',
      parcelas_max: 12,
      desconto_avista_encargos_pct: 10,
      encargo_renegociacao_tipo: 'nenhum',
      encargo_renegociacao_valor: 0,
      encargo_teto: 0,
      modo_acesso: 'informativo',
      descricao_cobranca_padrao: 'Referente honorários dos serviços contábeis contratados Competência [mes/ano]',
    },
  })

  useEffect(() => {
    if (policy) {
      reset({
        multa_pct: policy.multa_pct,
        juros_mes_pct: policy.juros_mes_pct,
        carencia_dias: policy.carencia_dias,
        indice_correcao: policy.indice_correcao,
        parcelas_max: policy.parcelas_max,
        desconto_avista_encargos_pct: policy.desconto_avista_encargos_pct,
        encargo_renegociacao_tipo: policy.encargo_renegociacao_tipo,
        encargo_renegociacao_valor: policy.encargo_renegociacao_valor,
        encargo_teto: policy.encargo_teto,
        modo_acesso: policy.modo_acesso,
        descricao_cobranca_padrao: policy.descricao_cobranca_padrao ?? 'Referente honorários dos serviços contábeis contratados Competência [mes/ano]',
      })
    }
  }, [policy, reset])

  const multaPct = watch('multa_pct')
  const encargoTipo = watch('encargo_renegociacao_tipo')

  const onSubmit = async (data: FormData) => {
    const { descricao_cobranca_padrao, ...rest } = data
    const updated: BillingPolicy = {
      id: policy?.id ?? uuidv4(),
      tenant_id: tenantId,
      ...rest,
      descricao_cobranca_padrao: descricao_cobranca_padrao || undefined,
    }
    try {
      await upsert.mutateAsync(updated)
      toast({ title: 'Política salva', description: 'Configurações de cobrança atualizadas com sucesso.' })
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível salvar a política.', variant: 'destructive' })
    }
  }

  if (isLoading) return <PageLoader />

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Encargos por Atraso</CardTitle>
          <CardDescription>Defina multa, juros e correção para faturas vencidas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="multa_pct">Multa (%)</Label>
              <Input id="multa_pct" type="number" step="0.1" {...register('multa_pct')} />
              {errors.multa_pct && <p className="text-xs text-destructive">{errors.multa_pct.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="juros_mes_pct">Juros ao mês (%)</Label>
              <Input id="juros_mes_pct" type="number" step="0.1" {...register('juros_mes_pct')} />
              {errors.juros_mes_pct && <p className="text-xs text-destructive">{errors.juros_mes_pct.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="carencia_dias">Carência (dias)</Label>
              <Input id="carencia_dias" type="number" {...register('carencia_dias')} />
              {errors.carencia_dias && <p className="text-xs text-destructive">{errors.carencia_dias.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Índice de Correção</Label>
              <Select
                defaultValue={policy?.indice_correcao ?? 'nenhum'}
                onValueChange={(v) => setValue('indice_correcao', v as 'ipca' | 'nenhum', { shouldDirty: true })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhum">Nenhum</SelectItem>
                  <SelectItem value="ipca">IPCA (mock 0,4% a.m.)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {Number(multaPct) > 2 && (
            <div className="alert-warning flex items-start gap-2 rounded-md border p-3 text-sm">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                Atenção: multa acima de 2% pode violar o CDC art. 52 §1º em relações de consumo.
                Ao salvar, você confirma ciência do risco.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Renegociação</CardTitle>
          <CardDescription>Encargos e descontos no processo de renegociação.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Tipo de Encargo</Label>
              <Select
                defaultValue={policy?.encargo_renegociacao_tipo ?? 'nenhum'}
                onValueChange={(v) => setValue('encargo_renegociacao_tipo', v as 'fixo' | 'pct' | 'nenhum', { shouldDirty: true })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhum">Nenhum</SelectItem>
                  <SelectItem value="fixo">Fixo (R$)</SelectItem>
                  <SelectItem value="pct">Percentual (%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {encargoTipo !== 'nenhum' && (
              <div className="space-y-1">
                <Label htmlFor="encargo_renegociacao_valor">
                  Valor do Encargo {encargoTipo === 'pct' ? '(%)' : '(R$)'}
                </Label>
                <Input id="encargo_renegociacao_valor" type="number" step="0.01" {...register('encargo_renegociacao_valor')} />
              </div>
            )}
            <div className="space-y-1">
              <Label htmlFor="encargo_teto">Teto do Encargo (R$)</Label>
              <Input id="encargo_teto" type="number" step="0.01" {...register('encargo_teto')} />
              <p className="text-xs text-muted-foreground">0 = sem teto</p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="parcelas_max">Parcelas Máximas</Label>
              <Input id="parcelas_max" type="number" {...register('parcelas_max')} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="desconto_avista_encargos_pct">Desconto à Vista sobre Encargos (%)</Label>
              <Input id="desconto_avista_encargos_pct" type="number" step="0.1" {...register('desconto_avista_encargos_pct')} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Controle de Acesso a Documentos</CardTitle>
          <CardDescription>O que acontece com o acesso a documentos quando há inadimplência.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>Modo de Acesso</Label>
            <Select
              defaultValue={policy?.modo_acesso ?? 'informativo'}
              onValueChange={(v) => setValue('modo_acesso', v as 'informativo' | 'parcial' | 'total', { shouldDirty: true })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="informativo">Informativo — Exibe banner de pendência, download sempre liberado</SelectItem>
                <SelectItem value="parcial">Parcial — Documentos essenciais sempre liberados; demais bloqueiam</SelectItem>
                <SelectItem value="total">Total — Tudo bloqueado até regularização (requer aceite)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Descrição Padrão de Cobrança</CardTitle>
          <CardDescription>
            Texto padrão enviado ao banco/boleto. Use <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">[mes/ano]</code> como variável — será substituído pela competência na geração do lote.
            Pode ser sobreposto individualmente no cadastro de cada cliente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="descricao_cobranca_padrao">Template (máx. 250 caracteres)</Label>
              <button
                type="button"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => {
                  const field = document.getElementById('descricao_cobranca_padrao') as HTMLTextAreaElement | null
                  if (field) {
                    field.value = 'Referente honorários dos serviços contábeis contratados Competência [mes/ano]'
                    field.dispatchEvent(new Event('input', { bubbles: true }))
                  }
                }}
              >
                <RotateCcw size={12} /> Restaurar padrão
              </button>
            </div>
            <textarea
              id="descricao_cobranca_padrao"
              rows={2}
              maxLength={250}
              className="w-full resize-none text-sm rounded-lg border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring leading-relaxed"
              {...register('descricao_cobranca_padrao')}
            />
            <p className="text-xs text-muted-foreground">
              Exemplo de saída: <em>"Referente honorários dos serviços contábeis contratados Competência 10/2026"</em>
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={upsert.isPending}>
          {upsert.isPending ? 'Salvando...' : 'Salvar Política'}
        </Button>
      </div>
    </form>
  )
}
