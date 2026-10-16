import type { AppVisibility } from '@/domain/types'
import type { AppVisibilityRepository as IAppVisibilityRepository } from '../interfaces'

class LocalAppVisibilityRepository implements IAppVisibilityRepository {
  private readonly key = 'vb_app_visibility'

  private readAll(): AppVisibility[] {
    try {
      const raw = localStorage.getItem(this.key)
      return raw ? (JSON.parse(raw) as AppVisibility[]) : []
    } catch {
      return []
    }
  }

  private writeAll(items: AppVisibility[]): void {
    localStorage.setItem(this.key, JSON.stringify(items))
  }

  async findByEscritorio(escritorioId: string): Promise<AppVisibility[]> {
    return Promise.resolve(this.readAll().filter((v) => v.escritorio_id === escritorioId))
  }

  async findByApp(escritorioId: string, appId: string): Promise<AppVisibility | null> {
    const found = this.readAll().find(
      (v) => v.escritorio_id === escritorioId && v.app_id === appId
    )
    return Promise.resolve(found ?? null)
  }

  async upsert(item: AppVisibility): Promise<AppVisibility> {
    const all = this.readAll()
    const idx = all.findIndex(
      (v) => v.escritorio_id === item.escritorio_id && v.app_id === item.app_id
    )
    if (idx === -1) {
      all.push(item)
    } else {
      all[idx] = item
    }
    this.writeAll(all)
    return Promise.resolve(item)
  }
}

export const appVisibilityRepo = new LocalAppVisibilityRepository()
