import { supabase } from '@/lib/supabase'
import type { User } from '@/domain/types'
import type { UserRepository as IUserRepository } from '../interfaces'

export class SupabaseUserRepository implements IUserRepository {
  async findAll(tenantId: string, options?: { includeInactive?: boolean }): Promise<User[]> {
    let query = supabase.from('users').select('*').eq('tenant_id', tenantId)
    if (!options?.includeInactive) query = query.eq('ativo', true)
    const { data, error } = await query
    if (error) throw error
    return data ?? []
  }

  async findById(id: string): Promise<User | null> {
    const { data, error } = await supabase.from('users').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data ?? null
  }

  async findByEmail(email: string): Promise<User | null> {
    const { data, error } = await supabase.from('users').select('*').eq('email', email).maybeSingle()
    if (error) throw error
    return data ?? null
  }

  async create(item: User): Promise<User> {
    const { data, error } = await supabase.from('users').insert(item).select().single()
    if (error) throw error
    return data
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    const { data: updated, error } = await supabase.from('users').update(data).eq('id', id).select().single()
    if (error) throw error
    return updated
  }
}
