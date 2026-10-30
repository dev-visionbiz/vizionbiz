import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Plus, Pencil, FileCheck2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/auth/AuthProvider'
import { useClients } from '@/data/hooks/useClients'
import { useObrigacaoConfigs, useCreateObrigacaoConfig, useUpdateObrigacaoConfig } from '@/data/hooks/useObrigacoes'
import { useToast } from '@/components/ui/use-toast'
import type { ObrigacaoConfig, ObrigacaoTipo } from '@/domain/types'

const TIPO_LABELS: Record<ObrigacaoTipo, string> = {
  simples_nacional: 'Simples Nacional',
  dctfweb: 'DCTFWeb',
  defis: 'DEFIS',
}

interface FormState {
  client_id: string
  tipo: ObrigacaoTipo
  data_inicio: string
  data_fim: string
  ativo: boolean
}

const EMPTY_FORM: FormState = {
  client_id: '',
  tipo: 'simples_nacional',
  data_inicio: '',
  data_fim: '',
  ativo: true,
}

export default function ObrigacoesConfigPage() {
  const { currentUser } = useAuth()
  const tenantId = currentUser?.tenant_id ?? ''
  const { toast } = useToast()

  const { data: configs = [] } = useObrigacaoConfigs(tenantId)
  const { data: clientes = [] } = useClients(tenantId)
  const createConfig = useCreateObrigacaoConfig()
  const updateConfig = useUpdateObrigacaoConfig()

  const [modalOpen, setModalOpen] = useState(false)
  const [editingConfig, setEditingConfig] = useState<ObrigacaoConfig | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [loading, setLoading] = useState(false)

  function openNew() {
    setEditingConfig(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  function openEdit(config: ObrigacaoConfig) {
    setEditingConfig(config)
    setForm({
      client_id: config.client_id,
      tipo: config.tipo,
      data_inicio: config.data_inicio,
      data_fim: config.data_fim ?? '',
      ativo: config.ativo,
    })
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.client_id) {
      toast({ title: 'Selecione um cliente', variant: 'destructive' })
      return
    }
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
            client_id: form.client_id,
            tipo: form.tipo,
            data_inicio: form.data_inicio,
            data_fim: form.data_fim || undefined,
            ativo: form.ativo,
          },
        })
        toast({ title: 'Configuração atualizada' })
      } else {
        await createConfig.mutateAsync({
          tenant_id: tenantId,
          client_id: form.client_id,
          tipo: form.tipo,
          data_inicio: form.data_inicio,
          data_fim: form.data_fim || undefined,
          ativo: form.ativo,
          criado_em: now,
          criado_por: currentUser?.id,
        })
        toast({ title: 'Obrigação configurada com sucesso' })
      }
      setModalOpen(false)
    } catch {
      toast({ title: 'Erro ao salvar configuração', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  function clienteNome(clienteId: string): string {
    const c = clientes.find((cl) => cl.id === clienteId)
    return c?.fantasia ?? c?.razao_social ?? clienteId
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileCheck2 className="w-6 h-6" />
            Configurar Obrigações
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Defina quais clientes possuem cada obrigação e o período de vigência
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Obrigação
        </Button>
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left px-4 py-3 font-medium">Cliente</th>
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
                <td colSpan={6} className="text-center py-12 text-muted-foreground">
                  Nenhuma obrigação configurada. Clique em &quot;Nova Obrigação&quot; para começar.
                </td>
              </tr>
            )}
            {configs.map((config) => (
              <tr key={config.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-medium">{clienteNome(config.client_id)}</td>
                <td className="px-4 py-3">{TIPO_LABELS[config.tipo] ?? config.tipo}</td>
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

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingConfig ? 'Editar Obrigação' : 'Nova Obrigação'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="config-cliente">Cliente *</Label>
              <Select
                value={form.client_id}
                onValueChange={(v) => setForm((f) => ({ ...f, client_id: v }))}
              >
                <SelectTrigger id="config-cliente">
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.fantasia ?? c.razao_social}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="config-tipo">Tipo de Obrigação *</Label>
              <Select
                value={form.tipo}
                onValueChange={(v) => setForm((f) => ({ ...f, tipo: v as ObrigacaoTipo }))}
              >
                <SelectTrigger id="config-tipo">
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
                <Label htmlFor="config-inicio">Data Início *</Label>
                <Input
                  id="config-inicio"
                  type="date"
                  value={form.data_inicio}
                  onChange={(e) => setForm((f) => ({ ...f, data_inicio: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="config-fim">Data Fim</Label>
                <Input
                  id="config-fim"
                  type="date"
                  value={form.data_fim}
                  onChange={(e) => setForm((f) => ({ ...f, data_fim: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                id="config-ativo"
                type="checkbox"
                checked={form.ativo}
                onChange={(e) => setForm((f) => ({ ...f, ativo: e.target.checked }))}
                className="w-4 h-4 rounded border-input"
              />
              <Label htmlFor="config-ativo">Ativo</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
