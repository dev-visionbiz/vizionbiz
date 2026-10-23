import { useState } from 'react'
import { useAppPlans, useCriarAppPlan, useAtualizarAppPlan, useExcluirAppPlan } from '@/data/hooks/useApps'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogClose, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { Plus, Pencil, Trash2, Info, Lightbulb } from 'lucide-react'
import type { AppPlan, AppPlanTipoCobranca } from '@/domain/types'

// ─── UI auxiliares ─────────────────────────────────────────────────────────────

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
      <Info className="h-4 w-4 mt-0.5 shrink-0" />
      <div className="space-y-1">{children}</div>
    </div>
  )
}

function TipBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <Lightbulb className="h-4 w-4 mt-0.5 shrink-0" />
      <div className="space-y-1">{children}</div>
    </div>
  )
}

// ─── Dados dos modelos de cobrança ────────────────────────────────────────────

const TIPO_LABEL: Record<AppPlanTipoCobranca, string> = {
  gratuito: 'Gratuito',
  mensal:   'Mensal',
  anual:    'Anual',
  por_uso:  'Por uso',
  por_lead: 'Por lead',
}

const TIPO_VARIANT: Record<AppPlanTipoCobranca, 'secondary' | 'outline' | 'default'> = {
  gratuito: 'secondary',
  mensal:   'default',
  anual:    'default',
  por_uso:  'outline',
  por_lead: 'outline',
}

const TIPO_INFO: Record<AppPlanTipoCobranca, { desc: string; exemplo: string; quando: string }> = {
  gratuito: {
    desc: 'O extensor é disponibilizado sem cobrança.',
    exemplo: 'Ex: versão básica gratuita para atrair escritórios, com plano pago opcional.',
    quando: 'Use para extensores de baixo custo operacional ou como isca para conversão em planos pagos.',
  },
  mensal: {
    desc: 'Cobrança recorrente mensal em valor fixo em R$.',
    exemplo: 'Ex: R$ 49/mês por escritório que instalar.',
    quando: 'Modelo mais comum. Previsibilidade de receita para ambos os lados.',
  },
  anual: {
    desc: 'Cobrança recorrente anual em valor fixo em R$.',
    exemplo: 'Ex: R$ 490/ano (equivalente a 10× o mensal — 2 meses grátis).',
    quando: 'Ofereça desconto em relação ao mensal. Melhora retenção e fluxo de caixa.',
  },
  por_uso: {
    desc: 'Cobrança variável com base no volume de uso.',
    exemplo: 'Ex: R$ 12,00 por certificado emitido.',
    quando: 'Ideal quando o custo varia por uso real — escritórios menores pagam menos. O valor é definido contratualmente fora da plataforma.',
  },
  por_lead: {
    desc: 'Cobrança por cada lead/cliente que utilizar o extensor.',
    exemplo: 'Ex: R$ 5,00 por CNPJ de cliente que acessar o serviço.',
    quando: 'Use quando o extensor gera valor por cliente atendido, não por escritório. Escala com o crescimento do escritório.',
  },
}

