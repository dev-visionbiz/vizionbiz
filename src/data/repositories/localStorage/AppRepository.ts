import { BaseLocalStorageRepository } from './BaseLocalStorageRepository'
import type { App } from '@/domain/types'
import type { AppRepository as IAppRepository } from '../interfaces'

class LocalAppRepository implements IAppRepository {
  private readonly key = 'vb_apps'

  private readAll(): App[] {
    try {
      const raw = localStorage.getItem(this.key)
      return raw ? (JSON.parse(raw) as App[]) : []
    } catch {
      return []
    }
  }

  private writeAll(items: App[]): void {
    localStorage.setItem(this.key, JSON.stringify(items))
  }

  async findAll(): Promise<App[]> {
    return Promise.resolve(this.readAll())
  }

  async findById(id: string): Promise<App | null> {
    return Promise.resolve(this.readAll().find((a) => a.id === id) ?? null)
  }

  async findBySlug(slug: string): Promise<App | null> {
    return Promise.resolve(this.readAll().find((a) => a.slug === slug) ?? null)
  }

  async create(item: App): Promise<App> {
    const all = this.readAll()
    all.push(item)
    this.writeAll(all)
    return Promise.resolve(item)
  }

  async update(id: string, data: Partial<App>): Promise<App> {
    const all = this.readAll()
    const idx = all.findIndex((a) => a.id === id)
    if (idx === -1) throw new Error(`App ${id} not found`)
    all[idx] = { ...all[idx], ...data }
    this.writeAll(all)
    return Promise.resolve(all[idx])
  }
}

export const appRepo = new LocalAppRepository()
