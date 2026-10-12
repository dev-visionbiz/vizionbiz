import { useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import * as XLSX from 'xlsx'
import {
  FlaskConical, Globe, GlobeLock, Copy, CheckCheck, ChevronDown, ChevronUp,
  ClipboardList, AlertCircle, BarChart3, Download, Users, Lock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/auth/AuthProvider'
import {
  useAllFormulariosTemplate,
  useUpdateFormularioTemplate,
  useRespostasByTemplate,
} from '@/data/hooks/useFormulariosTemplate'
import { useToast } from '@/components/ui/use-toast'
import { EmptyState } from '@/components/shared/EmptyState'
import type { FormularioTemplate, FormularioResposta } from '@/domain/types'

function exportarExcel(template: FormularioTemplate, respostas: FormularioResposta[]) {
  const campos = template.campos
  const linhas = respostas.map(r => {
    const obj: Record<string, string> = {
      Data: format(new Date(r.criado_em), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
    }
    campos.forEach(c => { obj[c.rotulo] = r.respostas[c.id] ?? '' })
    return obj
  })
  const ws = XLSX.utils.json_to_sheet(linhas)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Respostas')
  XLSX.writeFile(wb, `${template.nome}_respostas.xlsx`)
}

// ─── Painel de respostas ──────────────────────────────────────────────────────

function RespostasPanel({ template }: { template: FormularioTemplate }) {
  const { currentUser } = useAuth()
  const tenantId = currentUser?.tenant_id ?? ''
  const { data: respostas = [], isLoading } = useRespostasByTemplate(tenantId, template.id)

  if (isLoading) {
    return <p className="text-sm text-muted-foreground py-4 text-center">Carregando...</p>
  }

  if (respostas.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center border rounded-lg border-dashed">
        Nenhuma resposta recebida ainda.
      </p>
    )
  }

  const campos = template.campos

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {respostas.length} resposta{respostas.length !== 1 ? 's' : ''} recebida{respostas.length !== 1 ? 's' : ''}
        </p>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1.5"
          onClick={() => exportarExcel(template, respostas)}
        >
          <Download className="h-3.5 w-3.5" />
          Exportar Excel
        </Button>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground whitespace-nowrap">Data</th>
              {campos.map(c => (
                <th key={c.id} className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground whitespace-nowrap">
                  {c.rotulo}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {respostas.map((r: FormularioResposta) => (
              <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                  {format(new Date(r.criado_em), "dd/MM/yy HH:mm", { locale: ptBR })}
                </td>
                {campos.map(c => (
                  <td key={c.id} className="px-3 py-2 text-xs max-w-48 truncate" title={r.respostas[c.id] ?? '—'}>
                    {r.respostas[c.id] || <span className="text-muted-foreground">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Card de pesquisa ─────────────────────────────────────────────────────────

function PesquisaCard({ template }: { template: FormularioTemplate }) {
  const { toast } = useToast()
  const update = useUpdateFormularioTemplate()
  const [respostasAberto, setRespostasAberto] = useState(false)
  const [copiado, setCopiado] = useState(false)

  const publicUrl = `${window.location.origin}/pesquisa/${template.id}`

  function togglePublicado(valor: boolean) {
    update.mutate(
      { id: template.id, data: { publicado: valor, ...(valor ? { acesso: template.acesso ?? 'publico' } : {}) } },
      {
        onSuccess: () => toast({
          title: valor ? 'Formulário publicado' : 'Formulário despublicado',
          description: valor ? 'O link está ativo.' : 'O link foi desativado.',
        }),
      }
    )
  }

  function toggleAcesso(valor: 'publico' | 'clientes') {
    update.mutate(
      { id: template.id, data: { acesso: valor } },
      {
        onSuccess: () => toast({
          title: valor === 'publico' ? 'Acesso público' : 'Acesso restrito a clientes',
          description: valor === 'publico'
            ? 'Qualquer pessoa com o link pode responder.'
            : 'Apenas clientes logados no portal podem responder.',
        }),
      }
    )
  }

  function toggleAtivo(valor: boolean) {
    update.mutate({ id: template.id, data: { ativo: valor } })
  }

  function copiarLink() {
    navigator.clipboard.writeText(publicUrl).then(() => {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    })
  }

  return (
    <div className="border rounded-xl bg-card overflow-hidden">
      {/* Cabeçalho */}
      <div className="px-4 py-3.5 flex items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-500/20 shrink-0 mt-0.5">
          <FlaskConical className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm">{template.nome}</p>
            {template.publicado && template.acesso !== 'clientes' && (
              <Badge className="bg-green-100 text-green-700 border-transparent text-xs gap-1">
                <Globe className="h-3 w-3" />Publicada
              </Badge>
            )}
            {template.publicado && template.acesso === 'clientes' && (
              <Badge className="bg-amber-100 text-amber-700 border-transparent text-xs gap-1">
                <Lock className="h-3 w-3" />Clientes
              </Badge>
            )}
            {!template.ativo && (
              <Badge variant="outline" className="text-xs text-muted-foreground">Inativo</Badge>
            )}
          </div>
          {template.descricao && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{template.descricao}</p>
          )}
          <p className="text-xs text-muted-foreground mt-0.5">{template.campos.length} campo(s)</p>
        </div>
      </div>

      <Separator />

      {/* Controles */}
      <div className="px-4 py-3 space-y-3">
        {/* Publicação */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {template.publicado
              ? <Globe className="h-4 w-4 text-green-600" />
              : <GlobeLock className="h-4 w-4 text-muted-foreground" />
            }
            <div>
              <Label className="text-sm cursor-pointer" htmlFor={`pub-${template.id}`}>
                Publicar formulário
              </Label>
              <p className="text-xs text-muted-foreground">
                {template.publicado ? 'Link ativo' : 'Link desativado'}
              </p>
            </div>
          </div>
          <Switch
            id={`pub-${template.id}`}
            checked={!!template.publicado}
            onCheckedChange={togglePublicado}
            disabled={update.isPending}
          />
        </div>

        {/* Modo de acesso (visível apenas quando publicado) */}
        {template.publicado && (
          <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Modo de acesso</p>
            <div className="space-y-1.5">
              <label className={`flex items-center gap-2.5 cursor-pointer rounded-md px-2 py-1.5 transition-colors ${(template.acesso ?? 'publico') === 'publico' ? 'bg-primary/10' : 'hover:bg-muted/50'}`}>
                <input
                  type="radio"
                  name={`acesso-${template.id}`}
                  value="publico"
                  checked={(template.acesso ?? 'publico') === 'publico'}
                  onChange={() => toggleAcesso('publico')}
                  disabled={update.isPending}
                  className="accent-primary"
                />
                <Globe className="h-3.5 w-3.5 text-green-600 shrink-0" />
                <div>
                  <p className="text-xs font-medium">Público</p>
                  <p className="text-xs text-muted-foreground">Qualquer pessoa com o link pode responder</p>
                </div>
              </label>
              <label className={`flex items-center gap-2.5 cursor-pointer rounded-md px-2 py-1.5 transition-colors ${template.acesso === 'clientes' ? 'bg-primary/10' : 'hover:bg-muted/50'}`}>
                <input
                  type="radio"
                  name={`acesso-${template.id}`}
                  value="clientes"
                  checked={template.acesso === 'clientes'}
                  onChange={() => toggleAcesso('clientes')}
                  disabled={update.isPending}
                  className="accent-primary"
                />
                <Lock className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                <div>
                  <p className="text-xs font-medium">Somente clientes</p>
                  <p className="text-xs text-muted-foreground">Apenas clientes logados no portal podem responder</p>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Link */}
        {template.publicado && (
          <div className="flex items-center gap-2 bg-muted/40 border rounded-lg px-3 py-2">
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              {template.acesso === 'clientes'
                ? <Users className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                : <Globe className="h-3.5 w-3.5 text-green-600 shrink-0" />
              }
              <code className="text-xs text-muted-foreground truncate">{publicUrl}</code>
            </div>
            <button
              type="button"
              onClick={copiarLink}
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              title="Copiar link"
            >
              {copiado ? <CheckCheck className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        )}

        {/* Ativo/Inativo */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-normal text-muted-foreground cursor-pointer" htmlFor={`ativo-${template.id}`}>
            Template ativo (disponível em tarefas)
          </Label>
          <Switch
            id={`ativo-${template.id}`}
            checked={!!template.ativo}
            onCheckedChange={toggleAtivo}
            disabled={update.isPending}
          />
        </div>
      </div>

      <Separator />

      {/* Toggle respostas */}
      <button
        type="button"
        onClick={() => setRespostasAberto(v => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-muted/30 transition-colors"
      >
        <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
          <BarChart3 className="h-3.5 w-3.5" />
          Ver respostas
        </span>
        {respostasAberto ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {respostasAberto && (
        <div className="px-4 pb-4">
          <RespostasPanel template={template} />
        </div>
      )}
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function PesquisasPage() {
  const { currentUser } = useAuth()
  const tenantId = currentUser?.tenant_id ?? ''

  const { data: todos = [] } = useAllFormulariosTemplate(tenantId)
  const pesquisas = todos.filter(t => t.destino === 'generico')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Formulários Livres</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Formulários personalizados para qualquer finalidade — pesquisas, inscrições, campanhas, feedbacks e muito mais.
        </p>
      </div>

      {pesquisas.length === 0 ? (
        <EmptyState
          icon={FlaskConical}
          title="Nenhum formulário criado"
          description='Crie um template do tipo "Formulário Livre" em Configurações → Formulários.'
          action={
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              Acesse Configurações → Formulários para criar
            </div>
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold uppercase tracking-wide">
            <ClipboardList className="h-3.5 w-3.5" />
            {pesquisas.length} formulário{pesquisas.length !== 1 ? 's' : ''}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {pesquisas.map(t => (
              <PesquisaCard key={t.id} template={t} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
