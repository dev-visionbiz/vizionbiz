import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Bell, Eye, MessageCircle, Mail, User, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLogAtividadeByReferencia } from '@/data/hooks/useLogAtividadeCliente'
import type { LogAtividadeCliente } from '@/domain/types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Props {
  open: boolean
  onClose: () => void
  tenantId: string
  guiaId: string
  guiaTitulo: string
}

const CANAL_ICON: Record<string, React.FC<{ className?: string }>> = {
  WhatsApp: MessageCircle,
  'E-mail':  Mail,
  Manual:    User,
}

function LogItem({ log }: { log: LogAtividadeCliente }) {
  const isNotificacao = log.acao === 'guia_notificada'
  const canalMatch = log.descricao.match(/via (.+)$/)
  const canal = canalMatch?.[1] ?? null
  const CanalIcon = canal ? CANAL_ICON[canal] : null

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={cn(
          'h-7 w-7 rounded-full flex items-center justify-center shrink-0',
          isNotificacao ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700',
        )}>
          {isNotificacao ? <Bell className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </div>
        <div className="flex-1 w-px bg-border mt-1" />
      </div>
      <div className="pb-4 flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn(
            'text-xs font-semibold',
            isNotificacao ? 'text-emerald-700' : 'text-blue-700',
          )}>
            {isNotificacao ? 'Notificação enviada' : 'Visualização confirmada'}
          </span>
          {canal && CanalIcon && (
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5">
              <CanalIcon className="h-2.5 w-2.5" />
              {canal}
            </span>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {format(new Date(log.em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          {' · '}{log.usuario_nome}
        </p>
      </div>
    </div>
  )
}

export function NotificacaoLogDialog({ open, onClose, tenantId, guiaId, guiaTitulo }: Props) {
  const { data: todosLogs = [], isLoading } = useLogAtividadeByReferencia(tenantId, guiaId)
  const logs = todosLogs.filter(
    (l) => l.acao === 'guia_notificada' || l.acao === 'guia_visualizacao_confirmada'
  )

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">Histórico de notificações</DialogTitle>
          <p className="text-xs text-muted-foreground truncate">{guiaTitulo}</p>
        </DialogHeader>

        <div className="mt-2 max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="py-8 flex items-center justify-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma notificação registrada ainda.
            </div>
          ) : (
            <div className="pr-1">
              {logs.map((log) => (
                <LogItem key={log.id} log={log} />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
