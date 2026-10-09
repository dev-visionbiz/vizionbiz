import { useState, useEffect } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { whatsappService } from '@/lib/whatsapp/whatsappService'
import { MessageCircle, AlertTriangle } from 'lucide-react'

export interface ContatoDisponivel {
  id: string
  nome: string
  telefone: string
  setor?: string
  principal: boolean
}

interface Props {
  open: boolean
  onClose: () => void
  escritorioId: string
  telefoneInicial?: string
  mensagemInicial?: string
  titulo?: string
  thumbnail?: string | null
  contatosDisponiveis?: ContatoDisponivel[]
}

export function WhatsAppMessageDialog({
  open,
  onClose,
  escritorioId,
  telefoneInicial = '',
  mensagemInicial = '',
  titulo = 'Enviar via WhatsApp',
  thumbnail,
  contatosDisponiveis,
}: Props) {
  const { toast } = useToast()
  const [telefone, setTelefone] = useState(telefoneInicial)
  const [mensagem, setMensagem] = useState(mensagemInicial)
  const [enviando, setEnviando] = useState(false)
  const [contatoSelecionado, setContatoSelecionado] = useState<string>('')
  const apiConfigurada = !!import.meta.env.VITE_WHATSAPP_API_URL

  useEffect(() => {
    if (open) {
      const telefoneDefault = (() => {
        if (contatosDisponiveis?.length) {
          const principal = contatosDisponiveis.find((c) => c.principal && c.telefone)
          const qualquer = contatosDisponiveis.find((c) => c.telefone)
          const ct = principal ?? qualquer
          if (ct) {
            setContatoSelecionado(ct.id)
            return ct.telefone
          }
        }
        setContatoSelecionado('')
        return telefoneInicial
      })()
      setTelefone(telefoneDefault)
      setMensagem(mensagemInicial)
    }
  }, [open, telefoneInicial, mensagemInicial, contatosDisponiveis])

  const handleSelecionarContato = (id: string) => {
    setContatoSelecionado(id)
    const ct = contatosDisponiveis?.find((c) => c.id === id)
    if (ct?.telefone) setTelefone(ct.telefone)
  }

  async function handleEnviar() {
    if (!telefone.trim() || !mensagem.trim()) return
    setEnviando(true)
    try {
      await whatsappService.enviar({ escritorioId, telefone: telefone.trim(), mensagem: mensagem.trim(), thumbnail })
      toast({ title: 'Mensagem enviada!', description: 'O cliente receberá a mensagem em instantes.' })
      onClose()
    } catch (err) {
      toast({
        title: 'Erro ao enviar',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-green-600" />
            {titulo}
          </DialogTitle>
        </DialogHeader>

        {!apiConfigurada && (
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              <strong>VITE_WHATSAPP_API_URL</strong> não está configurado.
              Adicione a variável no <code>.env.local</code> apontando para o servidor Node.js.
            </p>
          </div>
        )}

        <div className="space-y-4 py-1">
          {thumbnail && (
            <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-2">
              <img src={thumbnail} alt="Preview do documento" className="h-16 w-12 rounded border object-cover shrink-0" />
              <p className="text-xs text-muted-foreground">Miniatura do documento será enviada antes da mensagem.</p>
            </div>
          )}

          {contatosDisponiveis && contatosDisponiveis.length > 0 && (
            <div className="space-y-1.5">
              <Label>Selecionar contato</Label>
              <Select value={contatoSelecionado} onValueChange={handleSelecionarContato}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um contato..." />
                </SelectTrigger>
                <SelectContent>
                  {contatosDisponiveis.map((ct) => (
                    <SelectItem key={ct.id} value={ct.id}>
                      {ct.nome}{ct.setor ? ` · ${ct.setor}` : ''}{ct.principal ? ' ★' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="wa-telefone">Telefone (com DDD e código do país)</Label>
            <Input
              id="wa-telefone"
              placeholder="5544999172670"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Ex: 5544999172670 (55 = Brasil, 44 = DDD, sem espaços)</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="wa-mensagem">Mensagem</Label>
            <Textarea
              id="wa-mensagem"
              rows={10}
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              className="text-sm font-mono resize-none"
              placeholder="Digite a mensagem..."
            />
            <p className="text-xs text-muted-foreground">{mensagem.length} caracteres</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={enviando}>
            Cancelar
          </Button>
          <Button
            onClick={handleEnviar}
            disabled={!telefone.trim() || !mensagem.trim() || enviando || !apiConfigurada}
            className="gap-2 bg-green-600 hover:bg-green-700 text-white"
          >
            <MessageCircle className="h-4 w-4" />
            {enviando ? 'Enviando...' : 'Enviar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
