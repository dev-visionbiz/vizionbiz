import { supabase } from '@/lib/supabase'
import type { DocumentEventRecord } from '@/domain/types'
import type { DocumentEventRepository as IDocumentEventRepository } from '../interfaces'

export class SupabaseDocumentEventRepository implements IDocumentEventRepository {
  async findByDocument(documentId: string): Promise<DocumentEventRecord[]> {
    const { data, error } = await supabase.from('document_event_records').select('*').eq('document_id', documentId)
    if (error) throw error
    return data ?? []
  }

  async findByClient(tenantId: string, clientId: string): Promise<DocumentEventRecord[]> {
    const { data: docs, error: docsError } = await supabase
      .from('documents')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('client_id', clientId)
    if (docsError) throw docsError
    if (!docs || docs.length === 0) return []

    const ids = docs.map((d) => d.id)
    const { data, error } = await supabase.from('document_event_records').select('*').in('document_id', ids)
    if (error) throw error
    return data ?? []
  }

  async create(item: DocumentEventRecord): Promise<DocumentEventRecord> {
    const { data, error } = await supabase.from('document_event_records').insert(item).select().single()
    if (error) throw error
    return data
  }
}
