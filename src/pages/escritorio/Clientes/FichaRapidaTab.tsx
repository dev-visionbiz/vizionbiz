import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Check, Copy, Pencil, Plus, Trash2 } from 'lucide-react'
import { useAuth } from '@/auth/AuthProvider'
import { useRegistrarLogAtividade } from '@/data/hooks/useLogAtividadeCliente'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { EmptyState } from '@/components/shared/EmptyState'
import type { FichaBloco, FichaCampo, FichaCampoTipo } from '@/domain/types'
import { FICHA_CAMPO_TIPOS_DUPLOS } from '@/domain/types'
import {
  useFichaBlocos,
  useCreateFichaBloco,
  useUpdateFichaBloco,
  useDeleteFichaBloco,
  useFichaCampos,
  useCreateFichaCampo,
  useUpdateFichaCampo,
  useDeleteFichaCampo,
} from '@/data/hooks/useFichaRapida'
import { copyToClipboard, digitsOnly, formatFichaCampoValor } from '@/lib/utils'

const TIPO_LABELS: Record<FichaCampoTipo, string> = {
  texto: 'Texto livre',
  cnpj: 'CNPJ',
  cpf: 'CPF',
  telefone: 'Telefone',
  email: 'E-mail',
  cep: 'CEP',
  pis: 'PIS/PASEP',
  titulo_eleitor: 'Título de Eleitor',
  senha: 'Senha / Código de acesso',
  url: 'URL / Link',
}

// ---- CopyButton ----

interface CopyButtonProps {
  value: string
  label: string
}

function CopyButton({ value, label }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const ok = await copyToClipboard(value)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCopy}
      className="h-6 px-2 text-xs gap-1 shrink-0"
    >
      {copied ? (
        <>
          <Check className="h-3 w-3 text-green-600" />
          Copiado
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" />
          {label}
        </>
      )}
    </Button>
  )
}

// ---- CampoRow ----

interface CampoRowProps {
  campo: FichaCampo
  onEdit: (campo: FichaCampo) => void
  onDelete: (campo: FichaCampo) => void
}

