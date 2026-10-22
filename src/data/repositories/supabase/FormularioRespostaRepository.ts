import { supabase } from '@/lib/supabase'
import type { FormularioResposta } from '@/domain/types'
import type { FormularioRespostaRepository as IFormularioRespostaRepository } from '../interfaces'

export class SupabaseFormularioRespostaRepository implements IFormularioRespostaRepository {
  async findAll(tenantId: string): Promise<FormularioResposta[]> {
    const { data, error } = await supabase
      .from('formulario_respostas')
      .select('*')
      .eq('tenant_id', tenantId)
    if (error) throw error
    return data ?? []
  }

  async findById(id: string): Promise<FormularioResposta | null> {
    const { data, error } = await supabase
      .from('formulario_respostas')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return data ?? null
  }

  async findByOcorrencia(ocorrenciaId: string): Promise<FormularioResposta[]> {
    const { data, error } = await supabase
      .from('formulario_respostas')
      .select('*')
      .eq('ocorrencia_id', ocorrenciaId)
    if (error) throw error
    return data ?? []
  }

  async findByCliente(tenantId: string, clienteId: string): Promise<FormularioResposta[]> {
    const { data, error } = await supabase
      .from('formulario_respostas')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('cliente_id', clienteId)
    if (error) throw error
    return data ?? []
  }

  async findByTemplate(tenantId: string, templateId: string): Promise<FormularioResposta[]> {
    const { data, error } = await supabase
      .from('formulario_respostas')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('template_id', templateId)
      .order('criado_em', { ascending: false })
    if (error) throw error
    return data ?? []
  }

  async create(item: FormularioResposta): Promise<FormularioResposta> {
    const { data, error } = await supabase
      .from('formulario_respostas')
      .insert(item)
      .select()
      .single()
    if (error) throw error
    return data
  }

  async update(id: string, item: Partial<FormularioResposta>): Promise<FormularioResposta> {
    const { data, error } = await supabase
      .from('formulario_respostas')
      .update(item)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('formulario_respostas')
      .delete()
      .eq('id', id)
    if (error) throw error
  }
}
