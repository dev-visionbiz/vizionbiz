import { supabase } from '@/lib/supabase'
import type { AppPlan } from '@/domain/types'
import type { AppPlanRepository as IAppPlanRepository } from '../interfaces'

export class SupabaseAppPlanRepository implements IAppPlanRepository {
  async findByApp(appId: string): Promise<AppPlan[]> {
    const { data, error } = await supabase
      .from('app_plans')
      .select('*')
      .eq('app_id', appId)
    if (error) throw error
    return data ?? []
  }

  async findById(id: string): Promise<AppPlan | null> {
    const { data, error } = await supabase
      .from('app_plans')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return data
  }

  async create(item: AppPlan): Promise<AppPlan> {
    const { data, error } = await supabase
      .from('app_plans')
      .insert(item)
      .select()
      .single()
    if (error) throw error
    return data
  }

  async update(id: string, changes: Partial<AppPlan>): Promise<AppPlan> {
    const { data, error } = await supabase
      .from('app_plans')
      .update(changes)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('app_plans').delete().eq('id', id)
    if (error) throw error
  }
}
