import { useState } from 'react'
import { useClientContracts, useCreateContract, useUpdateContract } from '@/data/hooks/useContracts'
import { useContratoItems, useCreateContratoItem, useDeleteContratoItem } from '@/data/hooks/useContratoItems'
import { usePlanosAtivos } from '@/data/hooks/usePlanos'
import { useServicosAtivos } from '@/data/hooks/useServicos'
import { useToast } from '@/components/ui/use-toast'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Plus, Trash2, FileText, ChevronDown, ChevronUp } from 'lucide-react'
import type { Contract, ContratoItem, ContractStatus, ContrataNatureza } from '@/domain/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { v4 as uuidv4 } from 'uuid'

const statusConfig: Record<ContractStatus, { label: string; className: string }> = {
  rascunho: { label: 'Rascunho', className: 'bg-gray-100 text-gray-700 border-transparent' },
  ativo: { label: 'Ativo', className: 'bg-green-100 text-green-800 border-transparent' },
  suspenso: { label: 'Suspenso', className: 'bg-yellow-100 text-yellow-800 border-transparent' },
  encerrado: { label: 'Encerrado', className: 'bg-red-100 text-red-700 border-transparent' },
}

const naturezaConfig: Record<ContrataNatureza, { label: string; className: string }> = {
  principal: { label: 'Principal', className: 'bg-blue-100 text-blue-800 border-transparent' },
  avulso: { label: 'Avulso', className: 'bg-purple-100 text-purple-800 border-transparent' },
  gestao_provisoria: { label: 'Gestão Provisória', className: 'bg-orange-100 text-orange-800 border-transparent' },
  emissao: { label: 'Emissão', className: 'bg-teal-100 text-teal-800 border-transparent' },
}

const indiceLabels: Record<string, string> = {
  IGPM: 'IGP-M', IPCA: 'IPCA', INPC: 'INPC', nenhum: 'Nenhum',
}

function isPrincipal(c: Contract): boolean {
  return !c.natureza || c.natureza === 'principal'
}

interface Props {
  tenantId: string
  clientId: string
}

interface ContractFormState {
  natureza: ContrataNatureza
  inicio: string
  dia_vencimento: string
  indice_reajuste: string
  apenas_reajuste_positivo: boolean
  desconto_valor: string
}

const defaultForm: ContractFormState = {
  natureza: 'principal',
  inicio: '',
  dia_vencimento: '10',
  indice_reajuste: 'IGPM',
  apenas_reajuste_positivo: true,
  desconto_valor: '',
}

interface EncerrarFormState {
  data_encerramento: string
  motivo_encerramento: string
  observacao_encerramento: string
  ultima_competencia_cobrada: string
}

