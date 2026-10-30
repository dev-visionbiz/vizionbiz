import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Plus, Pencil, FileCheck2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/auth/AuthProvider'
import {
  useObrigacaoConfigsByCliente,
  useCreateObrigacaoConfig,
  useUpdateObrigacaoConfig,
} from '@/data/hooks/useObrigacoes'
import { useToast } from '@/components/ui/use-toast'
import type { ObrigacaoConfig, ObrigacaoTipo } from '@/domain/types'

const TIPO_LABELS: Record<ObrigacaoTipo, string> = {
  simples_nacional: 'Simples Nacional',
  dctfweb: 'DCTFWeb',
  defis: 'DEFIS',
}

interface FormState {
  tipo: ObrigacaoTipo
  data_inicio: string
  data_fim: string
  ativo: boolean
}

const EMPTY_FORM: FormState = {
  tipo: 'simples_nacional',
  data_inicio: '',
  data_fim: '',
  ativo: true,
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  clienteId: string
  tenantId: string
}

export function ObrigacoesClienteModal({ open, onOpenChange, clienteId, tenantId }: Props) {
  const { currentUser } = useAuth()
  const { toast } = useToast()

  const { data: configs = [] } = useObrigacaoConfigsByCliente(tenantId, clienteId)
  const createConfig = useCreateObrigacaoConfig()
  const updateConfig = useUpdateObrigacaoConfig()

  const [formOpen, setFormOpen] = useState(false)
  const [editingConfig, setEditingConfig] = useState<ObrigacaoConfig | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [loading, setLoading] = useState(false)

  function openNew() {
    setEditingConfig(null)
    setForm(EMPTY_FORM)
    setFormOpen(true)
  }

  function openEdit(config: ObrigacaoConfig) {
    setEditingConfig(config)
    setForm({
      tipo: config.tipo,
      data_inicio: config.data_inicio,
      data_fim: config.data_fim ?? '',
      ativo: config.ativo,
    })
    setFormOpen(true)
  }

  async function handleSave() {
    if (!form.data_inicio) {
      toast({ title: 'Informe a data de início', variant: 'destructive' })
      return
    }

    setLoading(true)
    try {
      const now = new Date().toISOString()
      if (editingConfig) {
        await updateConfig.mutateAsync({
          id: editingConfig.id,
          data: {
            tipo: form.tipo,
            data_inicio: form.data_inicio,
            data_fim: form.data_fim || undefined,
            ativo: form.ativo,
          },
        })
        toast({ title: 'Obrigação atualizada' })
      } else {
        await createConfig.mutateAsync({
          tenant_id: tenantId,
          client_id: clienteId,
          tipo: form.tipo,
          data_inicio: form.data_inicio,
          data_fim: form.data_fim || undefined,
          ativo: form.ativo,
          criado_em: now,
          criado_por: currentUser?.id,
        })
        toast({ title: 'Obrigação configurada com sucesso' })
      }
      setFormOpen(false)
    } catch {
      toast({ title: 'Erro ao salvar obrigação', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <FileCheck2 className="w-5 h-5" />
                Obrigações do Cliente
              </DialogTitle>
              <Button size="sm" onClick={openNew} className="mr-6">
                <Plus className="w-4 h-4 mr-1" />
                Nova Obrigação
              </Button>
            </div>
          </DialogHeader>

          <div className="rounded-lg border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium">Tipo</th>
                  <th className="text-left px-4 py-3 font-medium">Data Início</th>
                  <th className="text-left px-4 py-3 font-medium">Data Fim</th>
                  <th className="text-center px-4 py-3 font-medium">Ativo</th>
                  <th className="text-right px-4 py-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {configs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-muted-foreground">
                      Nenhuma obrigação configurada para este cliente.
                    </td>
                  </tr>
                )}
                {configs.map((config) => (
                  <tr
                    key={config.id}
                    className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium">
                      {TIPO_LABELS[config.tipo] ?? config.tipo}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {config.data_inicio
                        ? format(parseISO(config.data_inicio), 'dd/MM/yyyy')
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {config.data_fim
                        ? format(parseISO(config.data_fim), 'dd/MM/yyyy')
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
                          config.ativo
                            ? 'bg-green-100 text-green-700 border-green-200'
                            : 'bg-gray-100 text-gray-600 border-gray-200'
                        }`}
                      >
                        {config.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(config)}>
                        <Pencil className="w-3.5 h-3.5 mr-1" />
                        Editar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingConfig ? 'Editar Obrigação' : 'Nova Obrigação'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="obrig-tipo">Tipo de Obrigação *</Label>
              <Select
                value={form.tipo}
                onValueChange={(v) => setForm((f) => ({ ...f, tipo: v as ObrigacaoTipo }))}
              >
                <SelectTrigger id="obrig-tipo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="simples_nacional">Simples Nacional</SelectItem>
                  <SelectItem value="dctfweb" disabled>DCTFWeb (em breve)</SelectItem>
                  <SelectItem value="defis" disabled>DEFIS (em breve)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="obrig-inicio">Data Início *</Label>
                <Input
                  id="obrig-inicio"
                  type="date"
                  value={form.data_inicio}
                  onChange={(e) => setForm((f) => ({ ...f, data_inicio: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="obrig-fim">Data Fim</Label>
                <Input
                  id="obrig-fim"
                  type="date"
                  value={form.data_fim}
                  onChange={(e) => setForm((f) => ({ ...f, data_fim: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                id="obrig-ativo"
                type="checkbox"
                checked={form.ativo}
                onChange={(e) => setForm((f) => ({ ...f, ativo: e.target.checked }))}
                className="w-4 h-4 rounded border-input"
              />
              <Label htmlFor="obrig-ativo">Ativo</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
