import { useState, useEffect } from 'react'
import { v4 as uuid } from 'uuid'
import { Plus, Pencil, Trash2, Building2, FileText, Users, Calculator, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { useUsers } from '@/data/hooks/useUsers'
import {
  useEtapasDemandaTemplate,
  useUpdateDemandaTemplate,
  useCreateEtapaDemandaTemplate,
  useUpdateEtapaDemandaTemplate,
  useDeleteEtapaDemandaTemplate,
} from '@/data/hooks/useDemandaTemplates'
import type { CategoriaDemanda, DemandaTemplate } from '@/domain/types'

const categoriaConfig: Record<CategoriaDemanda, { label: string; icon: React.ElementType; color: string }> = {
  societario: { label: 'Societário',   icon: Building2,  color: 'text-purple-600' },
  fiscal:     { label: 'Fiscal',       icon: Calculator, color: 'text-blue-600' },
  dp:         { label: 'Dep. Pessoal', icon: Users,      color: 'text-green-600' },
  contabil:   { label: 'Contábil',     icon: FileText,   color: 'text-orange-600' },
  outros:     { label: 'Outros',       icon: FileText,   color: 'text-gray-600' },
}

export interface EtapaLocal {
  _localId: string
  id?: string
  nome: string
  descricao: string
  prazo_relativo_dias: number
  responsavel_padrao: string
  ordem: number
}

// ─── Dialog de detalhe/criação de uma etapa de template ─────────────────────

interface EtapaTemplateDialogProps {
  etapa: EtapaLocal | null  // null = criar nova
  ordem: number
  colaboradores: { id: string; nome: string }[]
  onClose: () => void
  onSalvar: (data: Partial<EtapaLocal> & { nome: string; prazo_relativo_dias: number }) => void
}

export function EtapaTemplateDialog({ etapa, ordem, colaboradores, onClose, onSalvar }: EtapaTemplateDialogProps) {
  const { toast } = useToast()
  const [nome, setNome]         = useState(etapa?.nome ?? '')
  const [descricao, setDescricao] = useState(etapa?.descricao ?? '')
  const [prazoDias, setPrazoDias] = useState(etapa?.prazo_relativo_dias ?? 0)
  const [respPadrao, setRespPadrao] = useState(etapa?.responsavel_padrao ?? '')

  const isCriacao = !etapa

  function handleSalvar() {
    if (!nome.trim()) return toast({ title: 'Informe o nome da etapa', variant: 'destructive' })
    onSalvar({
      _localId: etapa?._localId,
      id: etapa?.id,
      nome: nome.trim(),
      descricao,
      prazo_relativo_dias: prazoDias,
      responsavel_padrao: respPadrao,
    })
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isCriacao ? 'Nova Etapa' : `Etapa ${ordem} — ${etapa.nome || 'sem nome'}`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome *</Label>
            <Input
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Ex: Reunião com cliente"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleSalvar()}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Tempo (dias)</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={prazoDias}
                onChange={e => setPrazoDias(parseInt(e.target.value) || 0)}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">dias em relação ao prazo final</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Negativo = antes do vencimento · 0 = no vencimento · Positivo = depois
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Responsável padrão</Label>
            <Select value={respPadrao} onValueChange={setRespPadrao}>
              <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Nenhum</SelectItem>
                {colaboradores.map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Instruções / informativo</Label>
            <Textarea
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              placeholder="Orientações para executar esta etapa..."
              rows={5}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSalvar}>
            {isCriacao ? 'Adicionar' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Dialog principal de detalhe/edição do template ─────────────────────────

interface Props {
  template: DemandaTemplate | null
  open: boolean
  onOpenChange: (v: boolean) => void
  tenantId: string
}

export function TemplateDetalheDialog({ template, open, onOpenChange, tenantId }: Props) {
  const { toast } = useToast()
  const { data: users = [] } = useUsers(tenantId)
  const { data: etapasDB = [] } = useEtapasDemandaTemplate(tenantId, template?.id ?? '')

  const colaboradores = users
    .filter(u => u.papel !== 'cliente' && u.ativo)
    .map(u => ({ id: u.id, nome: u.nome }))

  // Aba: Configuração
  const [nome, setNome]               = useState('')
  const [descricao, setDescricao]     = useState('')
  const [categoria, setCategoria]     = useState<CategoriaDemanda>('outros')
  const [prazoDias, setPrazoDias]     = useState(15)
  const [valorSugerido, setValorSugerido] = useState('')
  const [etapas, setEtapas]           = useState<EtapaLocal[]>([])

  // Aba: Instruções
  const [instrucoes, setInstrucoes] = useState('')

  // Dialog de etapa
  const [etapaDialog, setEtapaDialog] = useState<EtapaLocal | null | 'nova'>(null)

  const updateTemplate = useUpdateDemandaTemplate()
  const createEtapa    = useCreateEtapaDemandaTemplate()
  const updateEtapa    = useUpdateEtapaDemandaTemplate()
  const deleteEtapa    = useDeleteEtapaDemandaTemplate()

  const isPending = updateTemplate.isPending || createEtapa.isPending || updateEtapa.isPending

  useEffect(() => {
    if (template && open) {
      setNome(template.nome)
      setDescricao(template.descricao ?? '')
      setCategoria(template.categoria)
      setPrazoDias(template.prazo_dias_padrao)
      setValorSugerido(template.valor_sugerido ? String(template.valor_sugerido) : '')
      setInstrucoes(template.instrucoes ?? '')
    }
  }, [template, open])

  useEffect(() => {
    if (open) {
      setEtapas(
        etapasDB.map(e => ({
          _localId: e.id,
          id: e.id,
          nome: e.nome,
          descricao: e.descricao ?? '',
          prazo_relativo_dias: e.prazo_relativo_dias,
          responsavel_padrao: e.responsavel_padrao ?? '',
          ordem: e.ordem,
        }))
      )
    }
  }, [etapasDB, open])

  function handleEtapaDialogSalvar(data: Partial<EtapaLocal> & { nome: string; prazo_relativo_dias: number }) {
    if (etapaDialog === 'nova') {
      setEtapas(prev => [
        ...prev,
        {
          _localId: uuid(),
          nome: data.nome,
          descricao: data.descricao ?? '',
          prazo_relativo_dias: data.prazo_relativo_dias,
          responsavel_padrao: data.responsavel_padrao ?? '',
          ordem: prev.length + 1,
        },
      ])
    } else if (etapaDialog && data._localId) {
      setEtapas(prev => prev.map(e =>
        e._localId === data._localId
          ? { ...e, nome: data.nome, descricao: data.descricao ?? '', prazo_relativo_dias: data.prazo_relativo_dias, responsavel_padrao: data.responsavel_padrao ?? '' }
          : e
      ))
    }
    setEtapaDialog(null)
  }

  function removeEtapa(localId: string) {
    const etapa = etapas.find(e => e._localId === localId)
    if (etapa?.id) deleteEtapa.mutate(etapa.id)
    setEtapas(prev => prev.filter(e => e._localId !== localId))
  }

  async function handleSalvar() {
    if (!template) return
    if (!nome.trim()) return toast({ title: 'Informe o nome do template', variant: 'destructive' })
    if (etapas.some(e => !e.nome.trim())) return toast({ title: 'Há etapas sem nome', variant: 'destructive' })

    try {
      await updateTemplate.mutateAsync({
        id: template.id,
        data: {
          nome: nome.trim(),
          descricao: descricao.trim() || undefined,
          instrucoes: instrucoes.trim() || undefined,
          categoria,
          prazo_dias_padrao: prazoDias,
          valor_sugerido: valorSugerido ? parseFloat(valorSugerido) : undefined,
        },
      })

      for (let i = 0; i < etapas.length; i++) {
        const e = etapas[i]
        const payload = {
          tenant_id: tenantId,
          template_id: template.id,
          ordem: i + 1,
          nome: e.nome.trim(),
          descricao: e.descricao.trim() || undefined,
          prazo_relativo_dias: e.prazo_relativo_dias,
          responsavel_padrao: e.responsavel_padrao || undefined,
        }
        if (e.id) {
          await updateEtapa.mutateAsync({ id: e.id, data: payload })
        } else {
          await createEtapa.mutateAsync(payload)
        }
      }

      toast({ title: 'Template salvo com sucesso' })
      onOpenChange(false)
    } catch {
      toast({ title: 'Erro ao salvar template', variant: 'destructive' })
    }
  }

  if (!template) return null

  const etapaEmEdicao = etapaDialog !== 'nova' ? etapaDialog : null
  const etapaDialogOrdem = etapaDialog === 'nova'
    ? etapas.length + 1
    : etapas.findIndex(e => e._localId === (etapaDialog as EtapaLocal)?._localId) + 1

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Template — {template.nome}</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="configuracao" className="flex-1 flex flex-col min-h-0">
            <TabsList className="shrink-0">
              <TabsTrigger value="configuracao">Configuração</TabsTrigger>
              <TabsTrigger value="instrucoes">Instruções</TabsTrigger>
            </TabsList>

            {/* ── Aba Configuração ─────────────────────── */}
            <TabsContent value="configuracao" className="flex-1 overflow-y-auto mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Nome *</Label>
                  <Input value={nome} onChange={e => setNome(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Categoria</Label>
                  <Select value={categoria} onValueChange={v => setCategoria(v as CategoriaDemanda)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(categoriaConfig).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Prazo padrão (dias)</Label>
                  <Input
                    type="number"
                    value={prazoDias}
                    onChange={e => setPrazoDias(parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Valor sugerido (opcional)</Label>
                  <Input
                    type="number"
                    value={valorSugerido}
                    onChange={e => setValorSugerido(e.target.value)}
                    placeholder="R$ 0,00"
                    step="0.01"
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Descrição</Label>
                  <Textarea
                    value={descricao}
                    onChange={e => setDescricao(e.target.value)}
                    rows={2}
                    placeholder="Opcional..."
                  />
                </div>
              </div>

              <Separator />

              {/* Etapas */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Etapas</Label>
                  <Button size="sm" variant="outline" onClick={() => setEtapaDialog('nova')}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar etapa
                  </Button>
                </div>

                {etapas.length === 0 && (
                  <button
                    onClick={() => setEtapaDialog('nova')}
                    className="w-full py-6 border border-dashed rounded-lg text-sm text-muted-foreground hover:bg-accent/30 transition-colors"
                  >
                    Nenhuma etapa. Clique para adicionar.
                  </button>
                )}

                {etapas.map((e, i) => {
                  const respNome = colaboradores.find(u => u.id === e.responsavel_padrao)?.nome
                  return (
                    <div
                      key={e._localId}
                      className="flex items-center gap-3 border rounded-lg px-3 py-2.5 hover:bg-accent/20 transition-colors group"
                    >
                      <span className="text-xs text-muted-foreground w-4 shrink-0">{i + 1}</span>
                      <button
                        className="flex-1 text-left min-w-0"
                        onClick={() => setEtapaDialog(e)}
                      >
                        <p className="text-sm font-medium truncate">{e.nome || <span className="text-muted-foreground italic">sem nome</span>}</p>
                        <p className="text-xs text-muted-foreground">
                          {e.prazo_relativo_dias === 0
                            ? 'No vencimento'
                            : e.prazo_relativo_dias < 0
                              ? `${Math.abs(e.prazo_relativo_dias)}d antes`
                              : `${e.prazo_relativo_dias}d depois`}
                          {respNome && ` · ${respNome}`}
                          {e.descricao && (
                            <span className="ml-1 inline-flex items-center gap-0.5 text-muted-foreground/60">
                              · <BookOpen className="h-2.5 w-2.5" /> instrucoes
                            </span>
                          )}
                        </p>
                      </button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => setEtapaDialog(e)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <button
                        onClick={() => removeEtapa(e._localId)}
                        className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                        disabled={deleteEtapa.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )
                })}

                <p className="text-xs text-muted-foreground">
                  Tempo (dias) é relativo ao prazo final (negativo = antes, 0 = no vencimento, positivo = depois).
                </p>
              </div>
            </TabsContent>

            {/* ── Aba Instruções ───────────────────────── */}
            <TabsContent value="instrucoes" className="flex-1 overflow-y-auto mt-4 space-y-3">
              <div className="space-y-1">
                <Label>Página de instruções</Label>
                <p className="text-xs text-muted-foreground">
                  Conteúdo exibido ao executar esta demanda — pode ser um tutorial, checklist de documentos,
                  orientações ao colaborador etc. Em breve: editor rico, formulários e anexos.
                </p>
              </div>
              <Textarea
                value={instrucoes}
                onChange={e => setInstrucoes(e.target.value)}
                placeholder="Descreva o passo a passo, documentos necessários, observações importantes..."
                rows={16}
                className="resize-none font-mono text-sm"
              />
            </TabsContent>
          </Tabs>

          <DialogFooter className="shrink-0 pt-2 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSalvar} disabled={isPending}>
              {isPending ? 'Salvando...' : 'Salvar Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de detalhe/edição de etapa do template */}
      {etapaDialog !== null && (
        <EtapaTemplateDialog
          etapa={etapaEmEdicao}
          ordem={etapaDialogOrdem}
          colaboradores={colaboradores}
          onClose={() => setEtapaDialog(null)}
          onSalvar={handleEtapaDialogSalvar}
        />
      )}
    </>
  )
}
