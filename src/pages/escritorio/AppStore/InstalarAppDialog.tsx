import { useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { useInstalarApp } from '@/data/hooks/useApps'
import type { App, AppVersion, AppEscopoSlug } from '@/domain/types'
import { ShieldCheck, Loader2 } from 'lucide-react'

const escopoLabels: Record<AppEscopoSlug, string> = {
  'clientes:read': 'Ler dados cadastrais dos clientes',
  'clientes:write': 'Alterar dados cadastrais dos clientes',
  'contratos:read': 'Ler contratos',
  'financeiro:read': 'Ler faturas e saldo financeiro',
  'financeiro:write': 'Gerar cobranças e lançamentos',
  'documentos:read': 'Baixar e visualizar documentos',
  'documentos:write': 'Enviar e organizar documentos',
  'tarefas:write': 'Criar ocorrências e tarefas automaticamente',
  'notificacoes:send': 'Enviar notificações ao cliente (WhatsApp / e-mail)',
}

interface Props {
  app: App
  version: AppVersion
  open: boolean
  onClose: () => void
  escritorioId: string
  usuarioId: string
}

export function InstalarAppDialog({ app, version, open, onClose, escritorioId, usuarioId }: Props) {
  const [aceito, setAceito] = useState(false)
  const { toast } = useToast()
  const instalar = useInstalarApp()

  const escopos = version.manifesto.escopos

  function handleInstalar() {
    instalar.mutate(
      { escritorioId, appId: app.id, escopos, instaladoPor: usuarioId },
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
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{app.icone}</span>
            Conectar {app.nome}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">{app.descricao}</p>

          <div>
            <p className="text-sm font-medium mb-2 flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-primary" />
              Permissões solicitadas
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

          {version.manifesto.slots.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-1">Pontos de extensão</p>
              <div className="flex flex-wrap gap-1">
                {version.manifesto.slots.map((slot) => (
                  <Badge key={slot} variant="secondary" className="text-xs">{slot}</Badge>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-start gap-2 pt-2">
            <Checkbox
              id="aceito"
              checked={aceito}
              onCheckedChange={(v) => setAceito(v === true)}
            />
            <Label htmlFor="aceito" className="text-sm leading-snug cursor-pointer">
              Entendo as permissões acima e autorizo a conexão deste serviço aos dados indicados.
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={handleInstalar}
            disabled={!aceito || instalar.isPending}
          >
            {instalar.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Conectar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
