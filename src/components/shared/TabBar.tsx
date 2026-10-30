import { useRef } from 'react'
import { X, Plus } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useNavigationTabs } from '@/context/NavigationTabsContext'

export function TabBar() {
  const { tabs, activeTabId, openTab, closeTab, switchTab } = useNavigationTabs()
  const location = useLocation()
  const scrollRef = useRef<HTMLDivElement>(null)

  // Only relevant for escritório workflow
  if (!location.pathname.startsWith('/escritorio')) return null

  function handleClose(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    closeTab(id)
  }

  // Middle-click closes tab
  function handleAuxClick(e: React.MouseEvent, id: string) {
    if (e.button === 1) closeTab(id)
  }

  return (
    <div className="flex items-end border-b bg-muted/20 shrink-0">
      {/* Scrollable tab list */}
      <div
        ref={scrollRef}
        className="flex items-end gap-0.5 px-2 pt-1 overflow-x-auto overflow-y-hidden flex-1 min-w-0"
        style={{ scrollbarWidth: 'none' }}
      >
        {tabs.map(tab => {
          const isActive = tab.id === activeTabId
          return (
            <div
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              tabIndex={0}
              onClick={() => switchTab(tab.id)}
              onAuxClick={e => handleAuxClick(e, tab.id)}
              onKeyDown={e => e.key === 'Enter' && switchTab(tab.id)}
              className={cn(
                'group flex items-center gap-1.5 pl-3 pr-1.5 py-1.5',
                'rounded-t-md text-xs font-medium cursor-pointer transition-all',
                'max-w-44 min-w-20 shrink-0 select-none outline-none',
                'border border-b-0 focus-visible:ring-1 focus-visible:ring-ring',
                isActive
                  ? 'bg-background border-border text-foreground -mb-px z-10'
                  : [
                    'bg-transparent border-transparent text-muted-foreground',
                    'hover:bg-background/70 hover:border-border/40 hover:text-foreground',
                  ],
              )}
            >
              <span className="truncate flex-1 leading-none">{tab.title}</span>

              {tabs.length > 1 && (
                <button
                  onClick={e => handleClose(e, tab.id)}
                  tabIndex={-1}
                  aria-label="Fechar aba"
                  className={cn(
                    'shrink-0 flex items-center justify-center w-4 h-4 rounded transition-all',
                    'text-muted-foreground hover:text-foreground hover:bg-accent/80',
                    !isActive && 'opacity-0 group-hover:opacity-100',
                  )}
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* New tab button */}
      <div className="shrink-0 flex items-center px-1.5 pb-1 self-end">
        <button
          onClick={openTab}
          disabled={tabs.length >= 8}
          aria-label="Nova aba"
          title="Nova aba (abre o Dashboard)"
          className={cn(
            'flex items-center justify-center w-6 h-6 rounded transition-colors',
            'text-muted-foreground hover:text-foreground hover:bg-accent',
            'disabled:opacity-30 disabled:cursor-not-allowed',
          )}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
