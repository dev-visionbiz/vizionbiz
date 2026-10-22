import { supabase } from '@/lib/supabase'
import type { BillingPolicy } from '@/domain/types'
import type { BillingPolicyRepository as IBillingPolicyRepository } from '../interfaces'

export class SupabaseBillingPolicyRepository implements IBillingPolicyRepository {
  async findByTenant(tenantId: string): Promise<BillingPolicy | null> {
    const { data, error } = await supabase.from('billing_policies').select('*').eq('tenant_id', tenantId).maybeSingle()
    if (error) throw error
    return data ?? null
  }

  async upsert(policy: BillingPolicy): Promise<BillingPolicy> {
    const { data, error } = await supabase.from('billing_policies').upsert(policy, { onConflict: 'tenant_id' }).select().single()
    if (error) throw error
    return data
  }
}
