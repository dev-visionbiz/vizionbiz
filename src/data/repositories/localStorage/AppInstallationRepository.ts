import type { AppInstallation } from '@/domain/types'
import type { AppInstallationRepository as IAppInstallationRepository } from '../interfaces'

class LocalAppInstallationRepository implements IAppInstallationRepository {
  private readonly key = 'vb_app_installations'

  private readAll(): AppInstallation[] {
    try {
      const raw = localStorage.getItem(this.key)
      return raw ? (JSON.parse(raw) as AppInstallation[]) : []
    } catch {
      return []
    }
  }

  private writeAll(items: AppInstallation[]): void {
    localStorage.setItem(this.key, JSON.stringify(items))
  }

  async findByEscritorio(escritorioId: string): Promise<AppInstallation[]> {
    return Promise.resolve(
      this.readAll().filter((i) => i.escritorio_id === escritorioId && i.status === 'ativa')
    )
  }

  async findByCliente(escritorioId: string, clienteId: string): Promise<AppInstallation[]> {
    return Promise.resolve(
      this.readAll().filter(
        (i) => i.escritorio_id === escritorioId && i.cliente_id === clienteId && i.status === 'ativa'
      )
    )
  }

  async findById(id: string): Promise<AppInstallation | null> {
    return Promise.resolve(this.readAll().find((i) => i.id === id) ?? null)
  }

  async findByApp(escritorioId: string, appId: string): Promise<AppInstallation | null> {
    const found = this.readAll().find(
      (i) => i.escritorio_id === escritorioId && i.app_id === appId && !i.cliente_id && i.status === 'ativa'
    )
    return Promise.resolve(found ?? null)
  }

  async create(item: AppInstallation): Promise<AppInstallation> {
    const all = this.readAll()
    all.push(item)
    this.writeAll(all)
    return Promise.resolve(item)
  }

  async update(id: string, data: Partial<AppInstallation>): Promise<AppInstallation> {
    const all = this.readAll()
    const idx = all.findIndex((i) => i.id === id)
    if (idx === -1) throw new Error(`AppInstallation ${id} not found`)
    all[idx] = { ...all[idx], ...data }
    this.writeAll(all)
    return Promise.resolve(all[idx])
  }
}

export const appInstallationRepo = new LocalAppInstallationRepository()
