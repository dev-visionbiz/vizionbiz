import { useState } from 'react'
import { format } from 'date-fns'
import {
  History, ChevronDown, ChevronUp,
  Plus, ArrowRight, UserCheck, AlertTriangle, CheckCircle2, ListChecks, MessageSquare,
  PlayCircle, Flag, PauseCircle, StopCircle, User,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { useHistoricoTarefa, useRegistrarHistoricoTarefa } from '@/data/hooks/useHistoricoTarefa'
import { useAuth } from '@/auth/AuthProvider'
import type { HistoricoTarefa, HistoricoTipoEvento, TarefaStatus } from '@/domain/types'

const statusLabel: Record<TarefaStatus, string> = {
  pendente:      'Pendente',
  em_andamento:  'Em andamento',
  concluida:     'Concluída',
  atrasada:      'Atrasada',
  nao_se_aplica: 'N/A',
  impedido:      'Impedida',
}

const eventoIcon: Record<HistoricoTipoEvento, React.ReactNode> = {
  criacao:                  <Plus className="h-3 w-3" />,
  status_alterado:          <ArrowRight className="h-3 w-3" />,
  responsavel_alterado:     <UserCheck className="h-3 w-3" />,
  impedimento_registrado:   <AlertTriangle className="h-3 w-3 text-orange-500" />,
  impedimento_resolvido:    <CheckCircle2 className="h-3 w-3 text-green-600" />,
  checklist_completo:       <ListChecks className="h-3 w-3 text-green-600" />,
  comentario:               <MessageSquare className="h-3 w-3 text-primary" />,
  inicio_item_checklist:        <PlayCircle className="h-3 w-3 text-amber-500" />,
  conclusao_item_checklist:     <Flag className="h-3 w-3 text-green-600" />,
  pausa_item_checklist:         <PauseCircle className="h-3 w-3 text-amber-500" />,
  retomada_item_checklist:      <PlayCircle className="h-3 w-3 text-green-600" />,
  cancelamento_item_checklist:  <StopCircle className="h-3 w-3 text-destructive" />,
}

function labelEvento(h: HistoricoTarefa): string {
  switch (h.tipo) {
    case 'criacao':
      return 'Etapa criada'
    case 'status_alterado': {
      const ant = h.meta?.status_anterior ? statusLabel[h.meta.status_anterior] : '?'
      const nov = h.meta?.status_novo ? statusLabel[h.meta.status_novo] : '?'
      return `Status: ${ant} → ${nov}`
    }
    case 'responsavel_alterado': {
      const ant = h.meta?.responsavel_anterior_nome ?? 'Nenhum'
      const nov = h.meta?.responsavel_novo_nome ?? 'Nenhum'
      return `Responsável: ${ant} → ${nov}`
    }
    case 'impedimento_registrado':
      return 'Impedimento registrado'
    case 'impedimento_resolvido':
      return 'Impedimento resolvido'
    case 'checklist_completo':
      return 'Checklist 100% concluído'
    case 'comentario':
      return h.conteudo ?? ''
    case 'inicio_item_checklist':
      return h.meta?.checklist_item_nome
        ? `Iniciado: ${h.meta.checklist_item_nome}`
        : 'Execução iniciada'
    case 'conclusao_item_checklist':
      return h.meta?.checklist_item_nome
        ? `Concluído: ${h.meta.checklist_item_nome}`
        : 'Item concluído'
    case 'pausa_item_checklist':
      return h.meta?.checklist_item_nome
        ? `Pausado: ${h.meta.checklist_item_nome}`
        : 'Execução pausada'
    case 'retomada_item_checklist':
      return h.meta?.checklist_item_nome
        ? `Retomado: ${h.meta.checklist_item_nome}`
        : 'Execução retomada'
    case 'cancelamento_item_checklist':
      return h.meta?.checklist_item_nome
        ? `Execução cancelada: ${h.meta.checklist_item_nome}`
        : 'Execução cancelada'
  }
}

interface Props {
  tenantId: string
  tarefaId: string
  tarefaTipo: 'tarefa'
}

export function HistoricoPanel({ tenantId, tarefaId, tarefaTipo }: Props) {
  const [aberto, setAberto] = useState(false)
  const [comentario, setComentario] = useState('')
  const { data: historico = [] } = useHistoricoTarefa(tenantId, tarefaId)
  const registrar = useRegistrarHistoricoTarefa()
  const { currentUser } = useAuth()

  function handleRegistrarComentario() {
    const texto = comentario.trim()
    if (!texto) return
    registrar.mutate({
      tenantId,
      tarefaId,
      tarefaTipo,
      tipo: 'comentario',
      autorId: currentUser?.id,
      autorNome: currentUser?.nome,
      conteudo: texto,
    })
    setComentario('')
  }

  return (
    <div className="border rounded-md">
      <button
        type="button"
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/40 transition-colors"
        onClick={() => setAberto((v) => !v)}
      >
        <History className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="text-xs font-medium flex-1">Histórico</span>
        {historico.length > 0 && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
            {historico.length}
          </Badge>
        )}
        {aberto ? (
          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>

      {aberto && (
        <div className="px-3 pb-3 space-y-2.5">
          <Separator />

          {historico.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-2">Nenhum registro ainda</p>
          )}

          {historico.length > 0 && (
            <div className="space-y-2">
              {historico.map((h) => (
                <div key={h.id} className="flex gap-2">
                  <div className={`mt-0.5 shrink-0 rounded-full p-1 ${h.tipo === 'comentario' ? 'bg-primary/10' : 'bg-muted'}`}>
                    {eventoIcon[h.tipo]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs leading-snug ${h.tipo === 'comentario' ? 'font-medium' : 'text-muted-foreground'}`}>
                      {labelEvento(h)}
                    </p>
                    {h.tipo !== 'comentario' && typeof h.conteudo === 'string' && h.conteudo && (
                      <p className="text-xs mt-0.5 text-foreground/80 whitespace-pre-wrap">{h.conteudo}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                      <User className="h-2.5 w-2.5 shrink-0" />
                      <span>{h.autor_nome ?? 'Sistema'}</span>
                      <span>·</span>
                      <span>{format(new Date(h.criado_em), 'dd/MM HH:mm')}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Separator />

          <div className="space-y-1.5">
            <Textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="Adicionar comentário..."
              rows={2}
              className="text-xs resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleRegistrarComentario()
              }}
            />
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs w-full"
              onClick={handleRegistrarComentario}
              disabled={!comentario.trim() || registrar.isPending}
            >
              Registrar comentário
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
