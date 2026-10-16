import type { Subscription, SubscriptionStatus } from '@/domain/types'

class LocalSubscriptionRepository {
  private readonly key = 'vb_app_subscriptions'

  private readAll(): Subscription[] {
    try {
      const raw = localStorage.getItem(this.key)
      return raw ? (JSON.parse(raw) as Subscription[]) : []
    } catch {
      return []
    }
  }

  private writeAll(items: Subscription[]): void {
    localStorage.setItem(this.key, JSON.stringify(items))
  }

  async findByEscritorio(escritorioId: string): Promise<Subscription[]> {
    return Promise.resolve(this.readAll().filter((s) => s.escritorio_id === escritorioId))
  }

  async findByInstallation(installationId: string): Promise<Subscription | null> {
    const found = this.readAll()
      .filter((s) => s.installation_id === installationId && s.status === 'ativa')
      .sort((a, b) => b.criado_em.localeCompare(a.criado_em))[0]
    return Promise.resolve(found ?? null)
  }

  async findById(id: string): Promise<Subscription | null> {
    return Promise.resolve(this.readAll().find((s) => s.id === id) ?? null)
  }

  async create(item: Subscription): Promise<Subscription> {
    const all = this.readAll()
    all.push(item)
    this.writeAll(all)
    return Promise.resolve(item)
  }

  async update(id: string, data: Partial<Subscription>): Promise<Subscription> {
    const all = this.readAll()
    const idx = all.findIndex((s) => s.id === id)
    if (idx === -1) throw new Error(`Subscription ${id} not found`)
    all[idx] = { ...all[idx], ...data }
    this.writeAll(all)
    return Promise.resolve(all[idx])
  }
}

export const subscriptionRepo = new LocalSubscriptionRepository()
