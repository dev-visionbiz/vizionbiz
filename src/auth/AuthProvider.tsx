import React, { createContext, useContext, useState, useEffect } from 'react'
import type { User, Tenant } from '@/domain/types'

// Ponto de integração Supabase Auth:
// import { supabase } from '@/lib/supabase'
// supabase.auth.onAuthStateChange(...)

interface AuthContextValue {
  currentUser: User | null
  currentTenant: Tenant | null
  allUsers: User[]
  isLoading: boolean
  login: (email: string, senha: string) => Promise<{ ok: boolean; erro?: string; papel?: string }>
  logout: () => void
  switchUser: (userId: string) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

const SESSION_KEY = 'vb_active_user_id'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null)
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)

  function readUsers(): User[] {
    try {
      const raw = localStorage.getItem('vb_users')
      return raw ? (JSON.parse(raw) as User[]) : []
    } catch {
      return []
    }
  }

  function readTenants(): Tenant[] {
    try {
      const raw = localStorage.getItem('vb_tenants')
      return raw ? (JSON.parse(raw) as Tenant[]) : []
    } catch {
      return []
    }
  }

  function applyUser(user: User) {
    const tenants = readTenants()
    const tenant = tenants.find((t) => t.id === user.tenant_id) ?? null
    setCurrentUser(user)
    setCurrentTenant(tenant)
    sessionStorage.setItem(SESSION_KEY, user.id)
  }

  useEffect(() => {
    const savedId = sessionStorage.getItem(SESSION_KEY)
    if (savedId) {
      const users = readUsers()
      setAllUsers(users)
      const user = users.find((u) => u.id === savedId)
      if (user && user.ativo !== false) {
        applyUser(user)
      } else {
        sessionStorage.removeItem(SESSION_KEY)
      }
    }
    setIsLoading(false)
  }, [])

  async function login(email: string, senha: string): Promise<{ ok: boolean; erro?: string; papel?: string }> {
    const users = readUsers()
    setAllUsers(users)
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase())
    if (!user) return { ok: false, erro: 'E-mail não encontrado.' }
    if (user.ativo === false) return { ok: false, erro: 'Usuário desativado. Contate o administrador.' }
    if (user.senha_hash && user.senha_hash !== senha) return { ok: false, erro: 'Senha incorreta.' }
    applyUser(user)
    return { ok: true, papel: user.papel }
  }

  function logout() {
    sessionStorage.removeItem(SESSION_KEY)
    setCurrentUser(null)
    setCurrentTenant(null)
  }

  function switchUser(userId: string) {
    const users = readUsers()
    setAllUsers(users)
    const user = users.find((u) => u.id === userId)
    if (user) applyUser(user)
  }

  return (
    <AuthContext.Provider value={{ currentUser, currentTenant, allUsers, isLoading, login, logout, switchUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
