import { useState, useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarDays, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/auth/AuthProvider'
import { useObrigacoesAtivas } from '@/data/hooks/useObrigacoes'
import { useCompetencias, useGerarCompetencia, useUpdateCompetencia } from '@/data/hooks/useCompetencias'
import { useClienteObrigacoes } from '@/data/hooks/useClienteObrigacoes'
import { calcularVencimento } from '@/domain/obrigacoes/calcularVencimento'
import { formatDate } from '@/lib/utils'

function periodoLabel(periodo: string): string {
  try {
    const [ano, mes] = periodo.split('-').map(Number)
    const d = new Date(ano, mes - 1, 1)
    return format(d, 'MMMM/yyyy', { locale: ptBR }).replace(/^\w/, (c) => c.toUpperCase())
  } catch {
    return periodo
  }
}

export function GeracaoCompetencia() {
  const { currentUser } = useAuth()
  const tenantId = currentUser?.tenant_id ?? ''
  const { toast } = useToast()

  const { data: obrigacoes = [] } = useObrigacoesAtivas(tenantId)
  const gerarCompetencia = useGerarCompetencia()
  const updateCompetencia = useUpdateCompetencia()

  const [obrigacaoId, setObrigacaoId] = useState('')
  const [periodo, setPeriodo] = useState(() => format(new Date(), 'yyyy-MM'))

  const obrigacaoSelecionada = obrigacoes.find((o) => o.id === obrigacaoId)

  const { data: competencias = [] } = useCompetencias(tenantId, obrigacaoId)
  const { data: vinculos = [] } = useClienteObrigacoes(tenantId, obrigacaoId)
  const clientesAtivos = vinculos.filter((v) => v.ativo).length

  const vencimentoPreview = useMemo(() => {
    if (!obrigacaoSelecionada || !periodo) return null
    try {
      return calcularVencimento(obrigacaoSelecionada.regra_vencimento, periodo)
    } catch {
      return null
    }
  }, [obrigacaoSelecionada, periodo])

  const competenciaJaExiste = competencias.some((c) => c.periodo === periodo)

  async function handleGerar() {
    if (!obrigacaoSelecionada) return
    try {
      const result = await gerarCompetencia.mutateAsync({ tenantId, obrigacao: obrigacaoSelecionada, periodo })
      toast({
        title: competenciaJaExiste ? 'Competência atualizada' : 'Competência gerada',
        description: `${result.tarefasCriadas} tarefa${result.tarefasCriadas !== 1 ? 's' : ''} criada${result.tarefasCriadas !== 1 ? 's' : ''}.`,
      })
    } catch {
      toast({ title: 'Erro ao gerar competência', variant: 'destructive' })
    }
  }

  return (
    <div className="px-4 sm:px-6 pb-8 space-y-6">
      <div className="rounded-lg border p-4 space-y-4 max-w-lg">
        <h3 className="font-medium text-sm">Gerar competência</h3>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1 col-span-2">
            <Label>Obrigação</Label>
            <Select value={obrigacaoId} onValueChange={setObrigacaoId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {obrigacoes.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Período (AAAA-MM)</Label>
            <Input
              type="month"
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
            />
          </div>
        </div>

        {obrigacaoSelecionada && (
          <div className="bg-muted/50 rounded-md p-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Período:</span>
              <span className="font-medium">{periodoLabel(periodo)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Vencimento:</span>
              <span className="font-medium">
                {vencimentoPreview ? formatDate(vencimentoPreview) : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Clientes ativos vinculados:</span>
              <span className="font-medium">{clientesAtivos}</span>
            </div>
            {competenciaJaExiste && (
              <p className="text-xs text-amber-600 mt-1">
                Já existe uma competência para este período. Novas tarefas serão adicionadas apenas para clientes ainda não incluídos.
              </p>
            )}
          </div>
        )}

        <Button
          onClick={handleGerar}
          disabled={!obrigacaoSelecionada || !periodo || gerarCompetencia.isPending}
          className="gap-2 w-full"
        >
          <Play className="h-4 w-4" />
          {gerarCompetencia.isPending ? 'Gerando...' : 'Gerar Competência'}
        </Button>
      </div>

      {obrigacaoId && (
        <div className="space-y-3">
          <h3 className="font-medium text-sm">
            Competências de {obrigacaoSelecionada?.nome}
          </h3>

          {competencias.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma competência gerada ainda.</p>
          ) : (
            <div className="rounded-lg border divide-y max-w-2xl">
              <div className="hidden sm:grid grid-cols-[1fr_10rem_8rem_7rem] gap-x-3 px-4 py-2 bg-muted/40 text-xs font-medium text-muted-foreground">
                <span>Período</span>
                <span>Vencimento</span>
                <span>Status</span>
                <span></span>
              </div>
              {competencias.map((c) => (
                <div key={c.id} className="flex sm:grid sm:grid-cols-[1fr_10rem_8rem_7rem] gap-x-3 px-4 py-3 items-center">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium">{periodoLabel(c.periodo)}</span>
                  </div>
                  <span className="hidden sm:block text-sm text-muted-foreground">{formatDate(c.data_vencimento)}</span>
                  <div className="hidden sm:block">
                    {c.status === 'aberta' ? (
                      <Badge className="text-xs bg-blue-100 text-blue-800 border-transparent">Aberta</Badge>
                    ) : (
                      <Badge className="text-xs bg-gray-100 text-gray-600 border-transparent">Encerrada</Badge>
                    )}
                  </div>
                  <div className="hidden sm:block">
                    {c.status === 'aberta' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => updateCompetencia.mutate({ id: c.id, data: { status: 'encerrada' } })}
                      >
                        Encerrar
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => updateCompetencia.mutate({ id: c.id, data: { status: 'aberta' } })}
                      >
                        Reabrir
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
