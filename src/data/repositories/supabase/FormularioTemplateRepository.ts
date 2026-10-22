import { supabase } from '@/lib/supabase'
import type { FormularioTemplate } from '@/domain/types'
import type { FormularioTemplateRepository as IFormularioTemplateRepository } from '../interfaces'

export class SupabaseFormularioTemplateRepository implements IFormularioTemplateRepository {
  async findAll(tenantId: string): Promise<FormularioTemplate[]> {
    const { data, error } = await supabase
      .from('formulario_templates')
      .select('*')
      .eq('tenant_id', tenantId)
    if (error) throw error
    return data ?? []
  }

  async findById(id: string): Promise<FormularioTemplate | null> {
    const { data, error } = await supabase
      .from('formulario_templates')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return data ?? null
  }

  async findAtivos(tenantId: string): Promise<FormularioTemplate[]> {
    const { data, error } = await supabase
      .from('formulario_templates')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('ativo', true)
    if (error) throw error
    return data ?? []
  }

  async create(item: FormularioTemplate): Promise<FormularioTemplate> {
    const { data, error } = await supabase
      .from('formulario_templates')
      .insert(item)
      .select()
      .single()
    if (error) throw error
    return data
  }

  async update(id: string, item: Partial<FormularioTemplate>): Promise<FormularioTemplate> {
    const { data, error } = await supabase
      .from('formulario_templates')
      .update(item)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('formulario_templates')
      .delete()
      .eq('id', id)
    if (error) throw error
  }
}
