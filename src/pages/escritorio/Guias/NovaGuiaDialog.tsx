import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useCreateGuia } from '@/data/hooks/useGuias'
import type { Client, TipoGuia } from '@/domain/types'
import { TIPO_GUIA_CONFIG, TIPOS_GUIA_ORDENADOS, CAMPOS_ESPECIFICOS } from './guiasConfig'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'

const schema = z.object({
  cliente_id: z.string().min(1, 'Selecione o cliente'),
  tipo: z.string().min(1, 'Selecione o tipo'),
  descricao: z.string().min(3, 'Descreva a guia'),
  competencia: z.string().regex(/^\d{4}-\d{2}$/, 'Use o formato AAAA-MM'),
  vencimento: z.string().min(1, 'Informe o vencimento'),
  valor: z.coerce.number().positive('Valor deve ser positivo'),
  codigo_receita: z.string().optional(),
  periodo_apuracao: z.string().optional(),
  numero_referencia: z.string().optional(),
  codigo_barras: z.string().optional(),
  linha_digitavel: z.string().optional(),
  pix_copia_cola: z.string().optional(),
  numero_documento: z.string().optional(),
  observacoes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface Props {
  open: boolean
  onClose: () => void
  tenantId: string
  userId: string
  clientes: Client[]
}

export function NovaGuiaDialog({ open, onClose, tenantId, userId, clientes }: Props) {
  const [step, setStep] = useState(0)
  const { mutateAsync, isPending } = useCreateGuia()
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    trigger,
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      competencia: format(new Date(), 'yyyy-MM'),
      tipo: '',
      cliente_id: '',
    },
  })

  const tipoSelecionado = watch('tipo') as TipoGuia | ''
  const camposEspecificos = tipoSelecionado ? CAMPOS_ESPECIFICOS[tipoSelecionado] : undefined

  async function avancar() {
    const fieldsStep0: (keyof FormData)[] = ['cliente_id', 'tipo', 'descricao']
    const ok = await trigger(fieldsStep0)
    if (ok) setStep(1)
  }

  async function onSubmit(data: FormData) {
    try {
      await mutateAsync({
        tenant_id: tenantId,
        cliente_id: data.cliente_id,
        tipo: data.tipo as TipoGuia,
        descricao: data.descricao,
        competencia: data.competencia,
        vencimento: data.vencimento,
        valor: data.valor,
        status: 'emitida',
        origem: 'manual',
        segunda_via_status: 'nao_solicitada',
        codigo_receita: data.codigo_receita || undefined,
        periodo_apuracao: data.periodo_apuracao || undefined,
        numero_referencia: data.numero_referencia || undefined,
        codigo_barras: data.codigo_barras || undefined,
        linha_digitavel: data.linha_digitavel || undefined,
        pix_copia_cola: data.pix_copia_cola || undefined,
        numero_documento: data.numero_documento || undefined,
        observacoes: data.observacoes || undefined,
        criado_em: format(new Date(), 'yyyy-MM-dd'),
        criado_por: userId,
      })
      toast({ title: 'Guia cadastrada com sucesso!' })
      reset()
      setStep(0)
      onClose()
    } catch {
      toast({ title: 'Erro ao cadastrar guia', variant: 'destructive' })
    }
  }

  function handleClose() {
    reset()
    setStep(0)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Guia de Recolhimento</DialogTitle>
        </DialogHeader>

        {/* Stepper indicator */}
        <div className="flex items-center gap-2 pb-1">
          {['Identificação', 'Dados da Guia'].map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              {i > 0 && <div className="h-px flex-1 bg-border w-8" />}
              <div className="flex items-center gap-1.5">
                <span className={cn(
                  'h-5 w-5 rounded-full text-xs font-medium flex items-center justify-center',
                  step === i ? 'bg-primary text-primary-foreground' :
                  step > i ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'
                )}>
                  {i + 1}
                </span>
                <span className={cn('text-sm', step === i ? 'font-medium' : 'text-muted-foreground')}>
                  {label}
                </span>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          {step === 0 && (
            <div className="space-y-4">
              {/* Cliente */}
              <div className="space-y-1.5">
                <Label>Cliente *</Label>
                <Select
                  value={watch('cliente_id')}
                  onValueChange={(v) => setValue('cliente_id', v, { shouldValidate: true })}
                >
                  <SelectTrigger className={errors.cliente_id ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.fantasia ?? c.razao_social}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.cliente_id && <p className="text-xs text-destructive">{errors.cliente_id.message}</p>}
              </div>

              {/* Tipo */}
              <div className="space-y-1.5">
                <Label>Tipo de Guia *</Label>
                <Select
                  value={watch('tipo')}
                  onValueChange={(v) => {
                    setValue('tipo', v, { shouldValidate: true })
                    // Sugerir descrição automática
                    if (!watch('descricao')) {
                      const comp = watch('competencia')
                      const label = TIPO_GUIA_CONFIG[v as TipoGuia]?.labelCurto ?? ''
                      if (comp) setValue('descricao', `${label} ${comp}`)
                    }
                  }}
                >
                  <SelectTrigger className={errors.tipo ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_GUIA_ORDENADOS.map((t) => (
                      <SelectItem key={t} value={t}>
                        {TIPO_GUIA_CONFIG[t].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.tipo && <p className="text-xs text-destructive">{errors.tipo.message}</p>}
              </div>

              {/* Descrição */}
              <div className="space-y-1.5">
                <Label>Descrição *</Label>
                <Input
                  {...register('descricao')}
                  placeholder="Ex: IRPJ 4º Trimestre, DAS Out/2026"
                  className={errors.descricao ? 'border-destructive' : ''}
                />
                {errors.descricao && <p className="text-xs text-destructive">{errors.descricao.message}</p>}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Competência */}
                <div className="space-y-1.5">
                  <Label>Competência *</Label>
                  <Input
                    {...register('competencia')}
                    placeholder="AAAA-MM"
                    maxLength={7}
                    className={errors.competencia ? 'border-destructive' : ''}
                  />
                  {errors.competencia && <p className="text-xs text-destructive">{errors.competencia.message}</p>}
                </div>

                {/* Vencimento */}
                <div className="space-y-1.5">
                  <Label>Vencimento *</Label>
                  <Input
                    type="date"
                    {...register('vencimento')}
                    className={errors.vencimento ? 'border-destructive' : ''}
                  />
                  {errors.vencimento && <p className="text-xs text-destructive">{errors.vencimento.message}</p>}
                </div>
              </div>

              {/* Valor */}
              <div className="space-y-1.5">
                <Label>Valor (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  {...register('valor')}
                  placeholder="0,00"
                  className={errors.valor ? 'border-destructive' : ''}
                />
                {errors.valor && <p className="text-xs text-destructive">{errors.valor.message}</p>}
              </div>

              {/* Campos específicos por tipo */}
              {camposEspecificos?.codigo_receita && (
                <div className="space-y-1.5">
                  <Label>Código de Receita</Label>
                  <Input {...register('codigo_receita')} placeholder="Ex: 1138" />
                </div>
              )}

              {camposEspecificos?.periodo_apuracao && (
                <div className="space-y-1.5">
                  <Label>Período de Apuração</Label>
                  <Input {...register('periodo_apuracao')} placeholder="Ex: 09/2026" />
                </div>
              )}

              {camposEspecificos?.numero_referencia && (
                <div className="space-y-1.5">
                  <Label>Número de Referência</Label>
                  <Input {...register('numero_referencia')} />
                </div>
              )}

              {/* Identificação da guia */}
              <div className="space-y-1.5">
                <Label>Linha Digitável / Código de Barras</Label>
                <Input
                  {...register('linha_digitavel')}
                  placeholder="Cole a linha digitável ou código de barras"
                  className="font-mono text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label>PIX Copia e Cola <span className="text-muted-foreground font-normal text-xs">(opcional)</span></Label>
                <Input
                  {...register('pix_copia_cola')}
                  placeholder="Cole o código EMV do PIX"
                  className="font-mono text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Número do Documento</Label>
                <Input {...register('numero_documento')} placeholder="Número de identificação único" />
              </div>

              {/* Observações */}
              <div className="space-y-1.5">
                <Label>Observações</Label>
                <Textarea
                  {...register('observacoes')}
                  placeholder="Observações internas"
                  rows={2}
                />
              </div>
            </div>
          )}

          <DialogFooter className="mt-6 gap-2">
            {step === 0 ? (
              <>
                <Button type="button" variant="outline" onClick={handleClose}>Cancelar</Button>
                <Button type="button" onClick={avancar}>Próximo</Button>
              </>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={() => setStep(0)}>Voltar</Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? 'Salvando...' : 'Cadastrar Guia'}
                </Button>
              </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
