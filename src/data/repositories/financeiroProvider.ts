/**
 * Provider de repositórios financeiros.
 *
 * Quando VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY estão no .env.local:
 *   → usa implementações Supabase (persistência real, multi-device)
 *
 * Quando não estão configuradas:
 *   → cai silenciosamente para localStorage (modo desenvolvimento/demo)
 */

import { isSupabaseEnabled } from '@/lib/supabase'

// --- localStorage ---
import { LocalServicoRepository } from './localStorage/ServicoRepository'
import { LocalPlanoRepository } from './localStorage/PlanoRepository'
import { LocalContratoItemRepository } from './localStorage/ContratoItemRepository'
import { LocalContractRepository } from './localStorage/ContractRepository'
import { LocalInvoiceRepository } from './localStorage/InvoiceRepository'
import { LocalPaymentRepository } from './localStorage/PaymentRepository'
import { LocalBillingPolicyRepository } from './localStorage/BillingPolicyRepository'
import { LocalRenegotiationRepository } from './localStorage/RenegotiationRepository'
import { servicoRealizadoRepo as localServicoRealizadoRepo } from './localStorage/ServicoRealizadoRepository'

// --- Supabase ---
import { SupabaseServicoRepository } from './supabase/ServicoRepository'
import { SupabasePlanoRepository } from './supabase/PlanoRepository'
import { SupabaseContratoItemRepository } from './supabase/ContratoItemRepository'
import { SupabaseContractRepository } from './supabase/ContractRepository'
import { SupabaseInvoiceRepository } from './supabase/InvoiceRepository'
import { SupabasePaymentRepository } from './supabase/PaymentRepository'
import { SupabaseBillingPolicyRepository } from './supabase/BillingPolicyRepository'
import { SupabaseRenegotiationRepository } from './supabase/RenegotiationRepository'
import { SupabaseServicoRealizadoRepository } from './supabase/ServicoRealizadoRepository'

export const servicoRepo = isSupabaseEnabled
  ? new SupabaseServicoRepository()
  : new LocalServicoRepository()

export const planoRepo = isSupabaseEnabled
  ? new SupabasePlanoRepository()
  : new LocalPlanoRepository()

export const contratoItemRepo = isSupabaseEnabled
  ? new SupabaseContratoItemRepository()
  : new LocalContratoItemRepository()

export const contractRepo = isSupabaseEnabled
  ? new SupabaseContractRepository()
  : new LocalContractRepository()

export const invoiceRepo = isSupabaseEnabled
  ? new SupabaseInvoiceRepository()
  : new LocalInvoiceRepository()

export const paymentRepo = isSupabaseEnabled
  ? new SupabasePaymentRepository()
  : new LocalPaymentRepository()

export const billingPolicyRepo = isSupabaseEnabled
  ? new SupabaseBillingPolicyRepository()
  : new LocalBillingPolicyRepository()

export const renegotiationRepo = isSupabaseEnabled
  ? new SupabaseRenegotiationRepository()
  : new LocalRenegotiationRepository()

export const servicoRealizadoRepo = isSupabaseEnabled
  ? new SupabaseServicoRealizadoRepository()
  : localServicoRealizadoRepo
