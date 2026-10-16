import type { AppPlan } from '@/domain/types'
import type { AppPlanRepository as IAppPlanRepository } from '../interfaces'

class LocalAppPlanRepository implements IAppPlanRepository {
  private readonly key = 'vb_app_plans'

  private readAll(): AppPlan[] {
    try {
      const raw = localStorage.getItem(this.key)
      return raw ? (JSON.parse(raw) as AppPlan[]) : []
    } catch {
      return []
    }
  }

  private writeAll(items: AppPlan[]): void {
    localStorage.setItem(this.key, JSON.stringify(items))
  }

  async findByApp(appId: string): Promise<AppPlan[]> {
    return Promise.resolve(this.readAll().filter((p) => p.app_id === appId))
  }

  async findById(id: string): Promise<AppPlan | null> {
    return Promise.resolve(this.readAll().find((p) => p.id === id) ?? null)
  }

  async create(item: AppPlan): Promise<AppPlan> {
    const all = this.readAll()
    all.push(item)
    this.writeAll(all)
    return Promise.resolve(item)
  }

  async update(id: string, data: Partial<AppPlan>): Promise<AppPlan> {
    const all = this.readAll()
    const idx = all.findIndex((p) => p.id === id)
    if (idx === -1) throw new Error(`AppPlan ${id} not found`)
    all[idx] = { ...all[idx], ...data }
    this.writeAll(all)
    return Promise.resolve(all[idx])
  }
}

export const appPlanRepo = new LocalAppPlanRepository()
