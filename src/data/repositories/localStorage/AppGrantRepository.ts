import type { AppGrant } from '@/domain/types'
import type { AppGrantRepository as IAppGrantRepository } from '../interfaces'

class LocalAppGrantRepository implements IAppGrantRepository {
  private readonly key = 'vb_app_grants'

  private readAll(): AppGrant[] {
    try {
      const raw = localStorage.getItem(this.key)
      return raw ? (JSON.parse(raw) as AppGrant[]) : []
    } catch {
      return []
    }
  }

  private writeAll(items: AppGrant[]): void {
    localStorage.setItem(this.key, JSON.stringify(items))
  }

  async findByInstallation(installationId: string): Promise<AppGrant[]> {
    return Promise.resolve(this.readAll().filter((g) => g.installation_id === installationId))
  }

  async findActive(installationId: string): Promise<AppGrant[]> {
    return Promise.resolve(
      this.readAll().filter((g) => g.installation_id === installationId && !g.revogado_em)
    )
  }

  async create(item: AppGrant): Promise<AppGrant> {
    const all = this.readAll()
    all.push(item)
    this.writeAll(all)
    return Promise.resolve(item)
  }

  async revokeAll(installationId: string, revokedAt: string): Promise<void> {
    const all = this.readAll().map((g) =>
      g.installation_id === installationId && !g.revogado_em
        ? { ...g, revogado_em: revokedAt }
        : g
    )
    this.writeAll(all)
    return Promise.resolve()
  }
}

export const appGrantRepo = new LocalAppGrantRepository()
