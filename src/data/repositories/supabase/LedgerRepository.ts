import { supabase } from '@/lib/supabase'
import type { LedgerEntry } from '@/domain/types'

export class SupabaseLedgerRepository {
  async findAll(): Promise<LedgerEntry[]> {
    const { data, error } = await supabase
      .from('ledger')
      .select('*')
      .order('criado_em', { ascending: false })
    if (error) throw error
    return data ?? []
  }

  async findByEscritorio(escritorioId: string): Promise<LedgerEntry[]> {
    const { data, error } = await supabase
      .from('ledger')
      .select('*')
      .eq('escritorio_id', escritorioId)
      .order('criado_em', { ascending: false })
    if (error) throw error
    return data ?? []
  }

  async findByApp(appId: string): Promise<LedgerEntry[]> {
    const { data, error } = await supabase
      .from('ledger')
      .select('*')
      .eq('app_id', appId)
      .order('criado_em', { ascending: false })
    if (error) throw error
    return data ?? []
  }

  async findByPeriodo(de: string, ate: string): Promise<LedgerEntry[]> {
    const { data, error } = await supabase
      .from('ledger')
      .select('*')
      .gte('criado_em', de)
      .lte('criado_em', ate)
      .order('criado_em', { ascending: false })
    if (error) throw error
    return data ?? []
  }

  async create(item: LedgerEntry): Promise<LedgerEntry> {
    const { data, error } = await supabase
      .from('ledger')
      .insert(item)
      .select()
      .single()
    if (error) throw error
    return data
  }
}
