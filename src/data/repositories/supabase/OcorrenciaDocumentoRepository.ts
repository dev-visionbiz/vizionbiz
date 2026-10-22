import { supabase } from '@/lib/supabase'
import type { OcorrenciaDocumento } from '@/domain/types'
import type { OcorrenciaDocumentoRepository as IOcorrenciaDocumentoRepository } from '../interfaces'

export class SupabaseOcorrenciaDocumentoRepository implements IOcorrenciaDocumentoRepository {
  async findAll(tenantId: string): Promise<OcorrenciaDocumento[]> {
    const { data, error } = await supabase.from('ocorrencia_documentos').select('*').eq('tenant_id', tenantId)
    if (error) throw error
    return data ?? []
  }

  async findById(id: string): Promise<OcorrenciaDocumento | null> {
    const { data, error } = await supabase.from('ocorrencia_documentos').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data ?? null
  }

  async findByOcorrencia(tenantId: string, ocorrenciaId: string): Promise<OcorrenciaDocumento[]> {
    const { data, error } = await supabase.from('ocorrencia_documentos').select('*').eq('tenant_id', tenantId).eq('ocorrencia_id', ocorrenciaId)
    if (error) throw error
    return data ?? []
  }

  async findByTarefa(tenantId: string, tarefaId: string): Promise<OcorrenciaDocumento[]> {
    const { data, error } = await supabase.from('ocorrencia_documentos').select('*').eq('tenant_id', tenantId).eq('tarefa_id', tarefaId)
    if (error) throw error
    return data ?? []
  }

  async findByCliente(tenantId: string, clienteId: string): Promise<OcorrenciaDocumento[]> {
    const { data, error } = await supabase.from('ocorrencia_documentos').select('*').eq('tenant_id', tenantId).eq('cliente_id', clienteId)
    if (error) throw error
    return data ?? []
  }

  async findByDocument(documentId: string): Promise<OcorrenciaDocumento[]> {
    const { data, error } = await supabase.from('ocorrencia_documentos').select('*').eq('document_id', documentId)
    if (error) throw error
    return data ?? []
  }

  async create(item: OcorrenciaDocumento): Promise<OcorrenciaDocumento> {
    const { data, error } = await supabase.from('ocorrencia_documentos').insert(item).select().single()
    if (error) throw error
    return data
  }

  async update(id: string, data: Partial<OcorrenciaDocumento>): Promise<OcorrenciaDocumento> {
    const { data: updated, error } = await supabase.from('ocorrencia_documentos').update(data).eq('id', id).select().single()
    if (error) throw error
    return updated
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('ocorrencia_documentos').delete().eq('id', id)
    if (error) throw error
  }
}
