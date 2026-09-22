import type { DocumentEventRecord } from '@/domain/types'
import type { DocumentEventRepository as IDocumentEventRepository } from '../interfaces'

export class LocalDocumentEventRepository implements IDocumentEventRepository {
  private readonly key = 'vb_document_events'

  private readAll(): DocumentEventRecord[] {
    try {
      const raw = localStorage.getItem(this.key)
      return raw ? (JSON.parse(raw) as DocumentEventRecord[]) : []
    } catch {
      return []
    }
  }

  private writeAll(items: DocumentEventRecord[]): void {
    localStorage.setItem(this.key, JSON.stringify(items))
  }

  async findByDocument(documentId: string): Promise<DocumentEventRecord[]> {
    return Promise.resolve(this.readAll().filter((e) => e.document_id === documentId))
  }

  async findByClient(tenantId: string, clientId: string): Promise<DocumentEventRecord[]> {
    // Needs join via documents - for localStorage we do a full scan
    const docsRaw = localStorage.getItem('vb_documents')
    const docs: Array<{ id: string; tenant_id: string; client_id: string }> = docsRaw
      ? JSON.parse(docsRaw)
      : []
    const docIds = new Set(
      docs
        .filter((d) => d.tenant_id === tenantId && d.client_id === clientId)
        .map((d) => d.id)
    )
    return Promise.resolve(this.readAll().filter((e) => docIds.has(e.document_id)))
  }

  async create(item: DocumentEventRecord): Promise<DocumentEventRecord> {
    const all = this.readAll()
    all.push(item)
    this.writeAll(all)
    return Promise.resolve(item)
  }
}
