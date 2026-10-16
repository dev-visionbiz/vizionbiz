import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useLedger } from '@/data/hooks/useLedger'
import { useApps } from '@/data/hooks/useApps'
import { useCommissionRules, useUpsertCommissionRule, useDeleteCommissionRule } from '@/data/hooks/useSubscriptions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { CommissionRule, LedgerEntryTipo } from '@/domain/types'
import { v4 as uuid } from 'uuid'
import { formatCurrency } from '@/lib/utils'
import { Plus, Trash2, Loader2, TrendingUp, Receipt } from 'lucide-react'

const tipoLabels: Record<LedgerEntryTipo, string> = {
  receita: 'Receita',
  comissao_escritorio: 'Comissão Escritório',
  comissao_plataforma: 'Comissão Plataforma',
  estorno_receita: 'Estorno Receita',
  estorno_comissao: 'Estorno Comissão',
}

const tipoBadgeClass: Record<LedgerEntryTipo, string> = {
  receita: 'bg-blue-100 text-blue-800',
  comissao_escritorio: 'bg-green-100 text-green-800',
  comissao_plataforma: 'bg-purple-100 text-purple-800',
  estorno_receita: 'bg-red-100 text-red-800',
  estorno_comissao: 'bg-orange-100 text-orange-800',
}

// --- Commission Rule Form ---

const ruleSchema = z.object({
  app_id: z.string().min(1, 'Selecione o app'),
  tipo: z.enum(['percentual', 'fixo', 'nenhum']),
  valor: z.coerce.number().min(0),
  escritorio_id: z.string().optional(),
})
type RuleForm = z.infer<typeof ruleSchema>

