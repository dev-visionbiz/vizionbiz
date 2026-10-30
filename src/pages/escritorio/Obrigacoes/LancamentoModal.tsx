import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { useCreateObrigacaoLancamento, useUpdateObrigacaoLancamento } from '@/data/hooks/useObrigacoes'
import type { ObrigacaoConfig, ObrigacaoLancamento, ObrigacaoStatus } from '@/domain/types'
import type { Client } from '@/domain/types'

type Row = {
  config: ObrigacaoConfig
  lancamento: ObrigacaoLancamento | null
  cliente: Client | undefined
  statusDisplay: ObrigacaoStatus
}

interface Props {
  row: Row
  competencia: string
  tenantId: string
  onClose: () => void
}

function formatCompetencia(comp: string): string {
  try {
    const d = parseISO(comp + '-01')
    const s = format(d, 'MMMM/yyyy', { locale: ptBR })
    return s.charAt(0).toUpperCase() + s.slice(1)
  } catch {
    return comp
  }
}

function parseCurrency(value: string): number {
  return parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0
}

function formatCurrencyInput(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function LancamentoModal({ row, competencia, tenantId, onClose }: Props) {
  const { toast } = useToast()
  const createLancamento = useCreateObrigacaoLancamento()
  const updateLancamento = useUpdateObrigacaoLancamento()

  const [faturamento, setFaturamento] = useState(() =>
    row.lancamento?.faturamento != null
      ? formatCurrencyInput(row.lancamento.faturamento)
      : ''
  )
  const [observacoes, setObservacoes] = useState(row.lancamento?.observacoes ?? '')
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    const valor = parseCurrency(faturamento)
    if (!valor || isNaN(valor) || valor <= 0) {
      toast({ title: 'Informe o faturamento', description: 'O valor deve ser maior que zero.', variant: 'destructive' })
      return
    }

    setLoading(true)
    try {
      const now = new Date().toISOString()

      if (!row.lancamento) {
        await createLancamento.mutateAsync({
          tenant_id: tenantId,
          client_id: row.config.client_id,
          tipo: row.config.tipo,
          competencia,
          status: 'gerar',
          faturamento: valor,
          observacoes: observacoes || undefined,
          criado_em: now,
          criado_por: undefined,
          atualizado_em: now,
        })
      } else {
        const currentStatus = row.lancamento.status
        let newStatus: ObrigacaoStatus = currentStatus
        if (currentStatus === 'pendente') newStatus = 'gerar'
        else if (currentStatus === 'aberto' || currentStatus === 'transmitido') newStatus = 'recalcular'

        await updateLancamento.mutateAsync({
          id: row.lancamento.id,
          data: {
            faturamento: valor,
            status: newStatus,
            observacoes: observacoes || undefined,
          },
        })
      }

      toast({ title: 'Faturamento salvo com sucesso' })
      onClose()
    } catch {
      toast({ title: 'Erro ao salvar', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Lançar Faturamento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Cliente</Label>
            <p className="text-sm text-muted-foreground border rounded px-3 py-2 bg-muted/30">
              {row.cliente?.fantasia ?? row.cliente?.razao_social ?? '—'}
            </p>
          </div>

          <div className="space-y-1">
            <Label>Competência</Label>
            <p className="text-sm text-muted-foreground border rounded px-3 py-2 bg-muted/30">
              {formatCompetencia(competencia)}
            </p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="faturamento">Faturamento (R$) *</Label>
            <Input
              id="faturamento"
              placeholder="0,00"
              value={faturamento}
              onChange={(e) => setFaturamento(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              placeholder="Observações opcionais..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
