import { useState } from 'react'
import { v4 as uuid } from 'uuid'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { FlaskConical, Send, CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { useAuth } from '@/auth/AuthProvider'
import {
  useAllFormulariosTemplate,
  useRespostasByTemplate,
} from '@/data/hooks/useFormulariosTemplate'
import { formularioRespostaRepo } from '@/data/repositories/localStorage/FormularioTemplateRepository'
import { useQueryClient } from '@tanstack/react-query'
import { EmptyState } from '@/components/shared/EmptyState'
import type { FormularioTemplate, FormularioCampoTemplate } from '@/domain/types'

// ─── Campo renderer (mesma lógica do PesquisaPublica) ────────────────────────

function Campo({
  campo,
  valor,
  onChange,
}: {
  campo: FormularioCampoTemplate
  valor: string
  onChange: (v: string) => void
}) {
  switch (campo.tipo) {
    case 'texto_longo':
      return <Textarea value={valor} onChange={e => onChange(e.target.value)} placeholder={campo.placeholder} rows={3} className="w-full" />
    case 'checkbox':
      return (
        <div className="flex items-center gap-2">
          <Checkbox id={campo.id} checked={valor === 'true'} onCheckedChange={v => onChange(String(v))} />
          <Label htmlFor={campo.id} className="font-normal cursor-pointer">{campo.placeholder ?? campo.rotulo}</Label>
        </div>
      )
    case 'select':
      return (
        <Select value={valor} onValueChange={onChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={campo.placeholder ?? 'Selecione...'} />
          </SelectTrigger>
          <SelectContent>
            {(campo.opcoes ?? []).filter(o => o.trim()).map(o => (
              <SelectItem key={o} value={o}>{o}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    case 'slider': {
      const min = campo.slider_min ?? 0
      const max = campo.slider_max ?? 10
      const num = valor !== '' ? Number(valor) : Math.round((min + max) / 2)
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{min}</span>
            <span className="text-lg font-bold text-foreground">{valor !== '' ? num : '—'}</span>
            <span>{max}</span>
          </div>
          <input
            type="range"
            min={min}
            max={max}
            step={1}
            value={valor !== '' ? num : Math.round((min + max) / 2)}
            onChange={e => onChange(e.target.value)}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            {Array.from({ length: max - min + 1 }, (_, i) => (
              <span key={i} className={num === min + i ? 'font-semibold text-primary' : ''}>{min + i}</span>
            ))}
          </div>
        </div>
      )
    }
    case 'data':
      return <Input type="date" value={valor} onChange={e => onChange(e.target.value)} className="w-full" />
    case 'numero':
    case 'moeda':
    case 'percentual':
      return (
        <Input
          type="number"
          step={campo.tipo === 'moeda' ? '0.01' : campo.tipo === 'percentual' ? '0.01' : '1'}
          min="0"
          value={valor}
          onChange={e => onChange(e.target.value)}
          placeholder={campo.placeholder}
          className="w-full"
        />
      )
    default:
      return (
        <Input
          type={campo.tipo === 'email' ? 'email' : 'text'}
          value={valor}
          onChange={e => onChange(e.target.value)}
          placeholder={campo.placeholder}
          className="w-full"
        />
      )
  }
}

// ─── Dialog de preenchimento ─────────────────────────────────────────────────

function PesquisaDialog({
  template,
  clienteId,
  tenantId,
  open,
  onClose,
}: {
  template: FormularioTemplate
  clienteId: string
  tenantId: string
  open: boolean
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [respostas, setRespostas] = useState<Record<string, string>>({})
  const [enviando, setEnviando] = useState(false)
  const [concluido, setConcluido] = useState(false)

  const camposOrdenados = [...template.campos].sort((a, b) => a.ordem - b.ordem)
  const todosObrigatoriosOk = camposOrdenados.filter(c => c.obrigatorio).every(c => respostas[c.id]?.trim())

  async function handleEnviar() {
    if (!todosObrigatoriosOk) return
    setEnviando(true)
    try {
      await formularioRespostaRepo.create({
        id: uuid(),
        tenant_id: tenantId,
        template_id: template.id,
        cliente_id: clienteId,
        respostas,
        processado: false,
        criado_em: new Date().toISOString(),
      })
      qc.invalidateQueries({ queryKey: ['formularios_resposta'] })
      setConcluido(true)
    } finally {
      setEnviando(false)
    }
  }

  function handleClose() {
    if (!enviando) {
      onClose()
      // reset after dialog closes
      setTimeout(() => {
        setRespostas({})
        setConcluido(false)
      }, 300)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose() }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template.nome}</DialogTitle>
          {template.descricao && (
            <DialogDescription>{template.descricao}</DialogDescription>
          )}
        </DialogHeader>

        {concluido ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle2 className="w-14 h-14 text-green-500" />
            <p className="text-base font-semibold">Obrigado pela sua resposta!</p>
            <p className="text-sm text-muted-foreground">Suas respostas foram registradas com sucesso.</p>
            <p className="text-xs text-muted-foreground">
              Enviado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
            <Button className="mt-2" onClick={handleClose}>Fechar</Button>
          </div>
        ) : (
          <div className="space-y-4 pt-1">
            {camposOrdenados.map(campo => (
              <div key={campo.id} className="space-y-1.5">
                {campo.tipo !== 'checkbox' && (
                  <Label>
                    {campo.rotulo}
                    {campo.obrigatorio && <span className="text-destructive ml-1">*</span>}
                  </Label>
                )}
                <Campo
                  campo={campo}
                  valor={respostas[campo.id] ?? ''}
                  onChange={v => setRespostas(prev => ({ ...prev, [campo.id]: v }))}
                />
              </div>
            ))}
            {camposOrdenados.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum campo configurado nesta pesquisa.
              </p>
            )}
            <div className="pt-2">
              <Button
                className="w-full"
                disabled={!todosObrigatoriosOk || enviando}
                onClick={handleEnviar}
              >
                {enviando
                  ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  : <Send className="w-4 h-4 mr-2" />
                }
                Enviar resposta
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Campos marcados com * são obrigatórios
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── Card de pesquisa ─────────────────────────────────────────────────────────

function PesquisaClienteCard({
  template,
  clienteId,
  tenantId,
}: {
  template: FormularioTemplate
  clienteId: string
  tenantId: string
}) {
  const [dialogAberto, setDialogAberto] = useState(false)

  const { data: respostas = [] } = useRespostasByTemplate(tenantId, template.id)
  const jaRespondeu = respostas.some(r => r.cliente_id === clienteId)

  return (
    <>
      <div className="border rounded-xl bg-card p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-500/20 shrink-0">
            <FlaskConical className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-sm">{template.nome}</p>
              {jaRespondeu && (
                <Badge className="bg-green-100 text-green-700 border-transparent text-xs gap-1">
                  <CheckCircle2 className="h-3 w-3" />Respondida
                </Badge>
              )}
            </div>
            {template.descricao && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{template.descricao}</p>
            )}
          </div>
        </div>

        <Button
          size="sm"
          variant={jaRespondeu ? 'outline' : 'default'}
          className="w-full"
          onClick={() => setDialogAberto(true)}
        >
          {jaRespondeu ? 'Responder novamente' : 'Responder'}
        </Button>
      </div>

      <PesquisaDialog
        template={template}
        clienteId={clienteId}
        tenantId={tenantId}
        open={dialogAberto}
        onClose={() => setDialogAberto(false)}
      />
    </>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function PortalPesquisas() {
  const { currentUser } = useAuth()
  const tenantId = currentUser?.tenant_id ?? ''
  const clienteId = currentUser?.client_id ?? ''

  const { data: todos = [], isLoading } = useAllFormulariosTemplate(tenantId)

  const pesquisas = todos.filter(
    t => t.destino === 'generico' && t.publicado === true && t.acesso === 'clientes'
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Formulários</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Formulários disponibilizados pelo escritório para você preencher.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : pesquisas.length === 0 ? (
        <EmptyState
          icon={FlaskConical}
          title="Nenhum formulário disponível"
          description="Não há formulários disponibilizados para você no momento."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {pesquisas.map(t => (
            <PesquisaClienteCard
              key={t.id}
              template={t}
              clienteId={clienteId}
              tenantId={tenantId}
            />
          ))}
        </div>
      )}
    </div>
  )
}
