import type { ShareLink } from '@/domain/types'
import type { ShareLinkRepository as IShareLinkRepository } from '../interfaces'

export class LocalShareLinkRepository implements IShareLinkRepository {
  private readonly key = 'vb_share_links'

  private readAll(): ShareLink[] {
    try {
      const raw = localStorage.getItem(this.key)
      return raw ? (JSON.parse(raw) as ShareLink[]) : []
    } catch {
      return []
    }
  }

  private writeAll(items: ShareLink[]): void {
    localStorage.setItem(this.key, JSON.stringify(items))
  }

  async findByDocument(documentId: string): Promise<ShareLink[]> {
    return Promise.resolve(this.readAll().filter((s) => s.document_id === documentId))
  }

  async findByToken(token: string): Promise<ShareLink | null> {
    return Promise.resolve(this.readAll().find((s) => s.token === token) ?? null)
  }

  async create(item: ShareLink): Promise<ShareLink> {
    const all = this.readAll()
    all.push(item)
    this.writeAll(all)
    return Promise.resolve(item)
  }

  async delete(id: string): Promise<void> {
    const all = this.readAll().filter((s) => s.id !== id)
    this.writeAll(all)
    return Promise.resolve()
  }
}
