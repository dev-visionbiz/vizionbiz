/**
 * Provider de repositórios core (tenant e usuário).
 *
 * Quando VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY estão no .env.local:
 *   → usa implementações Supabase (persistência real, multi-device)
 *
 * Quando não estão configuradas:
 *   → cai silenciosamente para localStorage (modo desenvolvimento/demo)
 */

import { isSupabaseEnabled } from '@/lib/supabase'

// --- localStorage ---
import { LocalTenantRepository } from './localStorage/TenantRepository'
import { LocalUserRepository } from './localStorage/UserRepository'

// --- Supabase ---
import { SupabaseTenantRepository } from './supabase/TenantRepository'
import { SupabaseUserRepository } from './supabase/UserRepository'

export const tenantRepo = isSupabaseEnabled
  ? new SupabaseTenantRepository()
  : new LocalTenantRepository()

export const userRepo = isSupabaseEnabled
  ? new SupabaseUserRepository()
  : new LocalUserRepository()
