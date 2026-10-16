import { useState } from 'react'
import { differenceInDays, parseISO, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useAuth } from '@/auth/AuthProvider'
import {
  useCertificadosByCliente,
  useCreateCertificado,
  useUpdateCertificado,
  useDeleteCertificado,
  useAlertarVencimento,
} from '@/data/hooks/useCertificados'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { CertificadoDigital, CertificadoTipo } from '@/domain/types'
import { ShieldCheck, ShieldAlert, ShieldX, Plus, Bell, Pencil, Trash2, Loader2 } from 'lucide-react'

const tipoLabels: Record<CertificadoTipo, string> = {
  ecnpj_a1: 'e-CNPJ A1',
  ecnpj_a3: 'e-CNPJ A3',
  ecpf_a1: 'e-CPF A1',
  ecpf_a3: 'e-CPF A3',
  nfe: 'NF-e',
  outro: 'Outro',
}

const schema = z.object({
  tipo: z.enum(['ecnpj_a1', 'ecnpj_a3', 'ecpf_a1', 'ecpf_a3', 'nfe', 'outro']),
  titular: z.string().min(1, 'Informe o titular'),
  cnpj_cpf: z.string().min(1, 'Informe o CNPJ/CPF'),
  validade: z.string().min(1, 'Informe a validade'),
  observacoes: z.string().optional(),
})
type FormData = z.infer<typeof schema>

function StatusBadge({ validade }: { validade: string }) {
  const dias = differenceInDays(parseISO(validade), new Date())
  if (dias < 0) return <Badge className="bg-red-100 text-red-800 border-transparent gap-1"><ShieldX className="w-3 h-3" />Vencido</Badge>
  if (dias <= 30) return <Badge className="bg-red-100 text-red-800 border-transparent gap-1"><ShieldAlert className="w-3 h-3" />Vence em {dias}d</Badge>
  if (dias <= 60) return <Badge className="bg-orange-100 text-orange-800 border-transparent gap-1"><ShieldAlert className="w-3 h-3" />Vence em {dias}d</Badge>
  if (dias <= 90) return <Badge className="bg-yellow-100 text-yellow-800 border-transparent gap-1"><ShieldAlert className="w-3 h-3" />Vence em {dias}d</Badge>
  return <Badge className="bg-green-100 text-green-800 border-transparent gap-1"><ShieldCheck className="w-3 h-3" />Válido</Badge>
}

function CertificadoFormDialog({
  open, onClose, clienteId, tenantId, userId, cert,
}: {
  open: boolean
  onClose: () => void
  clienteId: string
  tenantId: string
  userId: string
  cert?: CertificadoDigital
}) {
  const criar = useCreateCertificado()
  const atualizar = useUpdateCertificado()
  const { toast } = useToast()

  const { register, handleSubmit, control, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: cert
      ? { tipo: cert.tipo, titular: cert.titular, cnpj_cpf: cert.cnpj_cpf, validade: cert.validade, observacoes: cert.observacoes }
      : { tipo: 'ecnpj_a1' },
  })

  function onSubmit(data: FormData) {
    if (cert) {
      atualizar.mutate({ id: cert.id, data }, {
        onSuccess: () => { toast({ title: 'Certificado atualizado.' }); onClose() },
      })
    } else {
      criar.mutate({
        ...data,
        tenant_id: tenantId,
        cliente_id: clienteId,
        criado_por: userId,
        criado_em: new Date().toISOString(),
      }, {
        onSuccess: () => { toast({ title: 'Certificado cadastrado.' }); onClose() },
      })
    }
  }

  const isPending = criar.isPending || atualizar.isPending

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{cert ? 'Editar certificado' : 'Novo certificado'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <Label>Tipo</Label>
            <Controller control={control} name="tipo" render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(tipoLabels) as [CertificadoTipo, string][]).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )} />
          </div>
          <div>
            <Label>Titular</Label>
            <Input {...register('titular')} placeholder="Nome do titular" />
            {errors.titular && <p className="text-xs text-destructive mt-1">{errors.titular.message}</p>}
          </div>
          <div>
            <Label>CNPJ / CPF</Label>
            <Input {...register('cnpj_cpf')} placeholder="00.000.000/0001-00" />
            {errors.cnpj_cpf && <p className="text-xs text-destructive mt-1">{errors.cnpj_cpf.message}</p>}
          </div>
          <div>
            <Label>Validade</Label>
            <Input type="date" {...register('validade')} />
            {errors.validade && <p className="text-xs text-destructive mt-1">{errors.validade.message}</p>}
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea {...register('observacoes')} rows={2} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface Props {
  clienteId: string
}

export function CertificadosTab({ clienteId }: Props) {
  const { currentTenant, currentUser } = useAuth()
  const tenantId = currentTenant?.id ?? ''
  const userId = currentUser?.id ?? ''

  const { data: certs = [], isLoading } = useCertificadosByCliente(tenantId, clienteId)
  const deletar = useDeleteCertificado()
  const alertar = useAlertarVencimento()
  const { toast } = useToast()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editando, setEditando] = useState<CertificadoDigital | undefined>()
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  function handleAlertar(cert: CertificadoDigital) {
    alertar.mutate(cert, {
      onSuccess: () => toast({ title: 'Ocorrência de alerta criada em Tarefas.' }),
      onError: () => toast({ title: 'Erro ao criar ocorrência.', variant: 'destructive' }),
    })
  }

  if (isLoading) return <p className="text-sm text-muted-foreground py-4">Carregando...</p>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{certs.length} certificado(s) cadastrado(s)</p>
        <Button size="sm" onClick={() => { setEditando(undefined); setDialogOpen(true) }}>
          <Plus className="w-4 h-4 mr-1" />
          Novo
        </Button>
      </div>

      {certs.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Nenhum certificado cadastrado.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {certs.map((cert) => {
            const dias = differenceInDays(parseISO(cert.validade), new Date())
            const jaAlertado = !!cert.ocorrencia_alerta_id
            return (
              <Card key={cert.id}>
                <CardContent className="py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{cert.titular}</span>
                      <Badge variant="outline" className="text-xs">{tipoLabels[cert.tipo]}</Badge>
                      <StatusBadge validade={cert.validade} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{cert.cnpj_cpf}</p>
                    <p className="text-xs text-muted-foreground">
                      Vence em {format(parseISO(cert.validade), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                    {cert.observacoes && (
                      <p className="text-xs text-muted-foreground mt-1 italic">{cert.observacoes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {dias <= 90 && !jaAlertado && (
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Criar alerta de vencimento em Tarefas"
                        onClick={() => handleAlertar(cert)}
                        disabled={alertar.isPending}
                        className="text-orange-600 hover:text-orange-700"
                      >
                        <Bell className="w-4 h-4" />
                      </Button>
                    )}
                    {jaAlertado && (
                      <span title="Alerta já criado">
                        <Bell className="w-4 h-4 text-muted-foreground" />
                      </span>
                    )}
                    <Button size="icon" variant="ghost" onClick={() => { setEditando(cert); setDialogOpen(true) }}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setConfirmDelete(cert.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {dialogOpen && (
        <CertificadoFormDialog
          open
          onClose={() => { setDialogOpen(false); setEditando(undefined) }}
          clienteId={clienteId}
          tenantId={tenantId}
          userId={userId}
          cert={editando}
        />
      )}

      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir certificado?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Esta ação não pode ser desfeita.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirmDelete) deletar.mutate(confirmDelete)
                setConfirmDelete(null)
              }}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