function CampoRow({ campo, onEdit, onDelete }: CampoRowProps) {
  const formatted = formatFichaCampoValor(campo.valor, campo.tipo)
  const isDuplo = FICHA_CAMPO_TIPOS_DUPLOS.includes(campo.tipo)

  return (
    <div className="flex items-center gap-2 py-1.5 text-sm min-w-0 group">
      <span className="text-muted-foreground w-40 shrink-0 truncate text-xs">{campo.rotulo}</span>
      {campo.sensivel ? (
        <span className="font-mono tracking-widest text-muted-foreground flex-1 text-xs">
          ••••••••
        </span>
      ) : (
        <span className="font-mono flex-1 min-w-0 truncate text-xs">{formatted}</span>
      )}
      <div className="flex items-center gap-1 shrink-0">
        {campo.sensivel ? (
          <CopyButton value={campo.valor} label="Copiar" />
        ) : isDuplo ? (
          <>
            <CopyButton value={formatted} label="Formatado" />
            <CopyButton value={digitsOnly(campo.valor)} label="Só dígitos" />
          </>
        ) : (
          <CopyButton value={campo.valor} label="Copiar" />
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => onEdit(campo)}
        >
          <Pencil className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
          onClick={() => onDelete(campo)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}

// ---- CampoDialog ----

interface CampoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: FichaCampo
  onSave: (data: { rotulo: string; tipo: FichaCampoTipo; valor: string; sensivel: boolean }) => void
}

function CampoDialog({ open, onOpenChange, initial, onSave }: CampoDialogProps) {
  const [rotulo, setRotulo] = useState(initial?.rotulo ?? '')
  const [tipo, setTipo] = useState<FichaCampoTipo>(initial?.tipo ?? 'texto')
  const [valor, setValor] = useState(initial?.valor ?? '')
  const [sensivel, setSensivel] = useState(initial?.sensivel ?? false)

  const handleSave = () => {
    if (!rotulo.trim()) return
    onSave({ rotulo: rotulo.trim(), tipo, valor, sensivel })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? 'Editar Campo' : 'Adicionar Campo'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Rótulo</Label>
            <Input
              value={rotulo}
              onChange={(e) => setRotulo(e.target.value)}
              placeholder="Ex: CNPJ, Senha de acesso..."
            />
          </div>
          <div className="space-y-1">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as FichaCampoTipo)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(TIPO_LABELS) as [FichaCampoTipo, string][]).map(([val, lbl]) => (
                  <SelectItem key={val} value={val}>
                    {lbl}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Valor</Label>
            <Input
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              type={sensivel ? 'password' : 'text'}
              placeholder={
                tipo === 'cnpj' || tipo === 'cpf'
                  ? 'Somente dígitos'
                  : tipo === 'cep'
                  ? 'Ex: 01310100'
                  : ''
              }
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch id="sensivel" checked={sensivel} onCheckedChange={setSensivel} />
            <Label htmlFor="sensivel">Campo sensível (senha / código de acesso)</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!rotulo.trim()}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---- BlocoCard ----

interface BlocoCardProps {
  bloco: FichaBloco
  tenantId: string
}

function BlocoCard({ bloco, tenantId }: BlocoCardProps) {
  const { data: campos = [] } = useFichaCampos(tenantId, bloco.id)
  const { currentUser } = useAuth()
  const registrarLog = useRegistrarLogAtividade()
  const updateBloco = useUpdateFichaBloco()
  const deleteBloco = useDeleteFichaBloco()
  const createCampo = useCreateFichaCampo()
  const updateCampo = useUpdateFichaCampo()
  const deleteCampo = useDeleteFichaCampo()

  const logFicha = (descricao: string) => registrarLog.mutate({
    tenantId,
    clientId: bloco.client_id,
    acao: 'ficha_rapida_alterada',
    descricao,
    usuarioId: currentUser?.id ?? 'desconhecido',
    usuarioNome: currentUser?.nome ?? 'Sistema',
  })

  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(bloco.titulo)
  const [campoDialog, setCampoDialog] = useState(false)
  const [editingCampo, setEditingCampo] = useState<FichaCampo | null>(null)

  const saveTitle = () => {
    if (titleDraft.trim() && titleDraft.trim() !== bloco.titulo) {
      updateBloco.mutate({ id: bloco.id, data: { titulo: titleDraft.trim() } })
      logFicha(`Bloco renomeado: "${bloco.titulo}" → "${titleDraft.trim()}"`)
    }
    setEditingTitle(false)
  }

  const handleDeleteBloco = () => {
    if (!window.confirm(`Excluir bloco "${bloco.titulo}" e todos os seus campos?`)) return
    deleteBloco.mutate({ id: bloco.id, tenantId, clientId: bloco.client_id })
    logFicha(`Bloco excluído: "${bloco.titulo}"`)
  }

  const openEditCampo = (campo: FichaCampo) => {
    setEditingCampo(campo)
    setCampoDialog(true)
  }

  const openNewCampo = () => {
    setEditingCampo(null)
    setCampoDialog(true)
  }

  const handleDeleteCampo = (campo: FichaCampo) => {
    if (!window.confirm(`Excluir campo "${campo.rotulo}"?`)) return
    deleteCampo.mutate({ id: campo.id, tenantId, blocoId: bloco.id })
    logFicha(`Campo excluído: "${campo.rotulo}" (bloco "${bloco.titulo}")`)
  }

  const handleSaveCampo = (data: {
    rotulo: string
    tipo: FichaCampoTipo
    valor: string
    sensivel: boolean
  }) => {
    if (editingCampo) {
      updateCampo.mutate({
        id: editingCampo.id,
        data: { rotulo: data.rotulo, tipo: data.tipo, valor: data.valor, sensivel: data.sensivel },
      })
      logFicha(`Campo editado: "${data.rotulo}" (bloco "${bloco.titulo}")`)
    } else {
      const novoCampo: FichaCampo = {
        id: uuidv4(),
        tenant_id: tenantId,
        bloco_id: bloco.id,
        rotulo: data.rotulo,
        tipo: data.tipo,
        valor: data.valor,
        sensivel: data.sensivel,
        ordem: campos.length,
      }
      createCampo.mutate(novoCampo)
      logFicha(`Campo adicionado: "${data.rotulo}" (bloco "${bloco.titulo}")`)
    }
  }

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <div className="flex items-center gap-2">
          {editingTitle ? (
            <div className="flex items-center gap-2 flex-1">
              <Input
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                className="h-7 text-sm font-semibold"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveTitle()
                  if (e.key === 'Escape') {
                    setTitleDraft(bloco.titulo)
                    setEditingTitle(false)
                  }
                }}
                autoFocus
              />
              <Button size="sm" className="h-7 px-3" onClick={saveTitle}>
                Salvar
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-3"
                onClick={() => {
                  setTitleDraft(bloco.titulo)
                  setEditingTitle(false)
                }}
              >
                Cancelar
              </Button>
            </div>
          ) : (
            <>
              <CardTitle className="text-sm flex-1">{bloco.titulo}</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => {
                  setTitleDraft(bloco.titulo)
                  setEditingTitle(true)
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                onClick={handleDeleteBloco}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-0">
        {campos.length > 0 && (
          <div className="space-y-0">
            {campos.map((campo, i) => (
              <div key={campo.id}>
                {i > 0 && <Separator className="my-0.5" />}
                <CampoRow campo={campo} onEdit={openEditCampo} onDelete={handleDeleteCampo} />
              </div>
            ))}
            <Separator className="my-2" />
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
          onClick={openNewCampo}
        >
          <Plus className="h-3.5 w-3.5" />
          Adicionar Campo
        </Button>
      </CardContent>

      {/* key forces remount so dialog state resets when switching between add/edit */}
      <CampoDialog
        key={editingCampo?.id ?? 'new'}
        open={campoDialog}
        onOpenChange={setCampoDialog}
        initial={editingCampo ?? undefined}
        onSave={handleSaveCampo}
      />
    </Card>
  )
}

// ---- FichaRapidaTab ----

interface FichaRapidaTabProps {
  tenantId: string
  clientId: string
}

export function FichaRapidaTab({ tenantId, clientId }: FichaRapidaTabProps) {
  const { data: blocos = [], isLoading } = useFichaBlocos(tenantId, clientId)
  const { currentUser } = useAuth()
  const createBloco = useCreateFichaBloco()
  const registrarLog = useRegistrarLogAtividade()

  const addBloco = () => {
    const novoBloco: FichaBloco = {
      id: uuidv4(),
      tenant_id: tenantId,
      client_id: clientId,
      titulo: 'Novo Bloco',
      ordem: blocos.length,
    }
    createBloco.mutate(novoBloco)
    registrarLog.mutate({
      tenantId,
      clientId,
      acao: 'ficha_rapida_alterada',
      descricao: 'Novo bloco adicionado à ficha rápida',
      usuarioId: currentUser?.id ?? 'desconhecido',
      usuarioNome: currentUser?.nome ?? 'Sistema',
    })
  }

  if (isLoading) return null

  if (blocos.length === 0) {
    return (
      <div className="py-4">
        <EmptyState
          title="Nenhum bloco cadastrado"
          description="Adicione blocos para organizar senhas, códigos e dados de acesso deste cliente."
          action={
            <Button onClick={addBloco}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Bloco
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={addBloco} className="gap-1">
          <Plus className="h-4 w-4" />
          Novo Bloco
        </Button>
      </div>
      <div className="space-y-3">
        {blocos.map((bloco) => (
          <BlocoCard key={bloco.id} bloco={bloco} tenantId={tenantId} />
        ))}
      </div>
    </div>
  )
}
