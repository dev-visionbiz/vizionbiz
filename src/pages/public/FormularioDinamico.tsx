import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { v4 as uuid } from 'uuid'
import { Loader2, CheckCircle2, XCircle, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { formularioTemplateRepo, formularioRespostaRepo } from '@/data/repositories/localStorage/FormularioTemplateRepository'
import { tarefaRepo } from '@/data/repositories/localStorage/TarefaRepository'
import { LocalTenantRepository } from '@/data/repositories/localStorage'
import type { FormularioTemplate, FormularioCampoTemplate, Tenant, Tarefa } from '@/domain/types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const tenantRepo = new LocalTenantRepository()

function Campo({
  campo,
  valor,
  onChange,
}: {
  campo: FormularioCampoTemplate
  valor: string
  onChange: (v: string) => void
}) {
  const base = 'w-full'
  switch (campo.tipo) {
    case 'texto_longo':
      return (
        <Textarea
          value={valor}
          onChange={e => onChange(e.target.value)}
          placeholder={campo.placeholder}
          rows={3}
          className={base}
        />
      )
    case 'checkbox':
      return (
        <div className="flex items-center gap-2">
          <Checkbox
            id={campo.id}
            checked={valor === 'true'}
            onCheckedChange={v => onChange(String(v))}
          />
          <Label htmlFor={campo.id} className="font-normal cursor-pointer">
            {campo.placeholder ?? campo.rotulo}
          </Label>
        </div>
      )
    case 'select':
      return (
        <Select value={valor} onValueChange={onChange}>
          <SelectTrigger className={base}>
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
      return (
        <Input
          type="date"
          value={valor}
          onChange={e => onChange(e.target.value)}
          className={base}
        />
      )
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
          className={base}
        />
      )
    default:
      return (
        <Input
          type={campo.tipo === 'email' ? 'email' : 'text'}
          value={valor}
          onChange={e => onChange(e.target.value)}
          placeholder={campo.placeholder}
          className={base}
        />
      )
  }
}

export default function FormularioDinamico() {
  const { token } = useParams<{ token: string }>()

  const [tarefa, setTarefa]       = useState<Tarefa | null>(null)
  const [template, setTemplate]   = useState<FormularioTemplate | null>(null)
  const [tenant, setTenant]       = useState<Tenant | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro]           = useState<string | null>(null)
  const [respostas, setRespostas] = useState<Record<string, string>>({})
  const [enviando, setEnviando]   = useState(false)
  const [concluido, setConcluido] = useState(false)

  useEffect(() => {
    if (!token) return
    tarefaRepo.findByFormularioToken(token).then(async (t) => {
      if (!t) {
        setErro('Formulário não encontrado ou link inválido.')
        setCarregando(false)
        return
      }
      if (t.formulario_status === 'preenchido') {
        setErro('Este formulário já foi preenchido.')
        setCarregando(false)
        return
      }
      if (!t.formulario_template_id) {
        setErro('Esta tarefa não possui um formulário configurado.')
        setCarregando(false)
        return
      }
      setTarefa(t)
      const tmpl = await formularioTemplateRepo.findById(t.formulario_template_id)
      if (!tmpl || !tmpl.ativo) {
        setErro('Formulário não encontrado ou indisponível.')
        setCarregando(false)
        return
      }
      setTemplate(tmpl)
      const tenant = await tenantRepo.findById(tmpl.tenant_id)
      setTenant(tenant)
      setCarregando(false)
    })
  }, [token])

  async function handleEnviar() {
    if (!template || !tarefa) return
    const obrigatoriosPreenchidos = template.campos
      .filter(c => c.obrigatorio)
      .every(c => respostas[c.id]?.trim())
    if (!obrigatoriosPreenchidos) return

    setEnviando(true)
    try {
      await formularioRespostaRepo.create({
        id: uuid(),
        tenant_id: template.tenant_id,
        template_id: template.id,
        tarefa_id: tarefa.id,
        ocorrencia_id: tarefa.ocorrencia_id,
        respostas,
        processado: false,
        criado_em: new Date().toISOString(),
      })
      await tarefaRepo.update(tarefa.id, { formulario_status: 'preenchido' })
      setConcluido(true)
    } catch {
      setErro('Erro ao enviar. Tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (erro) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-center px-4">
        <XCircle className="w-12 h-12 text-destructive opacity-60" />
        <p className="text-lg font-semibold">Formulário indisponível</p>
        <p className="text-sm text-muted-foreground">{erro}</p>
      </div>
    )
  }

  if (concluido) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-4">
        <CheckCircle2 className="w-16 h-16 text-green-500" />
        <div>
          <p className="text-xl font-bold">Informações recebidas!</p>
          <p className="text-sm text-muted-foreground mt-1">
            O escritório receberá os dados e dará continuidade ao processo.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Enviado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
        </p>
      </div>
    )
  }

  const camposOrdenados = [...(template?.campos ?? [])].sort((a, b) => a.ordem - b.ordem)
  const todosObrigatoriosOk = camposOrdenados
    .filter(c => c.obrigatorio)
    .every(c => respostas[c.id]?.trim())

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-background rounded-2xl border shadow-sm overflow-hidden">
        <div className="bg-primary/5 border-b px-6 py-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
            {tenant?.nome ?? 'Escritório'}
          </p>
          <h1 className="text-xl font-bold">{template?.nome ?? 'Formulário'}</h1>
          {template?.descricao && (
            <p className="text-sm text-muted-foreground mt-0.5">{template.descricao}</p>
          )}
          {tarefa && (
            <p className="text-xs text-muted-foreground mt-1 opacity-70">Tarefa: {tarefa.nome}</p>
          )}
        </div>

        <div className="px-6 py-5 space-y-4">
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
              Nenhum campo configurado neste formulário.
            </p>
          )}
        </div>

        <div className="px-6 pb-6">
          <Button
            className="w-full"
            disabled={!todosObrigatoriosOk || enviando}
            onClick={handleEnviar}
          >
            {enviando
              ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              : <Send className="w-4 h-4 mr-2" />
            }
            Enviar informações
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-3">
            Campos marcados com * são obrigatórios
          </p>
        </div>
      </div>
    </div>
  )
}
