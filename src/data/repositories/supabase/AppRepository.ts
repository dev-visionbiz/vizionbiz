import { supabase } from '@/lib/supabase'
import type { App } from '@/domain/types'
import type { AppRepository as IAppRepository } from '../interfaces'

export class SupabaseAppRepository implements IAppRepository {
  async findAll(): Promise<App[]> {
    const { data, error } = await supabase
      .from('apps')
      .select('*')
      .order('nome')
    if (error) throw error
    return data ?? []
  }

  async findById(id: string): Promise<App | null> {
    const { data, error } = await supabase
      .from('apps')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return data
  }

  async findBySlug(slug: string): Promise<App | null> {
    const { data, error } = await supabase
      .from('apps')
      .select('*')
      .eq('slug', slug)
      .maybeSingle()
    if (error) throw error
    return data
  }

  async create(item: App): Promise<App> {
    const { data, error } = await supabase
      .from('apps')
      .insert(item)
      .select()
      .single()
    if (error) throw error
    return data
  }

  async update(id: string, changes: Partial<App>): Promise<App> {
    const { data, error } = await supabase
      .from('apps')
      .update(changes)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }
}
