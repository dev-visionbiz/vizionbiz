import { useState } from 'react'
import { format } from 'date-fns'
import {
  Plus, Search, X, CreditCard, AlertTriangle, CheckCircle2, Clock, Upload,
  MoreHorizontal, Eye, Pencil, CheckCheck, FileText, Download, Ban,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/auth/AuthProvider'
import { useClients } from '@/data/hooks/useClients'
import { useGuias } from '@/data/hooks/useGuias'
import { storageService } from '@/lib/storage'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import type { TipoGuia, GuiaStatus, GuiaRecolhimento } from '@/domain/types'
import { TIPO_GUIA_CONFIG, STATUS_GUIA_CONFIG, TIPOS_GUIA_ORDENADOS } from './guiasConfig'
import { NovaGuiaDialog } from './NovaGuiaDialog'
import { EditarGuiaDialog } from './EditarGuiaDialog'
import { ImportarGuiasDialog } from './ImportarGuiasDialog'
import { GuiaDetalheDialog } from './GuiaDetalheDialog'
import { BaixaManualDialog } from './BaixaManualDialog'
import { SegundaViaDialog } from './SegundaViaDialog'
import { VisualizarGuiaPDFDialog } from './VisualizarGuiaPDFDialog'
import { useToast } from '@/components/ui/use-toast'

export default function GuiasPage() {
  const { currentUser } = useAuth()
  const tenantId = currentUser?.tenant_id ?? ''
  const { data: clientes = [] } = useClients(tenantId)
  const { toast } = useToast()

  const [filtroTipo, setFiltroTipo] = useState<TipoGuia | 'todos'>('todos')
  const [filtroStatus, setFiltroStatus] = useState<GuiaStatus | 'todos'>('todos')
  const [filtroCliente, setFiltroCliente] = useState<string>('todos')
  const [filtroCompetencia, setFiltroCompetencia] = useState('')
  const [busca, setBusca] = useState('')

  const [novaOpen, setNovaOpen] = useState(false)
  const [importarOpen, setImportarOpen] = useState(false)
  const [detalheGuia, setDetalheGuia] = useState<GuiaRecolhimento | null>(null)
  const [editarGuia, setEditarGuia] = useState<GuiaRecolhimento | null>(null)
  const [baixaGuia, setBaixaGuia] = useState<GuiaRecolhimento | null>(null)
  const [segundaViaGuia, setSegundaViaGuia] = useState<GuiaRecolhimento | null>(null)
  const [visualizarPDFGuia, setVisualizarPDFGuia] = useState<GuiaRecolhimento | null>(null)

  const { data: guias = [], isLoading } = useGuias(tenantId, {
    tipo: filtroTipo !== 'todos' ? filtroTipo : undefined,
    status: filtroStatus !== 'todos' ? filtroStatus : undefined,
    clienteId: filtroCliente !== 'todos' ? filtroCliente : undefined,
    competencia: filtroCompetencia || undefined,
    busca: busca || undefined,
  })

  const hoje = format(new Date(), 'yyyy-MM-dd')
  const mesAtual = format(new Date(), 'yyyy-MM')

  const temFiltro =
    filtroTipo !== 'todos' ||
    filtroStatus !== 'todos' ||
    filtroCliente !== 'todos' ||
    !!filtroCompetencia ||
    !!busca

  function limparFiltros() {
    setFiltroTipo('todos')
    setFiltroStatus('todos')
    setFiltroCliente('todos')
    setFiltroCompetencia('')
    setBusca('')
  }

  const todasGuias = useGuias(tenantId).data ?? []

  const totalAVencer = todasGuias.filter((g) => g.status === 'emitida' && g.vencimento >= hoje)
  const totalVencidas = todasGuias.filter((g) => g.status === 'vencida')
  const totalPagasMes = todasGuias.filter((g) => g.status === 'paga' && g.pago_em?.startsWith(mesAtual))
  const totalAgEmissao = todasGuias.filter((g) => g.status === 'aguardando_emissao')

  const somaAVencer = totalAVencer.reduce((s, g) => s + g.valor, 0)
  const somaVencidas = totalVencidas.reduce((s, g) => s + (g.valor + (g.valor_multa ?? 0) + (g.valor_juros ?? 0)), 0)
  const somaPagasMes = totalPagasMes.reduce((s, g) => s + (g.pago_valor ?? g.valor), 0)

  function nomeCliente(clienteId: string) {
    const c = clientes.find((cl) => cl.id === clienteId)
    return c?.fantasia ?? c?.razao_social ?? '–'
  }

  async function baixarArquivo(storageKey: string, nomeArquivo: string) {
    try {
      const url = await storageService.gerarUrlDownload(storageKey, 120)
      const a = document.createElement('a')
      a.href = url
      a.download = nomeArquivo
      a.click()
    } catch {
      toast({ title: 'Arquivo não encontrado', description: 'O arquivo pode ter sido removido.', variant: 'destructive' })
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 px-4 pt-4 pb-3 border-b bg-background">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Guias e Recolhimentos</h1>
            <p className="text-sm text-muted-foreground">
              DARF, DAS, FGTS, boletos municipais e outras obrigações
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" onClick={() => setImportarOpen(true)} size="sm" className="gap-2">
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Importar</span>
            </Button>
            <Button onClick={() => setNovaOpen(true)} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nova Guia</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4 max-w-6xl mx-auto">

          {/* Cards de resumo */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <SummaryCard
              label="A Vencer"
              count={totalAVencer.length}
              value={somaAVencer}
              icon={<Clock className="h-5 w-5 text-blue-600" />}
              colorClass="border-blue-200 bg-blue-50/60"
            />
            <SummaryCard
              label="Vencidas"
              count={totalVencidas.length}
              value={somaVencidas}
              icon={<AlertTriangle className="h-5 w-5 text-red-600" />}
              colorClass="border-red-200 bg-red-50/60"
            />
            <SummaryCard
              label="Pagas no Mês"
              count={totalPagasMes.length}
              value={somaPagasMes}
              icon={<CheckCircle2 className="h-5 w-5 text-green-600" />}
              colorClass="border-green-200 bg-green-50/60"
            />
            <SummaryCard
              label="Ag. Emissão"
              count={totalAgEmissao.length}
              value={totalAgEmissao.reduce((s, g) => s + g.valor, 0)}
              icon={<CreditCard className="h-5 w-5 text-zinc-500" />}
              colorClass="border-zinc-200 bg-zinc-50/60"
            />
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-45 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Buscar..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-8 h-9"
              />
            </div>

            <Select value={filtroTipo} onValueChange={(v) => setFiltroTipo(v as TipoGuia | 'todos')}>
              <SelectTrigger className="h-9 w-35">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                {TIPOS_GUIA_ORDENADOS.map((t) => (
                  <SelectItem key={t} value={t}>{TIPO_GUIA_CONFIG[t].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filtroStatus} onValueChange={(v) => setFiltroStatus(v as GuiaStatus | 'todos')}>
              <SelectTrigger className="h-9 w-35">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                {(Object.keys(STATUS_GUIA_CONFIG) as GuiaStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_GUIA_CONFIG[s].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filtroCliente} onValueChange={setFiltroCliente}>
              <SelectTrigger className="h-9 w-40">
                <SelectValue placeholder="Cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os clientes</SelectItem>
                {clientes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.fantasia ?? c.razao_social}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              placeholder="Competência (AAAA-MM)"
              value={filtroCompetencia}
              onChange={(e) => setFiltroCompetencia(e.target.value)}
              className="h-9 w-44"
              maxLength={7}
            />

            {temFiltro && (
              <Button variant="ghost" size="sm" onClick={limparFiltros} className="gap-1.5 text-muted-foreground h-9">
                <X className="h-3.5 w-3.5" />
                Limpar
              </Button>
            )}
          </div>

          {/* Lista */}
          {isLoading ? (
            <div className="py-12 flex items-center justify-center text-muted-foreground text-sm">
              Carregando...
            </div>
          ) : guias.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-center gap-3">
              <CreditCard className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-muted-foreground text-sm">
                {temFiltro
                  ? 'Nenhuma guia encontrada para os filtros aplicados.'
                  : 'Nenhuma guia cadastrada ainda.'}
              </p>
              {!temFiltro && (
                <Button variant="outline" size="sm" onClick={() => setNovaOpen(true)} className="gap-2 mt-1">
                  <Plus className="h-4 w-4" />
                  Cadastrar primeira guia
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {guias.map((guia) => {
                const tipoConfig = TIPO_GUIA_CONFIG[guia.tipo]
                const statusConfig = STATUS_GUIA_CONFIG[guia.status]
                const TipoIcon = tipoConfig.icon
                const podeBaixar = guia.status === 'emitida' || guia.status === 'vencida'
                const podeEditar = guia.status !== 'paga' && guia.status !== 'cancelada'
                const temArquivoGuia = !!guia.arquivo_key
                const temArquivo = !!(guia.arquivo_key || guia.comprovante_storage_key || guia.segunda_via_arquivo_key)

                return (
                  <div
                    key={guia.id}
                    className="border rounded-lg bg-card hover:bg-accent/30 transition-colors group cursor-pointer"
                    onClick={() => setDetalheGuia(guia)}
                  >
                    <div className="p-3 sm:p-4">
                      <div className="flex items-start gap-3">
                        {/* Ícone tipo */}
                        <div className={cn(
                          'mt-0.5 shrink-0 h-8 w-8 rounded-md flex items-center justify-center',
                          tipoConfig.cor,
                        )}>
                          <TipoIcon className={cn('h-4 w-4', tipoConfig.corTexto)} />
                        </div>

                        {/* Conteúdo principal */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="font-medium text-sm truncate">{guia.descricao}</span>
                            <Badge
                              variant="outline"
                              className={cn('text-xs shrink-0', tipoConfig.cor, tipoConfig.corTexto, tipoConfig.corBorda)}
                            >
                              {tipoConfig.labelCurto}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={cn('text-xs shrink-0', statusConfig.cor, statusConfig.corTexto)}
                            >
                              {statusConfig.label}
                            </Badge>
                          </div>

                          <div className="text-xs text-muted-foreground">{nomeCliente(guia.cliente_id)}</div>

                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span>
                              Comp.: <span className="text-foreground">{guia.competencia}</span>
                            </span>
                            <span>
                              Venc.:{' '}
                              <span className={cn(
                                'font-medium',
                                guia.status === 'vencida'
                                  ? 'text-red-600'
                                  : guia.vencimento <= hoje && guia.status === 'emitida'
                                    ? 'text-orange-600'
                                    : 'text-foreground',
                              )}>
                                {formatDate(guia.vencimento)}
                              </span>
                            </span>
                            {guia.status === 'paga' && guia.pago_em && (
                              <span>
                                Pago em:{' '}
                                <span className="text-green-600 font-medium">{formatDate(guia.pago_em)}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Valor + ações */}
                        <div className="shrink-0 flex flex-col items-end gap-2">
                          <div className="text-right">
                            <div className="font-semibold text-sm">{formatCurrency(guia.valor)}</div>
                            {(guia.valor_multa || guia.valor_juros) && (
                              <div className="text-xs text-red-600">
                                +{formatCurrency((guia.valor_multa ?? 0) + (guia.valor_juros ?? 0))} enc.
                              </div>
                            )}
                          </div>

                          {/* Ações inline + dropdown */}
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            {podeBaixar && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 text-xs gap-1"
                                onClick={() => setBaixaGuia(guia)}
                              >
                                <CheckCheck className="h-3 w-3" />
                                Baixar
                              </Button>
                            )}

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={() => setDetalheGuia(guia)}>
                                  <Eye className="h-3.5 w-3.5 mr-2" />
                                  Visualizar
                                </DropdownMenuItem>

                                {temArquivoGuia && (
                                  <DropdownMenuItem onClick={() => setVisualizarPDFGuia(guia)}>
                                    <FileText className="h-3.5 w-3.5 mr-2" />
                                    Visualizar PDF
                                  </DropdownMenuItem>
                                )}

                                {podeEditar && (
                                  <DropdownMenuItem onClick={() => setEditarGuia(guia)}>
                                    <Pencil className="h-3.5 w-3.5 mr-2" />
                                    Editar
                                  </DropdownMenuItem>
                                )}

                                {podeBaixar && (
                                  <DropdownMenuItem onClick={() => setBaixaGuia(guia)}>
                                    <CheckCheck className="h-3.5 w-3.5 mr-2" />
                                    Registrar pagamento
                                  </DropdownMenuItem>
                                )}

                                <DropdownMenuItem onClick={() => setSegundaViaGuia(guia)}>
                                  <FileText className="h-3.5 w-3.5 mr-2" />
                                  Segunda via
                                </DropdownMenuItem>

                                {temArquivo && (
                                  <>
                                    <DropdownMenuSeparator />
                                    {guia.arquivo_key && (
                                      <DropdownMenuItem
                                        onClick={() => baixarArquivo(guia.arquivo_key!, `guia-${guia.descricao}.pdf`)}
                                      >
                                        <Download className="h-3.5 w-3.5 mr-2" />
                                        Baixar guia
                                      </DropdownMenuItem>
                                    )}
                                    {guia.comprovante_storage_key && (
                                      <DropdownMenuItem
                                        onClick={() => baixarArquivo(guia.comprovante_storage_key!, `comprovante-${guia.descricao}.pdf`)}
                                      >
                                        <Download className="h-3.5 w-3.5 mr-2" />
                                        Baixar comprovante
                                      </DropdownMenuItem>
                                    )}
                                    {guia.segunda_via_arquivo_key && (
                                      <DropdownMenuItem
                                        onClick={() => baixarArquivo(guia.segunda_via_arquivo_key!, `segunda-via-${guia.descricao}.pdf`)}
                                      >
                                        <Download className="h-3.5 w-3.5 mr-2" />
                                        Baixar 2ª via
                                      </DropdownMenuItem>
                                    )}
                                  </>
                                )}

                                {guia.status !== 'paga' && guia.status !== 'cancelada' && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-destructive focus:text-destructive"
                                      onClick={() => {
                                        setDetalheGuia(guia)
                                      }}
                                    >
                                      <Ban className="h-3.5 w-3.5 mr-2" />
                                      Cancelar guia
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      {novaOpen && (
        <NovaGuiaDialog
          open={novaOpen}
          onClose={() => setNovaOpen(false)}
          tenantId={tenantId}
          userId={currentUser?.id ?? ''}
          clientes={clientes}
        />
      )}

      {importarOpen && (
        <ImportarGuiasDialog
          open={importarOpen}
          onClose={() => setImportarOpen(false)}
          tenantId={tenantId}
          userId={currentUser?.id ?? ''}
          clientes={clientes}
        />
      )}

      {detalheGuia && (
        <GuiaDetalheDialog
          guia={detalheGuia}
          tenantId={tenantId}
          open={!!detalheGuia}
          onClose={() => setDetalheGuia(null)}
          nomeCliente={nomeCliente(detalheGuia.cliente_id)}
          onBaixar={() => { setBaixaGuia(detalheGuia); setDetalheGuia(null) }}
          onEditar={() => { setEditarGuia(detalheGuia); setDetalheGuia(null) }}
          onSegundaVia={() => { setSegundaViaGuia(detalheGuia); setDetalheGuia(null) }}
          onBaixarArquivo={baixarArquivo}
        />
      )}

      {editarGuia && (
        <EditarGuiaDialog
          guia={editarGuia}
          nomeCliente={nomeCliente(editarGuia.cliente_id)}
          open={!!editarGuia}
          onClose={() => setEditarGuia(null)}
        />
      )}

      {baixaGuia && (
        <BaixaManualDialog
          guia={baixaGuia}
          open={!!baixaGuia}
          onClose={() => setBaixaGuia(null)}
          userId={currentUser?.id ?? ''}
        />
      )}

      {segundaViaGuia && (
        <SegundaViaDialog
          guia={segundaViaGuia}
          open={!!segundaViaGuia}
          onClose={() => setSegundaViaGuia(null)}
          userId={currentUser?.id ?? ''}
        />
      )}

      {visualizarPDFGuia?.arquivo_key && (
        <VisualizarGuiaPDFDialog
          open={!!visualizarPDFGuia}
          onClose={() => setVisualizarPDFGuia(null)}
          guia={visualizarPDFGuia}
          arquivoKey={visualizarPDFGuia.arquivo_key}
          titulo={visualizarPDFGuia.descricao}
        />
      )}
    </div>
  )
}

function SummaryCard({
  label, count, value, icon, colorClass,
}: {
  label: string
  count: number
  value: number
  icon: React.ReactNode
  colorClass: string
}) {
  return (
    <div className={cn('border rounded-lg p-3 sm:p-4', colorClass)}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground font-medium">{label}</p>
          <p className="text-xl font-bold mt-0.5">{count}</p>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{formatCurrency(value)}</p>
        </div>
        <div className="shrink-0 mt-0.5">{icon}</div>
      </div>
    </div>
  )
}
