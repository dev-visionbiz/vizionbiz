import type { StorageConnection } from '@/domain/types'

export class LocalStorageConnectionRepository {
  private readonly key = 'vb_storage_connections'

  private readAll(): StorageConnection[] {
    try {
      const raw = localStorage.getItem(this.key)
      return raw ? (JSON.parse(raw) as StorageConnection[]) : []
    } catch {
      return []
    }
  }

  private writeAll(items: StorageConnection[]): void {
    localStorage.setItem(this.key, JSON.stringify(items))
  }

  async buscarPorEscritorioId(escritorioId: string): Promise<StorageConnection | null> {
    const all = this.readAll()
    return Promise.resolve(all.find((c) => c.escritorio_id === escritorioId) ?? null)
  }

  async salvar(conn: StorageConnection): Promise<StorageConnection> {
    const all = this.readAll()
    const idx = all.findIndex((c) => c.escritorio_id === conn.escritorio_id)
    if (idx === -1) {
      all.push(conn)
    } else {
      all[idx] = conn
    }
    this.writeAll(all)
    return Promise.resolve(conn)
  }

  async atualizarStatus(
    escritorioId: string,
    status: StorageConnection['status'],
  ): Promise<void> {
    const all = this.readAll()
    const idx = all.findIndex((c) => c.escritorio_id === escritorioId)
    if (idx !== -1) {
      all[idx] = { ...all[idx], status, updated_at: new Date().toISOString() }
      this.writeAll(all)
    }
  }

  async remover(escritorioId: string): Promise<void> {
    const all = this.readAll().filter((c) => c.escritorio_id !== escritorioId)
    this.writeAll(all)
  }
}
