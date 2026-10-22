import { supabase } from '@/lib/supabase'
import type { CertificadoDigital } from '@/domain/types'

export class SupabaseCertificadoRepository {
  async findAll(tenantId: string): Promise<CertificadoDigital[]> {
    const { data, error } = await supabase
      .from('certificados_digitais')
      .select('*')
      .eq('tenant_id', tenantId)
    if (error) throw error
    return data ?? []
  }

  async findById(id: string): Promise<CertificadoDigital | null> {
    const { data, error } = await supabase
      .from('certificados_digitais')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return data ?? null
  }

  async findByCliente(tenantId: string, clienteId: string): Promise<CertificadoDigital[]> {
    const { data, error } = await supabase
      .from('certificados_digitais')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('cliente_id', clienteId)
    if (error) throw error
    return data ?? []
  }

  async findVencendo(tenantId: string, diasLimite: number): Promise<CertificadoDigital[]> {
    const hoje = new Date()
    const limite = new Date()
    limite.setDate(hoje.getDate() + diasLimite)
    const hojeStr = hoje.toISOString().slice(0, 10)
    const thresholdDate = limite.toISOString().slice(0, 10)

    const { data, error } = await supabase
      .from('certificados_digitais')
      .select('*')
      .eq('tenant_id', tenantId)
      .in('status', ['valido', 'vencendo'])
      .lte('validade', thresholdDate)
      .gte('validade', hojeStr)
    if (error) throw error
    return data ?? []
  }

  async findVencidos(tenantId: string): Promise<CertificadoDigital[]> {
    const hojeStr = new Date().toISOString().slice(0, 10)

    const { data, error } = await supabase
      .from('certificados_digitais')
      .select('*')
      .eq('tenant_id', tenantId)
      .or(`status.eq.vencido,validade.lt.${hojeStr}`)
    if (error) throw error
    return data ?? []
  }

  async create(item: CertificadoDigital): Promise<CertificadoDigital> {
    const { data, error } = await supabase
      .from('certificados_digitais')
      .insert(item)
      .select()
      .single()
    if (error) throw error
    return data
  }

  async update(id: string, item: Partial<CertificadoDigital>): Promise<CertificadoDigital> {
    const { data, error } = await supabase
      .from('certificados_digitais')
      .update(item)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('certificados_digitais')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
  }
}
