/**
 * Provider de repositórios de clientes.
 *
 * Quando VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY estão no .env.local:
 *   → usa implementações Supabase (persistência real, multi-device)
 *
 * Quando não estão configuradas:
 *   → cai silenciosamente para localStorage (modo desenvolvimento/demo)
 */

import { isSupabaseEnabled } from '@/lib/supabase'

// --- localStorage ---
import { LocalClientRepository } from './localStorage/ClientRepository'
import { LocalPessoaRepository } from './localStorage/PessoaRepository'
import { LocalEmpresaPessoaRepository } from './localStorage/EmpresaPessoaRepository'
import { LocalGrupoRepository } from './localStorage/GrupoRepository'
import { LocalGrupoEmpresaRepository } from './localStorage/GrupoEmpresaRepository'
import { LocalClientVinculoRepository } from './localStorage/ClientVinculoRepository'
import { LocalCarteiraRepository } from './localStorage/CarteiraRepository'
import { LocalHistoricoStatusClienteRepository } from './localStorage/HistoricoStatusClienteRepository'
import { clienteEnderecoRepo as localClienteEnderecoRepo } from './localStorage/ClienteEnderecoRepository'
import { clienteContatoRepo as localClienteContatoRepo } from './localStorage/ClienteContatoRepository'
import { clienteCnaeRepo as localClienteCnaeRepo } from './localStorage/ClienteCnaeRepository'
import { LocalLogAtividadeClienteRepository } from './localStorage/LogAtividadeClienteRepository'

// --- Supabase ---
import { SupabaseClientRepository } from './supabase/ClientRepository'
import { SupabasePessoaRepository } from './supabase/PessoaRepository'
import { SupabaseEmpresaPessoaRepository } from './supabase/EmpresaPessoaRepository'
import { SupabaseGrupoRepository } from './supabase/GrupoRepository'
import { SupabaseGrupoEmpresaRepository } from './supabase/GrupoEmpresaRepository'
import { SupabaseClientVinculoRepository } from './supabase/ClientVinculoRepository'
import { SupabaseCarteiraRepository } from './supabase/CarteiraRepository'
import { SupabaseHistoricoStatusClienteRepository } from './supabase/HistoricoStatusClienteRepository'
import { SupabaseClienteEnderecoRepository } from './supabase/ClienteEnderecoRepository'
import { SupabaseClienteContatoRepository } from './supabase/ClienteContatoRepository'
import { SupabaseClienteCnaeRepository } from './supabase/ClienteCnaeRepository'
import { SupabaseLogAtividadeClienteRepository } from './supabase/LogAtividadeClienteRepository'

export const clientRepo = isSupabaseEnabled
  ? new SupabaseClientRepository()
  : new LocalClientRepository()

export const pessoaRepo = isSupabaseEnabled
  ? new SupabasePessoaRepository()
  : new LocalPessoaRepository()

export const empresaPessoaRepo = isSupabaseEnabled
  ? new SupabaseEmpresaPessoaRepository()
  : new LocalEmpresaPessoaRepository()

export const grupoRepo = isSupabaseEnabled
  ? new SupabaseGrupoRepository()
  : new LocalGrupoRepository()

export const grupoEmpresaRepo = isSupabaseEnabled
  ? new SupabaseGrupoEmpresaRepository()
  : new LocalGrupoEmpresaRepository()

export const clientVinculoRepo = isSupabaseEnabled
  ? new SupabaseClientVinculoRepository()
  : new LocalClientVinculoRepository()

export const carteiraRepo = isSupabaseEnabled
  ? new SupabaseCarteiraRepository()
  : new LocalCarteiraRepository()

export const historicoStatusRepo = isSupabaseEnabled
  ? new SupabaseHistoricoStatusClienteRepository()
  : new LocalHistoricoStatusClienteRepository()

export const clienteEnderecoRepo = isSupabaseEnabled
  ? new SupabaseClienteEnderecoRepository()
  : localClienteEnderecoRepo

export const clienteContatoRepo = isSupabaseEnabled
  ? new SupabaseClienteContatoRepository()
  : localClienteContatoRepo

export const clienteCnaeRepo = isSupabaseEnabled
  ? new SupabaseClienteCnaeRepository()
  : localClienteCnaeRepo

export const logAtividadeRepo = isSupabaseEnabled
  ? new SupabaseLogAtividadeClienteRepository()
  : new LocalLogAtividadeClienteRepository()
