import { useState, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { format } from 'date-fns'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Wrench, BookOpen } from 'lucide-react'
import type { Client, Servico } from '@/domain/types'
import { useCreateServicoRealizado } from '@/data/hooks/useServicosRealizados'
import { useToast } from '@/components/ui/use-toast'

function parseBRL(s: string): number {
  if (!s) return 0
  return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0
}
function inputToBRL(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  return (parseInt(digits, 10) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

interface Props {
  open: boolean
  onClose: () => void
  tenantId: string
  userId: string
  clients: Client[]
  servicos: Servico[]
  preClienteId?: string  // quando abre da ficha de um cliente específico
}

export function RegistrarServicoDialog({ open, onClose, tenantId, userId, clients, servicos, preClienteId }: Props) {
  const { toast } = useToast()
  const createServico = useCreateServicoRealizado()

  const hoje = format(new Date(), 'yyyy-MM-dd')
  const mesAtual = hoje.slice(0, 7)

  const [form, setForm] = useState({
    cliente_id: preClienteId ?? '',
    servico_id: '',       // catálogo (opcional)
    nome: '',
    descricao: '',
    valor: '',
    competencia: mesAtual,
    data_execucao: hoje,
  })

  // Preenche nome e valor ao selecionar do catálogo
  const handleServicoCatalogo = (servicoId: string) => {
    const s = servicos.find(sv => sv.id === servicoId)
    setForm(f => ({
      ...f,
      servico_id: servicoId,
      nome: s?.nome ?? f.nome,
      valor: s ? s.valor_padrao.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : f.valor,
    }))
  }

  useEffect(() => {
    if (open) {
      setForm({
        cliente_id: preClienteId ?? '',
        servico_id: '',
        nome: '',
        descricao: '',
        valor: '',
        competencia: mesAtual,
        data_execucao: hoje,
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const canSave = !!form.cliente_id && !!form.nome.trim() && parseBRL(form.valor) > 0 && !!form.competencia && !!form.data_execucao

  const handleSave = async () => {
    if (!canSave) return
    try {
      await createServico.mutateAsync({
        id: uuidv4(),
        tenant_id: tenantId,
        cliente_id: form.cliente_id,
        servico_id: form.servico_id || undefined,
        nome: form.nome.trim(),
        descricao: form.descricao.trim() || undefined,
        valor: parseBRL(form.valor),
        competencia: form.competencia,
        data_execucao: form.data_execucao,
        status: 'pendente_cobranca',
        criado_por: userId,
        criado_em: new Date().toISOString(),
      })
      toast({ title: 'Lançamento registrado', description: 'Pendente de cobrança.' })
      onClose()
    } catch {
      toast({ title: 'Erro ao registrar lançamento', variant: 'destructive' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench size={18} className="text-primary" />
            Registrar Serviço Realizado
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-0.5">
            Registra um serviço executado que ficará pendente de cobrança.
          </p>
        </DialogHeader>

        <div className="space-y-4 py-1">

          {/* Cliente */}
          <div className="space-y-1.5">
            <Label>Cliente <span className="text-destructive">*</span></Label>
            <Select
              value={form.cliente_id}
              onValueChange={(v) => setForm(f => ({ ...f, cliente_id: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecionar cliente..." />
              </SelectTrigger>
              <SelectContent>
                {clients.filter(c => c.status === 'ativo').map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.razao_social}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Catálogo de serviços (opcional) */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <BookOpen size={13} className="text-muted-foreground" />
              Do catálogo
              <span className="text-xs text-muted-foreground font-normal">(opcional — preenche nome e valor)</span>
            </Label>
            <Select
              value={form.servico_id || '_nenhum'}
              onValueChange={(v) => v === '_nenhum' ? setForm(f => ({ ...f, servico_id: '' })) : handleServicoCatalogo(v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Serviço do catálogo..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_nenhum">Serviço personalizado</SelectItem>
                {servicos.filter(s => s.ativo).map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nome}
                    {s.valor_padrao > 0 && (
                      <span className="ml-2 text-xs text-muted-foreground tabular-nums">
                        R$ {s.valor_padrao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Nome do serviço */}
          <div className="space-y-1.5">
            <Label htmlFor="sr-nome">Descrição do serviço <span className="text-destructive">*</span></Label>
            <Input
              id="sr-nome"
              placeholder="Ex: IRPF 2025 — Declaração Pessoa Física"
              value={form.nome}
              onChange={(e) => setForm(f => ({ ...f, nome: e.target.value }))}
            />
          </div>

          {/* Observação interna */}
          <div className="space-y-1.5">
            <Label htmlFor="sr-desc">Observação interna <span className="text-xs font-normal text-muted-foreground">(opcional)</span></Label>
            <Input
              id="sr-desc"
              placeholder="Detalhes para uso interno..."
              value={form.descricao}
              onChange={(e) => setForm(f => ({ ...f, descricao: e.target.value }))}
            />
          </div>

          {/* Valor + Competência + Data */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sr-valor">Valor (R$) <span className="text-destructive">*</span></Label>
              <Input
                id="sr-valor"
                type="text"
                inputMode="numeric"
                placeholder="0,00"
                value={form.valor}
                onChange={(e) => setForm(f => ({ ...f, valor: inputToBRL(e.target.value) }))}
                className="text-right tabular-nums"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sr-comp">Competência <span className="text-destructive">*</span></Label>
              <Input
                id="sr-comp"
                placeholder="2026-10"
                value={form.competencia}
                onChange={(e) => setForm(f => ({ ...f, competencia: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sr-exec">Data de execução</Label>
              <Input
                id="sr-exec"
                type="date"
                value={form.data_execucao}
                onChange={(e) => setForm(f => ({ ...f, data_execucao: e.target.value }))}
              />
            </div>
          </div>

          {/* Info box */}
          <div className="rounded-[12px] bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 px-4 py-3">
            <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
              O lançamento ficará como <strong>pendente de cobrança</strong>. Você pode faturá-lo
              individualmente (fatura avulsa) ou incluí-lo no próximo fechamento mensal do cliente.
            </p>
          </div>

        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!canSave || createServico.isPending}>
            <Wrench size={15} className="mr-2" />
            Registrar Lançamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
