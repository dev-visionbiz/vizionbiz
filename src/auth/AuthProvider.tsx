import React, { createContext, useContext, useState, useEffect, useMemo } from 'react'
import type { User, Tenant } from '@/domain/types'

const SESSION_KEY = 'vb_active_user_id'
const EMPRESA_KEY = 'vb_active_client_id'

interface AuthContextValue {
  currentUser: User | null
  currentTenant: Tenant | null
  allUsers: User[]
  isLoading: boolean
  needsEmpresaSelection: boolean
  login: (email: string, senha: string) => Promise<{ ok: boolean; erro?: string; papel?: string }>
  logout: () => void
  switchUser: (userId: string) => void
  switchCliente: (clientId: string) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [baseUser, setBaseUser] = useState<User | null>(null)
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null)
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [activeClientId, setActiveClientId] = useState<string | null>(null)
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

  function resolveActiveClientId(user: User): string | null {
    if (user.papel !== 'cliente') return null
    if (!user.clientes?.length) return user.client_id ?? null

    const saved = sessionStorage.getItem(EMPRESA_KEY)
    if (saved && user.clientes.some(c => c.client_id === saved)) return saved
    if (user.clientes.length === 1) {
      sessionStorage.setItem(EMPRESA_KEY, user.clientes[0].client_id)
      return user.clientes[0].client_id
    }
    return null
  }

  function applyUser(user: User) {
    const tenants = readTenants()
    const tenant = tenants.find((t) => t.id === user.tenant_id) ?? null
    setBaseUser(user)
    setCurrentTenant(tenant)
    sessionStorage.setItem(SESSION_KEY, user.id)
    setActiveClientId(resolveActiveClientId(user))
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
        sessionStorage.removeItem(EMPRESA_KEY)
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
    sessionStorage.removeItem(EMPRESA_KEY)
    applyUser(user)
    return { ok: true, papel: user.papel }
  }

  function logout() {
    sessionStorage.removeItem(SESSION_KEY)
    sessionStorage.removeItem(EMPRESA_KEY)
    setBaseUser(null)
    setCurrentTenant(null)
    setActiveClientId(null)
  }

  function switchUser(userId: string) {
    const users = readUsers()
    setAllUsers(users)
    const user = users.find((u) => u.id === userId)
    if (user) {
      sessionStorage.removeItem(EMPRESA_KEY)
      applyUser(user)
    }
  }

  function switchCliente(clientId: string) {
    sessionStorage.setItem(EMPRESA_KEY, clientId)
    setActiveClientId(clientId)
  }

  // currentUser: baseUser com client_id refletindo a empresa ativa na sessão
  const currentUser = useMemo<User | null>(() => {
    if (!baseUser) return null
    if (baseUser.papel !== 'cliente') return baseUser
    if (!baseUser.clientes?.length) return baseUser  // legado: usa client_id do próprio User
    return { ...baseUser, client_id: activeClientId ?? undefined }
  }, [baseUser, activeClientId])

  const needsEmpresaSelection = useMemo<boolean>(() => {
    if (!baseUser || baseUser.papel !== 'cliente') return false
    if (!baseUser.clientes?.length || baseUser.clientes.length <= 1) return false
    return !activeClientId
  }, [baseUser, activeClientId])

  return (
    <AuthContext.Provider value={{
      currentUser, currentTenant, allUsers, isLoading,
      needsEmpresaSelection,
      login, logout, switchUser, switchCliente,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
