import type { User } from '@/domain/types'
import type { UserRepository as IUserRepository } from '../interfaces'

export class LocalUserRepository implements IUserRepository {
  private readonly key = 'vb_users'

  private readAll(): User[] {
    try {
      const raw = localStorage.getItem(this.key)
      return raw ? (JSON.parse(raw) as User[]) : []
    } catch {
      return []
    }
  }

  private writeAll(items: User[]): void {
    localStorage.setItem(this.key, JSON.stringify(items))
  }

  async findAll(tenantId: string, options?: { includeInactive?: boolean }): Promise<User[]> {
    const all = this.readAll().filter((u) => u.tenant_id === tenantId)
    if (options?.includeInactive) return Promise.resolve(all)
    return Promise.resolve(all.filter((u) => u.ativo !== false))
  }

  async findById(id: string): Promise<User | null> {
    return Promise.resolve(this.readAll().find((u) => u.id === id) ?? null)
  }

  async findByEmail(email: string): Promise<User | null> {
    return Promise.resolve(this.readAll().find((u) => u.email === email) ?? null)
  }

  async create(item: User): Promise<User> {
    const all = this.readAll()
    all.push(item)
    this.writeAll(all)
    return Promise.resolve(item)
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    const all = this.readAll()
    const idx = all.findIndex((u) => u.id === id)
    if (idx === -1) throw new Error(`User ${id} not found`)
    all[idx] = { ...all[idx], ...data }
    this.writeAll(all)
    return Promise.resolve(all[idx])
  }
}
