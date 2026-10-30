import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

export interface TarefaAtivaData {
  ocorrenciaId: string
  titulo: string
  clienteNome?: string
  clienteId?: string
}

interface TarefaAtivaContextValue {
  tarefaAtiva: TarefaAtivaData | null
  visivel: boolean
  ativar(data: TarefaAtivaData): void
  desativar(): void
  minimizar(): void
  reabrir(): void
}

const STORAGE_KEY = 'visionbiz:tarefaAtiva'

const TarefaAtivaCtx = createContext<TarefaAtivaContextValue | null>(null)

export function useTarefaAtiva() {
  const ctx = useContext(TarefaAtivaCtx)
  if (!ctx) throw new Error('useTarefaAtiva deve ser usado dentro de TarefaAtivaProvider')
  return ctx
}

export function TarefaAtivaProvider({ children }: { children: ReactNode }) {
  const [tarefaAtiva, setTarefaAtiva] = useState<TarefaAtivaData | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })
  const [visivel, setVisivel] = useState(true)

  const ativar = useCallback((data: TarefaAtivaData) => {
    setTarefaAtiva(data)
    setVisivel(true)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }, [])

  const desativar = useCallback(() => {
    setTarefaAtiva(null)
    setVisivel(true)
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  const minimizar = useCallback(() => setVisivel(false), [])
  const reabrir   = useCallback(() => setVisivel(true), [])

  return (
    <TarefaAtivaCtx.Provider value={{ tarefaAtiva, visivel, ativar, desativar, minimizar, reabrir }}>
      {children}
    </TarefaAtivaCtx.Provider>
  )
}
