import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useUpdateGuia } from '@/data/hooks/useGuias'
import { formatCurrency, cn } from '@/lib/utils'
import type { GuiaRecolhimento, GuiaStatus } from '@/domain/types'
import { TIPO_GUIA_CONFIG, STATUS_GUIA_CONFIG } from './guiasConfig'
import { Pencil, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

const schema = z.object({
  descricao: z.string().min(3, 'Informe a descrição'),
  competencia: z.string().regex(/^\d{4}-\d{2}$/, 'Use o formato AAAA-MM'),
  vencimento: z.string().min(1, 'Informe o vencimento'),
  valor: z.coerce.number().min(0, 'Valor inválido'),
  valor_multa: z.coerce.number().min(0).optional(),
  valor_juros: z.coerce.number().min(0).optional(),
  status: z.string(),
  codigo_receita: z.string().optional(),
  periodo_apuracao: z.string().optional(),
  numero_referencia: z.string().optional(),
  numero_documento: z.string().optional(),
  codigo_barras: z.string().optional(),
  linha_digitavel: z.string().optional(),
  pix_copia_cola: z.string().optional(),
  observacoes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

// Status que o usuário pode setar manualmente (exceto paga/vencida que são derivadas)
const STATUS_EDITAVEIS: GuiaStatus[] = ['aguardando_emissao', 'emitida', 'em_retificacao', 'cancelada']

interface Props {
  guia: GuiaRecolhimento
  nomeCliente: string
  open: boolean
  onClose: () => void
}

export function EditarGuiaDialog({ guia, nomeCliente, open, onClose }: Props) {
  const { mutateAsync, isPending } = useUpdateGuia()
  const { toast } = useToast()
  const tipoConfig = TIPO_GUIA_CONFIG[guia.tipo]
  const TipoIcon = tipoConfig.icon

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      descricao: guia.descricao,
      competencia: guia.competencia,
      vencimento: guia.vencimento,
      valor: guia.valor,
      valor_multa: guia.valor_multa ?? 0,
      valor_juros: guia.valor_juros ?? 0,
      status: guia.status,
      codigo_receita: guia.codigo_receita ?? '',
      periodo_apuracao: guia.periodo_apuracao ?? '',
      numero_referencia: guia.numero_referencia ?? '',
      numero_documento: guia.numero_documento ?? '',
      codigo_barras: guia.codigo_barras ?? '',
      linha_digitavel: guia.linha_digitavel ?? '',
      pix_copia_cola: guia.pix_copia_cola ?? '',
      observacoes: guia.observacoes ?? '',
    },
  })

  async function onSubmit(data: FormData) {
    try {
      await mutateAsync({
        id: guia.id,
        data: {
          descricao: data.descricao,
          competencia: data.competencia,
          vencimento: data.vencimento,
          valor: data.valor,
          valor_multa: data.valor_multa || undefined,
          valor_juros: data.valor_juros || undefined,
          status: data.status as GuiaStatus,
          codigo_receita: data.codigo_receita || undefined,
          periodo_apuracao: data.periodo_apuracao || undefined,
          numero_referencia: data.numero_referencia || undefined,
          numero_documento: data.numero_documento || undefined,
          codigo_barras: data.codigo_barras || undefined,
          linha_digitavel: data.linha_digitavel || undefined,
          pix_copia_cola: data.pix_copia_cola || undefined,
          observacoes: data.observacoes || undefined,
        },
      })
      toast({ title: 'Guia atualizada com sucesso!' })
      onClose()
    } catch {
      toast({ title: 'Erro ao atualizar guia', variant: 'destructive' })
    }
  }

  function handleClose() {
    reset()
    onClose()
  }

  const valorAtual = watch('valor') ?? 0
  const multaAtual = watch('valor_multa') ?? 0
  const jurosAtual = watch('valor_juros') ?? 0
  const total = Number(valorAtual) + Number(multaAtual) + Number(jurosAtual)

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4 text-muted-foreground" />
            Editar Guia
          </DialogTitle>
        </DialogHeader>

        {/* Identificação (somente leitura) */}
        <div className="rounded-lg border bg-muted/30 p-3 text-sm flex items-center gap-3">
          <div className={cn('h-8 w-8 rounded flex items-center justify-center shrink-0', tipoConfig.cor)}>
            <TipoIcon className={cn('h-4 w-4', tipoConfig.corTexto)} />
          </div>
          <div className="min-w-0">
            <p className="font-medium truncate">{tipoConfig.label}</p>
            <p className="text-muted-foreground text-xs truncate">{nomeCliente}</p>
          </div>
          <p className="text-xs text-muted-foreground ml-auto shrink-0">Tipo e cliente não editáveis</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

          {/* Descrição */}
          <div className="space-y-1.5">
            <Label>Descrição *</Label>
            <Input
              {...register('descricao')}
              className={errors.descricao ? 'border-destructive' : ''}
            />
            {errors.descricao && <p className="text-xs text-destructive">{errors.descricao.message}</p>}
          </div>

          {/* Competência + Vencimento */}
          <div className="grid grid-cols-2 gap-4">
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

          {/* Valores */}
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Valor Principal *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('valor')}
                  className={errors.valor ? 'border-destructive' : ''}
                />
                {errors.valor && <p className="text-xs text-destructive">{errors.valor.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Multa</Label>
                <Input type="number" step="0.01" min="0" {...register('valor_multa')} />
              </div>
              <div className="space-y-1.5">
                <Label>Juros</Label>
                <Input type="number" step="0.01" min="0" {...register('valor_juros')} />
              </div>
            </div>
            {(Number(multaAtual) > 0 || Number(jurosAtual) > 0) && (
              <p className="text-xs text-muted-foreground text-right">
                Total: <span className="font-medium text-foreground">{formatCurrency(total)}</span>
              </p>
            )}
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select
              value={watch('status')}
              onValueChange={(v) => setValue('status', v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_EDITAVEIS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_GUIA_CONFIG[s].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Status "Paga" e "Vencida" são definidos automaticamente pelo sistema.
            </p>
          </div>

          {/* Linha digitável / Código de barras / PIX */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Linha Digitável</Label>
              <Input
                {...register('linha_digitavel')}
                placeholder="000.00000 00000.000000 00000.000000 0 00000000000000"
                className="font-mono text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nº Documento</Label>
                <Input {...register('numero_documento')} />
              </div>
              <div className="space-y-1.5">
                <Label>Cód. de Barras</Label>
                <Input {...register('codigo_barras')} className="font-mono text-xs" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>PIX Copia e Cola <span className="text-muted-foreground font-normal text-xs">(opcional)</span></Label>
              <Input
                {...register('pix_copia_cola')}
                placeholder="Cole o código EMV do PIX"
                className="font-mono text-xs"
              />
            </div>
          </div>

          {/* Campos específicos DARF */}
          {(guia.tipo === 'darf' || guia.tipo === 'darf_simples') && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Código de Receita</Label>
                <Input {...register('codigo_receita')} placeholder="0000" maxLength={4} />
              </div>
              <div className="space-y-1.5">
                <Label>Período de Apuração</Label>
                <Input {...register('periodo_apuracao')} placeholder="MM/AAAA" />
              </div>
            </div>
          )}

          {guia.tipo === 'fgts' && (
            <div className="space-y-1.5">
              <Label>Número de Referência</Label>
              <Input {...register('numero_referencia')} />
            </div>
          )}

          {/* Observações */}
          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Textarea
              {...register('observacoes')}
              rows={2}
              className="resize-none"
              placeholder="Anotações internas sobre esta guia"
            />
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending} className="gap-2">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
              {isPending ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
