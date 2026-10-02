import { useState, useEffect, useRef } from 'react'
import {
  Timer, PauseCircle, PlayCircle, SkipForward,
  X, Minus, Coffee, Brain, Volume2, VolumeX, Clock, ExternalLink, ChevronUp,
} from 'lucide-react'
import { format } from 'date-fns'
import type { ChecklistItemProgresso } from '@/domain/types'

// ── Pomodoro phases ──────────────────────────────────────────────────────────

type Fase = 'foco' | 'pausa_curta' | 'pausa_longa'

const DUR: Record<Fase, number> = {
  foco: 25 * 60,
  pausa_curta: 5 * 60,
  pausa_longa: 15 * 60,
}

// ── Áudio mecânico via Web Audio API ─────────────────────────────────────────

function ruido(ctx: AudioContext, duracaoS: number): AudioBufferSourceNode {
  const n = Math.floor(ctx.sampleRate * duracaoS)
  const buf = ctx.createBuffer(1, n, ctx.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1
  const src = ctx.createBufferSource()
  src.buffer = buf
  return src
}

function tocarSom(tipo: 'tick' | 'tock' | 'fim_foco' | 'fim_pausa') {
  try {
    const ctx = new AudioContext()
    const t = ctx.currentTime

    if (tipo === 'tick' || tipo === 'tock') {
      // Clique mecânico: ruído branco filtrado em banda estreita
      const dur = 0.03
      const src = ruido(ctx, dur)
      const bp = ctx.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = tipo === 'tick' ? 3000 : 2100
      bp.Q.value = 2.5
      const env = ctx.createGain()
      env.gain.setValueAtTime(tipo === 'tick' ? 0.7 : 0.5, t)
      env.gain.exponentialRampToValueAtTime(0.001, t + dur)
      src.connect(bp); bp.connect(env); env.connect(ctx.destination)
      src.start(t); src.stop(t + dur)
      setTimeout(() => ctx.close(), 300)

    } else if (tipo === 'fim_foco') {
      // Sino de timer de cozinha: harmônicos metálicos + tremolo 28 Hz (BRRRING)
      const dur = 3.8
      // Parciais com razões inarmônicas típicas de sino metálico
      const parciais: [number, number][] = [[880, 0.40], [2420, 0.20], [4840, 0.10]]
      const mistura = ctx.createGain()
      mistura.gain.value = 1

      parciais.forEach(([freq, vol]) => {
        const o = ctx.createOscillator()
        const g = ctx.createGain()
        o.type = 'sine'; o.frequency.value = freq; g.gain.value = vol
        o.connect(g); g.connect(mistura)
        o.start(t); o.stop(t + dur)
      })

      // Tremolo (amplitude modulation) → efeito "BRRRING"
      const lfo = ctx.createOscillator()
      lfo.type = 'sine'; lfo.frequency.value = 28
      const lfoAmp = ctx.createGain(); lfoAmp.gain.value = 0.42
      const tremoloGain = ctx.createGain(); tremoloGain.gain.value = 0.45
      lfo.connect(lfoAmp); lfoAmp.connect(tremoloGain.gain)
      lfo.start(t); lfo.stop(t + dur)

      // Envelope de decaimento geral
      const env = ctx.createGain()
      env.gain.setValueAtTime(0.5, t)
      env.gain.exponentialRampToValueAtTime(0.001, t + dur)

      mistura.connect(tremoloGain); tremoloGain.connect(env); env.connect(ctx.destination)
      setTimeout(() => ctx.close(), (dur + 0.5) * 1000)

    } else {
      // fim_pausa: 3 cliques mecânicos suaves (avanço do mecanismo)
      for (let i = 0; i < 3; i++) {
        const delay = t + i * 0.13
        const src = ruido(ctx, 0.025)
        const bp = ctx.createBiquadFilter()
        bp.type = 'bandpass'; bp.frequency.value = 1800 + i * 350; bp.Q.value = 2
        const env = ctx.createGain()
        env.gain.setValueAtTime(0.3, delay)
        env.gain.exponentialRampToValueAtTime(0.001, delay + 0.025)
        src.connect(bp); bp.connect(env); env.connect(ctx.destination)
        src.start(delay); src.stop(delay + 0.03)
      }
      setTimeout(() => ctx.close(), 800)
    }
  } catch { /* AudioContext indisponível */ }
}

// ── Utilitários ──────────────────────────────────────────────────────────────

function mmss(s: number): string {
  const m = Math.floor(s / 60)
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

function calcularDecorridoMs(item: ChecklistItemProgresso): number {
  if (!item.inicio_em) return 0
  const inicio = new Date(item.inicio_em).getTime()
  const fim = item.timer_pausado_em ? new Date(item.timer_pausado_em).getTime() : Date.now()
  return Math.max(0, fim - inicio - (item.tempo_pausado_acumulado_ms ?? 0))
}

function formatarTempo(ms: number): string {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const h = Math.floor(m / 60)
  if (h > 0) return `${h}h ${m % 60}min`
  if (m > 0) return `${m}min ${s % 60}s`
  return `${s}s`
}

function estadoInicial(item: ChecklistItemProgresso, duracaoFoco: number): { segundos: number; ciclos: number } {
  const decorridoMs = calcularDecorridoMs(item)
  if (decorridoMs === 0 || !item.inicio_em) return { segundos: duracaoFoco, ciclos: 0 }
  const decorridoSeg = Math.floor(decorridoMs / 1000)
  const ciclosCompletos = Math.floor(decorridoSeg / duracaoFoco)
  const segundosNoCicloAtual = decorridoSeg % duracaoFoco
  return {
    segundos: Math.max(1, duracaoFoco - segundosNoCicloAtual),
    ciclos: ciclosCompletos,
  }
}

// ── Props ────────────────────────────────────────────────────────────────────

export interface PomodoroFloatProps {
  item: ChecklistItemProgresso
  tarefaTitulo?: string
  clienteNome?: string
  dataPrevista?: string
  onPausar: () => void
  onRetomar: () => void
  onFechar: () => void
  onNavegar?: () => void
}

// ── Componente ───────────────────────────────────────────────────────────────

export function PomodoroFloat({
  item,
  tarefaTitulo,
  clienteNome,
  dataPrevista,
  onPausar,
  onRetomar,
  onFechar,
  onNavegar,
}: PomodoroFloatProps) {
  const checklistRodando = !!item.inicio_em && !item.concluido && !item.timer_pausado_em

  // Duration comes from the item's estimated time; fallback to classic 25 min
  const duracaoFoco = item.tempo_estimado_min ? item.tempo_estimado_min * 60 : 25 * 60
  const duracaoFocoRef = useRef(duracaoFoco)
  duracaoFocoRef.current = duracaoFoco

  // Compute initial countdown from actual elapsed time
  const { segundos: segInicial, ciclos: ciclosInicial } = estadoInicial(item, duracaoFoco)

  // Pomodoro state
  const [fase, setFaseState]        = useState<Fase>('foco')
  const [segundos, setSegState]     = useState(segInicial)
  const [ciclos, setCiclosState]    = useState(ciclosInicial)
  const [rodando, setRodandoState]  = useState(checklistRodando)
  const [minimizado, setMinimizado] = useState(false)
  const [tickTockAtivo, setTickTockAtivo] = useState(false)
  // Tick counter to force re-render of elapsed time each second
  const [tick, setTick] = useState(0)

  // Refs para evitar closures stale no interval
  const faseRef         = useRef<Fase>('foco')
  const segRef          = useRef(segInicial)
  const ciclosRef       = useRef(ciclosInicial)
  const rodandoRef      = useRef(checklistRodando)
  const tickTockRef     = useRef(false)
  const tickParidadeRef = useRef(0) // alterna tick/tock
  const onPausarRef     = useRef(onPausar)
  const onRetomarRef    = useRef(onRetomar)
  onPausarRef.current  = onPausar
  onRetomarRef.current = onRetomar
  tickTockRef.current  = tickTockAtivo

  const setFase    = (f: Fase)    => { faseRef.current    = f; setFaseState(f) }
  const setSeg     = (s: number)  => { segRef.current     = s; setSegState(s) }
  const setCiclos  = (c: number)  => { ciclosRef.current  = c; setCiclosState(c) }
  const setRodando = (r: boolean) => { rodandoRef.current = r; setRodandoState(r) }

  const handleFaseCompletaRef = useRef(() => {})
  handleFaseCompletaRef.current = () => {
    const f = faseRef.current
    if (f === 'foco') {
      tocarSom('fim_foco')
      const novos = ciclosRef.current + 1
      setCiclos(novos)
      onPausarRef.current()
      const prox: Fase = novos % 4 === 0 ? 'pausa_longa' : 'pausa_curta'
      setFase(prox)
      setSeg(DUR[prox])
      // break roda automaticamente
    } else {
      tocarSom('fim_pausa')
      setFase('foco')
      setSeg(duracaoFoco)
      setRodando(false) // aguarda usuário iniciar próximo foco
    }
  }

  // Reset countdown when item changes or a new timer session starts
  useEffect(() => {
    const { segundos: s, ciclos: c } = estadoInicial(item, duracaoFocoRef.current)
    setFase('foco')
    setSeg(s)
    setCiclos(c)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id, item.inicio_em])

  // Sync com checklist durante foco
  useEffect(() => {
    if (faseRef.current !== 'foco') return
    setRodando(checklistRodando)
  }, [checklistRodando])

  // Countdown + tick-tock
  useEffect(() => {
    if (!rodando) return
    const id = setInterval(() => {
      // tick-tock contínuo durante foco
      if (tickTockRef.current && faseRef.current === 'foco') {
        tocarSom(tickParidadeRef.current % 2 === 0 ? 'tick' : 'tock')
        tickParidadeRef.current++
      } else {
        // tick nos últimos 5 segundos de foco
        if (faseRef.current === 'foco' && segRef.current <= 5 && segRef.current > 1) {
          tocarSom('tick')
        }
      }

      const next = segRef.current - 1
      if (next <= 0) {
        handleFaseCompletaRef.current()
      } else {
        setSeg(next)
      }
      setTick(t => t + 1) // força re-render p/ elapsed time
    }, 1000)
    return () => clearInterval(id)
  }, [rodando])

  // Controles
  function handleToggle() {
    if (rodando) {
      setRodando(false)
      if (faseRef.current === 'foco') onPausar()
    } else {
      tickParidadeRef.current = 0
      setRodando(true)
      if (faseRef.current === 'foco') onRetomar()
    }
  }

  function handlePular() {
    const f = faseRef.current
    if (f === 'foco') {
      tocarSom('fim_foco')
      const novos = ciclosRef.current + 1
      setCiclos(novos)
      onPausar()
      const prox: Fase = novos % 4 === 0 ? 'pausa_longa' : 'pausa_curta'
      setFase(prox)
      setSeg(DUR[prox])
      tickParidadeRef.current = 0
      setRodando(true)
    } else {
      tocarSom('fim_pausa')
      setFase('foco')
      setSeg(duracaoFoco)
      setRodando(false)
    }
  }

  // Drag
  const [pos, setPos] = useState(() => ({
    top:  Math.max(20, (typeof window !== 'undefined' ? window.innerHeight : 800)  - 420),
    left: Math.max(20, (typeof window !== 'undefined' ? window.innerWidth  : 1200) - 278),
  }))
  const dragRef = useRef<{ mx: number; my: number; pt: number; pl: number } | null>(null)

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return
      setPos({
        top:  Math.max(0, dragRef.current.pt + (e.clientY - dragRef.current.my)),
        left: Math.max(0, dragRef.current.pl + (e.clientX - dragRef.current.mx)),
      })
    }
    const onTouch = (e: TouchEvent) => {
      if (!dragRef.current) return
      const t = e.touches[0]
      setPos({
        top:  Math.max(0, dragRef.current.pt + (t.clientY - dragRef.current.my)),
        left: Math.max(0, dragRef.current.pl + (t.clientX - dragRef.current.mx)),
      })
    }
    const onUp = () => { dragRef.current = null }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onTouch, { passive: true })
    window.addEventListener('touchend', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onTouch)
      window.removeEventListener('touchend', onUp)
    }
  }, [])

  function startDrag(clientX: number, clientY: number) {
    dragRef.current = { mx: clientX, my: clientY, pt: pos.top, pl: pos.left }
  }

  // Dados calculados
  const isFoco       = fase === 'foco'
  const durFaseAtual  = fase === 'foco' ? duracaoFoco : DUR[fase]
  const pct          = Math.round(((durFaseAtual - segundos) / durFaseAtual) * 100)
  const urgente      = segundos <= 10 && rodando && isFoco
  const decorridoMs  = calcularDecorridoMs(item)
  const tempoEstimMs = item.tempo_estimado_min ? item.tempo_estimado_min * 60_000 : null
  const pctEstimado  = tempoEstimMs ? Math.min(100, Math.round((decorridoMs / tempoEstimMs) * 100)) : null

  // ── Minimized card ───────────────────────────────────────────────────────────
  if (minimizado) {
    return (
      <div
        style={{ top: pos.top, left: pos.left, width: 192 }}
        className="fixed z-50 rounded-2xl border bg-card shadow-2xl overflow-hidden select-none"
      >
        {/* Drag handle + expandir */}
        <div
          className="flex items-center justify-between px-3 pt-2.5 pb-1 cursor-grab"
          onMouseDown={(e) => { e.preventDefault(); startDrag(e.clientX, e.clientY) }}
          onTouchStart={(e) => { const t = e.touches[0]; startDrag(t.clientX, t.clientY) }}
        >
          <div className="flex items-center gap-1.5 pointer-events-none">
            {isFoco
              ? <Brain className="h-3.5 w-3.5 text-red-500" />
              : <Coffee className="h-3.5 w-3.5 text-emerald-500" />}
            <span className={`text-[10px] font-semibold uppercase tracking-wide ${
              isFoco ? 'text-red-500' : 'text-emerald-500'
            }`}>
              {isFoco ? 'Foco' : fase === 'pausa_longa' ? 'Pausa longa' : 'Pausa'}
            </span>
            {rodando && <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />}
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setMinimizado(false) }}
            className="pointer-events-auto p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
            title="Expandir"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Countdown e progresso */}
        <div
          className="px-3 pb-3 cursor-pointer"
          onClick={() => setMinimizado(false)}
        >
          <div className={`font-mono text-4xl font-bold tabular-nums leading-none text-center ${
            urgente ? 'text-red-500 animate-pulse' : 'text-foreground'
          }`}>
            {mmss(segundos)}
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${isFoco ? 'bg-red-500' : 'bg-emerald-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {tarefaTitulo && (
            <p className="mt-1.5 text-[10px] text-muted-foreground truncate text-center" title={tarefaTitulo}>
              {tarefaTitulo}
            </p>
          )}
        </div>
      </div>
    )
  }

  // ── Expanded bubble ──────────────────────────────────────────────────────────
  return (
    <div
      style={{ top: pos.top, left: pos.left, width: 258 }}
      className="fixed z-50 rounded-2xl border bg-card shadow-2xl overflow-hidden select-none"
    >
      {/* Drag handle */}
      <div
        className="flex items-center justify-between px-3 py-2 bg-muted/40 cursor-grab"
        onMouseDown={(e) => { e.preventDefault(); startDrag(e.clientX, e.clientY) }}
        onTouchStart={(e) => { const t = e.touches[0]; startDrag(t.clientX, t.clientY) }}
      >
        <div className="flex items-center gap-1.5 pointer-events-none">
          <Timer className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Pomodoro</span>
          {ciclos > 0 && (
            <span className="text-[10px] bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full px-1.5 py-0.5 font-semibold">
              {ciclos} 🍅
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5 pointer-events-auto">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setTickTockAtivo(v => !v) }}
            title={tickTockAtivo ? 'Desativar tick-tock' : 'Ativar tick-tock'}
            className={`p-1 rounded transition-colors ${
              tickTockAtivo
                ? 'text-amber-600 bg-amber-100 dark:bg-amber-900/30'
                : 'text-muted-foreground hover:bg-background/60'
            }`}
          >
            {tickTockAtivo ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              // Clampeia posição para o card minimizado (192 × 110) não sair da tela
              setPos(p => ({
                top:  Math.min(Math.max(0, p.top),  window.innerHeight - 110),
                left: Math.min(Math.max(0, p.left), window.innerWidth  - 192),
              }))
              setMinimizado(true)
            }}
            className="p-1 rounded hover:bg-background/60 text-muted-foreground transition-colors"
            title="Minimizar"
          >
            <Minus className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onFechar() }}
            className="p-1 rounded hover:bg-background/60 text-muted-foreground hover:text-destructive transition-colors"
            title="Fechar"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-3">
        {/* Fase */}
        <div className={`flex items-center justify-center gap-1.5 text-xs font-semibold tracking-wide ${
          isFoco ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
        }`}>
          {isFoco
            ? <><Brain className="h-3.5 w-3.5" /> FOCO</>
            : fase === 'pausa_longa'
              ? <><Coffee className="h-3.5 w-3.5" /> PAUSA LONGA</>
              : <><Coffee className="h-3.5 w-3.5" /> PAUSA</>
          }
        </div>

        {/* Countdown */}
        <div className="text-center">
          <span className={`font-mono text-5xl font-bold tabular-nums leading-none block transition-colors ${
            urgente
              ? 'text-red-500 animate-pulse'
              : isFoco
                ? rodando ? 'text-foreground' : 'text-muted-foreground'
                : 'text-emerald-600 dark:text-emerald-400'
          }`}>
            {mmss(segundos)}
          </span>
          {/* Tempo decorrido (crescente) */}
          <span className="text-xs font-mono tabular-nums mt-0.5 block text-muted-foreground">
            {formatarTempo(decorridoMs)} decorrido
          </span>
        </div>

        {/* Barra de progresso do Pomodoro */}
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${isFoco ? 'bg-red-500' : 'bg-emerald-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Controles */}
        <div className="flex items-center justify-center gap-5">
          <div className="w-8" />
          <button
            type="button"
            onClick={handleToggle}
            className={`p-2.5 rounded-full transition-all shadow-sm ${
              rodando
                ? 'bg-amber-100 hover:bg-amber-200 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
            }`}
            title={rodando ? 'Pausar' : 'Iniciar'}
          >
            {rodando ? <PauseCircle className="h-7 w-7" /> : <PlayCircle className="h-7 w-7" />}
          </button>
          <button
            type="button"
            onClick={handlePular}
            title={isFoco ? 'Pular para pausa' : 'Pular para foco'}
            className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <SkipForward className="h-5 w-5" />
          </button>
        </div>

        {/* Dots: ciclos concluídos */}
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: 4 }, (_, i) => (
            <div
              key={i}
              className={`h-2 w-2 rounded-full transition-all ${
                i < (ciclos % 4) ? 'bg-red-500 scale-110' : 'bg-muted-foreground/20'
              }`}
            />
          ))}
        </div>

        {/* Separador */}
        <div className="border-t border-dashed" />

        {/* Dados da tarefa */}
        <div className="space-y-1.5">
          {/* Tarefa e cliente */}
          {(tarefaTitulo || clienteNome) && (
            <div className="space-y-0.5">
              {tarefaTitulo && (
                <div className="flex items-center gap-1">
                  <p className="text-xs font-semibold text-foreground leading-tight truncate flex-1" title={tarefaTitulo}>
                    {tarefaTitulo}
                  </p>
                  {onNavegar && (
                    <button
                      type="button"
                      onClick={onNavegar}
                      title="Ir para a tarefa em execução"
                      className="shrink-0 p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )}
              <div className="flex items-center justify-between gap-2">
                {clienteNome && (
                  <p className="text-[11px] text-muted-foreground truncate">{clienteNome}</p>
                )}
                {dataPrevista && (
                  <p className="text-[11px] text-muted-foreground shrink-0">
                    📅 {format(new Date(dataPrevista + 'T00:00:00'), 'dd/MM')}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Etapa atual */}
          <div className="rounded-md bg-muted/60 px-2.5 py-1.5 space-y-1">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              Etapa em execução
            </p>
            <p className="text-xs text-foreground leading-tight line-clamp-2" title={item.nome}>
              {item.nome}
            </p>
          </div>

          {/* Tempo trabalhado vs estimado */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>
                Trabalhado: <span className="font-medium text-foreground font-mono">
                  {formatarTempo(decorridoMs)}
                </span>
              </span>
            </div>
            {item.tempo_estimado_min && (
              <span className={`text-[11px] font-medium shrink-0 ${
                (pctEstimado ?? 0) >= 100 ? 'text-destructive' : 'text-muted-foreground'
              }`}>
                {pctEstimado}% do est.
              </span>
            )}
          </div>

          {/* Barra do tempo real vs estimado */}
          {pctEstimado !== null && (
            <div className="h-1 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  pctEstimado >= 100 ? 'bg-destructive' : 'bg-amber-400'
                }`}
                style={{ width: `${pctEstimado}%` }}
              />
            </div>
          )}

          {/* Início */}
          {item.inicio_em && (
            <p className="text-[10px] text-muted-foreground text-center">
              Início: {format(new Date(item.inicio_em), "dd/MM 'às' HH:mm")}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
