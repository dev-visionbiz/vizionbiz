import { useState } from 'react'
import { v4 as uuid } from 'uuid'
import {
  Plus, Pencil, Trash2, FileText, ClipboardList, FlaskConical,
  CheckSquare, Square,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { useAuth } from '@/auth/AuthProvider'
import {
  useFormulariosTemplate,
  useCreateFormularioTemplate,
  useUpdateFormularioTemplate,
  useDeleteFormularioTemplate,
} from '@/data/hooks/useFormulariosTemplate'
import { EmptyState } from '@/components/shared/EmptyState'
import {
  SCHEMA_POR_DESTINO, getCamposPadrao, isDestinoEstruturado, type CampoSchema,
} from '@/lib/formularioSchema'
import type {
  FormularioTemplate, FormularioCampoTemplate, FormularioDestino, FormularioCampoTipo,
} from '@/domain/types'

// ─── Config de destinos ───────────────────────────────────────────────────────

const DESTINOS_ESTRUTURADOS: Exclude<FormularioDestino, 'generico'>[] = [
  'socio_novo',
  'socio_saida',
  'cliente_pj',
  'cliente_pf',
  'processo_alteracao',
]

const DESTINO_LABEL: Record<FormularioDestino, string> = {
  socio_novo:         'Inclusão de sócio',
  socio_saida:        'Saída de sócio',
  cliente_pj:         'Atualização da empresa (PJ)',
  cliente_pf:         'Dados de pessoa física',
  processo_alteracao: 'Alteração cadastral (RF)',
  generico:           'Formulário Livre',
}

const DESTINO_DESC: Record<FormularioDestino, string> = {
  socio_novo:         'Coleta dados para incluir um novo sócio no cadastro',
  socio_saida:        'Confirma os dados para registrar a saída de um sócio',
  cliente_pj:         'Atualiza endereço, contato e dados da empresa no cadastro',
  cliente_pf:         'Cria ou atualiza os dados de uma pessoa física',
  processo_alteracao: 'Coleta informações para protocolar alteração na Receita Federal',
  generico:           'Campos personalizados de uso livre — pesquisas, inscrições, campanhas, feedbacks e muito mais (não integra ao cadastro)',
}

const TIPO_CAMPO_LABEL: Record<FormularioCampoTipo, string> = {
  texto:        'Texto',
  texto_longo:  'Texto longo',
  numero:       'Número',
  moeda:        'Valor (R$)',
  data:         'Data',
  percentual:   'Percentual (%)',
  cpf:          'CPF',
  cnpj:         'CNPJ',
  cep:          'CEP',
  telefone:     'Telefone',
  email:        'E-mail',
  select:       'Seleção',
  checkbox:     'Checkbox',
  slider:       'Deslizante (escala)',
}

// ─── Editor de campos estruturados ───────────────────────────────────────────

function EditorEstruturado({
  destino,
  campos,
  onChange,
}: {
  destino: Exclude<FormularioDestino, 'generico'>
  campos: FormularioCampoTemplate[]
  onChange: (campos: FormularioCampoTemplate[]) => void
}) {
  const schema = SCHEMA_POR_DESTINO[destino]
  const ativosIds = new Set(campos.map(c => c.id))

  function toggleAtivo(campo: CampoSchema) {
    if (ativosIds.has(campo.id)) {
      onChange(campos.filter(c => c.id !== campo.id))
    } else {
      const { habilitadoPorPadrao: _, dica: __, ...base } = campo
      onChange([...campos, base].sort((a, b) => a.ordem - b.ordem))
    }
  }

  function toggleObrigatorio(campoId: string) {
    onChange(campos.map(c => c.id === campoId ? { ...c, obrigatorio: !c.obrigatorio } : c))
  }

  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground">
        Selecione quais campos serão exibidos ao cliente. Os campos marcados como obrigatórios impedirão o envio se não forem preenchidos.
      </p>
      <div className="border rounded-lg divide-y overflow-hidden">
        {schema.map(campo => {
          const ativo = ativosIds.has(campo.id)
          const campoAtivo = campos.find(c => c.id === campo.id)
          return (
            <div
              key={campo.id}
              className={`flex items-center gap-3 px-3 py-2.5 transition-colors ${ativo ? 'bg-background' : 'bg-muted/30 opacity-60'}`}
            >
              <button
                type="button"
                onClick={() => toggleAtivo(campo)}
                className="shrink-0 text-primary"
                title={ativo ? 'Desativar campo' : 'Ativar campo'}
              >
                {ativo
                  ? <CheckSquare className="h-4 w-4" />
                  : <Square className="h-4 w-4 text-muted-foreground" />
                }
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{campo.rotulo}</p>
                <p className="text-xs text-muted-foreground">{TIPO_CAMPO_LABEL[campo.tipo]}</p>
              </div>
              {ativo && (
                <label className="flex items-center gap-1.5 text-xs cursor-pointer shrink-0">
                  <Checkbox
                    checked={campoAtivo?.obrigatorio ?? false}
                    onCheckedChange={() => toggleObrigatorio(campo.id)}
                    className="h-3.5 w-3.5"
                  />
                  Obrigatório
                </label>
              )}
              {!ativo && (
                <span className="text-xs text-muted-foreground shrink-0">desativado</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Editor de campos livres (generico) ──────────────────────────────────────

function EditorGenerico({
  campos,
  onChange,
}: {
  campos: FormularioCampoTemplate[]
  onChange: (campos: FormularioCampoTemplate[]) => void
}) {
  function adicionar() {
    onChange([...campos, { id: uuid(), rotulo: '', tipo: 'texto', obrigatorio: false, ordem: campos.length + 1 }])
  }
  function remover(id: string) {
    onChange(campos.filter(c => c.id !== id).map((c, i) => ({ ...c, ordem: i + 1 })))
  }
  function patch(id: string, data: Partial<FormularioCampoTemplate>) {
    onChange(campos.map(c => c.id === id ? { ...c, ...data } : c))
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Campos personalizados de uso livre. Esses dados <strong>não são integrados automaticamente</strong> ao cadastro.
        </p>
        <Button size="sm" variant="outline" type="button" onClick={adicionar} className="shrink-0">
          <Plus className="w-3.5 h-3.5 mr-1" />Campo
        </Button>
      </div>
      {campos.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6 border rounded-lg border-dashed">
          Nenhum campo. Clique em "+ Campo" para adicionar.
        </p>
      ) : (
        <div className="space-y-2">
          {campos.map((campo, i) => (
            <div key={campo.id} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-5 text-right shrink-0">{i + 1}.</span>
                <Input
                  value={campo.rotulo}
                  onChange={e => patch(campo.id, { rotulo: e.target.value })}
                  placeholder="Rótulo do campo"
                  className="flex-1 text-sm h-8"
                />
                <Select
                  value={campo.tipo}
                  onValueChange={v => patch(campo.id, { tipo: v as FormularioCampoTipo })}
                >
                  <SelectTrigger className="w-32 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(TIPO_CAMPO_LABEL) as FormularioCampoTipo[]).map(t => (
                      <SelectItem key={t} value={t} className="text-xs">{TIPO_CAMPO_LABEL[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <label className="flex items-center gap-1 text-xs cursor-pointer shrink-0">
                  <Checkbox
                    checked={campo.obrigatorio}
                    onCheckedChange={v => patch(campo.id, { obrigatorio: Boolean(v) })}
                    className="h-3.5 w-3.5"
                  />
                  Obrig.
                </label>
                <button type="button" onClick={() => remover(campo.id)} className="text-muted-foreground hover:text-destructive shrink-0">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              {campo.tipo === 'select' && (
                <div className="pl-7 space-y-1">
                  <p className="text-xs text-muted-foreground">Digite cada opção em uma linha e pressione Enter para a próxima:</p>
                  <Textarea
                    value={(campo.opcoes ?? []).join('\n')}
                    onChange={e => patch(campo.id, { opcoes: e.target.value.split('\n') })}
                    onBlur={e => patch(campo.id, { opcoes: e.target.value.split('\n').filter(o => o.trim()) })}
                    rows={4}
                    placeholder={"Opção A\nOpção B\nOpção C"}
                    className="text-xs font-mono"
                  />
                </div>
              )}
              {campo.tipo === 'slider' && (
                <div className="pl-7 flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs text-muted-foreground whitespace-nowrap">Mín:</label>
                    <Input
                      type="number"
                      value={campo.slider_min ?? 0}
                      onChange={e => patch(campo.id, { slider_min: Number(e.target.value) })}
                      className="h-7 w-16 text-xs text-center"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs text-muted-foreground whitespace-nowrap">Máx:</label>
                    <Input
                      type="number"
                      value={campo.slider_max ?? 10}
                      onChange={e => patch(campo.id, { slider_max: Number(e.target.value) })}
                      className="h-7 w-16 text-xs text-center"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Escala de {campo.slider_min ?? 0} a {campo.slider_max ?? 10}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Formulário de criação/edição ─────────────────────────────────────────────

interface TemplateForm {
  nome: string
  descricao: string
  destino: FormularioDestino
  campos: FormularioCampoTemplate[]
  ativo: boolean
}

function defaultForm(): TemplateForm {
  return { nome: '', descricao: '', destino: 'socio_novo', campos: getCamposPadrao('socio_novo'), ativo: true }
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function FormulariosTemplates() {
  const { currentUser } = useAuth()
  const tenantId = currentUser?.tenant_id ?? ''

  const { data: templates = [] } = useFormulariosTemplate(tenantId)
  const create = useCreateFormularioTemplate()
  const update = useUpdateFormularioTemplate()
  const del    = useDeleteFormularioTemplate()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<FormularioTemplate | null>(null)
  const [form, setForm] = useState<TemplateForm>(defaultForm())

  function abrirCriar() {
    setEditTarget(null)
    setForm(defaultForm())
    setDialogOpen(true)
  }

  function abrirEditar(t: FormularioTemplate) {
    setEditTarget(t)
    setForm({ nome: t.nome, descricao: t.descricao ?? '', destino: t.destino, campos: t.campos, ativo: t.ativo })
    setDialogOpen(true)
  }

  function handleDestinoChange(novo: FormularioDestino) {
    // Ao trocar o destino, recarrega os campos padrão
    const campos = isDestinoEstruturado(novo) ? getCamposPadrao(novo) : []
    setForm(f => ({ ...f, destino: novo, campos }))
  }

  async function salvar() {
    if (!form.nome.trim()) return
    const payload = { ...form, descricao: form.descricao || undefined }
    if (editTarget) {
      await update.mutateAsync({ id: editTarget.id, data: payload })
    } else {
      await create.mutateAsync({ ...payload, tenant_id: tenantId })
    }
    setDialogOpen(false)
  }

  async function excluir(t: FormularioTemplate) {
    if (!confirm(`Excluir template "${t.nome}"?`)) return
    await del.mutateAsync(t.id)
  }

  const estruturados = templates.filter(t => t.destino !== 'generico')
  const genericos    = templates.filter(t => t.destino === 'generico')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Formulários para Clientes</h3>
          <p className="text-sm text-muted-foreground">
            Templates vinculados a tarefas para coletar dados do cliente durante um processo.
          </p>
        </div>
        <Button size="sm" onClick={abrirCriar}>
          <Plus className="w-4 h-4 mr-1.5" /> Novo Template
        </Button>
      </div>

      {templates.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Nenhum template criado"
          description="Crie templates de coleta estruturada para seus processos (inclusão de sócio, alteração cadastral, etc.)."
          action={<Button onClick={abrirCriar}>Criar template</Button>}
        />
      ) : (
        <div className="space-y-3">
          {estruturados.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
                <ClipboardList className="h-3.5 w-3.5" />
                Coleta estruturada — integra ao cadastro
              </div>
              {estruturados.map(t => (
                <div key={t.id} className="border rounded-lg px-4 py-3 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{t.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {DESTINO_LABEL[t.destino]} · {t.campos.length} campo(s) ativos
                    </p>
                  </div>
                  {!t.ativo && <Badge variant="outline" className="text-xs text-muted-foreground shrink-0">Inativo</Badge>}
                  <div className="flex gap-1 shrink-0">
                    <Button variant="outline" size="sm" onClick={() => abrirEditar(t)}>
                      <Pencil className="w-3.5 h-3.5 mr-1" /> Editar
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => excluir(t)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {genericos.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
                <FlaskConical className="h-3.5 w-3.5" />
                Formulário Livre — campos personalizados
              </div>
              {genericos.map(t => (
                <div key={t.id} className="border rounded-lg px-4 py-3 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{t.nome}</p>
                    <p className="text-xs text-muted-foreground">{t.campos.length} campo(s)</p>
                  </div>
                  {!t.ativo && <Badge variant="outline" className="text-xs text-muted-foreground shrink-0">Inativo</Badge>}
                  <div className="flex gap-1 shrink-0">
                    <Button variant="outline" size="sm" onClick={() => abrirEditar(t)}>
                      <Pencil className="w-3.5 h-3.5 mr-1" /> Editar
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => excluir(t)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Dialog de criação/edição */}
      <Dialog open={dialogOpen} onOpenChange={v => !v && setDialogOpen(false)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Editar Template' : 'Novo Template'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {/* Nome */}
            <div className="space-y-1">
              <Label>Nome do template *</Label>
              <Input
                value={form.nome}
                onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                placeholder="Ex: Inclusão de Sócio"
                autoFocus
              />
            </div>

            {/* Descrição */}
            <div className="space-y-1">
              <Label>Descrição <span className="text-muted-foreground font-normal">(exibida ao cliente)</span></Label>
              <Input
                value={form.descricao}
                onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                placeholder="Breve explicação do que está sendo solicitado"
              />
            </div>

            {/* Destino */}
            <div className="space-y-1">
              <Label>Tipo de formulário</Label>
              <Select value={form.destino} onValueChange={v => handleDestinoChange(v as FormularioDestino)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <div className="px-2 py-1 text-xs text-muted-foreground font-semibold uppercase tracking-wide">
                    Coleta estruturada
                  </div>
                  {DESTINOS_ESTRUTURADOS.map(d => (
                    <SelectItem key={d} value={d}>{DESTINO_LABEL[d]}</SelectItem>
                  ))}
                  <Separator className="my-1" />
                  <div className="px-2 py-1 text-xs text-muted-foreground font-semibold uppercase tracking-wide">
                    Livre
                  </div>
                  <SelectItem value="generico">{DESTINO_LABEL['generico']}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{DESTINO_DESC[form.destino]}</p>
            </div>

            <Separator />

            {/* Editor de campos */}
            <div className="space-y-2">
              <Label>
                {isDestinoEstruturado(form.destino) ? 'Campos do formulário' : 'Campos do formulário livre'}
              </Label>
              {isDestinoEstruturado(form.destino) ? (
                <EditorEstruturado
                  destino={form.destino}
                  campos={form.campos}
                  onChange={campos => setForm(f => ({ ...f, campos }))}
                />
              ) : (
                <EditorGenerico
                  campos={form.campos}
                  onChange={campos => setForm(f => ({ ...f, campos }))}
                />
              )}
            </div>

            {/* Ativo */}
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={form.ativo}
                onCheckedChange={v => setForm(f => ({ ...f, ativo: Boolean(v) }))}
              />
              Template ativo (disponível para uso em tarefas)
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={salvar}
              disabled={!form.nome.trim() || form.campos.length === 0 || create.isPending || update.isPending}
            >
              {editTarget ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
