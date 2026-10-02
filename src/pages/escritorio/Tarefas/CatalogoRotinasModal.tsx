import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import {
  RefreshCw, LayoutDashboard, ClipboardList,
  Users, CheckCircle2, Clock, Calendar,
} from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/auth/AuthProvider'
import {
  useRotinasAtivas, useAllRotinaClientes, useAllCiclos,
  useRotinas, useGerarCiclo, useCiclos, useUpdateCiclo,
} from '@/data/hooks/useRotinas'
import { useOcorrencias } from '@/data/hooks/useOcorrencias'
import { cn } from '@/lib/utils'
import type { Rotina, Ciclo } from '@/domain/types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mesAtual(): string {
  return format(new Date(), 'yyyy-MM')
}

function calcularStatusAgregado(concluidas: number, total: number, iniciadas: number): string {
  if (total === 0) return 'sem_ciclo'
  if (concluidas === total) return 'concluida'
  if (iniciadas > 0 || concluidas > 0) return 'em_andamento'
  return 'pendente'
}

const statusBadge: Record<string, { label: string; className: string }> = {
  concluida:    { label: 'Concluída',     className: 'bg-green-100 text-green-800 border-transparent' },
  em_andamento: { label: 'Em andamento',  className: 'bg-yellow-100 text-yellow-800 border-transparent' },
  pendente:     { label: 'Pendente',      className: 'bg-blue-100 text-blue-800 border-transparent' },
  sem_ciclo:    { label: 'Sem ciclo',     className: 'bg-gray-100 text-gray-400 border-transparent' },
}

// ─── GerarCicloDialog ─────────────────────────────────────────────────────────

interface GerarCicloDialogProps {
  open: boolean
  onClose: () => void
  tenantId: string
  defaultRotinaId?: string
  defaultPeriodo?: string
}

