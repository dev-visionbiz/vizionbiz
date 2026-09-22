// Stub para Fase 2. Implementação real será feita na migração para Supabase.
// Todo acesso ao Supabase Storage deve passar por este módulo conforme CLAUDE.md.
import type { DestinoEnvio, ProvedorStorage, ResultadoEnvio } from '../ProvedorStorage'

export class ProvedorSupabase implements ProvedorStorage {
  async enviar(_arquivo: File, _destino: DestinoEnvio): Promise<ResultadoEnvio> {
    throw new Error('ProvedorSupabase: ainda não configurado neste ambiente.')
  }

  async baixar(_providerFileId: string): Promise<string> {
    throw new Error('ProvedorSupabase: ainda não configurado neste ambiente.')
  }

  async excluir(_providerFileId: string): Promise<void> {
    throw new Error('ProvedorSupabase: ainda não configurado neste ambiente.')
  }

  async garantirPasta(_caminho: string[]): Promise<string> {
    throw new Error('ProvedorSupabase: ainda não configurado neste ambiente.')
  }

  async testarConexao(): Promise<{ ok: boolean; mensagem?: string }> {
    return { ok: false, mensagem: 'Supabase Storage ainda não configurado neste ambiente.' }
  }
}
