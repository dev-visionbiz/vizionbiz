import { useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { useConectarAppCliente, useAppVersion } from '@/data/hooks/useApps'
import type { App, AppEscopoSlug } from '@/domain/types'
import { ShieldCheck, Loader2, Plug } from 'lucide-react'

const escopoLabels: Record<AppEscopoSlug, string> = {
  'clientes:read': 'Ler dados cadastrais da sua empresa',
  'clientes:write': 'Alterar dados cadastrais da sua empresa',
  'contratos:read': 'Visualizar contratos',
  'financeiro:read': 'Visualizar faturas e saldo financeiro',
  'financeiro:write': 'Gerar cobranças e lançamentos',
  'documentos:read': 'Baixar e visualizar documentos',
  'documentos:write': 'Enviar e organizar documentos',
  'tarefas:write': 'Criar solicitações e tarefas automaticamente',
  'notificacoes:send': 'Enviar notificações (WhatsApp / e-mail)',
}

interface Props {
  app: App
  escritorioId: string
  clienteId: string
  usuarioId: string
  open: boolean
  onClose: () => void
}

export function ConectarServicoDialog({ app, escritorioId, clienteId, usuarioId, open, onClose }: Props) {
  const [aceito, setAceito] = useState(false)
  const { toast } = useToast()
  const { data: version } = useAppVersion(app.id)
  const conectar = useConectarAppCliente()

  const escopos = version?.manifesto.escopos ?? []

  function handleConectar() {
    if (!version) return
    conectar.mutate(
      { escritorioId, clienteId, appId: app.id, escopos, conectadoPor: usuarioId },
      {
        onSuccess: () => {
          toast({ title: `${app.nome} conectado com sucesso.` })
          onClose()
        },
        onError: () => {
          toast({ title: 'Erro ao conectar o serviço.', variant: 'destructive' })
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{app.icone ?? '📦'}</span>
            Conectar {app.nome}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">{app.descricao}</p>

          {escopos.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2 flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-primary" />
                Este serviço terá acesso a
              </p>
              <ul className="space-y-1.5">
                {escopos.map((escopo) => (
                  <li key={escopo} className="flex items-center gap-2 text-sm">
                    <Badge variant="outline" className="font-mono text-xs shrink-0">{escopo}</Badge>
                    <span className="text-muted-foreground">{escopoLabels[escopo] ?? escopo}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-start gap-2 pt-2">
            <Checkbox
              id="aceito-cliente"
              checked={aceito}
              onCheckedChange={(v) => setAceito(v === true)}
            />
            <Label htmlFor="aceito-cliente" className="text-sm leading-snug cursor-pointer">
              Entendo as permissões acima e autorizo a conexão deste serviço à minha conta.
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={handleConectar}
            disabled={!aceito || conectar.isPending || !version}
          >
            {conectar.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            <Plug className="w-4 h-4 mr-1.5" />
            Conectar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
