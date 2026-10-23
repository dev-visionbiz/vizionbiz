import type { AppVersion } from '@/domain/types'
import type { AppVersionRepository as IAppVersionRepository } from '../interfaces'

class LocalAppVersionRepository implements IAppVersionRepository {
  private readonly key = 'vb_app_versions'

  private readAll(): AppVersion[] {
    try {
      const raw = localStorage.getItem(this.key)
      return raw ? (JSON.parse(raw) as AppVersion[]) : []
    } catch {
      return []
    }
  }

  private writeAll(items: AppVersion[]): void {
    localStorage.setItem(this.key, JSON.stringify(items))
  }

  async findByApp(appId: string): Promise<AppVersion[]> {
    return Promise.resolve(this.readAll().filter((v) => v.app_id === appId))
  }

  async findLatest(appId: string): Promise<AppVersion | null> {
    const versions = this.readAll()
      .filter((v) => v.app_id === appId)
      .sort((a, b) => b.publicado_em.localeCompare(a.publicado_em))
    return Promise.resolve(versions[0] ?? null)
  }

  async findById(id: string): Promise<AppVersion | null> {
    return Promise.resolve(this.readAll().find((v) => v.id === id) ?? null)
  }

  async create(item: AppVersion): Promise<AppVersion> {
    const all = this.readAll()
    all.push(item)
    this.writeAll(all)
    return Promise.resolve(item)
  }

  async update(id: string, data: Partial<AppVersion>): Promise<AppVersion> {
    const all = this.readAll()
    const idx = all.findIndex((v) => v.id === id)
    if (idx === -1) throw new Error(`AppVersion ${id} not found`)
    all[idx] = { ...all[idx], ...data }
    this.writeAll(all)
    return Promise.resolve(all[idx])
  }
}

export const appVersionRepo = new LocalAppVersionRepository()
