import { useMemo } from 'react'
import { useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { AlertTriangle } from 'lucide-react'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/auth/AuthProvider'
import { useObrigacoesAtivas } from '@/data/hooks/useObrigacoes'
import { useCompetencias } from '@/data/hooks/useCompetencias'
import { useEtapasObrigacao } from '@/data/hooks/useEtapasObrigacao'
import { useTarefasCompetencia } from '@/data/hooks/useTarefasObrigacao'
import type { TarefaStatus } from '@/domain/types'

function periodoLabel(periodo: string): string {
  try {
    const [ano, mes] = periodo.split('-').map(Number)
    return format(new Date(ano, mes - 1, 1), 'MMMM/yyyy', { locale: ptBR }).replace(/^\w/, (c) => c.toUpperCase())
  } catch { return periodo }
}

const statusConcluido: TarefaStatus[] = ['concluida']
const statusAtrasado: TarefaStatus[] = ['atrasada']
const statusImpedido: TarefaStatus[] = ['impedido']

export function PainelObrigacao() {
  const { currentUser } = useAuth()
  const tenantId = currentUser?.tenant_id ?? ''

  const { data: obrigacoes = [] } = useObrigacoesAtivas(tenantId)
  const [obrigacaoId, setObrigacaoId] = useState('')
  const [competenciaId, setCompetenciaId] = useState('')

  const { data: competencias = [] } = useCompetencias(tenantId, obrigacaoId)
  const { data: etapas = [] } = useEtapasObrigacao(tenantId, obrigacaoId)
  const { data: tarefas = [] } = useTarefasCompetencia(tenantId, competenciaId)

  const resumo = useMemo(() => {
    if (!tarefas.length || !etapas.length) return null

    const porEtapa = etapas.map((etapa) => {
      const tt = tarefas.filter((t) => t.etapa_id === etapa.id)
      const total = tt.length
      const concluidas = tt.filter((t) => statusConcluido.includes(t.status)).length
      const atrasadas = tt.filter((t) => statusAtrasado.includes(t.status)).length
      const impedidas = tt.filter((t) => statusImpedido.includes(t.status)).length
      const pct = total > 0 ? Math.round((concluidas / total) * 100) : 0
      return { etapa, total, concluidas, atrasadas, impedidas, pct }
    })

    const totalGeral = tarefas.length
    const concluidasGeral = tarefas.filter((t) => statusConcluido.includes(t.status)).length
    const pctGeral = totalGeral > 0 ? Math.round((concluidasGeral / totalGeral) * 100) : 0
    const atrasadasGeral = tarefas.filter((t) => statusAtrasado.includes(t.status)).length
    const impedidasGeral = tarefas.filter((t) => statusImpedido.includes(t.status)).length

    return { porEtapa, totalGeral, concluidasGeral, atrasadasGeral, impedidasGeral, pctGeral }
  }, [tarefas, etapas])

  return (
    <div className="px-4 sm:px-6 pb-8 space-y-6">
      <div className="flex flex-wrap gap-3">
        <Select
          value={obrigacaoId}
          onValueChange={(v) => { setObrigacaoId(v); setCompetenciaId('') }}
        >
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Obrigação" />
          </SelectTrigger>
          <SelectContent>
            {obrigacoes.map((o) => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select
          value={competenciaId}
          onValueChange={setCompetenciaId}
          disabled={!obrigacaoId}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Competência" />
          </SelectTrigger>
          <SelectContent>
            {competencias.map((c) => (
              <SelectItem key={c.id} value={c.id}>{periodoLabel(c.periodo)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!obrigacaoId || !competenciaId ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm">Selecione obrigação e competência para ver o painel.</p>
        </div>
      ) : !resumo ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm">Nenhuma tarefa encontrada para esta competência.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Progresso geral */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Progresso geral</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-4">
                <Progress value={resumo.pctGeral} className="flex-1" />
                <span className="text-2xl font-bold text-primary">{resumo.pctGeral}%</span>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span>{resumo.concluidasGeral} / {resumo.totalGeral} tarefas concluídas</span>
                {resumo.atrasadasGeral > 0 && (
                  <span className="text-red-600">{resumo.atrasadasGeral} atrasada{resumo.atrasadasGeral !== 1 ? 's' : ''}</span>
                )}
                {resumo.impedidasGeral > 0 && (
                  <span className="text-orange-600 font-semibold flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {resumo.impedidasGeral} impedida{resumo.impedidasGeral !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Cards por etapa */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {resumo.porEtapa.map(({ etapa, total, concluidas, atrasadas, impedidas, pct }) => (
              <Card key={etapa.id} className={`relative overflow-hidden ${impedidas > 0 ? 'border-orange-300' : ''}`}>
                <CardContent className="pt-4 pb-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Etapa {etapa.ordem}</p>
                      <p className="text-sm font-medium leading-tight">{etapa.nome}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {impedidas > 0 && <AlertTriangle className="h-4 w-4 text-orange-500" />}
                      <span className="text-lg font-bold text-primary">{pct}%</span>
                    </div>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span>{concluidas}/{total} concluídas</span>
                    {atrasadas > 0 && (
                      <span className="text-red-600">{atrasadas} atrasada{atrasadas !== 1 ? 's' : ''}</span>
                    )}
                    {impedidas > 0 && (
                      <span className="text-orange-600 font-medium">{impedidas} impedida{impedidas !== 1 ? 's' : ''}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Tabela resumo */}
          <div>
            <h3 className="font-medium text-sm mb-3">Resumo por etapa</h3>
            <div className="rounded-lg border">
              <div className="hidden sm:grid grid-cols-[1fr_5rem_7rem_7rem_7rem_6rem] gap-x-3 px-4 py-2 bg-muted/40 text-xs font-medium text-muted-foreground border-b">
                <span>Etapa</span>
                <span className="text-right">Total</span>
                <span className="text-right">Concluídas</span>
                <span className="text-right">Atrasadas</span>
                <span className="text-right">Impedidas</span>
                <span className="text-right">% Completo</span>
              </div>
              <div className="divide-y">
                {resumo.porEtapa.map(({ etapa, total, concluidas, atrasadas, impedidas, pct }) => (
                  <div key={etapa.id} className="hidden sm:grid grid-cols-[1fr_5rem_7rem_7rem_7rem_6rem] gap-x-3 px-4 py-3 items-center">
                    <div>
                      <span className="text-sm">{etapa.ordem}. {etapa.nome}</span>
                    </div>
                    <span className="text-sm text-right">{total}</span>
                    <span className="text-sm text-right text-green-700">{concluidas}</span>
                    <span className={`text-sm text-right ${atrasadas > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                      {atrasadas}
                    </span>
                    <span className={`text-sm text-right flex items-center justify-end gap-1 ${impedidas > 0 ? 'text-orange-600 font-medium' : 'text-muted-foreground'}`}>
                      {impedidas > 0 && <AlertTriangle className="h-3 w-3" />}{impedidas}
                    </span>
                    <div className="flex justify-end">
                      <Badge
                        className={`text-xs ${pct === 100 ? 'bg-green-100 text-green-800 border-transparent' : 'bg-blue-100 text-blue-800 border-transparent'}`}
                      >
                        {pct}%
                      </Badge>
                    </div>
                  </div>
                ))}

                {/* Mobile */}
                {resumo.porEtapa.map(({ etapa, total, concluidas, atrasadas, impedidas, pct }) => (
                  <div key={`m-${etapa.id}`} className="sm:hidden flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm">{etapa.ordem}. {etapa.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {concluidas}/{total} concluídas
                        {atrasadas > 0 ? ` · ${atrasadas} atrasadas` : ''}
                        {impedidas > 0 ? ` · ${impedidas} impedidas` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {impedidas > 0 && <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />}
                      <Badge className={`text-xs ${pct === 100 ? 'bg-green-100 text-green-800 border-transparent' : 'bg-blue-100 text-blue-800 border-transparent'}`}>
                        {pct}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
