import { supabase } from '@/lib/supabase'
import type { StorageConnection } from '@/domain/types'

export class SupabaseStorageConnectionRepository {
  async findAll(escritorioId: string): Promise<StorageConnection[]> {
    const { data, error } = await supabase.from('storage_connections').select('*').eq('escritorio_id', escritorioId)
    if (error) throw error
    return data ?? []
  }

  async findById(id: string): Promise<StorageConnection | null> {
    const { data, error } = await supabase.from('storage_connections').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data ?? null
  }

  async create(item: StorageConnection): Promise<StorageConnection> {
    const { data, error } = await supabase.from('storage_connections').insert(item).select().single()
    if (error) throw error
    return data
  }

  async update(id: string, data: Partial<StorageConnection>): Promise<StorageConnection> {
    const { data: updated, error } = await supabase.from('storage_connections').update(data).eq('id', id).select().single()
    if (error) throw error
    return updated
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('storage_connections').delete().eq('id', id)
    if (error) throw error
  }

  async buscarPorEscritorioId(escritorioId: string): Promise<StorageConnection | null> {
    const { data, error } = await supabase
      .from('storage_connections')
      .select('*')
      .eq('escritorio_id', escritorioId)
      .maybeSingle()
    if (error) throw error
    return data
  }

  async salvar(conn: StorageConnection): Promise<StorageConnection> {
    const { data, error } = await supabase
      .from('storage_connections')
      .upsert(conn, { onConflict: 'escritorio_id' })
      .select()
      .single()
    if (error) throw error
    return data
  }

  async remover(escritorioId: string): Promise<void> {
    const { error } = await supabase
      .from('storage_connections')
      .delete()
      .eq('escritorio_id', escritorioId)
    if (error) throw error
  }
}
