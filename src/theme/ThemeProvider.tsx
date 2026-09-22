import React, { createContext, useContext, useEffect, useState } from 'react'

interface ThemeContextValue {
  isDark: boolean
  toggleDarkMode: () => void
  setPrimaryColor: (hsl: string) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({
  children,
  primaryColor = '221 83% 53%',
}: {
  children: React.ReactNode
  primaryColor?: string
}) {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('vb_dark_mode')
    if (saved === 'true') {
      setIsDark(true)
      document.documentElement.classList.add('dark')
    }
  }, [])

  useEffect(() => {
    document.documentElement.style.setProperty('--primary', primaryColor)
    document.documentElement.style.setProperty('--ring', primaryColor)
  }, [primaryColor])

  function toggleDarkMode() {
    setIsDark((prev) => {
      const next = !prev
      document.documentElement.classList.toggle('dark', next)
      localStorage.setItem('vb_dark_mode', String(next))
      return next
    })
  }

  function setPrimaryColor(hsl: string) {
    document.documentElement.style.setProperty('--primary', hsl)
    document.documentElement.style.setProperty('--ring', hsl)
  }

  return (
    <ThemeContext.Provider value={{ isDark, toggleDarkMode, setPrimaryColor }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
