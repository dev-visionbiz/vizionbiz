import { supabase } from '@/lib/supabase'
import type { Folder } from '@/domain/types'
import type { FolderRepository as IFolderRepository } from '../interfaces'

export class SupabaseFolderRepository implements IFolderRepository {
  async findAll(tenantId: string): Promise<Folder[]> {
    const { data, error } = await supabase.from('folders').select('*').eq('tenant_id', tenantId)
    if (error) throw error
    return data ?? []
  }

  async findById(id: string): Promise<Folder | null> {
    const { data, error } = await supabase.from('folders').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data ?? null
  }

  async findByClient(tenantId: string, clientId: string): Promise<Folder[]> {
    const { data, error } = await supabase.from('folders').select('*').eq('tenant_id', tenantId).eq('client_id', clientId)
    if (error) throw error
    return data ?? []
  }

  async findChildren(parentId: string): Promise<Folder[]> {
    const { data, error } = await supabase.from('folders').select('*').eq('parent_id', parentId)
    if (error) throw error
    return data ?? []
  }

  async create(item: Folder): Promise<Folder> {
    const { data, error } = await supabase.from('folders').insert(item).select().single()
    if (error) throw error
    return data
  }

  async update(id: string, data: Partial<Folder>): Promise<Folder> {
    const { data: updated, error } = await supabase.from('folders').update(data).eq('id', id).select().single()
    if (error) throw error
    return updated
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('folders').delete().eq('id', id)
    if (error) throw error
  }
}
