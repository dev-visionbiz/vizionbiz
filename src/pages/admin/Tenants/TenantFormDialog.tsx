import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { v4 as uuid } from 'uuid'
import { format } from 'date-fns'
import type { Tenant, User } from '@/domain/types'
import { digitsOnly } from '@/lib/utils'
import { supabase, isSupabaseEnabled, createSupabaseAuthUser } from '@/lib/supabase'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

// ─── Helpers ────────────────────────────────────────────────────────────────

function maskCNPJ(v: string): string {
  const d = digitsOnly(v).slice(0, 14)
  if (d.length <= 2) return d
  if (d.length <= 5) return `${d.slice(0,2)}.${d.slice(2)}`
  if (d.length <= 8) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5)}`
  if (d.length <= 12) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8)}`
  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`
}

function maskTel(v: string): string {
  const d = digitsOnly(v).slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ''
  if (d.length <= 6) return `(${d.slice(0,2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
}

function slugify(name: string): string {
  return name.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function readLS<T>(key: string): T[] {
  try { return JSON.parse(localStorage.getItem(key) ?? '[]') as T[] } catch { return [] }
}
function writeLS<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data))
}

// ─── Schemas ─────────────────────────────────────────────────────────────────

const baseSchema = z.object({
  nome: z.string().min(2, 'Mínimo 2 caracteres'),
  razao_social: z.string().optional(),
  cnpj: z.string().min(18, 'CNPJ inválido (ex: 00.000.000/0001-00)'),
  email: z.union([z.string().email('E-mail inválido'), z.literal('')]).optional(),
  telefone: z.string().optional(),
  responsavel: z.string().optional(),
  endereco_cidade: z.string().optional(),
  endereco_estado: z.string().max(2, 'Use a sigla — ex: SP').optional(),
  status: z.enum(['ativo', 'trial', 'suspenso', 'inativo']),
  plano: z.enum(['starter', 'pro', 'enterprise']),
})

const createSchema = baseSchema.extend({
  admin_nome: z.string().min(2, 'Mínimo 2 caracteres'),
  admin_email: z.string().email('E-mail inválido'),
  admin_senha: z.string().min(6, 'Mínimo 6 caracteres'),
})

type BaseValues = z.infer<typeof baseSchema>
type CreateValues = z.infer<typeof createSchema>

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  tenant?: Tenant        // present → edit mode
  onSaved: () => void
}