// --- Sub-componente: bloco de itens de um contrato ---
function ContratoItens({
  tenantId,
  contract,
  planos,
  servicos,
  onItemsChanged,
}: {
  tenantId: string
  contract: Contract
  planos: ReturnType<typeof usePlanosAtivos>['data']
  servicos: ReturnType<typeof useServicosAtivos>['data']
  onItemsChanged: (delta: number) => void
}) {
  const { data: items } = useContratoItems(tenantId, contract.id)
  const createItem = useCreateContratoItem()
  const deleteItem = useDeleteContratoItem()
  const updateContract = useUpdateContract()
  const { toast } = useToast()

  const [itemDialog, setItemDialog] = useState(false)
  const [itemForm, setItemForm] = useState({
    origem: 'manual' as ContratoItem['origem'],
    origem_id: '',
    nome: '',
    valor_unitario: '',
    quantidade: '1',
  })

  const subtotal = items?.reduce((s, i) => s + i.valor_unitario * i.quantidade, 0) ?? 0
  const desconto = contract.desconto_valor ?? 0
  const valorMensal = Math.max(0, subtotal - desconto)
  const canEdit = contract.status === 'rascunho' || contract.status === 'ativo'

  const handleOrigemChange = (origem: ContratoItem['origem']) => {
    setItemForm({ origem, origem_id: '', nome: '', valor_unitario: '', quantidade: '1' })
  }

  const handleSelectPlano = (planoId: string) => {
    const plano = planos?.find((p) => p.id === planoId)
    if (!plano) return
    setItemForm((f) => ({ ...f, origem_id: planoId, nome: plano.nome, valor_unitario: String(plano.valor) }))
  }

  const handleSelectServico = (servicoId: string) => {
    const servico = servicos?.find((s) => s.id === servicoId)
    if (!servico) return
    setItemForm((f) => ({ ...f, origem_id: servicoId, nome: servico.nome, valor_unitario: String(servico.valor_padrao) }))
  }

  const addItem = async () => {
    if (!itemForm.nome || !itemForm.valor_unitario) return
    const novoItem: ContratoItem = {
      id: uuidv4(),
      tenant_id: tenantId,
      contrato_id: contract.id,
      origem: itemForm.origem,
      origem_id: itemForm.origem_id || undefined,
      nome: itemForm.nome,
      valor_unitario: parseFloat(itemForm.valor_unitario),
      quantidade: Math.max(1, parseInt(itemForm.quantidade) || 1),
    }
    try {
      await createItem.mutateAsync(novoItem)
      const novoSubtotal = subtotal + novoItem.valor_unitario * novoItem.quantidade
      const novoValor = Math.max(0, novoSubtotal - desconto)
      await updateContract.mutateAsync({ id: contract.id, data: { valor_mensal: novoValor, atualizado_em: new Date().toISOString() } })
      onItemsChanged(novoValor)
      toast({ title: 'Item adicionado' })
      setItemDialog(false)
      setItemForm({ origem: 'manual', origem_id: '', nome: '', valor_unitario: '', quantidade: '1' })
    } catch {
      toast({ title: 'Erro ao adicionar item', variant: 'destructive' })
    }
  }

  const removeItem = async (item: ContratoItem) => {
    if (!confirm(`Remover "${item.nome}"?`)) return
    try {
      await deleteItem.mutateAsync(item.id)
      const novoSubtotal = subtotal - item.valor_unitario * item.quantidade
      const novoValor = Math.max(0, novoSubtotal - desconto)
      await updateContract.mutateAsync({ id: contract.id, data: { valor_mensal: novoValor, atualizado_em: new Date().toISOString() } })
      onItemsChanged(novoValor)
      toast({ title: 'Item removido' })
    } catch {
      toast({ title: 'Erro ao remover item', variant: 'destructive' })
    }
  }

  const itemPreviewTotal =
    itemForm.valor_unitario && itemForm.quantidade
      ? parseFloat(itemForm.valor_unitario) * (parseInt(itemForm.quantidade) || 1)
      : 0

  return (
    <>
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold">Itens do Contrato</p>
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setItemForm({ origem: 'manual', origem_id: '', nome: '', valor_unitario: '', quantidade: '1' })
                setItemDialog(true)
              }}
            >
              <Plus className="mr-1 h-3 w-3" />
              Adicionar Item
            </Button>
          )}
        </div>

        {!items?.length ? (
          <p className="text-sm text-muted-foreground py-2 italic">
            Nenhum item adicionado.{canEdit && ' Use o botão acima para incluir serviços ou planos.'}
          </p>
        ) : (
          <div className="space-y-1">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-md border bg-muted/30 px-3 py-2 text-sm"
              >
                <span className="flex-1 font-medium min-w-0 truncate">{item.nome}</span>
                <span className="text-muted-foreground whitespace-nowrap shrink-0">{item.quantidade}×</span>
                <span className="text-muted-foreground whitespace-nowrap shrink-0">{formatCurrency(item.valor_unitario)}</span>
                <span className="font-semibold whitespace-nowrap w-24 text-right shrink-0">
                  {formatCurrency(item.valor_unitario * item.quantidade)}
                </span>
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeItem(item)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-3 space-y-1 text-sm border-t pt-3">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {desconto > 0 && (
            <div className="flex justify-between text-green-700">
              <span>Desconto</span>
              <span>− {formatCurrency(desconto)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold text-base pt-1">
            <span>Total Mensal</span>
            <span>{formatCurrency(valorMensal)}</span>
          </div>
        </div>
      </div>

      {/* Dialog: Adicionar Item */}
      <Dialog open={itemDialog} onOpenChange={setItemDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Item ao Contrato</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Origem</Label>
              <Select value={itemForm.origem} onValueChange={(v) => handleOrigemChange(v as ContratoItem['origem'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="plano">Plano do catálogo</SelectItem>
                  <SelectItem value="servico">Serviço do catálogo</SelectItem>
                  <SelectItem value="manual">Manual (avulso)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {itemForm.origem === 'plano' && (
              <div className="space-y-1">
                <Label>Plano</Label>
                <Select value={itemForm.origem_id} onValueChange={handleSelectPlano}>
                  <SelectTrigger><SelectValue placeholder="Selecionar plano..." /></SelectTrigger>
                  <SelectContent>
                    {planos?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.nome} — {formatCurrency(p.valor)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {itemForm.origem === 'servico' && (
              <div className="space-y-1">
                <Label>Serviço</Label>
                <Select value={itemForm.origem_id} onValueChange={handleSelectServico}>
                  <SelectTrigger><SelectValue placeholder="Selecionar serviço..." /></SelectTrigger>
                  <SelectContent>
                    {servicos?.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.nome} — {formatCurrency(s.valor_padrao)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="item-nome">Descrição (snapshot)</Label>
              <Input
                id="item-nome"
                value={itemForm.nome}
                onChange={(e) => setItemForm((f) => ({ ...f, nome: e.target.value }))}
                placeholder="Nome do item que constará no contrato"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="item-valor">Valor Unitário (R$)</Label>
                <Input
                  id="item-valor"
                  type="number"
                  step="0.01"
                  min="0"
                  value={itemForm.valor_unitario}
                  onChange={(e) => setItemForm((f) => ({ ...f, valor_unitario: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="item-qtd">Quantidade</Label>
                <Input
                  id="item-qtd"
                  type="number"
                  min="1"
                  value={itemForm.quantidade}
                  onChange={(e) => setItemForm((f) => ({ ...f, quantidade: e.target.value }))}
                />
              </div>
            </div>

            {itemPreviewTotal > 0 && (
              <p className="text-sm text-muted-foreground">
                Total do item:{' '}
                <span className="font-semibold text-foreground">{formatCurrency(itemPreviewTotal)}</span>
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemDialog(false)}>Cancelar</Button>
            <Button
              onClick={addItem}
              disabled={!itemForm.nome || !itemForm.valor_unitario || createItem.isPending}
            >
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// --- Sub-componente: card de um contrato ---
function ContractCard({
  tenantId,
  contract,
  planos,
  servicos,
  isExpandedInitially = true,
  onEdit,
  onEncerrar,
}: {
  tenantId: string
  contract: Contract
  planos: ReturnType<typeof usePlanosAtivos>['data']
  servicos: ReturnType<typeof useServicosAtivos>['data']
  isExpandedInitially?: boolean
  onEdit: (c: Contract) => void
  onEncerrar: (c: Contract) => void
}) {
  const updateContract = useUpdateContract()
  const { toast } = useToast()
  const [expanded, setExpanded] = useState(isExpandedInitially)
  const natureza = contract.natureza ?? 'principal'

  const activateContract = async () => {
    if (contract.status !== 'rascunho') return
    try {
      await updateContract.mutateAsync({ id: contract.id, data: { status: 'ativo', atualizado_em: new Date().toISOString() } })
      toast({ title: 'Contrato ativado' })
    } catch (err: unknown) {
      toast({ title: err instanceof Error ? err.message : 'Erro ao ativar contrato', variant: 'destructive' })
    }
  }

  const suspendContract = async () => {
    if (contract.status !== 'ativo') return
    if (!confirm('Suspender o contrato? As faturas automáticas não serão geradas enquanto suspenso.')) return
    await updateContract.mutateAsync({ id: contract.id, data: { status: 'suspenso', atualizado_em: new Date().toISOString() } })
    toast({ title: 'Contrato suspenso' })
  }

  const reactivateContract = async () => {
    if (contract.status !== 'suspenso') return
    try {
      await updateContract.mutateAsync({ id: contract.id, data: { status: 'ativo', atualizado_em: new Date().toISOString() } })
      toast({ title: 'Contrato reativado' })
    } catch (err: unknown) {
      toast({ title: err instanceof Error ? err.message : 'Erro ao reativar contrato', variant: 'destructive' })
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <CardTitle className="text-base">
              {natureza === 'principal' ? 'Contrato' : naturezaConfig[natureza].label}
            </CardTitle>
            {natureza !== 'principal' && (
              <Badge className={naturezaConfig[natureza].className}>{naturezaConfig[natureza].label}</Badge>
            )}
            <Badge className={statusConfig[contract.status].className}>
              {statusConfig[contract.status].label}
            </Badge>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {contract.status !== 'encerrado' && (
              <Button variant="outline" size="sm" onClick={() => onEdit(contract)}>Editar</Button>
            )}
            {contract.status === 'rascunho' && (
              <Button size="sm" onClick={activateContract} disabled={updateContract.isPending}>Ativar</Button>
            )}
            {contract.status === 'ativo' && (
              <>
                <Button variant="outline" size="sm" onClick={suspendContract} disabled={updateContract.isPending}>Suspender</Button>
                <Button variant="destructive" size="sm" onClick={() => onEncerrar(contract)}>Encerrar</Button>
              </>
            )}
            {contract.status === 'suspenso' && (
              <>
                <Button variant="outline" size="sm" onClick={reactivateContract} disabled={updateContract.isPending}>Reativar</Button>
                <Button variant="destructive" size="sm" onClick={() => onEncerrar(contract)}>Encerrar</Button>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Início: </span>
              <span className="font-medium">{formatDate(contract.inicio)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Vencimento: </span>
              <span className="font-medium">dia {contract.dia_vencimento}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Índice: </span>
              <span className="font-medium">{indiceLabels[contract.indice_reajuste] ?? contract.indice_reajuste}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Só reajuste positivo: </span>
              <span className="font-medium">{contract.apenas_reajuste_positivo !== false ? 'Sim' : 'Não'}</span>
            </div>
            {contract.criado_em && (
              <div>
                <span className="text-muted-foreground">Criado em: </span>
                <span className="font-medium">{formatDate(contract.criado_em.split('T')[0])}</span>
              </div>
            )}
          </div>

          <Separator />

          <ContratoItens
            tenantId={tenantId}
            contract={contract}
            planos={planos}
            servicos={servicos}
            onItemsChanged={() => {}}
          />

          {contract.status === 'encerrado' && contract.data_encerramento && (
            <>
              <Separator />
              <div className="space-y-1 text-sm">
                <p className="font-semibold text-muted-foreground">Encerramento</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-muted-foreground">Data: </span>
                    <span>{formatDate(contract.data_encerramento)}</span>
                  </div>
                  {contract.ultima_competencia_cobrada && (
                    <div>
                      <span className="text-muted-foreground">Última competência: </span>
                      <span>{contract.ultima_competencia_cobrada}</span>
                    </div>
                  )}
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Motivo: </span>
                    <span>{contract.motivo_encerramento}</span>
                  </div>
                  {contract.observacao_encerramento && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Observação: </span>
                      <span>{contract.observacao_encerramento}</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      )}
    </Card>
  )
}

// --- Componente principal ---
export function ContratoTab({ tenantId, clientId }: Props) {
  const { data: contracts } = useClientContracts(tenantId, clientId)
  const createContract = useCreateContract()
  const updateContract = useUpdateContract()
  const { data: planos } = usePlanosAtivos(tenantId)
  const { data: servicos } = useServicosAtivos(tenantId)
  const { toast } = useToast()

  const principalContract =
    contracts?.find((c) => isPrincipal(c) && (c.status === 'ativo' || c.status === 'suspenso')) ??
    contracts?.find((c) => isPrincipal(c) && c.status === 'rascunho')

  const specificContracts = contracts?.filter((c) => !isPrincipal(c) && c.status !== 'encerrado') ?? []

  const closedContracts = contracts?.filter((c) => c.status === 'encerrado') ?? []

  // --- Estados dialogs ---
  const [contractDialog, setContractDialog] = useState(false)
  const [editingContract, setEditingContract] = useState<Contract | null>(null)
  const [contractForm, setContractForm] = useState<ContractFormState>(defaultForm)

  const [encerrarDialog, setEncerrarDialog] = useState(false)
  const [encerrarTarget, setEncerrarTarget] = useState<Contract | null>(null)
  const [encerrarForm, setEncerrarForm] = useState<EncerrarFormState>({
    data_encerramento: '',
    motivo_encerramento: '',
    observacao_encerramento: '',
    ultima_competencia_cobrada: '',
  })

  // --- Handlers contrato ---
  const openNewContract = (natureza: ContrataNatureza = 'principal') => {
    setEditingContract(null)
    setContractForm({ ...defaultForm, natureza })
    setContractDialog(true)
  }

  const openEditContract = (c: Contract) => {
    setEditingContract(c)
    setContractForm({
      natureza: c.natureza ?? 'principal',
      inicio: c.inicio,
      dia_vencimento: String(c.dia_vencimento),
      indice_reajuste: c.indice_reajuste,
      apenas_reajuste_positivo: c.apenas_reajuste_positivo ?? true,
      desconto_valor: c.desconto_valor ? String(c.desconto_valor) : '',
    })
    setContractDialog(true)
  }

  const saveContract = async () => {
    const now = new Date().toISOString()
    const novoDesconto = contractForm.desconto_valor ? parseFloat(contractForm.desconto_valor) : 0
    try {
      if (editingContract) {
        await updateContract.mutateAsync({
          id: editingContract.id,
          data: {
            natureza: contractForm.natureza,
            inicio: contractForm.inicio,
            dia_vencimento: parseInt(contractForm.dia_vencimento),
            indice_reajuste: contractForm.indice_reajuste,
            apenas_reajuste_positivo: contractForm.apenas_reajuste_positivo,
            desconto_valor: novoDesconto || undefined,
            atualizado_em: now,
          },
        })
      } else {
        const novo: Contract = {
          id: uuidv4(),
          tenant_id: tenantId,
          client_id: clientId,
          natureza: contractForm.natureza,
          valor_mensal: 0,
          dia_vencimento: parseInt(contractForm.dia_vencimento),
          inicio: contractForm.inicio,
          indice_reajuste: contractForm.indice_reajuste,
          status: 'rascunho',
          apenas_reajuste_positivo: contractForm.apenas_reajuste_positivo,
          desconto_valor: novoDesconto || undefined,
          criado_em: now,
          atualizado_em: now,
        }
        await createContract.mutateAsync(novo)
      }
      toast({ title: 'Contrato salvo' })
      setContractDialog(false)
    } catch (err: unknown) {
      toast({
        title: err instanceof Error ? err.message : 'Erro ao salvar contrato',
        variant: 'destructive',
      })
    }
  }

  const openEncerrar = (c: Contract) => {
    setEncerrarTarget(c)
    setEncerrarForm({
      data_encerramento: new Date().toISOString().split('T')[0],
      motivo_encerramento: '',
      observacao_encerramento: '',
      ultima_competencia_cobrada: '',
    })
    setEncerrarDialog(true)
  }

  const encerrarContract = async () => {
    if (!encerrarTarget) return
    const { data_encerramento, motivo_encerramento, observacao_encerramento, ultima_competencia_cobrada } = encerrarForm
    if (!data_encerramento || !motivo_encerramento) {
      toast({ title: 'Preencha a data e o motivo', variant: 'destructive' })
      return
    }
    try {
      await updateContract.mutateAsync({
        id: encerrarTarget.id,
        data: {
          status: 'encerrado',
          data_encerramento,
          motivo_encerramento,
          observacao_encerramento: observacao_encerramento || undefined,
          ultima_competencia_cobrada: ultima_competencia_cobrada || undefined,
          atualizado_em: new Date().toISOString(),
        },
      })
      toast({ title: 'Contrato encerrado' })
      setEncerrarDialog(false)
    } catch {
      toast({ title: 'Erro ao encerrar contrato', variant: 'destructive' })
    }
  }

  const hasPrincipalAtivo = !!principalContract && principalContract.status !== 'encerrado'

  return (
    <div className="space-y-4">
      {/* Contrato Principal */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contrato Principal</p>
          {!hasPrincipalAtivo && (
            <Button size="sm" variant="outline" onClick={() => openNewContract('principal')}>
              <Plus className="mr-1 h-3 w-3" />
              Novo Principal
            </Button>
          )}
        </div>

        {principalContract ? (
          <ContractCard
            tenantId={tenantId}
            contract={principalContract}
            planos={planos}
            servicos={servicos}
            isExpandedInitially={true}
            onEdit={openEditContract}
            onEncerrar={openEncerrar}
          />
        ) : (
          <EmptyState
            icon={FileText}
            title="Sem contrato principal"
            description="Este cliente é um prospect. Crie um contrato principal para iniciar o faturamento."
            action={<Button onClick={() => openNewContract('principal')}>Novo Contrato Principal</Button>}
          />
        )}
      </div>

      {/* Contratos Específicos */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contratos Específicos</p>
          <Button size="sm" variant="outline" onClick={() => openNewContract('avulso')}>
            <Plus className="mr-1 h-3 w-3" />
            Novo Específico
          </Button>
        </div>

        {specificContracts.length === 0 ? (
          <p className="text-sm text-muted-foreground italic py-2">
            Nenhum contrato específico ativo.
          </p>
        ) : (
          <div className="space-y-3">
            {specificContracts.map((c) => (
              <ContractCard
                key={c.id}
                tenantId={tenantId}
                contract={c}
                planos={planos}
                servicos={servicos}
                isExpandedInitially={false}
                onEdit={openEditContract}
                onEncerrar={openEncerrar}
              />
            ))}
          </div>
        )}
      </div>

      {/* Histórico de Contratos Encerrados */}
      {closedContracts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Histórico de Contratos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {closedContracts.map((c) => {
                const natureza = c.natureza ?? 'principal'
                return (
                  <div
                    key={c.id}
                    className="rounded-md border px-3 py-2 text-sm flex flex-wrap gap-x-4 gap-y-1 items-center"
                  >
                    <Badge className={natureza !== 'principal' ? naturezaConfig[natureza].className : 'bg-gray-100 text-gray-600 border-transparent'}>
                      {natureza === 'principal' ? 'Principal' : naturezaConfig[natureza].label}
                    </Badge>
                    <Badge className={statusConfig[c.status].className}>{statusConfig[c.status].label}</Badge>
                    <span className="text-muted-foreground">
                      Início: <span className="text-foreground">{formatDate(c.inicio)}</span>
                    </span>
                    {c.data_encerramento && (
                      <span className="text-muted-foreground">
                        Encerrado: <span className="text-foreground">{formatDate(c.data_encerramento)}</span>
                      </span>
                    )}
                    {c.motivo_encerramento && (
                      <span className="text-muted-foreground truncate max-w-xs">
                        Motivo: <span className="text-foreground">{c.motivo_encerramento}</span>
                      </span>
                    )}
                    <span className="text-muted-foreground ml-auto">
                      <span className="font-medium text-foreground">{formatCurrency(c.valor_mensal)}</span>/mês
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ---- Dialogs ---- */}

      {/* Dialog: Novo/Editar Contrato */}
      <Dialog open={contractDialog} onOpenChange={setContractDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingContract ? 'Editar Contrato' : 'Novo Contrato'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Natureza do Contrato</Label>
              <Select
                value={contractForm.natureza}
                onValueChange={(v) => setContractForm((f) => ({ ...f, natureza: v as ContrataNatureza }))}
                disabled={!!editingContract}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="principal">Principal</SelectItem>
                  <SelectItem value="avulso">Avulso</SelectItem>
                  <SelectItem value="gestao_provisoria">Gestão Provisória</SelectItem>
                  <SelectItem value="emissao">Emissão</SelectItem>
                </SelectContent>
              </Select>
              {contractForm.natureza === 'principal' && !editingContract && (
                <p className="text-xs text-muted-foreground">
                  Apenas um contrato principal ativo é permitido por cliente.
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="ct-inicio">Data de Início</Label>
              <Input
                id="ct-inicio"
                type="date"
                value={contractForm.inicio}
                onChange={(e) => setContractForm((f) => ({ ...f, inicio: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ct-dia">Dia de Vencimento (1–28)</Label>
              <Input
                id="ct-dia"
                type="number"
                min="1"
                max="28"
                value={contractForm.dia_vencimento}
                onChange={(e) => setContractForm((f) => ({ ...f, dia_vencimento: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Índice de Reajuste</Label>
              <Select
                value={contractForm.indice_reajuste}
                onValueChange={(v) => setContractForm((f) => ({ ...f, indice_reajuste: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="IGPM">IGP-M</SelectItem>
                  <SelectItem value="IPCA">IPCA</SelectItem>
                  <SelectItem value="INPC">INPC</SelectItem>
                  <SelectItem value="nenhum">Nenhum</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <Label htmlFor="sw-positivo" className="cursor-pointer">Somente reajuste positivo</Label>
              <Switch
                id="sw-positivo"
                checked={contractForm.apenas_reajuste_positivo}
                onCheckedChange={(v) => setContractForm((f) => ({ ...f, apenas_reajuste_positivo: v }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ct-desconto">Desconto Mensal (R$, opcional)</Label>
              <Input
                id="ct-desconto"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={contractForm.desconto_valor}
                onChange={(e) => setContractForm((f) => ({ ...f, desconto_valor: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContractDialog(false)}>Cancelar</Button>
            <Button
              onClick={saveContract}
              disabled={!contractForm.inicio || !contractForm.dia_vencimento || updateContract.isPending || createContract.isPending}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Encerrar Contrato */}
      <Dialog open={encerrarDialog} onOpenChange={setEncerrarDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Encerrar Contrato</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="enc-data">Data de Encerramento</Label>
              <Input
                id="enc-data"
                type="date"
                value={encerrarForm.data_encerramento}
                onChange={(e) => setEncerrarForm((f) => ({ ...f, data_encerramento: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="enc-motivo">Motivo *</Label>
              <Input
                id="enc-motivo"
                value={encerrarForm.motivo_encerramento}
                onChange={(e) => setEncerrarForm((f) => ({ ...f, motivo_encerramento: e.target.value }))}
                placeholder="Ex: Rescisão a pedido do cliente"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="enc-comp">Última Competência Cobrada</Label>
              <Input
                id="enc-comp"
                value={encerrarForm.ultima_competencia_cobrada}
                onChange={(e) => setEncerrarForm((f) => ({ ...f, ultima_competencia_cobrada: e.target.value }))}
                placeholder="AAAA-MM"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="enc-obs">Observação</Label>
              <Input
                id="enc-obs"
                value={encerrarForm.observacao_encerramento}
                onChange={(e) => setEncerrarForm((f) => ({ ...f, observacao_encerramento: e.target.value }))}
                placeholder="Observações adicionais..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEncerrarDialog(false)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={encerrarContract}
              disabled={!encerrarForm.data_encerramento || !encerrarForm.motivo_encerramento || updateContract.isPending}
            >
              Confirmar Encerramento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