function valorLabel(tipo: AppPlanTipoCobranca, valor: number | null): string {
  if (tipo === 'gratuito') return 'R$ 0'
  if (tipo === 'por_uso' || tipo === 'por_lead') return 'Variável'
  if (valor == null) return '—'
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// ─── Dialog de plano ──────────────────────────────────────────────────────────

interface PlanDialogProps {
  appId: string
  plan?: AppPlan
  open: boolean
  onClose: () => void
}

function PlanDialog({ appId, plan, open, onClose }: PlanDialogProps) {
  const { toast } = useToast()
  const criar = useCriarAppPlan()
  const atualizar = useAtualizarAppPlan()

  const [nome, setNome] = useState(plan?.nome ?? '')
  const [tipo, setTipo] = useState<AppPlanTipoCobranca>(plan?.tipo_cobranca ?? 'gratuito')
  const [valor, setValor] = useState<string>(plan?.valor != null ? String(plan.valor) : '')
  const [periodicidade, setPeriodicidade] = useState(plan?.periodicidade ?? '')

  const semValor = tipo === 'gratuito' || tipo === 'por_uso' || tipo === 'por_lead'
  const loading = criar.isPending || atualizar.isPending
  const tipoInfo = TIPO_INFO[tipo]

  async function salvar() {
    if (!nome.trim()) return
    const valorNum = semValor ? null : (valor ? parseFloat(valor) : null)
    try {
      if (plan) {
        await atualizar.mutateAsync({
          id: plan.id, appId,
          data: { nome, tipo_cobranca: tipo, valor: valorNum, periodicidade: periodicidade || undefined },
        })
      } else {
        await criar.mutateAsync({
          app_id: appId, nome, tipo_cobranca: tipo,
          valor: valorNum, periodicidade: periodicidade || undefined,
        })
      }
      toast({ title: plan ? 'Plano atualizado' : 'Plano criado' })
      onClose()
    } catch {
      toast({ title: 'Erro ao salvar plano', variant: 'destructive' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v: boolean) => { if (!v) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{plan ? 'Editar plano' : 'Novo plano de cobrança'}</DialogTitle>
          <DialogDescription>
            O plano aparece na página de vendas do extensor. O escritório vê todos os planos disponíveis antes de instalar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-1">
          <div className="space-y-1">
            <Label>Nome do plano <span className="text-destructive">*</span></Label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Gratuito, Pro, Empresarial, Por emissão"
            />
            <p className="text-xs text-muted-foreground">Nome exibido na tabela de preços da loja. Seja claro e direto.</p>
          </div>

          <div className="space-y-1">
            <Label>Modelo de cobrança</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as AppPlanTipoCobranca)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(TIPO_LABEL) as AppPlanTipoCobranca[]).map((t) => (
                  <SelectItem key={t} value={t}>{TIPO_LABEL[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Explicação do tipo selecionado */}
            <div className="mt-2 rounded-lg bg-muted/50 border px-3 py-2.5 space-y-1">
              <p className="text-xs font-medium text-foreground">{tipoInfo.desc}</p>
              <p className="text-xs text-muted-foreground">{tipoInfo.exemplo}</p>
              <p className="text-xs text-primary">{tipoInfo.quando}</p>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Valor (R$)</Label>
            <Input
              type="number"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="0,00"
              disabled={semValor}
              min={0}
              step={0.01}
            />
            {semValor && tipo !== 'gratuito' && (
              <p className="text-xs text-muted-foreground">
                Para este modelo, o valor é acordado fora da plataforma.
                A loja exibirá "Variável" ou "Por contrato".
              </p>
            )}
            {tipo === 'gratuito' && (
              <p className="text-xs text-muted-foreground">Plano sem custo — não há cobrança ao escritório.</p>
            )}
          </div>

          <div className="space-y-1">
            <Label>Rótulo de periodicidade</Label>
            <Input
              value={periodicidade}
              onChange={(e) => setPeriodicidade(e.target.value)}
              placeholder="Ex: /mês, /ano, por emissão, por CNPJ/mês"
            />
            <p className="text-xs text-muted-foreground">
              Texto exibido ao lado do valor na página de vendas. Ex: "R$ 49 <em>/mês</em>".
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <DialogClose asChild>
            <Button variant="outline">Cancelar</Button>
          </DialogClose>
          <Button onClick={salvar} disabled={loading || !nome.trim()}>
            {loading ? 'Salvando…' : plan ? 'Salvar alterações' : 'Criar plano'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── TabPlanos ────────────────────────────────────────────────────────────────

interface TabPlanosProps {
  appId: string
  bloqueado?: boolean
}

export function TabPlanos({ appId, bloqueado }: TabPlanosProps) {
  const { data: planos = [] } = useAppPlans(appId)
  const excluir = useExcluirAppPlan()
  const { toast } = useToast()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editando, setEditando] = useState<AppPlan | undefined>()
  const [excluindo, setExcluindo] = useState<AppPlan | undefined>()

  function abrirNovo() { setEditando(undefined); setDialogOpen(true) }
  function abrirEditar(p: AppPlan) { setEditando(p); setDialogOpen(true) }

  async function confirmarExclusao() {
    if (!excluindo) return
    try {
      await excluir.mutateAsync({ id: excluindo.id, appId })
      toast({ title: 'Plano removido' })
    } catch {
      toast({ title: 'Erro ao remover plano', variant: 'destructive' })
    } finally {
      setExcluindo(undefined)
    }
  }

  if (bloqueado) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p className="text-sm">Salve as informações gerais primeiro para gerenciar os planos.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* Intro */}
      <InfoBox>
        <p className="font-medium">Como funcionam os planos?</p>
        <p>
          Os planos definem as opções de contratação que o escritório verá na página de vendas do extensor.
          Você pode ter vários planos — por exemplo, um plano gratuito com recursos básicos e um plano Pro pago.
          O escritório escolhe um plano na hora de instalar.
        </p>
        <p>
          <strong>Dica:</strong> ofereça sempre um plano gratuito ou de trial para reduzir a barreira de entrada.
          A maioria dos extensores de sucesso começa com um plano freemium.
        </p>
      </InfoBox>

      {/* Modelos disponíveis — referência rápida */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {(Object.entries(TIPO_INFO) as [AppPlanTipoCobranca, typeof TIPO_INFO[keyof typeof TIPO_INFO]][]).map(([t, info]) => (
          <div key={t} className="border rounded-lg p-3 bg-card text-center">
            <Badge variant={TIPO_VARIANT[t]} className="text-xs mb-1.5">{TIPO_LABEL[t]}</Badge>
            <p className="text-xs text-muted-foreground leading-relaxed">{info.desc}</p>
          </div>
        ))}
      </div>

      <TipBox>
        <p>
          Um extensor pode ter planos com modelos diferentes ao mesmo tempo. Ex: "Gratuito (1 certificado/mês) + Pro (R$ 49/mês, ilimitado)".
          O escritório vê todos os planos e escolhe o mais adequado para o seu volume.
        </p>
      </TipBox>

      {/* Header da lista */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Planos cadastrados</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {planos.length === 0
              ? 'Nenhum plano ainda. Adicione ao menos um para publicar o extensor.'
              : `${planos.length} plano(s) — todos aparecerão na página de vendas.`}
          </p>
        </div>
        <Button size="sm" onClick={abrirNovo} className="gap-2">
          <Plus className="h-3.5 w-3.5" />
          Novo plano
        </Button>
      </div>

      {/* Lista de planos */}
      {planos.length === 0 ? (
        <div className="border-2 border-dashed rounded-xl py-14 flex flex-col items-center text-muted-foreground">
          <p className="text-sm font-medium">Nenhum plano cadastrado</p>
          <p className="text-xs mt-1 mb-4">Você precisa de ao menos um plano para publicar o extensor.</p>
          <Button size="sm" variant="outline" onClick={abrirNovo} className="gap-2">
            <Plus className="h-3.5 w-3.5" /> Criar primeiro plano
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {planos.map((p) => (
            <div
              key={p.id}
              className="border rounded-xl p-4 bg-card flex flex-col gap-3 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-sm leading-tight">{p.nome}</p>
                <Badge variant={TIPO_VARIANT[p.tipo_cobranca]} className="shrink-0 text-xs">
                  {TIPO_LABEL[p.tipo_cobranca]}
                </Badge>
              </div>

              <div>
                <p className="text-2xl font-bold">
                  {valorLabel(p.tipo_cobranca, p.valor)}
                  {p.periodicidade && (
                    <span className="text-sm font-normal text-muted-foreground ml-1">{p.periodicidade}</span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{TIPO_INFO[p.tipo_cobranca].exemplo}</p>
              </div>

              <div className="flex gap-2 mt-auto pt-2 border-t">
                <Button size="sm" variant="ghost" className="flex-1 gap-1.5 h-8 text-xs" onClick={() => abrirEditar(p)}>
                  <Pencil className="h-3 w-3" /> Editar
                </Button>
                <Button
                  size="sm" variant="ghost"
                  className="flex-1 gap-1.5 h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setExcluindo(p)}
                >
                  <Trash2 className="h-3 w-3" /> Excluir
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialogs */}
      <PlanDialog appId={appId} plan={editando} open={dialogOpen} onClose={() => setDialogOpen(false)} />

      <Dialog open={!!excluindo} onOpenChange={(v: boolean) => { if (!v) setExcluindo(undefined) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir plano</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o plano <strong>"{excluindo?.nome}"</strong>?
              Escritórios que já assinaram este plano não serão afetados, mas o plano não aparecerá mais
              para novas instalações. Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button
              onClick={confirmarExclusao}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir plano
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
