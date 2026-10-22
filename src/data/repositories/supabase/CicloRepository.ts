import { supabase } from '@/lib/supabase'
import type { Ciclo } from '@/domain/types'
import type { CicloRepository as ICicloRepository } from '../interfaces'

export class SupabaseCicloRepository implements ICicloRepository {
  async findAll(tenantId: string): Promise<Ciclo[]> {
    const { data, error } = await supabase.from('ciclos').select('*').eq('tenant_id', tenantId)
    if (error) throw error
    return data ?? []
  }

  async findById(id: string): Promise<Ciclo | null> {
    const { data, error } = await supabase.from('ciclos').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data ?? null
  }

  async findByRotina(tenantId: string, rotinaId: string): Promise<Ciclo[]> {
    const { data, error } = await supabase.from('ciclos').select('*').eq('tenant_id', tenantId).eq('rotina_id', rotinaId)
    if (error) throw error
    return data ?? []
  }

  async findByPeriodo(tenantId: string, rotinaId: string, periodo: string): Promise<Ciclo | null> {
    const { data, error } = await supabase
      .from('ciclos')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('rotina_id', rotinaId)
      .eq('periodo', periodo)
      .maybeSingle()
    if (error) throw error
    return data ?? null
  }

  async create(item: Ciclo): Promise<Ciclo> {
    const { data, error } = await supabase.from('ciclos').insert(item).select().single()
    if (error) throw error
    return data
  }

  async update(id: string, data: Partial<Ciclo>): Promise<Ciclo> {
    const { data: updated, error } = await supabase.from('ciclos').update(data).eq('id', id).select().single()
    if (error) throw error
    return updated
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('ciclos').delete().eq('id', id)
    if (error) throw error
  }
}
