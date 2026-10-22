import { useState, useMemo, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'
import type { Tenant, TenantStatus, TenantPlano, User, Client } from '@/domain/types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ArrowLeft, Building2, LogIn, Users, Briefcase, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
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
const PLANO_LABEL: Record<TenantPlano, string> = { starter: 'Starter', pro: 'Pro', enterprise: 'Enterprise' }

function readAll<T>(key: string): T[] {
  try { return JSON.parse(localStorage.getItem(key) ?? '[]') as T[] } catch { return [] }
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return (
    <div className="flex justify-between py-2 text-sm border-b last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right max-w-[60%]">{value}</span>
    </div>
  )
}

export default function TenantDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { impersonateEscritorio } = useAuth()
  const { toast } = useToast()

  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [rev, setRev] = useState(0)

  useEffect(() => {
    if (!id) return
    if (!isSupabaseEnabled) {
      const found = readAll<Tenant>('vb_tenants').find(t => t.id === id) ?? null
      setTenant(found)
      return
    }
    supabase.from('tenants').select('*').eq('id', id).maybeSingle().then(({ data }) => {
      setTenant(data ?? null)
    })
  }, [id, rev])

  const metrics = useMemo(() => {
    if (!id || isSupabaseEnabled) return { clientes: null, colaboradores: null, portais: null }
    const users = readAll<User>('vb_users').filter(u => u.tenant_id === id)
    const clients = readAll<Client>('vb_clients').filter(c => c.tenant_id === id)
    return {
      clientes: clients.length,
      colaboradores: users.filter(u => u.papel === 'escritorio_admin' || u.papel === 'escritorio_colaborador').length,
      portais: users.filter(u => u.papel === 'cliente').length,
    }
  }, [id, rev]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!tenant) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
        <Building2 className="h-10 w-10" />
        <p>Escritório não encontrado.</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/admin/tenants')}>
          Voltar à lista
        </Button>
      </div>
    )
  }

  const status = (tenant.status ?? 'ativo') as TenantStatus

  async function handleStatusChange(value: string) {
    if (isSupabaseEnabled) {
      await supabase.from('tenants').update({ status: value }).eq('id', tenant!.id)
    } else {
      const all = readAll<Tenant>('vb_tenants').map(t =>
        t.id === tenant!.id ? { ...t, status: value as TenantStatus } : t
      )
      localStorage.setItem('vb_tenants', JSON.stringify(all))
    }
    setRev(r => r + 1)
    toast({ title: `Status atualizado para ${STATUS_LABEL[value as TenantStatus]}` })
  }

  async function handlePlanoChange(value: string) {
    if (isSupabaseEnabled) {
      await supabase.from('tenants').update({ plano: value }).eq('id', tenant!.id)
    } else {
      const all = readAll<Tenant>('vb_tenants').map(t =>
        t.id === tenant!.id ? { ...t, plano: value as TenantPlano } : t
      )
      localStorage.setItem('vb_tenants', JSON.stringify(all))
    }
    setRev(r => r + 1)
    toast({ title: `Plano atualizado para ${PLANO_LABEL[value as TenantPlano]}` })
  }

  async function handleEnter() {
    const ok = await impersonateEscritorio(tenant!.id)
    if (!ok) {
      toast({ title: 'Nenhum admin encontrado neste escritório', variant: 'destructive' })
      return
    }
    navigate('/escritorio/dashboard', { replace: true })
  }

  async function confirmDelete() {
    if (isSupabaseEnabled) {
      await supabase.from('users').delete().eq('tenant_id', id)
      await supabase.from('tenants').delete().eq('id', id)
    } else {
      localStorage.setItem('vb_tenants', JSON.stringify(readAll<Tenant>('vb_tenants').filter(t => t.id !== id)))
      localStorage.setItem('vb_users', JSON.stringify(readAll<User>('vb_users').filter(u => u.tenant_id !== id)))
    }
    toast({ title: `Escritório "${tenant!.nome}" excluído` })
    navigate('/admin/tenants', { replace: true })
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => navigate('/admin/tenants')}>
          <ArrowLeft className="h-4 w-4" />
          Escritórios
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{tenant.nome}</h1>
            <p className="text-muted-foreground text-sm">{tenant.cnpj}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="default" className="gap-2" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" />
            Editar
          </Button>
          <Button variant="outline" size="default" className="gap-2 text-destructive hover:text-destructive hover:border-destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4" />
            Excluir
          </Button>
          <Button size="default" className="gap-2" onClick={handleEnter}>
            <LogIn className="h-4 w-4" />
            Entrar no escritório
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: Briefcase, label: 'Clientes', value: metrics.clientes },
          { icon: Users, label: 'Colaboradores', value: metrics.colaboradores },
          { icon: Users, label: 'Usuários portal', value: metrics.portais },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="rounded-lg border bg-card p-4 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide">
              <Icon className="h-3.5 w-3.5" />
              {label}
            </div>
            <p className="text-3xl font-bold">{value ?? '—'}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-lg border bg-card p-5 space-y-1">
          <h2 className="text-sm font-semibold mb-3">Dados básicos</h2>
          <InfoRow label="Razão social" value={tenant.razao_social} />
          <InfoRow label="CNPJ" value={tenant.cnpj} />
          <InfoRow label="E-mail" value={tenant.email} />
          <InfoRow label="Telefone" value={tenant.telefone} />
          <InfoRow label="Responsável" value={tenant.responsavel} />
          {tenant.endereco_cidade && (
            <InfoRow label="Cidade / Estado" value={`${tenant.endereco_cidade} / ${tenant.endereco_estado}`} />
          )}
        </div>

        <div className="rounded-lg border bg-card p-5 space-y-4">
          <h2 className="text-sm font-semibold">Plano & Status</h2>

          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Status</label>
            <div className="flex items-center gap-3">
              <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>
              <Select value={status} onValueChange={handleStatusChange}>
                <SelectTrigger className="h-8 w-36 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="suspenso">Suspenso</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Plano contratado</label>
            <Select value={tenant.plano ?? ''} onValueChange={handlePlanoChange}>
              <SelectTrigger className="h-8 w-40 text-sm">
                <SelectValue placeholder="Sem plano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="starter">Starter</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="text-sm space-y-1 pt-2 border-t">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cadastro</span>
              <span className="font-medium">
                {tenant.data_cadastro
                  ? format(new Date(tenant.data_cadastro), 'dd/MM/yyyy', { locale: ptBR })
                  : '—'}
              </span>
            </div>
            {tenant.data_expiracao && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Expiração</span>
                <span className="font-medium">
                  {format(new Date(tenant.data_expiracao), 'dd/MM/yyyy', { locale: ptBR })}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <TenantFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        tenant={tenant}
        onSaved={() => { setRev(r => r + 1); toast({ title: 'Escritório atualizado' }) }}
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir escritório</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Isso removerá permanentemente <strong>{tenant.nome}</strong> e todos os seus usuários.
            Esta ação não pode ser desfeita.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDelete}>Excluir permanentemente</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
