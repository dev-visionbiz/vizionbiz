import { supabase } from '@/lib/supabase'
import type { DocumentType } from '@/domain/types'
import type { DocumentTypeRepository as IDocumentTypeRepository } from '../interfaces'

export class SupabaseDocumentTypeRepository implements IDocumentTypeRepository {
  async findAll(tenantId: string): Promise<DocumentType[]> {
    const { data, error } = await supabase.from('document_types').select('*').eq('tenant_id', tenantId)
    if (error) throw error
    return data ?? []
  }

  async findById(id: string): Promise<DocumentType | null> {
    const { data, error } = await supabase.from('document_types').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data ?? null
  }

  async create(item: DocumentType): Promise<DocumentType> {
    const { data, error } = await supabase.from('document_types').insert(item).select().single()
    if (error) throw error
    return data
  }

  async update(id: string, data: Partial<DocumentType>): Promise<DocumentType> {
    const { data: updated, error } = await supabase.from('document_types').update(data).eq('id', id).select().single()
    if (error) throw error
    return updated
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('document_types').delete().eq('id', id)
    if (error) throw error
  }
}
