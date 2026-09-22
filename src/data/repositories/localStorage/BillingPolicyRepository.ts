import type { BillingPolicy } from '@/domain/types'
import type { BillingPolicyRepository as IBillingPolicyRepository } from '../interfaces'

export class LocalBillingPolicyRepository implements IBillingPolicyRepository {
  private readonly key = 'vb_billing_policies'

  private readAll(): BillingPolicy[] {
    try {
      const raw = localStorage.getItem(this.key)
      return raw ? (JSON.parse(raw) as BillingPolicy[]) : []
    } catch {
      return []
    }
  }

  async findByTenant(tenantId: string): Promise<BillingPolicy | null> {
    const all = this.readAll()
    return Promise.resolve(all.find((p) => p.tenant_id === tenantId) ?? null)
  }

  async upsert(policy: BillingPolicy): Promise<BillingPolicy> {
    const all = this.readAll()
    const idx = all.findIndex((p) => p.tenant_id === policy.tenant_id)
    if (idx === -1) {
      all.push(policy)
    } else {
      all[idx] = policy
    }
    localStorage.setItem(this.key, JSON.stringify(all))
    return Promise.resolve(policy)
  }
}
