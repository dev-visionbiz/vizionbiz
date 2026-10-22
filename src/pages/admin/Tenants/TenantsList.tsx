import { useState, useMemo, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'
import type { Tenant, TenantStatus, User, Client } from '@/domain/types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Search, LogIn, Eye, Building2, Plus, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { TenantFormDialog } from './TenantFormDialog'
import { supabase, isSupabaseEnabled } from '@/lib/supabase'

const STATUS_LABEL: Record<TenantStatus, string> = {
  ativo: 'Ativo', trial: 'Trial', suspenso: 'Suspenso', inativo: 'Inativo',
}
const STATUS_VARIANT: Record<TenantStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  ativo: 'default', trial: 'secondary', suspenso: 'destructive', inativo: 'outline',
}
const PLANO_LABEL: Record<string, string> = { starter: 'Starter', pro: 'Pro', enterprise: 'Enterprise' }

function readAll<T>(key: string): T[] {
  try { return JSON.parse(localStorage.getItem(key) ?? '[]') as T[] } catch { return [] }
}

function useTenantMetrics(tenantId: string) {
  return useMemo(() => {
    if (isSupabaseEnabled) return { clientes: null, usuarios: null }
    const users = readAll<User>('vb_users').filter(u => u.tenant_id === tenantId)
    const clients = readAll<Client>('vb_clients').filter(c => c.tenant_id === tenantId)
    const colaboradores = users.filter(u =>
      u.papel === 'escritorio_admin' || u.papel === 'escritorio_colaborador'
    ).length
    return { clientes: clients.length, usuarios: colaboradores }
  }, [tenantId])
}

// ─── Row ─────────────────────────────────────────────────────────────────────

function TenantRow({
  tenant, onEnter, onDelete,
}: { tenant: Tenant; onEnter: (id: string) => void; onDelete: (t: Tenant) => void }) {
  const navigate = useNavigate()
  const metrics = useTenantMetrics(tenant.id)
  const status = (tenant.status ?? 'ativo') as TenantStatus

  return (
    <tr className="border-b transition-colors hover:bg-muted/40">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary shrink-0">
            <Building2 className="h-4 w-4" />
          </div>
          <div>
            <p className="font-medium text-sm">{tenant.nome}</p>
            <p className="text-xs text-muted-foreground">{tenant.cnpj}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        {tenant.plano ? (PLANO_LABEL[tenant.plano] ?? tenant.plano) : '—'}
      </td>
      <td className="px-4 py-3 text-sm text-center">
        {metrics.clientes ?? '—'}
      </td>
      <td className="px-4 py-3 text-sm text-center">
        {metrics.usuarios ?? '—'}
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        {tenant.data_cadastro
          ? format(new Date(tenant.data_cadastro), 'dd/MM/yyyy', { locale: ptBR })
          : '—'}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5 justify-end">
          <Button
            variant="ghost" size="sm" className="h-7 gap-1.5"
            onClick={() => navigate(`/admin/tenants/${tenant.id}`)}
          >
            <Eye className="h-3.5 w-3.5" />
            Detalhes
          </Button>
          <Button
            size="sm" className="h-7 gap-1.5"
            onClick={() => onEnter(tenant.id)}
          >
            <LogIn className="h-3.5 w-3.5" />
            Entrar
          </Button>
          <Button
            variant="ghost" size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(tenant)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  )
}

// ─── Delete confirmation dialog ───────────────────────────────────────────────

function DeleteDialog({
  tenant, onConfirm, onCancel,
}: { tenant: Tenant; onConfirm: () => void; onCancel: () => void }) {
  return (
    <Dialog open onOpenChange={open => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Excluir escritório</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Isso removerá permanentemente <strong>{tenant.nome}</strong> e todos os seus usuários do sistema.
          Esta ação não pode ser desfeita.
        </p>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button variant="destructive" onClick={onConfirm}>Excluir permanentemente</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Status filter pills ──────────────────────────────────────────────────────

const STATUS_FILTERS: Array<{ value: TenantStatus | 'todos'; label: string }> = [
  { value: 'todos', label: 'Todos' },
  { value: 'ativo', label: 'Ativo' },
  { value: 'trial', label: 'Trial' },
  { value: 'suspenso', label: 'Suspenso' },
  { value: 'inativo', label: 'Inativo' },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TenantsList() {
  const { impersonateEscritorio } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<TenantStatus | 'todos'>('todos')
  const [formOpen, setFormOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Tenant | null>(null)
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [rev, setRev] = useState(0)
  const refresh = useCallback(() => setRev(r => r + 1), [])

  useEffect(() => {
    if (!isSupabaseEnabled) {
      setTenants(readAll<Tenant>('vb_tenants'))
      return
    }
    supabase.from('tenants').select('*').order('nome').then(({ data, error }) => {
      if (error) console.error(error)
      else setTenants(data ?? [])
    })
  }, [rev])

  const filtered = useMemo(() => {
    return tenants.filter(t => {
      const matchSearch = !search ||
        t.nome.toLowerCase().includes(search.toLowerCase()) ||
        (t.cnpj ?? '').includes(search)
      const matchStatus = statusFilter === 'todos' || (t.status ?? 'ativo') === statusFilter
      return matchSearch && matchStatus
    })
  }, [tenants, search, statusFilter])

  async function handleEnter(tenantId: string) {
    const ok = await impersonateEscritorio(tenantId)
    if (!ok) {
      toast({ title: 'Nenhum admin encontrado neste escritório', variant: 'destructive' })
      return
    }
    navigate('/escritorio/dashboard', { replace: true })
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    if (isSupabaseEnabled) {
      await supabase.from('users').delete().eq('tenant_id', deleteTarget.id)
      await supabase.from('tenants').delete().eq('id', deleteTarget.id)
    } else {
      const ts = readAll<Tenant>('vb_tenants').filter(t => t.id !== deleteTarget.id)
      localStorage.setItem('vb_tenants', JSON.stringify(ts))
      const us = readAll<User>('vb_users').filter(u => u.tenant_id !== deleteTarget.id)
      localStorage.setItem('vb_users', JSON.stringify(us))
    }
    toast({ title: `Escritório "${deleteTarget.nome}" excluído` })
    setDeleteTarget(null)
    refresh()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Escritórios</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {tenants.length} escritório{tenants.length !== 1 ? 's' : ''} cadastrado{tenants.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button className="gap-2" onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
          Novo escritório
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou CNPJ…"
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                statusFilter === f.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/40 text-xs text-muted-foreground uppercase tracking-wide">
              <th className="px-4 py-3 text-left">Escritório</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Plano</th>
              <th className="px-4 py-3 text-center">Clientes</th>
              <th className="px-4 py-3 text-center">Usuários</th>
              <th className="px-4 py-3 text-left">Cadastro</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground text-sm">
                  Nenhum escritório encontrado
                </td>
              </tr>
            ) : (
              filtered.map(t => (
                <TenantRow key={t.id} tenant={t} onEnter={handleEnter} onDelete={setDeleteTarget} />
              ))
            )}
          </tbody>
        </table>
      </div>

      <TenantFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSaved={() => { toast({ title: 'Escritório criado com sucesso' }); refresh() }}
      />

      {deleteTarget && (
        <DeleteDialog
          tenant={deleteTarget}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
