import { supabase } from '@/lib/supabase'
import type { EmpresaPessoa } from '@/domain/types'
import type { EmpresaPessoaRepository as IEmpresaPessoaRepository } from '../interfaces'

export class SupabaseEmpresaPessoaRepository implements IEmpresaPessoaRepository {
  async findAll(tenantId: string): Promise<EmpresaPessoa[]> {
    const { data, error } = await supabase.from('empresa_pessoas').select('*').eq('tenant_id', tenantId)
    if (error) throw error
    return data ?? []
  }

  async findById(id: string): Promise<EmpresaPessoa | null> {
    const { data, error } = await supabase.from('empresa_pessoas').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data ?? null
  }

  async findByEmpresa(tenantId: string, empresaId: string): Promise<EmpresaPessoa[]> {
    const { data, error } = await supabase.from('empresa_pessoas').select('*').eq('tenant_id', tenantId).eq('empresa_id', empresaId)
    if (error) throw error
    return data ?? []
  }

  async findByPessoa(tenantId: string, pessoaId: string): Promise<EmpresaPessoa[]> {
    const { data, error } = await supabase.from('empresa_pessoas').select('*').eq('tenant_id', tenantId).eq('pessoa_id', pessoaId)
    if (error) throw error
    return data ?? []
  }

  async create(item: EmpresaPessoa): Promise<EmpresaPessoa> {
    const { data, error } = await supabase.from('empresa_pessoas').insert(item).select().single()
    if (error) throw error
    return data
  }

  async update(id: string, data: Partial<EmpresaPessoa>): Promise<EmpresaPessoa> {
    const { data: updated, error } = await supabase.from('empresa_pessoas').update(data).eq('id', id).select().single()
    if (error) throw error
    return updated
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('empresa_pessoas').delete().eq('id', id)
    if (error) throw error
  }
}
