import { useState } from 'react'
import { useAuth } from '@/auth/AuthProvider'
import {
  useDocumentTypes,
  useCreateDocumentType,
  useUpdateDocumentType,
  useDeleteDocumentType,
} from '@/data/hooks/useDocumentTypes'
import { useToast } from '@/components/ui/use-toast'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

import { Pencil, Trash2, Plus, FileText, Clock } from 'lucide-react'
import type { DocumentType } from '@/domain/types'
import { v4 as uuidv4 } from 'uuid'

export default function TiposDocumento() {
  const { currentUser } = useAuth()
  const tenantId = currentUser?.tenant_id ?? ''
  const { data: tipos, isLoading } = useDocumentTypes(tenantId)
  const createType = useCreateDocumentType()
  const updateType = useUpdateDocumentType()
  const deleteType = useDeleteDocumentType()
  const { toast } = useToast()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<DocumentType | null>(null)
  const [formNome, setFormNome] = useState('')
  const [formEssencial, setFormEssencial] = useState(false)
  const [formTemValidade, setFormTemValidade] = useState(false)

  const openCreate = () => {
    setEditTarget(null)
    setFormNome('')
    setFormEssencial(false)
    setFormTemValidade(false)
    setDialogOpen(true)
  }

  const openEdit = (dt: DocumentType) => {
    setEditTarget(dt)
    setFormNome(dt.nome)
    setFormEssencial(dt.essencial)
    setFormTemValidade(dt.tem_validade ?? false)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formNome.trim()) return
    try {
      if (editTarget) {
        await updateType.mutateAsync({ id: editTarget.id, data: { nome: formNome, essencial: formEssencial, tem_validade: formTemValidade } })
        toast({ title: 'Tipo atualizado' })
      } else {
        const novo: DocumentType = {
          id: uuidv4(),
          tenant_id: tenantId,
          nome: formNome.trim(),
          essencial: formEssencial,
          tem_validade: formTemValidade,
        }
        await createType.mutateAsync(novo)
        toast({ title: 'Tipo criado' })
      }
      setDialogOpen(false)
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível salvar.', variant: 'destructive' })
    }
  }

  const handleDelete = async (dt: DocumentType) => {
    if (!confirm(`Excluir tipo "${dt.nome}"?`)) return
    try {
      await deleteType.mutateAsync(dt.id)
      toast({ title: 'Tipo excluído' })
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível excluir.', variant: 'destructive' })
    }
  }

  const handleToggleEssencial = async (dt: DocumentType) => {
    try {
      await updateType.mutateAsync({ id: dt.id, data: { essencial: !dt.essencial } })
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível atualizar.', variant: 'destructive' })
    }
  }

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Tipos de Documento</h3>
          <p className="text-sm text-muted-foreground">
            Tipos marcados como essenciais são liberados mesmo com pendência financeira (modo parcial/total).
          </p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="mr-2 h-4 w-4" /> Novo Tipo
        </Button>
      </div>

      {!tipos?.length ? (
        <EmptyState
          icon={FileText}
          title="Nenhum tipo cadastrado"
          description="Crie tipos de documento para organizar os arquivos dos clientes."
          action={<Button onClick={openCreate}>Novo Tipo</Button>}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {tipos.map((dt) => (
            <div key={dt.id} className="rounded-lg border bg-card px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
              <p className="font-semibold text-sm flex-1 min-w-48">{dt.nome}</p>
              <button onClick={() => handleToggleEssencial(dt)}>
                <Badge variant={dt.essencial ? 'success' : 'secondary'} className="text-xs shrink-0">
                  {dt.essencial ? 'Essencial' : 'Não essencial'}
                </Badge>
              </button>
              {dt.tem_validade && (
                <Badge variant="outline" className="text-xs shrink-0 gap-1">
                  <Clock className="h-3 w-3" /> Tem validade
                </Badge>
              )}
              <div className="flex items-center gap-1 ml-auto shrink-0">
                <Button variant="outline" size="sm" onClick={() => openEdit(dt)}>
                  <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar
                </Button>
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(dt)}>
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Excluir
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Editar Tipo' : 'Novo Tipo de Documento'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="tipo-nome">Nome</Label>
              <Input
                id="tipo-nome"
                value={formNome}
                onChange={(e) => setFormNome(e.target.value)}
                placeholder="Ex: Balancete, Guia DARF, Folha..."
                autoFocus
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="tipo-essencial"
                type="checkbox"
                checked={formEssencial}
                onChange={(e) => setFormEssencial(e.target.checked)}
                className="h-4 w-4 rounded border"
              />
              <Label htmlFor="tipo-essencial">Essencial (liberado mesmo com pendência financeira)</Label>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="tipo-tem-validade"
                type="checkbox"
                checked={formTemValidade}
                onChange={(e) => setFormTemValidade(e.target.checked)}
                className="h-4 w-4 rounded border"
              />
              <Label htmlFor="tipo-tem-validade">Tem data de validade (ex: alvará, certidão, licença)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!formNome.trim()}>
              {editTarget ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
