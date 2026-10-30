import {
  createContext, useContext, useState, useEffect, useCallback, useRef,
  type ReactNode,
} from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { v4 as uuid } from 'uuid'
import { getPageTitle } from '@/lib/pageTitle'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface NavTab {
  id: string
  url: string    // pathname + search
  title: string
}

interface NavigationTabsContextValue {
  tabs: NavTab[]
  activeTabId: string
  openTab(): void
  closeTab(id: string): void
  switchTab(id: string): void
  updateTabTitle(title: string): void
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STORAGE_KEY   = 'visionbiz:navTabs'
const DASHBOARD_URL = '/escritorio/dashboard'
const MAX_TABS      = 8

// ── Context ───────────────────────────────────────────────────────────────────

const NavigationTabsCtx = createContext<NavigationTabsContextValue | null>(null)

export function useNavigationTabs() {
  const ctx = useContext(NavigationTabsCtx)
  if (!ctx) throw new Error('useNavigationTabs deve ser usado dentro de NavigationTabsProvider')
  return ctx
}

/**
 * Permite que uma página defina um título mais específico para a aba ativa.
 * Ex: ClienteFicha chama useSetTabTitle("Empresa XPTO") para sobrescrever "Ficha do Cliente".
 */
export function useSetTabTitle(title: string | null | undefined) {
  const { updateTabTitle } = useNavigationTabs()
  useEffect(() => {
    if (title) updateTabTitle(title)
  }, [title, updateTabTitle])
}

// ── Persistence ───────────────────────────────────────────────────────────────

function persist(tabs: NavTab[], activeTabId: string) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ tabs, activeTabId }))
  } catch { /* quota exceeded — ignore */ }
}

function loadPersistedState(): { tabs: NavTab[]; activeTabId: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed?.tabs) || !parsed.activeTabId) return null
    return parsed
  } catch {
    return null
  }
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function NavigationTabsProvider({ children }: { children: ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()

  // Tracks when we triggered a programmatic navigation (tab switch / open / close)
  // so the sync-effect skips that cycle and doesn't overwrite the wrong tab.
  const switchingRef = useRef(false)

  const initialUrl = location.pathname + location.search

  const [tabs, setTabs] = useState<NavTab[]>(() => {
    const stored = loadPersistedState()
    if (stored?.tabs.length) return stored.tabs
    return [{ id: uuid(), url: initialUrl, title: getPageTitle(location.pathname) }]
  })

  const [activeTabId, setActiveTabId] = useState<string>(() => {
    const stored = loadPersistedState()
    // Verify the stored activeTabId still exists
    if (stored?.activeTabId && tabs.some(t => t.id === stored.activeTabId)) {
      return stored.activeTabId
    }
    return tabs[0].id
  })

  // ── Sync active tab URL/title on every normal navigation ──────────────────

  useEffect(() => {
    if (switchingRef.current) {
      switchingRef.current = false
      return
    }
    const url   = location.pathname + location.search
    const title = getPageTitle(location.pathname)
    setTabs(prev => {
      const next = prev.map(t => t.id === activeTabId ? { ...t, url, title } : t)
      persist(next, activeTabId)
      return next
    })
  }, [location.pathname, location.search, activeTabId])

  // ── Actions ───────────────────────────────────────────────────────────────

  const openTab = useCallback(() => {
    if (tabs.length >= MAX_TABS) return
    const newTab: NavTab = { id: uuid(), url: DASHBOARD_URL, title: 'Dashboard' }
    const next = [...tabs, newTab]
    switchingRef.current = true
    setTabs(next)
    setActiveTabId(newTab.id)
    persist(next, newTab.id)
    navigate(DASHBOARD_URL)
  }, [tabs, navigate])

  const closeTab = useCallback((id: string) => {
    if (tabs.length <= 1) return
    const idx    = tabs.findIndex(t => t.id === id)
    const next   = tabs.filter(t => t.id !== id)
    setTabs(next)
    if (id === activeTabId) {
      // Prefer the tab to the left; fall back to the first one
      const target = next[Math.max(0, idx - 1)]
      switchingRef.current = true
      setActiveTabId(target.id)
      persist(next, target.id)
      navigate(target.url)
    } else {
      persist(next, activeTabId)
    }
  }, [tabs, activeTabId, navigate])

  const switchTab = useCallback((id: string) => {
    if (id === activeTabId) return
    const tab = tabs.find(t => t.id === id)
    if (!tab) return
    switchingRef.current = true
    setActiveTabId(id)
    persist(tabs, id)
    navigate(tab.url)
  }, [tabs, activeTabId, navigate])

  const updateTabTitle = useCallback((title: string) => {
    setTabs(prev => {
      const next = prev.map(t => t.id === activeTabId ? { ...t, title } : t)
      persist(next, activeTabId)
      return next
    })
  }, [activeTabId])

  return (
    <NavigationTabsCtx.Provider value={{ tabs, activeTabId, openTab, closeTab, switchTab, updateTabTitle }}>
      {children}
    </NavigationTabsCtx.Provider>
  )
}
