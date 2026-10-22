import { supabase } from '@/lib/supabase'
import type { LoteImportacao } from '@/domain/types'
import type { LoteImportacaoRepository as ILoteImportacaoRepository } from '../interfaces'

export class SupabaseLoteImportacaoRepository implements ILoteImportacaoRepository {
  async findAll(tenantId: string): Promise<LoteImportacao[]> {
    const { data, error } = await supabase
      .from('lotes_importacao')
      .select('*')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
    if (error) throw error
    return data ?? []
  }

  async findById(id: string): Promise<LoteImportacao | null> {
    const { data, error } = await supabase
      .from('lotes_importacao')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return data ?? null
  }

  async findByTenant(tenantId: string): Promise<LoteImportacao[]> {
    const { data, error } = await supabase
      .from('lotes_importacao')
      .select('*')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
    if (error) throw error
    return data ?? []
  }

  async create(item: LoteImportacao): Promise<LoteImportacao> {
    const { data, error } = await supabase
      .from('lotes_importacao')
      .insert(item)
      .select()
      .single()
    if (error) throw error
    return data
  }

  async update(id: string, item: Partial<LoteImportacao>): Promise<LoteImportacao> {
    const { data, error } = await supabase
      .from('lotes_importacao')
      .update(item)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('lotes_importacao')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
  }
}
