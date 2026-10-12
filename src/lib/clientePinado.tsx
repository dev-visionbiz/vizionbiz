import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { Client } from '@/domain/types'

interface PinnedClientContextValue {
  clientePinado: Client | null
  pinClient: (client: Client) => void
  unpinClient: () => void
}

const PinnedClientContext = createContext<PinnedClientContextValue>({
  clientePinado: null,
  pinClient: () => {},
  unpinClient: () => {},
})

const STORAGE_KEY = 'visionbiz:clientePinado'

export function PinnedClientProvider({ children }: { children: ReactNode }) {
  const [clientePinado, setClientePinado] = useState<Client | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  const pinClient = useCallback((client: Client) => {
    setClientePinado(client)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(client))
  }, [])

  const unpinClient = useCallback(() => {
    setClientePinado(null)
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  return (
    <PinnedClientContext.Provider value={{ clientePinado, pinClient, unpinClient }}>
      {children}
    </PinnedClientContext.Provider>
  )
}

export function usePinnedClient() {
  return useContext(PinnedClientContext)
}