export function TenantFormDialog({ open, onOpenChange, tenant, onSaved }: Props) {
  const isEdit = !!tenant
  const [submitError, setSubmitError] = useState<string | null>(null)

  const form = useForm<CreateValues>({
    resolver: zodResolver(isEdit ? (baseSchema as unknown as z.ZodType<CreateValues>) : createSchema),
    defaultValues: {
      nome: '', razao_social: '', cnpj: '', email: '', telefone: '',
      responsavel: '', endereco_cidade: '', endereco_estado: '',
      status: 'trial', plano: 'starter',
      admin_nome: '', admin_email: '', admin_senha: '',
    },
  })

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = form

  useEffect(() => {
    if (open) {
      setSubmitError(null)
      if (tenant) {
        reset({
          nome: tenant.nome ?? '',
          razao_social: tenant.razao_social ?? '',
          cnpj: tenant.cnpj ?? '',
          email: tenant.email ?? '',
          telefone: tenant.telefone ?? '',
          responsavel: tenant.responsavel ?? '',
          endereco_cidade: tenant.endereco_cidade ?? '',
          endereco_estado: tenant.endereco_estado ?? '',
          status: (tenant.status ?? 'ativo') as BaseValues['status'],
          plano: (tenant.plano ?? 'starter') as BaseValues['plano'],
          admin_nome: '', admin_email: '', admin_senha: '',
        })
      } else {
        reset({
          nome: '', razao_social: '', cnpj: '', email: '', telefone: '',
          responsavel: '', endereco_cidade: '', endereco_estado: '',
          status: 'trial', plano: 'starter',
          admin_nome: '', admin_email: '', admin_senha: '',
        })
      }
    }
  }, [open, tenant, reset])

  async function onSubmit(values: CreateValues) {
    const tenantData = {
      nome: values.nome,
      razao_social: values.razao_social || undefined,
      cnpj: values.cnpj,
      email: values.email || undefined,
      telefone: values.telefone || undefined,
      responsavel: values.responsavel || undefined,
      endereco_cidade: values.endereco_cidade || undefined,
      endereco_estado: values.endereco_estado || undefined,
      status: values.status,
      plano: values.plano,
    }

    if (isSupabaseEnabled) {
      if (isEdit) {
        const { error } = await supabase.from('tenants').update(tenantData).eq('id', tenant!.id)
        if (error) { setSubmitError(error.message); return }
      } else {
        const tenantId = `tenant-${uuid()}`
        const newTenant = {
          id: tenantId,
          ...tenantData,
          cor_primaria: '221 83% 53%',
          logo_url: null,
          dominio: `${slugify(values.nome)}.visionbiz.app`,
          data_cadastro: format(new Date(), 'yyyy-MM-dd'),
        }
        const adminUser = {
          id: `user-${uuid()}`,
          tenant_id: tenantId,
          nome: values.admin_nome,
          email: values.admin_email,
          papel: 'escritorio_admin' as const,
          ativo: true,
          senha_hash: values.admin_senha,
        }
        const { error: authErr } = await createSupabaseAuthUser(values.admin_email, values.admin_senha)
        if (authErr) { setSubmitError(`Erro ao criar usuário Auth: ${authErr}`); return }
        const { error: te } = await supabase.from('tenants').insert(newTenant)
        if (te) { setSubmitError(`Erro ao salvar escritório: ${te.message}`); return }
        const { error: ue } = await supabase.from('users').insert(adminUser)
        if (ue) { setSubmitError(`Erro ao salvar usuário: ${ue.message}`); return }
      }
    } else {
      if (isEdit) {
        const tenants = readLS<Tenant>('vb_tenants')
        const updated: Tenant = { ...tenant!, ...tenantData }
        writeLS('vb_tenants', tenants.map(t => t.id === updated.id ? updated : t))
      } else {
        const tenantId = `tenant-${uuid()}`
        const newTenant: Tenant = {
          id: tenantId,
          ...tenantData,
          cor_primaria: '221 83% 53%',
          logo_url: null,
          dominio: `${slugify(values.nome)}.visionbiz.app`,
          data_cadastro: format(new Date(), 'yyyy-MM-dd'),
        }
        const adminUser: User = {
          id: `user-${uuid()}`,
          tenant_id: tenantId,
          nome: values.admin_nome,
          email: values.admin_email,
          papel: 'escritorio_admin',
          ativo: true,
          senha_hash: values.admin_senha,
        }
        writeLS('vb_tenants', [...readLS<Tenant>('vb_tenants'), newTenant])
        writeLS('vb_users', [...readLS<User>('vb_users'), adminUser])
      }
    }

    onSaved()
    onOpenChange(false)
  }

  function err(field: keyof CreateValues) {
    return errors[field]?.message
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg flex flex-col max-h-[90dvh]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? `Editar — ${tenant!.nome}` : 'Novo escritório'}
          </DialogTitle>
        </DialogHeader>

        <form
          id="tenant-form"
          onSubmit={handleSubmit(onSubmit)}
          className="overflow-y-auto flex-1 pr-1 space-y-6 py-1"
        >
          {/* Dados básicos */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground pb-1">
              Dados do escritório
            </legend>

            <div className="space-y-1">
              <Label htmlFor="tf-nome">Nome <span className="text-destructive">*</span></Label>
              <Input id="tf-nome" {...register('nome')} placeholder="Contábil Exemplo" />
              {err('nome') && <p className="text-xs text-destructive">{err('nome')}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="tf-razao">Razão social</Label>
              <Input id="tf-razao" {...register('razao_social')} placeholder="Exemplo Contabilidade Ltda" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="tf-cnpj">CNPJ <span className="text-destructive">*</span></Label>
                <Input
                  id="tf-cnpj"
                  value={watch('cnpj')}
                  onChange={e => setValue('cnpj', maskCNPJ(e.target.value), { shouldValidate: true })}
                  placeholder="00.000.000/0001-00"
                />
                {err('cnpj') && <p className="text-xs text-destructive">{err('cnpj')}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="tf-tel">Telefone</Label>
                <Input
                  id="tf-tel"
                  value={watch('telefone') ?? ''}
                  onChange={e => setValue('telefone', maskTel(e.target.value))}
                  placeholder="(11) 3000-0000"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="tf-email">E-mail</Label>
              <Input id="tf-email" type="email" {...register('email')} placeholder="contato@escritorio.com.br" />
              {err('email') && <p className="text-xs text-destructive">{err('email')}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="tf-resp">Responsável</Label>
              <Input id="tf-resp" {...register('responsavel')} placeholder="Nome do responsável" />
            </div>
          </fieldset>

          {/* Localização */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground pb-1">
              Localização
            </legend>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1">
                <Label htmlFor="tf-cidade">Cidade</Label>
                <Input id="tf-cidade" {...register('endereco_cidade')} placeholder="São Paulo" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="tf-estado">Estado</Label>
                <Input
                  id="tf-estado"
                  {...register('endereco_estado')}
                  placeholder="SP"
                  maxLength={2}
                  className="uppercase"
                />
                {err('endereco_estado') && <p className="text-xs text-destructive">{err('endereco_estado')}</p>}
              </div>
            </div>
          </fieldset>

          {/* Plano & Status */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground pb-1">
              Configuração
            </legend>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={watch('status')} onValueChange={v => setValue('status', v as BaseValues['status'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="suspenso">Suspenso</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Plano</Label>
                <Select value={watch('plano')} onValueChange={v => setValue('plano', v as BaseValues['plano'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </fieldset>

          {/* Admin inicial — só na criação */}
          {!isEdit && (
            <fieldset className="space-y-3 rounded-lg border border-dashed p-3">
              <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1">
                Primeiro admin do escritório
              </legend>

              <div className="space-y-1">
                <Label htmlFor="tf-anome">Nome <span className="text-destructive">*</span></Label>
                <Input id="tf-anome" {...register('admin_nome')} placeholder="Nome completo" />
                {err('admin_nome') && <p className="text-xs text-destructive">{err('admin_nome')}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="tf-aemail">E-mail <span className="text-destructive">*</span></Label>
                  <Input id="tf-aemail" type="email" {...register('admin_email')} placeholder="admin@escritorio.com" />
                  {err('admin_email') && <p className="text-xs text-destructive">{err('admin_email')}</p>}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="tf-asenha">Senha <span className="text-destructive">*</span></Label>
                  <Input id="tf-asenha" type="password" {...register('admin_senha')} placeholder="Mínimo 6 caracteres" />
                  {err('admin_senha') && <p className="text-xs text-destructive">{err('admin_senha')}</p>}
                </div>
              </div>
            </fieldset>
          )}
        </form>

        <DialogFooter className="shrink-0 pt-3 border-t gap-2">
          {submitError && (
            <p className="text-xs text-destructive flex-1 text-left">{submitError}</p>
          )}
          <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="tenant-form" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Criar escritório'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
