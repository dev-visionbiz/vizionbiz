import type { LedgerEntry, LedgerEntryTipo } from '@/domain/types'

// O ledger é imutável: só INSERT. Estornos são novos lançamentos com tipo estorno_*.
class LocalLedgerRepository {
  private readonly key = 'vb_ledger'

  private readAll(): LedgerEntry[] {
    try {
      const raw = localStorage.getItem(this.key)
      return raw ? (JSON.parse(raw) as LedgerEntry[]) : []
    } catch {
      return []
    }
  }

  private writeAll(items: LedgerEntry[]): void {
    localStorage.setItem(this.key, JSON.stringify(items))
  }

  async findAll(): Promise<LedgerEntry[]> {
    return Promise.resolve([...this.readAll()].sort((a, b) => b.criado_em.localeCompare(a.criado_em)))
  }

  async findByEscritorio(escritorioId: string): Promise<LedgerEntry[]> {
    return Promise.resolve(
      this.readAll()
        .filter((e) => e.escritorio_id === escritorioId)
        .sort((a, b) => b.criado_em.localeCompare(a.criado_em))
    )
  }

  async findByApp(appId: string): Promise<LedgerEntry[]> {
    return Promise.resolve(
      this.readAll()
        .filter((e) => e.app_id === appId)
        .sort((a, b) => b.criado_em.localeCompare(a.criado_em))
    )
  }

  async findByPeriodo(de: string, ate: string): Promise<LedgerEntry[]> {
    return Promise.resolve(
      this.readAll()
        .filter((e) => e.criado_em >= de && e.criado_em <= ate)
        .sort((a, b) => b.criado_em.localeCompare(a.criado_em))
    )
  }

  async create(item: LedgerEntry): Promise<LedgerEntry> {
    const all = this.readAll()
    all.push(item)
    this.writeAll(all)
    return Promise.resolve(item)
  }
}

export const ledgerRepo = new LocalLedgerRepository()
