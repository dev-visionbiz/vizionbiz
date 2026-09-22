import type { Tenant } from '@/domain/types'
import type { TenantRepository as ITenantRepository } from '../interfaces'

export class LocalTenantRepository implements ITenantRepository {
  private readonly key = 'vb_tenants'

  private readAll(): Tenant[] {
    try {
      const raw = localStorage.getItem(this.key)
      return raw ? (JSON.parse(raw) as Tenant[]) : []
    } catch {
      return []
    }
  }

  async findById(id: string): Promise<Tenant | null> {
    return Promise.resolve(this.readAll().find((t) => t.id === id) ?? null)
  }

  async create(item: Tenant): Promise<Tenant> {
    const all = this.readAll()
    all.push(item)
    localStorage.setItem(this.key, JSON.stringify(all))
    return Promise.resolve(item)
  }

  async update(id: string, data: Partial<Tenant>): Promise<Tenant> {
    const all = this.readAll()
    const idx = all.findIndex((t) => t.id === id)
    if (idx === -1) throw new Error(`Tenant ${id} not found`)
    all[idx] = { ...all[idx], ...data }
    localStorage.setItem(this.key, JSON.stringify(all))
    return Promise.resolve(all[idx])
  }
}
