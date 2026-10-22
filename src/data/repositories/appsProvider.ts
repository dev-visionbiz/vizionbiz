/**
 * Provider de repositórios do App Store.
 *
 * Quando VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY estão no .env.local:
 *   → usa implementações Supabase (persistência real, multi-device)
 *
 * Quando não estão configuradas:
 *   → cai silenciosamente para localStorage (modo desenvolvimento/demo)
 *
 * Os hooks em useApps.ts importam daqui — nada mais precisa mudar.
 */

import { isSupabaseEnabled } from '@/lib/supabase'

// --- localStorage (já existentes) ---
import { appRepo as localAppRepo } from './localStorage/AppRepository'
import { appVersionRepo as localAppVersionRepo } from './localStorage/AppVersionRepository'
import { appPlanRepo as localAppPlanRepo } from './localStorage/AppPlanRepository'
import { appInstallationRepo as localAppInstallationRepo } from './localStorage/AppInstallationRepository'
import { appGrantRepo as localAppGrantRepo } from './localStorage/AppGrantRepository'
import { appVisibilityRepo as localAppVisibilityRepo } from './localStorage/AppVisibilityRepository'
import { subscriptionRepo as localSubscriptionRepo } from './localStorage/SubscriptionRepository'
import { commissionRuleRepo as localCommissionRuleRepo } from './localStorage/CommissionRuleRepository'
import { ledgerRepo as localLedgerRepo } from './localStorage/LedgerRepository'

// --- Supabase (novas implementações) ---
import { SupabaseAppRepository } from './supabase/AppRepository'
import { SupabaseAppVersionRepository } from './supabase/AppVersionRepository'
import { SupabaseAppPlanRepository } from './supabase/AppPlanRepository'
import { SupabaseAppInstallationRepository } from './supabase/AppInstallationRepository'
import { SupabaseAppGrantRepository } from './supabase/AppGrantRepository'
import { SupabaseAppVisibilityRepository } from './supabase/AppVisibilityRepository'
import { SupabaseSubscriptionRepository } from './supabase/SubscriptionRepository'
import { SupabaseCommissionRuleRepository } from './supabase/CommissionRuleRepository'
import { SupabaseLedgerRepository } from './supabase/LedgerRepository'

// --- Exporta o repositório correto conforme disponibilidade do Supabase ---

export const appRepo = isSupabaseEnabled
  ? new SupabaseAppRepository()
  : localAppRepo

export const appVersionRepo = isSupabaseEnabled
  ? new SupabaseAppVersionRepository()
  : localAppVersionRepo

export const appPlanRepo = isSupabaseEnabled
  ? new SupabaseAppPlanRepository()
  : localAppPlanRepo

export const appInstallationRepo = isSupabaseEnabled
  ? new SupabaseAppInstallationRepository()
  : localAppInstallationRepo

export const appGrantRepo = isSupabaseEnabled
  ? new SupabaseAppGrantRepository()
  : localAppGrantRepo

export const appVisibilityRepo = isSupabaseEnabled
  ? new SupabaseAppVisibilityRepository()
  : localAppVisibilityRepo

export const subscriptionRepo = isSupabaseEnabled
  ? new SupabaseSubscriptionRepository()
  : localSubscriptionRepo

export const commissionRuleRepo = isSupabaseEnabled
  ? new SupabaseCommissionRuleRepository()
  : localCommissionRuleRepo

export const ledgerRepo = isSupabaseEnabled
  ? new SupabaseLedgerRepository()
  : localLedgerRepo
