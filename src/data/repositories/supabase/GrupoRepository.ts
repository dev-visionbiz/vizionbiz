import { supabase } from '@/lib/supabase'
import type { Grupo } from '@/domain/types'
import type { GrupoRepository as IGrupoRepository } from '../interfaces'

export class SupabaseGrupoRepository implements IGrupoRepository {
  async findAll(tenantId: string): Promise<Grupo[]> {
    const { data, error } = await supabase.from('grupos').select('*').eq('tenant_id', tenantId)
    if (error) throw error
    return data ?? []
  }

  async findById(id: string): Promise<Grupo | null> {
    const { data, error } = await supabase.from('grupos').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data ?? null
  }

  async create(item: Grupo): Promise<Grupo> {
    const { data, error } = await supabase.from('grupos').insert(item).select().single()
    if (error) throw error
    return data
  }

  async update(id: string, data: Partial<Grupo>): Promise<Grupo> {
    const { data: updated, error } = await supabase.from('grupos').update(data).eq('id', id).select().single()
    if (error) throw error
    return updated
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('grupos').delete().eq('id', id)
    if (error) throw error
  }
}