function RuleFormDialog({
  open, onClose, existing,
}: {
  open: boolean
  onClose: () => void
  existing?: CommissionRule
}) {
  const { data: apps = [] } = useApps()
  const upsert = useUpsertCommissionRule()
  const { toast } = useToast()

  const { register, handleSubmit, control, watch, formState: { errors } } = useForm<RuleForm>({
    resolver: zodResolver(ruleSchema),
    defaultValues: existing
      ? { app_id: existing.app_id, tipo: existing.tipo, valor: existing.valor, escritorio_id: existing.escritorio_id }
      : { tipo: 'percentual', valor: 0 },
  })

  const tipo = watch('tipo')

  function onSubmit(data: RuleForm) {
    upsert.mutate(
      {
        id: existing?.id ?? uuid(),
        app_id: data.app_id,
        tipo: data.tipo,
        valor: data.valor,
        escritorio_id: data.escritorio_id || undefined,
      },
      {
        onSuccess: () => { toast({ title: 'Regra salva.' }); onClose() },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{existing ? 'Editar regra' : 'Nova regra de comissão'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <Label>App</Label>
            <Controller control={control} name="app_id" render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue placeholder="Selecione o app" /></SelectTrigger>
                <SelectContent>
                  {apps.filter((a) => a.status === 'publicado').map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.icone} {a.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )} />
          </div>
          <div>
            <Label>Tipo</Label>
            <Controller control={control} name="tipo" render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentual">Percentual (%)</SelectItem>
                  <SelectItem value="fixo">Valor fixo (R$)</SelectItem>
                  <SelectItem value="nenhum">Nenhuma comissão</SelectItem>
                </SelectContent>
              </Select>
            )} />
          </div>
          {tipo !== 'nenhum' && (
            <div>
              <Label>{tipo === 'percentual' ? 'Percentual (%)' : 'Valor (R$)'}</Label>
              <Input type="number" step="0.01" {...register('valor')} />
            </div>
          )}
          <div>
            <Label className="text-muted-foreground">ID do escritório (opcional — vazio = padrão)</Label>
            <Input {...register('escritorio_id')} placeholder="tenant-xxx" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={upsert.isPending}>
              {upsert.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// --- Main Page ---

export function ComissoesPage() {
  const { data: ledger = [] } = useLedger()
  const { data: rules = [] } = useCommissionRules()
  const { data: apps = [] } = useApps()
  const deleteRule = useDeleteCommissionRule()
  const { toast } = useToast()

  const [ruleDialog, setRuleDialog] = useState(false)
  const [editingRule, setEditingRule] = useState<CommissionRule | undefined>()

  function appNome(appId: string) {
    const a = apps.find((x) => x.id === appId)
    return a ? `${a.icone ?? ''} ${a.nome}` : appId
  }

  // Totals
  const totalReceita = ledger.filter((e) => e.tipo === 'receita').reduce((s, e) => s + e.valor, 0)
  const totalComissaoEscritorio = ledger.filter((e) => e.tipo === 'comissao_escritorio').reduce((s, e) => s + e.valor, 0)
  const totalComissaoPlataforma = ledger.filter((e) => e.tipo === 'comissao_plataforma').reduce((s, e) => s + e.valor, 0)

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Comissões e Ledger</h1>
        <p className="text-muted-foreground text-sm mt-1">Histórico imutável de receitas, comissões e estornos.</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Receita total</p>
            <p className="text-xl font-bold mt-1">{formatCurrency(totalReceita)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Comissões escritórios</p>
            <p className="text-xl font-bold text-green-700 mt-1">{formatCurrency(totalComissaoEscritorio)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Comissões plataforma</p>
            <p className="text-xl font-bold text-purple-700 mt-1">{formatCurrency(totalComissaoPlataforma)}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="ledger">
        <TabsList>
          <TabsTrigger value="ledger">
            <Receipt className="w-4 h-4 mr-1.5" />Ledger
          </TabsTrigger>
          <TabsTrigger value="regras">
            <TrendingUp className="w-4 h-4 mr-1.5" />Regras de Comissão
          </TabsTrigger>
        </TabsList>

        {/* LEDGER */}
        <TabsContent value="ledger" className="mt-4">
          {ledger.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum lançamento no ledger ainda.</p>
          ) : (
            <div className="space-y-1.5">
              {ledger.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between border rounded-lg px-4 py-2.5 text-sm bg-card">
                  <div className="flex items-center gap-3 min-w-0">
                    <Badge className={`${tipoBadgeClass[entry.tipo]} border-transparent text-xs shrink-0`}>
                      {tipoLabels[entry.tipo]}
                    </Badge>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{entry.referencia}</p>
                      <p className="text-xs text-muted-foreground">
                        {appNome(entry.app_id)} · {entry.escritorio_id}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="font-semibold">{formatCurrency(entry.valor)}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(parseISO(entry.criado_em), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* COMMISSION RULES */}
        <TabsContent value="regras" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => { setEditingRule(undefined); setRuleDialog(true) }}>
              <Plus className="w-4 h-4 mr-1" />Nova regra
            </Button>
          </div>

          {rules.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma regra cadastrada.</p>
          ) : (
            <div className="space-y-2">
              {rules.map((rule) => (
                <div key={rule.id} className="flex items-center justify-between border rounded-lg px-4 py-2.5 text-sm bg-card">
                  <div>
                    <p className="font-medium">{appNome(rule.app_id)}</p>
                    <p className="text-xs text-muted-foreground">
                      {rule.escritorio_id ? `Escritório: ${rule.escritorio_id}` : 'Regra padrão (todos os escritórios)'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">
                      {rule.tipo === 'nenhum'
                        ? 'Sem comissão'
                        : rule.tipo === 'percentual'
                          ? `${rule.valor}%`
                          : formatCurrency(rule.valor)}
                    </Badge>
                    <Button size="icon" variant="ghost" onClick={() => { setEditingRule(rule); setRuleDialog(true) }}>
                      <span className="text-xs">✏️</span>
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => deleteRule.mutate(rule.id, {
                        onSuccess: () => toast({ title: 'Regra removida.' }),
                      })}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {ruleDialog && (
        <RuleFormDialog
          open
          onClose={() => { setRuleDialog(false); setEditingRule(undefined) }}
          existing={editingRule}
        />
      )}
    </div>
  )
}
