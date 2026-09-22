import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/auth/AuthProvider'
import { useTenant, useUpdateTenant } from '@/data/hooks/useTenant'
import { useToast } from '@/components/ui/use-toast'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

const UF_LIST = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS',
  'MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC',
  'SP','SE','TO',
]

const schema = z.object({
  nome:                 z.string().min(1, 'Obrigatório'),
  razao_social:         z.string().optional(),
  cnpj:                 z.string().optional(),
  crc:                  z.string().optional(),
  email:                z.string().email('E-mail inválido').optional().or(z.literal('')),
  telefone:             z.string().optional(),
  responsavel:          z.string().optional(),
  endereco_logradouro:  z.string().optional(),
  endereco_numero:      z.string().optional(),
  endereco_complemento: z.string().optional(),
  endereco_bairro:      z.string().optional(),
  endereco_cidade:      z.string().optional(),
  endereco_estado:      z.string().optional(),
  endereco_cep:         z.string().optional(),
  contador_nome:        z.string().optional(),
  contador_crc:         z.string().optional(),
  contador_cpf:         z.string().optional(),
  contador_email:       z.string().email('E-mail inválido').optional().or(z.literal('')),
  contador_telefone:    z.string().optional(),
})

type FormData = z.infer<typeof schema>

export default function DadosEscritorio() {
  const { currentUser } = useAuth()
  const tenantId = currentUser?.tenant_id ?? ''
  const { data: tenant, isLoading } = useTenant(tenantId)
  const updateTenant = useUpdateTenant()
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (tenant) {
      reset({
        nome:                 tenant.nome ?? '',
        razao_social:         tenant.razao_social ?? '',
        cnpj:                 tenant.cnpj ?? '',
        crc:                  tenant.crc ?? '',
        email:                tenant.email ?? '',
        telefone:             tenant.telefone ?? '',
        responsavel:          tenant.responsavel ?? '',
        endereco_logradouro:  tenant.endereco_logradouro ?? '',
        endereco_numero:      tenant.endereco_numero ?? '',
        endereco_complemento: tenant.endereco_complemento ?? '',
        endereco_bairro:      tenant.endereco_bairro ?? '',
        endereco_cidade:      tenant.endereco_cidade ?? '',
        endereco_estado:      tenant.endereco_estado ?? '',
        endereco_cep:         tenant.endereco_cep ?? '',
        contador_nome:        tenant.contador_nome ?? '',
        contador_crc:         tenant.contador_crc ?? '',
        contador_cpf:         tenant.contador_cpf ?? '',
        contador_email:       tenant.contador_email ?? '',
        contador_telefone:    tenant.contador_telefone ?? '',
      })
    }
  }, [tenant, reset])

  const onSubmit = async (values: FormData) => {
    if (!tenant) return
    try {
      await updateTenant.mutateAsync({ id: tenant.id, data: values })
      toast({ title: 'Dados salvos', description: 'Informações do escritório atualizadas.' })
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível salvar.', variant: 'destructive' })
    }
  }

  if (isLoading) return <PageLoader />

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">

      {/* Identificação */}
      <Card>
        <CardHeader>
          <CardTitle>Identificação</CardTitle>
          <CardDescription>Dados usados em documentos, contratos e cabeçalhos do portal.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 space-y-1">
            <Label htmlFor="nome">Nome Fantasia / Exibição *</Label>
            <Input id="nome" {...register('nome')} />
            {errors.nome && <p className="text-xs text-destructive">{errors.nome.message}</p>}
          </div>

          <div className="sm:col-span-2 space-y-1">
            <Label htmlFor="razao_social">Razão Social</Label>
            <Input id="razao_social" {...register('razao_social')} />
          </div>

          <div className="space-y-1">
            <Label htmlFor="cnpj">CNPJ</Label>
            <Input id="cnpj" placeholder="00.000.000/0001-00" {...register('cnpj')} />
          </div>

          <div className="space-y-1">
            <Label htmlFor="crc">CRC</Label>
            <Input id="crc" placeholder="CRC SP 123456/O-9" {...register('crc')} />
          </div>
        </CardContent>
      </Card>

      {/* Contato */}
      <Card>
        <CardHeader>
          <CardTitle>Contato</CardTitle>
          <CardDescription>Informações de contato exibidas no portal e nos documentos gerados.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" placeholder="contato@escritorio.com" {...register('email')} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="telefone">Telefone / WhatsApp</Label>
            <Input id="telefone" placeholder="(11) 99999-0000" {...register('telefone')} />
          </div>

          <div className="sm:col-span-2 space-y-1">
            <Label htmlFor="responsavel">Responsável Técnico</Label>
            <Input id="responsavel" placeholder="Nome do contador responsável" {...register('responsavel')} />
          </div>
        </CardContent>
      </Card>

      {/* Endereço */}
      <Card>
        <CardHeader>
          <CardTitle>Endereço</CardTitle>
          <CardDescription>Aparece no rodapé de documentos e boletos.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-6">
          <div className="sm:col-span-4 space-y-1">
            <Label htmlFor="endereco_logradouro">Logradouro</Label>
            <Input id="endereco_logradouro" placeholder="Rua, Av., Alameda..." {...register('endereco_logradouro')} />
          </div>

          <div className="sm:col-span-2 space-y-1">
            <Label htmlFor="endereco_numero">Número</Label>
            <Input id="endereco_numero" placeholder="123" {...register('endereco_numero')} />
          </div>

          <div className="sm:col-span-3 space-y-1">
            <Label htmlFor="endereco_complemento">Complemento</Label>
            <Input id="endereco_complemento" placeholder="Sala, andar, conj..." {...register('endereco_complemento')} />
          </div>

          <div className="sm:col-span-3 space-y-1">
            <Label htmlFor="endereco_bairro">Bairro</Label>
            <Input id="endereco_bairro" {...register('endereco_bairro')} />
          </div>

          <div className="sm:col-span-3 space-y-1">
            <Label htmlFor="endereco_cidade">Cidade</Label>
            <Input id="endereco_cidade" {...register('endereco_cidade')} />
          </div>

          <div className="sm:col-span-2 space-y-1">
            <Label htmlFor="endereco_estado">Estado</Label>
            <select
              id="endereco_estado"
              {...register('endereco_estado')}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">UF</option>
              {UF_LIST.map((uf) => (
                <option key={uf} value={uf}>{uf}</option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-1 space-y-1">
            <Label htmlFor="endereco_cep">CEP</Label>
            <Input id="endereco_cep" placeholder="00000-000" {...register('endereco_cep')} />
          </div>
        </CardContent>
      </Card>

      {/* Contador Responsável */}
      <Card>
        <CardHeader>
          <CardTitle>Contador Responsável</CardTitle>
          <CardDescription>Dados do contador que assina documentos e é responsável técnico pela escrituração.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 space-y-1">
            <Label htmlFor="contador_nome">Nome Completo</Label>
            <Input id="contador_nome" placeholder="Nome do contador" {...register('contador_nome')} />
          </div>

          <div className="space-y-1">
            <Label htmlFor="contador_crc">CRC</Label>
            <Input id="contador_crc" placeholder="CRC SP 123456/O-9" {...register('contador_crc')} />
          </div>

          <div className="space-y-1">
            <Label htmlFor="contador_cpf">CPF</Label>
            <Input id="contador_cpf" placeholder="000.000.000-00" {...register('contador_cpf')} />
          </div>

          <div className="space-y-1">
            <Label htmlFor="contador_email">E-mail</Label>
            <Input id="contador_email" type="email" placeholder="contador@escritorio.com" {...register('contador_email')} />
            {errors.contador_email && <p className="text-xs text-destructive">{errors.contador_email.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="contador_telefone">Telefone / WhatsApp</Label>
            <Input id="contador_telefone" placeholder="(11) 99999-0000" {...register('contador_telefone')} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={updateTenant.isPending}>
          {updateTenant.isPending ? 'Salvando...' : 'Salvar Dados'}
        </Button>
      </div>
    </form>
  )
}
