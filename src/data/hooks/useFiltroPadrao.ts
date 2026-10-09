import { useState, useRef } from 'react'
import { useAuth } from '@/auth/AuthProvider'

const STORAGE_KEY = 'vb_filtros_padrao'

type PadraoMap = Record<string, Record<string, unknown>>

function readMap(): PadraoMap {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
  } catch {
    return {}
  }
}

function writeMap(map: PadraoMap) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
}

export function useFiltroPadrao<T extends Record<string, unknown>>(
  pagina: string,
  fallback: T,
): {
  inicial: T
  salvarPadrao: (filtros: T) => void
  limparPadrao: () => void
  temPadrao: boolean
} {
  const { currentUser } = useAuth()
  const chave = currentUser?.id ? `${currentUser.id}:${pagina}` : null

  // Compute initial value once per mount
  const inicialRef = useRef<T | null>(null)
  if (inicialRef.current === null) {
    const saved = chave ? readMap()[chave] : undefined
    inicialRef.current = saved ? ({ ...fallback, ...saved } as T) : fallback
  }

  const [temPadrao, setTemPadrao] = useState(() => {
    if (!chave) return false
    return readMap()[chave] !== undefined
  })

  function salvarPadrao(filtros: T) {
    if (!chave) return
    const map = readMap()
    map[chave] = filtros as Record<string, unknown>
    writeMap(map)
    setTemPadrao(true)
  }

  function limparPadrao() {
    if (!chave) return
    const map = readMap()
    delete map[chave]
    writeMap(map)
    setTemPadrao(false)
  }

  return { inicial: inicialRef.current, salvarPadrao, limparPadrao, temPadrao }
}
