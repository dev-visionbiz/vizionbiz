import { supabase } from '@/lib/supabase'
import type { Tenant } from '@/domain/types'
import type { TenantRepository as ITenantRepository } from '../interfaces'

export class SupabaseTenantRepository implements ITenantRepository {
  async findById(id: string): Promise<Tenant | null> {
    const { data, error } = await supabase.from('tenants').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data ?? null
  }

  async update(id: string, data: Partial<Tenant>): Promise<Tenant> {
    const { data: updated, error } = await supabase
      .from('tenants')
      .upsert({ id, ...data }, { onConflict: 'id' })
      .select()
      .single()
    if (error) throw error
    return updated
  }

  async create(item: Tenant): Promise<Tenant> {
    const { data, error } = await supabase.from('tenants').insert(item).select().single()
    if (error) throw error
    return data
  }
}
