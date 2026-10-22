import { supabase } from '@/lib/supabase'
import type { Carteira } from '@/domain/types'
import type { CarteiraRepository as ICarteiraRepository } from '../interfaces'

export class SupabaseCarteiraRepository implements ICarteiraRepository {
  async findAll(tenantId: string): Promise<Carteira[]> {
    const { data, error } = await supabase.from('carteiras').select('*').eq('tenant_id', tenantId)
    if (error) throw error
    return data ?? []
  }

  async findById(id: string): Promise<Carteira | null> {
    const { data, error } = await supabase.from('carteiras').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data ?? null
  }

  async create(item: Carteira): Promise<Carteira> {
    const { data, error } = await supabase.from('carteiras').insert(item).select().single()
    if (error) throw error
    return data
  }

  async update(id: string, data: Partial<Carteira>): Promise<Carteira> {
    const { data: updated, error } = await supabase.from('carteiras').update(data).eq('id', id).select().single()
    if (error) throw error
    return updated
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('carteiras').delete().eq('id', id)
    if (error) throw error
  }
}
