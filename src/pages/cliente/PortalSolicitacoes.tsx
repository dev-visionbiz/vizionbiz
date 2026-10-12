import { useState } from 'react'
import { format, addDays } from 'date-fns'
import { SendHorizonal, Clock, CheckCircle2, CircleDot, XCircle, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/auth/AuthProvider'
import { useServicosAtivos } from '@/data/hooks/useServicos'
import { useFluxoTarefas } from '@/data/hooks/useFluxos'
import { useOcorrenciasByCliente, useCreateOcorrencia } from '@/data/hooks/useOcorrencias'
import { formatDate } from '@/lib/utils'
import type { OcorrenciaStatus, Servico } from '@/domain/types'

const statusConfig: Record<OcorrenciaStatus, { label: string; icon: React.ElementType; className: string }> = {
  pendente:     { label: 'Aguardando início', icon: Clock,          className: 'bg-blue-100 text-blue-800 border-transparent' },
  em_andamento: { label: 'Em andamento',      icon: CircleDot,      className: 'bg-yellow-100 text-yellow-800 border-transparent dark:bg-amber-950/50 dark:text-amber-300' },
  concluida:    { label: 'Concluída',         icon: CheckCircle2,   className: 'bg-green-100 text-green-800 border-transparent' },
  cancelada:    { label: 'Cancelada',         icon: XCircle,        className: 'bg-gray-100 text-gray-500 border-transparent' },
}

// ─── Dialog de solicitação ────────────────────────────────────────────────────

interface SolicitarDialogProps {
  servico: Servico
  tenantId: string
  clienteId: string
  userId: string
  open: boolean
  onOpenChange: (v: boolean) => void
}

function SolicitarDialog({ servico, tenantId, clienteId, userId, open, onOpenChange }: SolicitarDialogProps) {
  const { toast } = useToast()
  const [descricao, setDescricao] = useState('')
  const [salvando, setSalvando] = useState(false)

  const { data: fluxoTarefas = [] } = useFluxoTarefas(tenantId, servico.fluxo_id ?? '')
  const createOcorrencia = useCreateOcorrencia()

  async function handleSolicitar() {
    setSalvando(true)
    try {
      const hoje = format(new Date(), 'yyyy-MM-dd')
      const prazo = fluxoTarefas.reduce((max, t) => Math.max(max, t.prazo_relativo_dias ?? 0), 7)
      const dataPrevista = format(addDays(new Date(), prazo), 'yyyy-MM-dd')

      await createOcorrencia.mutateAsync({
        ocorrencia: {
          tenant_id: tenantId,
          titulo: servico.nome,
          descricao: descricao.trim() || undefined,
          cliente_id: clienteId,
          origem: 'cliente',
          fluxo_id: servico.fluxo_id,
          valor: servico.valor_padrao || undefined,
          data_solicitacao: hoje,
          data_prevista: dataPrevista,
          status: 'pendente',
          criado_por: userId,
          criado_em: new Date().toISOString(),
        },
        tarefas: fluxoTarefas
          .sort((a, b) => a.ordem - b.ordem)
          .map(ft => ({
            tenant_id: tenantId,
            fluxo_tarefa_id: ft.id,
            ordem: ft.ordem,
            nome: ft.nome,
            descricao: ft.descricao,
            prazo_relativo_dias: ft.prazo_relativo_dias,
            data_prevista: format(addDays(new Date(), ft.prazo_relativo_dias ?? 0), 'yyyy-MM-dd'),
            status: 'pendente' as const,
            criado_em: new Date().toISOString(),
          })),
      })
      toast({ title: 'Solicitação enviada com sucesso!' })
      setDescricao('')
      onOpenChange(false)
    } catch {
      toast({ title: 'Erro ao enviar solicitação', variant: 'destructive' })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{servico.nome}</DialogTitle>
        </DialogHeader>
        {servico.descricao && (
          <p className="text-sm text-muted-foreground">{servico.descricao}</p>
        )}
        <div className="space-y-3 pt-1">
          <div>
            <Label htmlFor="desc" className="text-sm">Observações (opcional)</Label>
            <Textarea
              id="desc"
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              placeholder="Descreva detalhes adicionais da sua solicitação…"
              rows={3}
              className="mt-1"
            />
          </div>
          {fluxoTarefas.length > 0 && (
            <div className="rounded-md bg-muted/50 p-3 space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Etapas do processo</p>
              <ol className="space-y-0.5">
                {fluxoTarefas
                  .sort((a, b) => a.ordem - b.ordem)
                  .map((t, i) => (
                    <li key={t.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="h-4 w-4 rounded-full bg-muted-foreground/20 text-[10px] flex items-center justify-center font-medium shrink-0">
                        {i + 1}
                      </span>
                      {t.nome}
                    </li>
                  ))
                }
              </ol>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSolicitar} disabled={salvando} className="gap-1.5">
            <SendHorizonal className="h-4 w-4" />
            {salvando ? 'Enviando…' : 'Enviar solicitação'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function PortalSolicitacoes() {
  const { currentUser } = useAuth()
  const tenantId = currentUser?.tenant_id ?? ''
  const clienteId = currentUser?.client_id ?? ''

  const { data: servicos = [] } = useServicosAtivos(tenantId)
  const { data: ocorrencias = [] } = useOcorrenciasByCliente(tenantId, clienteId)

  const [servicoSelecionado, setServicoSelecionado] = useState<Servico | null>(null)

  const servicosDisponiveis = servicos.filter(s => !!s.fluxo_id)

  const ocorrenciasCliente = ocorrencias
    .filter(o => o.status !== 'cancelada')
    .sort((a, b) => b.criado_em.localeCompare(a.criado_em))

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Solicitar Serviço</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Selecione um serviço para abrir uma solicitação para o escritório.
        </p>
      </div>

      {/* Catálogo de serviços */}
      {servicosDisponiveis.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
          <SendHorizonal className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Nenhum serviço disponível para solicitação no momento.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {servicosDisponiveis.map(s => (
            <button
              key={s.id}
              onClick={() => setServicoSelecionado(s)}
              className="flex items-center justify-between gap-4 rounded-xl border p-4 text-left hover:bg-accent/40 transition-colors group"
            >
              <div className="min-w-0">
                <p className="font-medium text-sm">{s.nome}</p>
                {s.descricao && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{s.descricao}</p>
                )}
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
            </button>
          ))}
        </div>
      )}

      {/* Minhas solicitações */}
      {ocorrenciasCliente.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold">Minhas solicitações</h2>
          <div className="space-y-2">
            {ocorrenciasCliente.map(o => {
              const cfg = statusConfig[o.status]
              const Icon = cfg.icon
              return (
                <div key={o.id} className="flex items-center gap-3 rounded-xl border p-3.5">
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{o.titulo}</p>
                    <p className="text-xs text-muted-foreground">
                      {o.data_solicitacao ? `Solicitado em ${formatDate(o.data_solicitacao)}` : formatDate(o.criado_em.split('T')[0])}
                    </p>
                  </div>
                  <Badge variant="outline" className={`text-xs shrink-0 ${cfg.className}`}>
                    {cfg.label}
                  </Badge>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {servicoSelecionado && (
        <SolicitarDialog
          servico={servicoSelecionado}
          tenantId={tenantId}
          clienteId={clienteId}
          userId={currentUser?.id ?? ''}
          open={!!servicoSelecionado}
          onOpenChange={v => { if (!v) setServicoSelecionado(null) }}
        />
      )}
    </div>
  )
}
