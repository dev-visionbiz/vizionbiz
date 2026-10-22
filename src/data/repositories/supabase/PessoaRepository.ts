import { supabase } from '@/lib/supabase'
import type { Pessoa } from '@/domain/types'
import type { PessoaRepository as IPessoaRepository } from '../interfaces'

export class SupabasePessoaRepository implements IPessoaRepository {
  async findAll(tenantId: string): Promise<Pessoa[]> {
    const { data, error } = await supabase.from('pessoas').select('*').eq('tenant_id', tenantId)
    if (error) throw error
    return data ?? []
  }

  async findById(id: string): Promise<Pessoa | null> {
    const { data, error } = await supabase.from('pessoas').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data ?? null
  }

  async create(item: Pessoa): Promise<Pessoa> {
    const { data, error } = await supabase.from('pessoas').insert(item).select().single()
    if (error) throw error
    return data
  }

  async update(id: string, data: Partial<Pessoa>): Promise<Pessoa> {
    const { data: updated, error } = await supabase.from('pessoas').update(data).eq('id', id).select().single()
    if (error) throw error
    return updated
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('pessoas').delete().eq('id', id)
    if (error) throw error
  }
}
