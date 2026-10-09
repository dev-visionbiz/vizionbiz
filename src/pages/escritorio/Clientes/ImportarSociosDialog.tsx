import { useState, useMemo, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { UserCheck, UserPlus, Users, AlertCircle } from 'lucide-react'
import type { Client, PapelPessoa } from '@/domain/types'
import { useCreateClientVinculo } from '@/data/hooks/useClientVinculos'
import { useCreateClient } from '@/data/hooks/useClients'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import type { QSASocio } from '@/lib/brasilApi'
import type { PFComVinculo } from '@/data/hooks/useClientVinculos'

interface Props {
  open: boolean
  onClose: () => void
  tenantId: string
  clientId: string
  qsa: QSASocio[]
  todosClientes: Client[]
  jaVinculados: PFComVinculo[]
}

function normalizarNome(nome: string): string {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function mapQualificacao(q: string): PapelPessoa {
  const lower = q.toLowerCase()
  if (lower.includes('administrador')) return 'administrador'
  return 'socio'
}

type SocioStatus = 'vincular' | 'criar' | 'ja_vinculado'

interface SocioItem {
  qsa: QSASocio
  status: SocioStatus
  clienteMatch?: Client
  incluir: boolean
  novoNome: string
  novoEmail: string
  novoTelefone: string
}

export function ImportarSociosDialog({
  open, onClose, tenantId, clientId, qsa, todosClientes, jaVinculados,
}: Props) {
  const { toast } = useToast()
  const createClient = useCreateClient()
  const createVinculo = useCreateClientVinculo()

  const jaVinculadosIds = useMemo(
    () => new Set(jaVinculados.map((v) => v.client_pf_id)),
    [jaVinculados],
  )

  const pfsList = useMemo(
    () => todosClientes.filter((c) => c.tipo === 'fisica'),
    [todosClientes],
  )

  const inicial = useMemo<SocioItem[]>(() => {
    return qsa.map((s) => {
      const nomeNorm = normalizarNome(s.nome_socio)

      const exato = pfsList.find((c) => normalizarNome(c.razao_social) === nomeNorm)

      if (exato) {
        const jaVinculado = jaVinculadosIds.has(exato.id)
        return {
          qsa: s,
          status: jaVinculado ? 'ja_vinculado' : 'vincular',
          clienteMatch: exato,
          incluir: !jaVinculado,
          novoNome: s.nome_socio,
          novoEmail: '',
          novoTelefone: '',
        }
      }

      return {
        qsa: s,
        status: 'criar',
        incluir: true,
        novoNome: s.nome_socio,
        novoEmail: '',
        novoTelefone: '',
      }
    })
  }, [qsa, pfsList, jaVinculadosIds])

  const [itens, setItens] = useState<SocioItem[]>(inicial)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (open) setItens(inicial)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const totalAtivos = itens.filter((i) => i.incluir && i.status !== 'ja_vinculado').length

  const atualizar = (idx: number, patch: Partial<SocioItem>) => {
    setItens((prev) => prev.map((item, i) => (i === idx ? { ...item, ...patch } : item)))
  }

  const handleConfirmar = async () => {
    setSalvando(true)
    let erros = 0
    const vinculadosAte = jaVinculados.length

    try {
      let contador = 0
      for (const item of itens) {
        if (!item.incluir || item.status === 'ja_vinculado') continue

        const papel = mapQualificacao(item.qsa.qualificacao_socio)
        const isPrincipal = vinculadosAte + contador === 0

        if (item.status === 'vincular' && item.clienteMatch) {
          try {
            await createVinculo.mutateAsync({
              id: uuidv4(),
              tenant_id: tenantId,
              client_pj_id: clientId,
              client_pf_id: item.clienteMatch.id,
              papel,
              principal: isPrincipal,
            })
            contador++
          } catch {
            erros++
          }
        } else if (item.status === 'criar') {
          if (!item.novoNome.trim()) continue
          try {
            const pfId = uuidv4()
            await createClient.mutateAsync({
              client: {
                id: pfId,
                tenant_id: tenantId,
                tipo: 'fisica',
                razao_social: item.novoNome.trim(),
                regime: 'Autônomo',
                status: 'ativo',
                email: item.novoEmail.trim() || undefined,
                telefone: item.novoTelefone.trim() || undefined,
              },
            })
            await createVinculo.mutateAsync({
              id: uuidv4(),
              tenant_id: tenantId,
              client_pj_id: clientId,
              client_pf_id: pfId,
              papel,
              principal: isPrincipal,
            })
            contador++
          } catch {
            erros++
          }
        }
      }

      if (erros === 0) {
        toast({ title: `${contador} sócio(s) importado(s) com sucesso` })
      } else {
        toast({
          title: `${contador} importado(s), ${erros} falha(s)`,
          variant: 'destructive',
        })
      }
    } finally {
      setSalvando(false)
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Importar Sócios da Receita Federal
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          {qsa.length} sócio(s) encontrado(s) no QSA. Revise e confirme as ações abaixo.
        </p>

        <div className="space-y-3 py-1">
          {itens.map((item, idx) => (
            <div
              key={idx}
              className={`rounded-lg border p-3 space-y-2 transition-opacity ${
                !item.incluir && item.status !== 'ja_vinculado' ? 'opacity-50' : ''
              }`}
            >
              {/* Cabeçalho do sócio */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{item.qsa.nome_socio}</p>
                  <p className="text-xs text-muted-foreground">{item.qsa.qualificacao_socio}</p>
                </div>
                {item.status !== 'ja_vinculado' && (
                  <input
                    type="checkbox"
                    checked={item.incluir}
                    onChange={(e) => atualizar(idx, { incluir: e.target.checked })}
                    className="h-4 w-4 shrink-0 mt-0.5 rounded border"
                    aria-label={`Incluir ${item.qsa.nome_socio}`}
                  />
                )}
              </div>

              <Separator />

              {/* Status e ação */}
              {item.status === 'ja_vinculado' && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary" className="text-xs">Já vinculado</Badge>
                  {item.clienteMatch?.cpf && (
                    <span className="font-mono">{item.clienteMatch.cpf}</span>
                  )}
                </div>
              )}

              {item.status === 'vincular' && item.clienteMatch && (
                <div className="rounded-md bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 px-2.5 py-2 flex items-start gap-2">
                  <UserCheck className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-green-800 dark:text-green-300">
                      Encontrado no cadastro
                    </p>
                    <p className="text-xs text-green-700 dark:text-green-400 truncate">
                      {item.clienteMatch.razao_social}
                      {item.clienteMatch.cpf && (
                        <span className="font-mono ml-2">{item.clienteMatch.cpf}</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Ação: vincular como {mapQualificacao(item.qsa.qualificacao_socio)}
                    </p>
                  </div>
                </div>
              )}

              {item.status === 'criar' && (
                <div className="space-y-2">
                  <div className="rounded-md bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 px-2.5 py-2 flex items-start gap-2">
                    <UserPlus className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium text-blue-800 dark:text-blue-300">
                        Não encontrado — cadastro preliminar
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Será criado sem CPF. Você pode completar depois.
                      </p>
                    </div>
                  </div>

                  {item.incluir && (
                    <div className="space-y-2 pl-1">
                      <div className="space-y-1">
                        <Label className="text-xs">Nome *</Label>
                        <Input
                          value={item.novoNome}
                          onChange={(e) => atualizar(idx, { novoNome: e.target.value })}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Telefone</Label>
                          <Input
                            placeholder="(44) 99999-0000"
                            value={item.novoTelefone}
                            onChange={(e) => atualizar(idx, { novoTelefone: e.target.value })}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Email</Label>
                          <Input
                            type="email"
                            value={item.novoEmail}
                            onChange={(e) => atualizar(idx, { novoEmail: e.target.value })}
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {itens.some((i) => i.status === 'criar' && i.incluir) && (
          <div className="rounded-md border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40 px-3 py-2 flex gap-2 text-xs text-amber-800 dark:text-amber-300">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              Cadastros preliminares são criados sem CPF. Lembre-se de completar os dados
              posteriormente na ficha de cada sócio.
            </span>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={salvando}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmar}
            disabled={salvando || totalAtivos === 0}
          >
            {salvando ? 'Importando...' : `Confirmar (${totalAtivos})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
