export class BaseLocalStorageRepository<T extends { id: string; tenant_id?: string }> {
  protected readonly key: string

  constructor(collectionName: string) {
    this.key = `vb_${collectionName}`
  }

  protected readAll(): T[] {
    try {
      const raw = localStorage.getItem(this.key)
      return raw ? (JSON.parse(raw) as T[]) : []
    } catch {
      return []
    }
  }

  protected writeAll(items: T[]): void {
    localStorage.setItem(this.key, JSON.stringify(items))
  }

  async findAll(tenantId: string): Promise<T[]> {
    return Promise.resolve(
      this.readAll().filter((item) => item.tenant_id === tenantId)
    )
  }

  async findById(id: string): Promise<T | null> {
    const item = this.readAll().find((i) => i.id === id)
    return Promise.resolve(item ?? null)
  }

  async create(item: T): Promise<T> {
    const all = this.readAll()
    all.push(item)
    this.writeAll(all)
    return Promise.resolve(item)
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    const all = this.readAll()
    const idx = all.findIndex((i) => i.id === id)
    if (idx === -1) throw new Error(`Item ${id} not found in ${this.key}`)
    all[idx] = { ...all[idx], ...data }
    this.writeAll(all)
    return Promise.resolve(all[idx])
  }

  async delete(id: string): Promise<void> {
    const all = this.readAll().filter((i) => i.id !== id)
    this.writeAll(all)
    return Promise.resolve()
  }
}
