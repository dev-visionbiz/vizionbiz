import { supabase } from '@/lib/supabase'
import type { FichaCampo } from '@/domain/types'
import type { FichaCampoRepository as IFichaCampoRepository } from '../interfaces'

export class SupabaseFichaCampoRepository implements IFichaCampoRepository {
  async findAll(tenantId: string): Promise<FichaCampo[]> {
    const { data, error } = await supabase.from('ficha_campos').select('*').eq('tenant_id', tenantId)
    if (error) throw error
    return data ?? []
  }

  async findById(id: string): Promise<FichaCampo | null> {
    const { data, error } = await supabase.from('ficha_campos').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data ?? null
  }

  async findByBloco(tenantId: string, blocoId: string): Promise<FichaCampo[]> {
    const { data, error } = await supabase.from('ficha_campos').select('*').eq('tenant_id', tenantId).eq('bloco_id', blocoId)
    if (error) throw error
    return data ?? []
  }

  async deleteByBloco(blocoId: string): Promise<void> {
    const { error } = await supabase.from('ficha_campos').delete().eq('bloco_id', blocoId)
    if (error) throw error
  }

  async create(item: FichaCampo): Promise<FichaCampo> {
    const { data, error } = await supabase.from('ficha_campos').insert(item).select().single()
    if (error) throw error
    return data
  }

  async update(id: string, data: Partial<FichaCampo>): Promise<FichaCampo> {
    const { data: updated, error } = await supabase.from('ficha_campos').update(data).eq('id', id).select().single()
    if (error) throw error
    return updated
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('ficha_campos').delete().eq('id', id)
    if (error) throw error
  }
}
