import { supabase } from '@/lib/supabase'
import type { LogAtividadeCliente } from '@/domain/types'
import type { LogAtividadeClienteRepository as ILogAtividadeClienteRepository } from '../interfaces'

export class SupabaseLogAtividadeClienteRepository implements ILogAtividadeClienteRepository {
  async findByClient(tenantId: string, clientId: string): Promise<LogAtividadeCliente[]> {
    const { data, error } = await supabase.from('log_atividades_clientes').select('*').eq('tenant_id', tenantId).eq('client_id', clientId)
    if (error) throw error
    return data ?? []
  }

  async findByReferencia(tenantId: string, referenciaId: string): Promise<LogAtividadeCliente[]> {
    const { data, error } = await supabase.from('log_atividades_clientes').select('*').eq('tenant_id', tenantId).eq('referencia_id', referenciaId)
    if (error) throw error
    return data ?? []
  }

  async create(item: LogAtividadeCliente): Promise<LogAtividadeCliente> {
    const { data, error } = await supabase.from('log_atividades_clientes').insert(item).select().single()
    if (error) throw error
    return data
  }
}
