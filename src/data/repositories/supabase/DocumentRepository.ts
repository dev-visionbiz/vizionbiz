import { supabase } from '@/lib/supabase'
import type { Document } from '@/domain/types'
import type { DocumentRepository as IDocumentRepository } from '../interfaces'

export class SupabaseDocumentRepository implements IDocumentRepository {
  async findAll(tenantId: string): Promise<Document[]> {
    const { data, error } = await supabase.from('documents').select('*').eq('tenant_id', tenantId)
    if (error) throw error
    return data ?? []
  }

  async findById(id: string): Promise<Document | null> {
    const { data, error } = await supabase.from('documents').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data ?? null
  }

  async findByClient(tenantId: string, clientId: string): Promise<Document[]> {
    const { data, error } = await supabase.from('documents').select('*').eq('tenant_id', tenantId).eq('client_id', clientId)
    if (error) throw error
    return data ?? []
  }

  async findByFolder(folderId: string): Promise<Document[]> {
    const { data, error } = await supabase.from('documents').select('*').eq('folder_id', folderId)
    if (error) throw error
    return data ?? []
  }

  async findByCompetencia(tenantId: string, competencia: string): Promise<Document[]> {
    const { data, error } = await supabase.from('documents').select('*').eq('tenant_id', tenantId).eq('competencia', competencia)
    if (error) throw error
    return data ?? []
  }

  async create(item: Document): Promise<Document> {
    const { data, error } = await supabase.from('documents').insert(item).select().single()
    if (error) throw error
    return data
  }

  async update(id: string, data: Partial<Document>): Promise<Document> {
    const { data: updated, error } = await supabase.from('documents').update(data).eq('id', id).select().single()
    if (error) throw error
    return updated
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('documents').delete().eq('id', id)
    if (error) throw error
  }
}
