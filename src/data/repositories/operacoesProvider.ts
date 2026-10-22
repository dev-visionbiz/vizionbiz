/**
 * Provider de repositórios de operações (fluxos, rotinas, ciclos, ocorrências, tarefas).
 *
 * Quando VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY estão no .env.local:
 *   → usa implementações Supabase (persistência real, multi-device)
 *
 * Quando não estão configuradas:
 *   → cai silenciosamente para localStorage (modo desenvolvimento/demo)
 */

import { isSupabaseEnabled } from '@/lib/supabase'

// --- localStorage ---
import { LocalFichaBlocoRepository } from './localStorage/FichaBlocoRepository'
import { LocalFichaCampoRepository } from './localStorage/FichaCampoRepository'
import { fluxoRepo as localFluxoRepo } from './localStorage/FluxoRepository'
import { fluxoTarefaRepo as localFluxoTarefaRepo } from './localStorage/FluxoTarefaRepository'
import { rotinaRepo as localRotinaRepo } from './localStorage/RotinaRepository'
import { rotinaClienteRepo as localRotinaClienteRepo } from './localStorage/RotinaClienteRepository'
import { cicloRepo as localCicloRepo } from './localStorage/CicloRepository'
import { ocorrenciaRepo as localOcorrenciaRepo } from './localStorage/OcorrenciaRepository'
import { tarefaRepo as localTarefaRepo } from './localStorage/TarefaRepository'
import { ocorrenciaDocumentoRepo as localOcorrenciaDocumentoRepo } from './localStorage/OcorrenciaDocumentoRepository'
import { LocalHistoricoTarefaRepository } from './localStorage/HistoricoTarefaRepository'

// --- Supabase ---
import { SupabaseFichaBlocoRepository } from './supabase/FichaBlocoRepository'
import { SupabaseFichaCampoRepository } from './supabase/FichaCampoRepository'
import { SupabaseFluxoRepository } from './supabase/FluxoRepository'
import { SupabaseFluxoTarefaRepository } from './supabase/FluxoTarefaRepository'
import { SupabaseRotinaRepository } from './supabase/RotinaRepository'
import { SupabaseRotinaClienteRepository } from './supabase/RotinaClienteRepository'
import { SupabaseCicloRepository } from './supabase/CicloRepository'
import { SupabaseOcorrenciaRepository } from './supabase/OcorrenciaRepository'
import { SupabaseTarefaRepository } from './supabase/TarefaRepository'
import { SupabaseOcorrenciaDocumentoRepository } from './supabase/OcorrenciaDocumentoRepository'
import { SupabaseHistoricoTarefaRepository } from './supabase/HistoricoTarefaRepository'

export const fichaBlocoRepo = isSupabaseEnabled
  ? new SupabaseFichaBlocoRepository()
  : new LocalFichaBlocoRepository()

export const fichaCampoRepo = isSupabaseEnabled
  ? new SupabaseFichaCampoRepository()
  : new LocalFichaCampoRepository()

export const fluxoRepo = isSupabaseEnabled
  ? new SupabaseFluxoRepository()
  : localFluxoRepo

export const fluxoTarefaRepo = isSupabaseEnabled
  ? new SupabaseFluxoTarefaRepository()
  : localFluxoTarefaRepo

export const rotinaRepo = isSupabaseEnabled
  ? new SupabaseRotinaRepository()
  : localRotinaRepo

export const rotinaClienteRepo = isSupabaseEnabled
  ? new SupabaseRotinaClienteRepository()
  : localRotinaClienteRepo

export const cicloRepo = isSupabaseEnabled
  ? new SupabaseCicloRepository()
  : localCicloRepo

export const ocorrenciaRepo = isSupabaseEnabled
  ? new SupabaseOcorrenciaRepository()
  : localOcorrenciaRepo

export const tarefaRepo = isSupabaseEnabled
  ? new SupabaseTarefaRepository()
  : localTarefaRepo

export const ocorrenciaDocumentoRepo = isSupabaseEnabled
  ? new SupabaseOcorrenciaDocumentoRepository()
  : localOcorrenciaDocumentoRepo

export const historicoTarefaRepo = isSupabaseEnabled
  ? new SupabaseHistoricoTarefaRepository()
  : new LocalHistoricoTarefaRepository()
