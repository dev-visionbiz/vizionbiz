import React, { createContext, useContext, useState, useEffect, useMemo } from 'react'
import type { User, Tenant } from '@/domain/types'
import { supabase, isSupabaseEnabled } from '@/lib/supabase'

const SESSION_KEY = 'vb_active_user_id'
const EMPRESA_KEY = 'vb_active_client_id'
const IMPERSONATION_KEY = 'vb_admin_impersonation'
const USER_IMPERSONATION_KEY = 'vb_user_impersonation'

interface AuthContextValue {
  currentUser: User | null
  currentTenant: Tenant | null
  allUsers: User[]
  isLoading: boolean
  needsEmpresaSelection: boolean
  isImpersonating: boolean
  isImpersonatingUser: boolean
  login: (email: string, senha: string) => Promise<{ ok: boolean; erro?: string; papel?: string }>
  logout: () => void
  switchUser: (userId: string) => void
  switchCliente: (clientId: string) => void
  impersonateEscritorio: (tenantId: string) => Promise<boolean>
  exitImpersonation: () => Promise<void>
  impersonateUser: (userId: string) => Promise<boolean>
  exitUserImpersonation: () => Promise<void>
  updateTenant: (updated: Tenant) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [baseUser, setBaseUser] = useState<User | null>(null)
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null)
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [activeClientId, setActiveClientId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // ── Helpers ──────────────────────────────────────────────────────────────────

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

  // ── localStorage helpers (modo sem Supabase) ──────────────────────────────────

  function readUsers(): User[] {
    try { return JSON.parse(localStorage.getItem('vb_users') ?? '[]') } catch { return [] }
  }

  function readTenants(): Tenant[] {
    try { return JSON.parse(localStorage.getItem('vb_tenants') ?? '[]') } catch { return [] }
  }

  function applyLocalUser(user: User) {
    const tenant = readTenants().find(t => t.id === user.tenant_id) ?? null
    setBaseUser(user)
    setCurrentTenant(tenant)
    sessionStorage.setItem(SESSION_KEY, user.id)
    setActiveClientId(resolveActiveClientId(user))
  }

  // ── Supabase helpers ──────────────────────────────────────────────────────────

  async function loadSupabaseProfile(email: string): Promise<User | null> {
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle()

    if (!user || user.ativo === false) return null

    const { data: tenant } = user.tenant_id
      ? await supabase.from('tenants').select('*').eq('id', user.tenant_id).maybeSingle()
      : { data: null }

    setBaseUser(user)
    setCurrentTenant(tenant ?? null)
    setActiveClientId(resolveActiveClientId(user))
    return user as User
  }

  // ── Session init ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isSupabaseEnabled) {
      const savedId = sessionStorage.getItem(SESSION_KEY)
      if (savedId) {
        const users = readUsers()
        setAllUsers(users)
        const user = users.find(u => u.id === savedId)
        if (user && user.ativo !== false) applyLocalUser(user)
        else { sessionStorage.removeItem(SESSION_KEY); sessionStorage.removeItem(EMPRESA_KEY) }
      }
      setIsLoading(false)
      return
    }

    // Supabase: INITIAL_SESSION restaura sessão existente; SIGNED_IN/OUT reage a mudanças
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'INITIAL_SESSION') {
        if (session?.user?.email) await loadSupabaseProfile(session.user.email)
        setIsLoading(false)
      } else if (event === 'SIGNED_OUT') {
        setBaseUser(null)
        setCurrentTenant(null)
        setActiveClientId(null)
      }
      // SIGNED_IN é tratado diretamente em login() para retornar o papel imediatamente
    })

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── login ─────────────────────────────────────────────────────────────────────

  async function login(email: string, senha: string): Promise<{ ok: boolean; erro?: string; papel?: string }> {
    if (!isSupabaseEnabled) {
      const users = readUsers()
      setAllUsers(users)
      const user = users.find(u => u.email.toLowerCase() === email.toLowerCase())
      if (!user) return { ok: false, erro: 'E-mail não encontrado.' }
      if (user.ativo === false) return { ok: false, erro: 'Usuário desativado. Contate o administrador.' }
      if (user.senha_hash && user.senha_hash !== senha) return { ok: false, erro: 'Senha incorreta.' }
      sessionStorage.removeItem(EMPRESA_KEY)
      applyLocalUser(user)
      return { ok: true, papel: user.papel }
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) return { ok: false, erro: error.message }

    const user = await loadSupabaseProfile(email)
    if (!user) {
      await supabase.auth.signOut()
      return { ok: false, erro: 'Perfil de usuário não encontrado ou desativado.' }
    }

    return { ok: true, papel: user.papel }
  }

  // ── logout ────────────────────────────────────────────────────────────────────

  function logout() {
    sessionStorage.removeItem(SESSION_KEY)
    sessionStorage.removeItem(EMPRESA_KEY)
    sessionStorage.removeItem(IMPERSONATION_KEY)
    sessionStorage.removeItem(USER_IMPERSONATION_KEY)
    setBaseUser(null)
    setCurrentTenant(null)
    setActiveClientId(null)
    if (isSupabaseEnabled) supabase.auth.signOut()
  }

  // ── switchUser (dev — somente modo localStorage) ──────────────────────────────

  function switchUser(userId: string) {
    if (isSupabaseEnabled) return
    const users = readUsers()
    setAllUsers(users)
    const user = users.find(u => u.id === userId)
    if (user) { sessionStorage.removeItem(EMPRESA_KEY); applyLocalUser(user) }
  }

  // ── switchCliente ─────────────────────────────────────────────────────────────

  function switchCliente(clientId: string) {
    sessionStorage.setItem(EMPRESA_KEY, clientId)
    setActiveClientId(clientId)
  }

  // ── impersonateEscritorio ─────────────────────────────────────────────────────

  async function impersonateEscritorio(tenantId: string): Promise<boolean> {
    if (!isSupabaseEnabled) {
      const users = readUsers()
      const adminUser = users.find(u =>
        u.tenant_id === tenantId && u.papel === 'escritorio_admin' && u.ativo !== false
      )
      if (!adminUser || !baseUser) return false
      sessionStorage.setItem(IMPERSONATION_KEY, baseUser.id)
      sessionStorage.removeItem(EMPRESA_KEY)
      applyLocalUser(adminUser)
      return true
    }

    if (!baseUser) return false

    const { data: adminUser } = await supabase
      .from('users')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('papel', 'escritorio_admin')
      .eq('ativo', true)
      .maybeSingle()

    if (!adminUser) return false

    const { data: tenant } = await supabase
      .from('tenants').select('*').eq('id', tenantId).maybeSingle()

    sessionStorage.setItem(IMPERSONATION_KEY, baseUser.id)
    sessionStorage.removeItem(EMPRESA_KEY)
    setBaseUser(adminUser as User)
    setCurrentTenant(tenant ?? null)
    setActiveClientId(null)
    return true
  }

  // ── exitImpersonation ─────────────────────────────────────────────────────────

  async function exitImpersonation(): Promise<void> {
    const originalId = sessionStorage.getItem(IMPERSONATION_KEY)
    sessionStorage.removeItem(IMPERSONATION_KEY)
    sessionStorage.removeItem(EMPRESA_KEY)
    if (!originalId) return

    if (!isSupabaseEnabled) {
      const user = readUsers().find(u => u.id === originalId)
      if (user) applyLocalUser(user)
      return
    }

    const { data: user } = await supabase.from('users').select('*').eq('id', originalId).maybeSingle()
    if (!user) return

    const { data: tenant } = user.tenant_id
      ? await supabase.from('tenants').select('*').eq('id', user.tenant_id).maybeSingle()
      : { data: null }

    setBaseUser(user as User)
    setCurrentTenant(tenant ?? null)
    setActiveClientId(null)
  }

  // ── impersonateUser (admin impersona usuário do mesmo escritório) ─────────────

  async function impersonateUser(userId: string): Promise<boolean> {
    if (!baseUser) return false

    if (!isSupabaseEnabled) {
      const users = readUsers()
      const target = users.find(u => u.id === userId && u.ativo !== false)
      if (!target) return false
      sessionStorage.setItem(USER_IMPERSONATION_KEY, baseUser.id)
      sessionStorage.removeItem(EMPRESA_KEY)
      applyLocalUser(target)
      return true
    }

    const { data: target } = await supabase.from('users').select('*').eq('id', userId).maybeSingle()
    if (!target || target.ativo === false) return false

    const { data: tenant } = target.tenant_id
      ? await supabase.from('tenants').select('*').eq('id', target.tenant_id).maybeSingle()
      : { data: null }

    sessionStorage.setItem(USER_IMPERSONATION_KEY, baseUser.id)
    sessionStorage.removeItem(EMPRESA_KEY)
    setBaseUser(target as User)
    setCurrentTenant(tenant ?? null)
    setActiveClientId(resolveActiveClientId(target as User))
    return true
  }

  async function exitUserImpersonation(): Promise<void> {
    const originalId = sessionStorage.getItem(USER_IMPERSONATION_KEY)
    sessionStorage.removeItem(USER_IMPERSONATION_KEY)
    sessionStorage.removeItem(EMPRESA_KEY)
    if (!originalId) return

    if (!isSupabaseEnabled) {
      const user = readUsers().find(u => u.id === originalId)
      if (user) applyLocalUser(user)
      return
    }

    const { data: user } = await supabase.from('users').select('*').eq('id', originalId).maybeSingle()
    if (!user) return

    const { data: tenant } = user.tenant_id
      ? await supabase.from('tenants').select('*').eq('id', user.tenant_id).maybeSingle()
      : { data: null }

    setBaseUser(user as User)
    setCurrentTenant(tenant ?? null)
    setActiveClientId(null)
  }

  // ── updateTenant (atualiza estado local após salvar) ──────────────────────────

  function updateTenant(updated: Tenant) {
    if (!isSupabaseEnabled) {
      const next = readTenants().map(t => t.id === updated.id ? updated : t)
      localStorage.setItem('vb_tenants', JSON.stringify(next))
    }
    if (currentTenant?.id === updated.id) setCurrentTenant(updated)
  }

  // ── Estado derivado ───────────────────────────────────────────────────────────

  const isImpersonating = !!sessionStorage.getItem(IMPERSONATION_KEY)
  const isImpersonatingUser = !!sessionStorage.getItem(USER_IMPERSONATION_KEY)

  const currentUser = useMemo<User | null>(() => {
    if (!baseUser) return null
    if (baseUser.papel !== 'cliente') return baseUser
    if (!baseUser.clientes?.length) return baseUser
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
      needsEmpresaSelection, isImpersonating, isImpersonatingUser,
      login, logout, switchUser, switchCliente,
      impersonateEscritorio, exitImpersonation,
      impersonateUser, exitUserImpersonation,
      updateTenant,
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
