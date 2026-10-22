import { supabase } from '@/lib/supabase'
import type { GrupoEmpresa } from '@/domain/types'
import type { GrupoEmpresaRepository as IGrupoEmpresaRepository } from '../interfaces'

export class SupabaseGrupoEmpresaRepository implements IGrupoEmpresaRepository {
  async findAll(tenantId: string): Promise<GrupoEmpresa[]> {
    const { data, error } = await supabase.from('grupo_empresas').select('*').eq('tenant_id', tenantId)
    if (error) throw error
    return data ?? []
  }

  async findById(id: string): Promise<GrupoEmpresa | null> {
    const { data, error } = await supabase.from('grupo_empresas').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data ?? null
  }

  async findByGrupo(tenantId: string, grupoId: string): Promise<GrupoEmpresa[]> {
    const { data, error } = await supabase.from('grupo_empresas').select('*').eq('tenant_id', tenantId).eq('grupo_id', grupoId)
    if (error) throw error
    return data ?? []
  }

  async findByEmpresa(tenantId: string, empresaId: string): Promise<GrupoEmpresa[]> {
    const { data, error } = await supabase.from('grupo_empresas').select('*').eq('tenant_id', tenantId).eq('empresa_id', empresaId)
    if (error) throw error
    return data ?? []
  }

  async create(item: GrupoEmpresa): Promise<GrupoEmpresa> {
    const { data, error } = await supabase.from('grupo_empresas').insert(item).select().single()
    if (error) throw error
    return data
  }

  async update(id: string, data: Partial<GrupoEmpresa>): Promise<GrupoEmpresa> {
    const { data: updated, error } = await supabase.from('grupo_empresas').update(data).eq('id', id).select().single()
    if (error) throw error
    return updated
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('grupo_empresas').delete().eq('id', id)
    if (error) throw error
  }
}