function GerarCicloDialog({ open, onClose, tenantId, defaultRotinaId = '', defaultPeriodo }: GerarCicloDialogProps) {
  const { toast } = useToast()
  const { data: rotinas = [] } = useRotinas(tenantId)
  const gerarCiclo  = useGerarCiclo()
  const updateCiclo = useUpdateCiclo()

  const [rotinaId, setRotinaId] = useState(defaultRotinaId)
  const [periodo,  setPeriodo]  = useState(defaultPeriodo ?? mesAtual())

  const { data: ciclos = [] } = useCiclos(tenantId, rotinaId)
  const rotinaAtual = rotinas.find(r => r.id === rotinaId)
  const ciclosOrdenados = [...ciclos].sort((a, b) => b.periodo.localeCompare(a.periodo))

  function handleGerar() {
    if (!rotinaAtual || !periodo) return
    gerarCiclo.mutate(
      { tenantId, rotina: rotinaAtual, periodo },
      {
        onSuccess: ({ ciclo, ocorrenciasCriadas, tarefasCriadas }) => {
          if (ocorrenciasCriadas > 0) {
            toast({
              title: 'Ciclo gerado',
              description: `${ocorrenciasCriadas} ocorrência${ocorrenciasCriadas !== 1 ? 's' : ''} e ${tarefasCriadas} tarefa${tarefasCriadas !== 1 ? 's' : ''} criadas`,
            })
          } else {
            toast({ title: 'Ciclo já existe', description: `Nenhuma ocorrência nova para ${ciclo.periodo}` })
          }
        },
        onError: () => toast({ title: 'Erro ao gerar ciclo', variant: 'destructive' }),
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <RefreshCw className="h-4 w-4 text-primary" />
            Gerar Ciclo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1.5 flex-1 min-w-40">
              <Label>Rotina</Label>
              <Select value={rotinaId} onValueChange={setRotinaId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {rotinas.map(r => <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Período (AAAA-MM)</Label>
              <Input
                className="w-36"
                value={periodo}
                onChange={e => setPeriodo(e.target.value)}
                placeholder="2026-09"
              />
            </div>
            <Button
              onClick={handleGerar}
              disabled={!rotinaId || !periodo || gerarCiclo.isPending}
            >
              <RefreshCw className={cn('h-4 w-4 mr-2', gerarCiclo.isPending && 'animate-spin')} />
              Gerar
            </Button>
          </div>

          {rotinaId && (
            <>
              <Separator />
              {ciclosOrdenados.length === 0 ? (
                <p className="text-sm text-muted-foreground py-3 text-center">Nenhum ciclo gerado para esta rotina.</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {ciclosOrdenados.map(c => (
                    <div key={c.id} className="flex items-center gap-3 border rounded-md px-4 py-2.5">
                      <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{c.periodo}</p>
                        <p className="text-xs text-muted-foreground">
                          Vencimento: {format(parseISO(c.data_vencimento), 'dd/MM/yyyy')}
                        </p>
                      </div>
                      <Badge variant={c.status === 'encerrada' ? 'secondary' : 'outline'} className="text-xs">
                        {c.status === 'encerrada' ? 'Encerrado' : 'Aberto'}
                      </Badge>
                      {c.status === 'aberta' && (
                        <Button
                          variant="outline" size="sm" className="h-7 text-xs"
                          onClick={() => updateCiclo.mutate(
                            { id: c.id, data: { status: 'encerrada' } },
                            { onSuccess: () => toast({ title: 'Ciclo encerrado' }) }
                          )}
                        >
                          Encerrar
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {!rotinaId && (
            <p className="text-sm text-muted-foreground py-3 text-center">
              Selecione uma rotina para ver e gerar ciclos.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Card de Rotina ───────────────────────────────────────────────────────────

interface RotinaCatalogoCardProps {
  rotina: Rotina
  ciclo: Ciclo | undefined
  totalClientes: number
  concluidas: number
  iniciadas: number
  onSelect: () => void
}

function RotinaCatalogoCard({ rotina, ciclo, totalClientes, concluidas, iniciadas, onSelect }: RotinaCatalogoCardProps) {
  const pendentes  = totalClientes - concluidas - iniciadas
  const pct        = totalClientes > 0 ? Math.round((concluidas / totalClientes) * 100) : 0
  const statusKey  = ciclo ? calcularStatusAgregado(concluidas, totalClientes, iniciadas) : 'sem_ciclo'
  const sb         = statusBadge[statusKey]

  return (
    <button
      onClick={onSelect}
      disabled={!ciclo}
      className={cn(
        'w-full text-left rounded-lg border p-4 transition-colors',
        ciclo ? 'hover:bg-accent/40 hover:border-primary/30 cursor-pointer' : 'opacity-60 cursor-default',
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <p className="font-semibold text-sm leading-snug">{rotina.nome}</p>
        <Badge variant="outline" className={`text-[10px] shrink-0 px-1.5 py-px ${sb.className}`}>
          {sb.label}
        </Badge>
      </div>

      {ciclo ? (
        <>
          <div className="h-1.5 rounded-full bg-muted mb-3 overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                pct === 100 ? 'bg-green-500' : 'bg-primary',
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />{totalClientes}
            </span>
            {iniciadas > 0 && (
              <span className="flex items-center gap-1 text-yellow-600">
                <Clock className="h-3 w-3" />{iniciadas} em andamento
              </span>
            )}
            {concluidas > 0 && (
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle2 className="h-3 w-3" />{concluidas} concluídos
              </span>
            )}
            {pendentes > 0 && (
              <span className="flex items-center gap-1">
                <ClipboardList className="h-3 w-3" />{pendentes} pendentes
              </span>
            )}
          </div>
        </>
      ) : (
        <p className="text-[11px] text-muted-foreground/60 mt-1">Sem ciclo para este período</p>
      )}

      <p className="text-[10px] text-muted-foreground/50 mt-2 capitalize">{rotina.periodicidade}</p>
    </button>
  )
}

// ─── CatalogoRotinasModal ─────────────────────────────────────────────────────

interface CatalogoRotinasModalProps {
  open: boolean
  onClose: () => void
  onSelectRotina: (rotinaId: string, cicloId: string) => void
}

export default function CatalogoRotinasModal({ open, onClose, onSelectRotina }: CatalogoRotinasModalProps) {
  const { currentUser } = useAuth()
  const tenantId = currentUser?.tenant_id ?? ''

  const [competencia, setCompetencia] = useState(mesAtual())
  const [gerarOpen,   setGerarOpen]   = useState(false)

  const { data: rotinas       = [] } = useRotinasAtivas(tenantId)
  const { data: rotinaClientes = [] } = useAllRotinaClientes(tenantId)
  const { data: ciclos         = [] } = useAllCiclos(tenantId)
  const { data: ocorrencias    = [] } = useOcorrencias(tenantId)

  return (
    <>
      <Dialog open={open} onOpenChange={o => { if (!o) onClose() }}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">

          <DialogHeader className="px-5 py-3.5 border-b shrink-0">
            <div className="flex items-center gap-3 flex-wrap">
              <DialogTitle className="flex items-center gap-2 text-base">
                <LayoutDashboard className="h-4 w-4 text-primary" />
                Painel de Rotinas
              </DialogTitle>
              <div className="ml-auto flex items-center gap-2">
                <Label className="text-xs text-muted-foreground shrink-0">Competência</Label>
                <Input
                  className="h-8 w-28 text-xs"
                  value={competencia}
                  onChange={e => setCompetencia(e.target.value)}
                  placeholder="AAAA-MM"
                />
                <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => setGerarOpen(true)}>
                  <RefreshCw className="h-3.5 w-3.5" />
                  Gerar Ciclo
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4">
            {rotinas.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                <ClipboardList className="h-10 w-10 mx-auto opacity-20 mb-3" />
                <p className="text-sm">Nenhuma rotina ativa cadastrada</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {rotinas.map(r => {
                  const ciclo = ciclos.find(c => c.rotina_id === r.id && c.periodo === competencia)
                  const totalClientes = rotinaClientes.filter(rc => rc.rotina_id === r.id && rc.ativo).length
                  const ocsCiclo = ciclo ? ocorrencias.filter(o => o.ciclo_id === ciclo.id) : []
                  const concluidas = ocsCiclo.filter(o => o.status === 'concluida').length
                  const iniciadas  = ocsCiclo.filter(o => o.status === 'em_andamento').length
                  return (
                    <RotinaCatalogoCard
                      key={r.id}
                      rotina={r}
                      ciclo={ciclo}
                      totalClientes={totalClientes}
                      concluidas={concluidas}
                      iniciadas={iniciadas}
                      onSelect={() => ciclo && onSelectRotina(r.id, ciclo.id)}
                    />
                  )
                })}
              </div>
            )}
          </div>

        </DialogContent>
      </Dialog>

      <GerarCicloDialog
        open={gerarOpen}
        onClose={() => setGerarOpen(false)}
        tenantId={tenantId}
        defaultPeriodo={competencia}
      />
    </>
  )
}
