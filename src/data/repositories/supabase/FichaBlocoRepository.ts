import { supabase } from '@/lib/supabase'
import type { FichaBloco } from '@/domain/types'
import type { FichaBlocoRepository as IFichaBlocoRepository } from '../interfaces'

export class SupabaseFichaBlocoRepository implements IFichaBlocoRepository {
  async findAll(tenantId: string): Promise<FichaBloco[]> {
    const { data, error } = await supabase.from('ficha_blocos').select('*').eq('tenant_id', tenantId)
    if (error) throw error
    return data ?? []
  }

  async findById(id: string): Promise<FichaBloco | null> {
    const { data, error } = await supabase.from('ficha_blocos').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data ?? null
  }

  async findByClient(tenantId: string, clientId: string): Promise<FichaBloco[]> {
    const { data, error } = await supabase.from('ficha_blocos').select('*').eq('tenant_id', tenantId).eq('client_id', clientId)
    if (error) throw error
    return data ?? []
  }

  async create(item: FichaBloco): Promise<FichaBloco> {
    const { data, error } = await supabase.from('ficha_blocos').insert(item).select().single()
    if (error) throw error
    return data
  }

  async update(id: string, data: Partial<FichaBloco>): Promise<FichaBloco> {
    const { data: updated, error } = await supabase.from('ficha_blocos').update(data).eq('id', id).select().single()
    if (error) throw error
    return updated
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('ficha_blocos').delete().eq('id', id)
    if (error) throw error
  }
}
