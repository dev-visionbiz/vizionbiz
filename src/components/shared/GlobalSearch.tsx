import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'
import { useClients } from '@/data/hooks/useClients'
import { useOcorrencias } from '@/data/hooks/useOcorrencias'
import { useInvoices } from '@/data/hooks/useInvoices'
import { useDocuments } from '@/data/hooks/useDocuments'
import { usePinnedClient } from '@/lib/clientePinado'
import { Search, Building2, ClipboardList, Receipt, FolderOpen, X, Pin, AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Client } from '@/domain/types'

const MAX = 4
const INACTIVITY_THRESHOLD = 5 * 60 * 1000 // 5 minutos

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
function fmtComp(comp: string) {
  const [y, m] = comp.split('-')
  return `${MESES[parseInt(m, 10) - 1]}/${y}`
}

function clientLabel(c: Client) {
  return c.fantasia || c.razao_social
}

export function GlobalSearch() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const tenantId = currentUser?.tenant_id ?? ''
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const isFirstRender = useRef(true)

  // Rastreamento de inatividade real:
  // O timer seta a flag após 5 min sem eventos. A flag NÃO é limpa por eventos de
  // atividade — apenas pela navegação — para que o modal apareça mesmo que o usuário
  // mova o mouse ao clicar no link de navegação após voltar de uma pausa.
  const isInactiveRef = useRef(false)
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { clientePinado, pinClient, unpinClient } = usePinnedClient()

  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [open, setOpen] = useState(false)
  const [flash, setFlash] = useState(false)
  const [showInactivityModal, setShowInactivityModal] = useState(false)

  // Fecha modal se cliente for desafixado por outro meio
  useEffect(() => {
    if (!clientePinado) setShowInactivityModal(false)
  }, [clientePinado])

  // Inicia/reinicia o timer de inatividade. Eventos de atividade reiniciam o timer
  // mas não limpam a flag — ela só é limpa ao checar na navegação.
  useEffect(() => {
    function scheduleFlag() {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current)
      inactivityTimerRef.current = setTimeout(() => {
        isInactiveRef.current = true
      }, INACTIVITY_THRESHOLD)
    }

    scheduleFlag()

    function onActivity() { scheduleFlag() }

    window.addEventListener('mousemove', onActivity, { passive: true })
    window.addEventListener('keydown', onActivity, { passive: true })
    window.addEventListener('click', onActivity, { passive: true })
    window.addEventListener('scroll', onActivity, { passive: true })
    window.addEventListener('touchstart', onActivity, { passive: true })

    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current)
      window.removeEventListener('mousemove', onActivity)
      window.removeEventListener('keydown', onActivity)
      window.removeEventListener('click', onActivity)
      window.removeEventListener('scroll', onActivity)
      window.removeEventListener('touchstart', onActivity)
    }
  }, [])

  // Animação na barra ao navegar com cliente fixado + modal se houve inatividade
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    if (!clientePinado) return

    setFlash(true)
    const t1 = setTimeout(() => setFlash(false), 350)
    const t2 = setTimeout(() => setFlash(true),  550)
    const t3 = setTimeout(() => setFlash(false), 950)

    if (isInactiveRef.current) {
      setShowInactivityModal(true)
      isInactiveRef.current = false
    }

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [location.pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 220)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const { data: clients } = useClients(tenantId)
  const { data: ocorrencias } = useOcorrencias(tenantId)
  const { data: invoices } = useInvoices(tenantId)
  const { data: documents } = useDocuments(tenantId)

  const matchedClients = useMemo(() => {
    const q = debounced.trim().toLowerCase()
    if (!q || !clients) return []
    const qD = q.replace(/\D/g, '')
    return clients.filter(c => {
      if (c.razao_social?.toLowerCase().includes(q)) return true
      if (c.fantasia?.toLowerCase().includes(q)) return true
      const doc = (c.cnpj ?? c.cpf ?? '').replace(/\D/g, '')
      if (qD.length >= 3 && doc.includes(qD)) return true
      return false
    }).slice(0, MAX)
  }, [debounced, clients])

  const matchedIds = useMemo(() => new Set(matchedClients.map(c => c.id)), [matchedClients])

  const clientMap = useMemo(() => {
    if (!clients) return new Map<string, Client>()
    return new Map(clients.map(c => [c.id, c]))
  }, [clients])

  const matchedOcorrencias = useMemo(() => {
    const q = debounced.trim().toLowerCase()
    if (!q || !ocorrencias) return []
    return ocorrencias.filter(o =>
      (['pendente', 'em_andamento'].includes(o.status)) &&
      (
        (o.cliente_id && matchedIds.has(o.cliente_id)) ||
        o.titulo.toLowerCase().includes(q)
      )
    ).slice(0, MAX)
  }, [debounced, ocorrencias, matchedIds])

  const matchedInvoices = useMemo(() => {
    if (!invoices || matchedIds.size === 0) return []
    return invoices.filter(inv =>
      matchedIds.has(inv.client_id) && ['aberta', 'vencida'].includes(inv.status)
    ).slice(0, MAX)
  }, [invoices, matchedIds])

  const matchedDocsByClient = useMemo(() => {
    if (!documents || matchedIds.size === 0) return []
    const map = new Map<string, number>()
    for (const d of documents) {
      if (matchedIds.has(d.client_id)) map.set(d.client_id, (map.get(d.client_id) ?? 0) + 1)
    }
    return Array.from(map.entries()).slice(0, MAX)
  }, [documents, matchedIds])

  const hasResults = matchedClients.length > 0 || matchedOcorrencias.length > 0 || matchedInvoices.length > 0 || matchedDocsByClient.length > 0

  function select(path: string) {
    navigate(path)
    setOpen(false)
    setQuery('')
    setDebounced('')
  }

  function clear() {
    setQuery('')
    setDebounced('')
    setOpen(false)
    inputRef.current?.focus()
  }

  function handleUnpin() {
    unpinClient()
    setFlash(false)
    inputRef.current?.focus()
  }

  function handleModalContinue() {
    setShowInactivityModal(false)
  }

  function handleModalUnpin() {
    unpinClient()
    setShowInactivityModal(false)
    setFlash(false)
  }

  const isPinned = clientePinado !== null
  const pinnedName = isPinned ? clientLabel(clientePinado!) : ''

  const inputContainerClass = isPinned
    ? `w-full h-9 pl-10 pr-9 rounded-full text-sm font-semibold text-amber-950
       placeholder:text-amber-950 placeholder:opacity-100 placeholder:font-semibold
       dark:text-amber-100 dark:placeholder:text-amber-200 dark:placeholder:opacity-100
       focus:outline-none transition-all
       bg-amber-400 border-2 border-amber-500 shadow-sm
       dark:bg-amber-800/50 dark:border-amber-500
       focus:ring-2 focus:ring-amber-600/50 focus:border-amber-600
       ${flash ? 'ring-2 ring-amber-600 ring-offset-2 shadow-amber-400/60 shadow-md' : ''}`
    : `w-full h-9 pl-10 pr-9 rounded-full bg-background border shadow-sm text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/50 transition-all`

  return (
    <>
      <div ref={containerRef} className="relative flex-1 min-w-0 max-w-2xl">
        {/* Input */}
        <div className={`relative transition-all duration-300 ${flash ? 'scale-[1.015]' : ''}`}>
          {isPinned ? (
            <Pin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-900 dark:text-amber-400 pointer-events-none" />
          ) : (
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          )}

          <input
            ref={inputRef}
            type="text"
            className={inputContainerClass}
            placeholder={isPinned ? `${pinnedName} · fixado` : 'Pesquisar cliente, processo, fatura...'}
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true) }}
            onFocus={() => { if (query || isPinned) setOpen(true) }}
            onKeyDown={e => { if (e.key === 'Escape') { setOpen(false); (e.target as HTMLInputElement).blur() } }}
            autoComplete="off"
          />

          {/* Botão direito: limpar query ou desafixar cliente */}
          {(query || isPinned) && (
            <button
              className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors rounded-full
                ${isPinned && !query
                  ? 'text-amber-900 hover:text-amber-950 dark:text-amber-300 dark:hover:text-amber-100'
                  : 'text-muted-foreground hover:text-foreground'}`}
              onClick={query ? clear : handleUnpin}
              tabIndex={-1}
              title={isPinned && !query ? 'Desafixar cliente' : 'Limpar pesquisa'}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Dropdown */}
        {open && (debounced || isPinned) && (
          <div className="absolute top-11 left-0 right-0 z-50 bg-popover text-popover-foreground rounded-2xl shadow-2xl border overflow-hidden max-h-120 overflow-y-auto">

            {/* Banner cliente fixado (quando não há query digitada) */}
            {isPinned && !debounced && (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-200 dark:bg-amber-950/40 border-b border-amber-400 dark:border-amber-800">
                <Pin className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                <span className="text-xs font-semibold text-amber-900 dark:text-amber-400 flex-1 truncate">
                  {pinnedName} · cliente fixado
                </span>
                <button
                  className="text-xs text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-200 font-semibold underline-offset-2 hover:underline"
                  onClick={handleUnpin}
                >
                  Desafixar
                </button>
              </div>
            )}

            {debounced && !hasResults ? (
              <div className="px-5 py-6 text-center text-sm text-muted-foreground">
                Nenhum resultado para <span className="font-medium text-foreground">"{debounced}"</span>
              </div>
            ) : debounced ? (
              <>
                {/* Clientes */}
                {matchedClients.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 px-4 pt-3 pb-1.5">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Clientes</span>
                    </div>
                    {matchedClients.map(c => {
                      const isThisPinned = clientePinado?.id === c.id
                      return (
                        <button
                          key={c.id}
                          className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-accent text-left transition-colors"
                          onClick={() => select(`/escritorio/clientes/${c.id}`)}
                        >
                          <div className="mt-0.5 h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <Building2 className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm truncate">{c.razao_social}</span>
                              <Badge variant="outline" className="text-[10px] h-4 shrink-0">{c.tipo === 'fisica' ? 'PF' : 'PJ'}</Badge>
                            </div>
                            {c.fantasia && c.fantasia !== c.razao_social && (
                              <p className="text-xs text-muted-foreground truncate">{c.fantasia}</p>
                            )}
                            <p className="text-xs text-muted-foreground">{c.cnpj ?? c.cpf ?? ''}</p>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1 shrink-0">
                            <Badge
                              variant={c.status === 'ativo' ? 'default' : 'secondary'}
                              className="text-[10px] h-4"
                            >
                              {c.status === 'ativo' ? 'Ativo' : c.status === 'inativo' ? 'Inativo' : 'Em Abertura'}
                            </Badge>
                            {/* Botão fixar/desafixar */}
                            <button
                              className={`p-1 rounded-full transition-colors ${isThisPinned ? 'text-amber-500 hover:text-amber-700' : 'text-muted-foreground hover:text-amber-500'}`}
                              onClick={e => {
                                e.stopPropagation()
                                isThisPinned ? unpinClient() : pinClient(c)
                                setOpen(false)
                                setQuery('')
                                setDebounced('')
                              }}
                              title={isThisPinned ? 'Desafixar cliente' : 'Fixar cliente'}
                            >
                              <Pin className={`h-3.5 w-3.5 ${isThisPinned ? 'fill-amber-500' : ''}`} />
                            </button>
                          </div>
                        </button>
                      )
                    })}
                  </section>
                )}

                {/* Processos / Tarefas */}
                {matchedOcorrencias.length > 0 && (
                  <section className="border-t border-border">
                    <div className="flex items-center gap-2 px-4 pt-3 pb-1.5">
                      <ClipboardList className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Processos / Tarefas</span>
                    </div>
                    {matchedOcorrencias.map(o => {
                      const client = clientMap.get(o.cliente_id ?? '')
                      return (
                        <button
                          key={o.id}
                          className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-accent text-left transition-colors"
                          onClick={() => select(`/escritorio/ocorrencias?id=${o.id}`)}
                        >
                          <div className="mt-0.5 h-7 w-7 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                            <ClipboardList className="h-3.5 w-3.5 text-blue-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{o.titulo}</p>
                            {client && <p className="text-xs text-muted-foreground truncate">{clientLabel(client)}</p>}
                          </div>
                          <Badge
                            variant={o.status === 'em_andamento' ? 'default' : 'secondary'}
                            className="text-[10px] h-4 shrink-0 mt-1"
                          >
                            {o.status === 'em_andamento' ? 'Em andamento' : 'Pendente'}
                          </Badge>
                        </button>
                      )
                    })}
                  </section>
                )}

                {/* Financeiro em Aberto */}
                {matchedInvoices.length > 0 && (
                  <section className="border-t border-border">
                    <div className="flex items-center gap-2 px-4 pt-3 pb-1.5">
                      <Receipt className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Financeiro em Aberto</span>
                    </div>
                    {matchedInvoices.map(inv => {
                      const client = clientMap.get(inv.client_id)
                      return (
                        <button
                          key={inv.id}
                          className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-accent text-left transition-colors"
                          onClick={() => select(`/escritorio/financeiro?cliente=${inv.client_id}`)}
                        >
                          <div className={`mt-0.5 h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${inv.status === 'vencida' ? 'bg-red-500/10' : 'bg-amber-500/10'}`}>
                            <Receipt className={`h-3.5 w-3.5 ${inv.status === 'vencida' ? 'text-red-500' : 'text-amber-500'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm">{fmtComp(inv.competencia)}</p>
                              <span className="text-sm font-semibold tabular-nums">{formatCurrency(inv.valor_original)}</span>
                            </div>
                            {client && <p className="text-xs text-muted-foreground truncate">{clientLabel(client)}</p>}
                            <p className="text-xs text-muted-foreground">Vence: {formatDate(inv.vencimento)}</p>
                          </div>
                          <Badge
                            variant={inv.status === 'vencida' ? 'destructive' : 'secondary'}
                            className="text-[10px] h-4 shrink-0 mt-1"
                          >
                            {inv.status === 'vencida' ? 'Vencida' : 'Aberta'}
                          </Badge>
                        </button>
                      )
                    })}
                  </section>
                )}

                {/* Documentos */}
                {matchedDocsByClient.length > 0 && (
                  <section className="border-t border-border">
                    <div className="flex items-center gap-2 px-4 pt-3 pb-1.5">
                      <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Documentos</span>
                    </div>
                    {matchedDocsByClient.map(([clientId, count]) => {
                      const client = clientMap.get(clientId)
                      if (!client) return null
                      return (
                        <button
                          key={clientId}
                          className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-accent text-left transition-colors"
                          onClick={() => select(`/escritorio/documentos?cliente=${clientId}`)}
                        >
                          <div className="mt-0.5 h-7 w-7 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                            <FolderOpen className="h-3.5 w-3.5 text-emerald-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{clientLabel(client)}</p>
                            <p className="text-xs text-muted-foreground">{count} documento{count !== 1 ? 's' : ''} na pasta</p>
                          </div>
                        </button>
                      )
                    })}
                  </section>
                )}

                <div className="h-2" />
              </>
            ) : null}
          </div>
        )}
      </div>

      {/* Modal de alerta pós-inatividade */}
      {showInactivityModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleModalContinue}
          />
          <div className="relative bg-background rounded-2xl shadow-2xl border-2 border-amber-400 dark:border-amber-600 p-6 max-w-sm w-full animate-in fade-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center gap-4 text-center">

              {/* Ícone */}
              <div className="relative">
                <div className="h-16 w-16 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center ring-4 ring-amber-200 dark:ring-amber-800/60">
                  <Pin className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-amber-500 flex items-center justify-center shadow-md">
                  <AlertTriangle className="h-3.5 w-3.5 text-white" />
                </div>
              </div>

              {/* Texto */}
              <div className="space-y-1.5">
                <h2 className="font-bold text-base text-foreground">Cliente fixado detectado</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Após um período de inatividade, o cliente{' '}
                  <span className="font-semibold text-amber-700 dark:text-amber-400">{pinnedName}</span>{' '}
                  ainda está fixado na barra de pesquisa.
                </p>
                <p className="text-sm text-muted-foreground">
                  Deseja continuar com este cliente fixado?
                </p>
              </div>

              {/* Ações */}
              <div className="flex flex-col gap-2.5 w-full pt-1">
                <button
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-semibold text-sm transition-colors shadow-sm"
                  onClick={handleModalContinue}
                >
                  Sim, continuar com cliente fixado
                </button>
                <button
                  className="w-full py-2.5 px-4 rounded-xl border border-border hover:bg-accent text-foreground font-medium text-sm transition-colors"
                  onClick={handleModalUnpin}
                >
                  Desafixar cliente
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  )
}
