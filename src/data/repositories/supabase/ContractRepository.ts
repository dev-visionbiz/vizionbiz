import { supabase } from '@/lib/supabase'
import type { Contract } from '@/domain/types'
import type { ContractRepository as IContractRepository } from '../interfaces'

export class SupabaseContractRepository implements IContractRepository {
  async findAll(tenantId: string): Promise<Contract[]> {
    const { data, error } = await supabase.from('contracts').select('*').eq('tenant_id', tenantId)
    if (error) throw error
    return data ?? []
  }

  async findById(id: string): Promise<Contract | null> {
    const { data, error } = await supabase.from('contracts').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data ?? null
  }

  async findByClient(tenantId: string, clientId: string): Promise<Contract[]> {
    const { data, error } = await supabase.from('contracts').select('*').eq('tenant_id', tenantId).eq('client_id', clientId)
    if (error) throw error
    return data ?? []
  }

  async findActive(tenantId: string): Promise<Contract[]> {
    const { data, error } = await supabase.from('contracts').select('*').eq('tenant_id', tenantId).eq('status', 'ativo')
    if (error) throw error
    return data ?? []
  }

  async findPrincipalAtivo(tenantId: string, clientId: string): Promise<Contract | null> {
    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('client_id', clientId)
      .eq('status', 'ativo')
      .eq('natureza', 'principal')
      .maybeSingle()
    if (error) throw error
    return data ?? null
  }

  async create(item: Contract): Promise<Contract> {
    const { data, error } = await supabase.from('contracts').insert(item).select().single()
    if (error) throw error
    return data
  }

  async update(id: string, data: Partial<Contract>): Promise<Contract> {
    const { data: updated, error } = await supabase.from('contracts').update(data).eq('id', id).select().single()
    if (error) throw error
    return updated
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('contracts').delete().eq('id', id)
    if (error) throw error
  }
}
