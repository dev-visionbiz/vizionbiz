/**
 * Provider de repositórios de guias, lotes, processos e certificados.
 *
 * Quando VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY estão no .env.local:
 *   → usa implementações Supabase (persistência real, multi-device)
 *
 * Quando não estão configuradas:
 *   → cai silenciosamente para localStorage (modo desenvolvimento/demo)
 */

import { isSupabaseEnabled } from '@/lib/supabase'

// --- localStorage ---
import { guiaRepo as localGuiaRepo } from './localStorage/GuiaRepository'
import { loteRepo as localLoteRepo } from './localStorage/LoteImportacaoRepository'
import { processoAberturaRepo as localProcessoAberturaRepo } from './localStorage/ProcessoAberturaRepository'
import { processoAlteracaoRepo as localProcessoAlteracaoRepo } from './localStorage/ProcessoAlteracaoRepository'
import { formularioTemplateRepo as localFormularioTemplateRepo, formularioRespostaRepo as localFormularioRespostaRepo } from './localStorage/FormularioTemplateRepository'
import { certificadoRepo as localCertificadoRepo } from './localStorage/CertificadoRepository'

// --- Supabase ---
import { SupabaseGuiaRecolhimentoRepository } from './supabase/GuiaRecolhimentoRepository'
import { SupabaseLoteImportacaoRepository } from './supabase/LoteImportacaoRepository'
import { SupabaseProcessoAberturaRepository } from './supabase/ProcessoAberturaRepository'
import { SupabaseProcessoAlteracaoRepository } from './supabase/ProcessoAlteracaoRepository'
import { SupabaseFormularioTemplateRepository } from './supabase/FormularioTemplateRepository'
import { SupabaseFormularioRespostaRepository } from './supabase/FormularioRespostaRepository'
import { SupabaseCertificadoRepository } from './supabase/CertificadoRepository'

export const guiaRepo = isSupabaseEnabled
  ? new SupabaseGuiaRecolhimentoRepository()
  : localGuiaRepo

export const loteRepo = isSupabaseEnabled
  ? new SupabaseLoteImportacaoRepository()
  : localLoteRepo

export const processoAberturaRepo = isSupabaseEnabled
  ? new SupabaseProcessoAberturaRepository()
  : localProcessoAberturaRepo

export const processoAlteracaoRepo = isSupabaseEnabled
  ? new SupabaseProcessoAlteracaoRepository()
  : localProcessoAlteracaoRepo

export const formularioTemplateRepo = isSupabaseEnabled
  ? new SupabaseFormularioTemplateRepository()
  : localFormularioTemplateRepo

export const formularioRespostaRepo = isSupabaseEnabled
  ? new SupabaseFormularioRespostaRepository()
  : localFormularioRespostaRepo

export const certificadoRepo = isSupabaseEnabled
  ? new SupabaseCertificadoRepository()
  : localCertificadoRepo
