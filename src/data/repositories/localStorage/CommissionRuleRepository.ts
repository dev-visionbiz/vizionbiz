import type { CommissionRule } from '@/domain/types'

class LocalCommissionRuleRepository {
  private readonly key = 'vb_commission_rules'

  private readAll(): CommissionRule[] {
    try {
      const raw = localStorage.getItem(this.key)
      return raw ? (JSON.parse(raw) as CommissionRule[]) : []
    } catch {
      return []
    }
  }

  private writeAll(items: CommissionRule[]): void {
    localStorage.setItem(this.key, JSON.stringify(items))
  }

  async findByApp(appId: string): Promise<CommissionRule[]> {
    return Promise.resolve(this.readAll().filter((r) => r.app_id === appId))
  }

  // Regra efetiva: escritório-específica tem prioridade sobre a padrão
  async findEfetiva(appId: string, escritorioId: string): Promise<CommissionRule | null> {
    const rules = this.readAll().filter((r) => r.app_id === appId)
    const especifica = rules.find((r) => r.escritorio_id === escritorioId)
    const padrao = rules.find((r) => !r.escritorio_id)
    return Promise.resolve(especifica ?? padrao ?? null)
  }

  async findAll(): Promise<CommissionRule[]> {
    return Promise.resolve(this.readAll())
  }

  async create(item: CommissionRule): Promise<CommissionRule> {
    const all = this.readAll()
    all.push(item)
    this.writeAll(all)
    return Promise.resolve(item)
  }

  async upsert(item: CommissionRule): Promise<CommissionRule> {
    const all = this.readAll()
    const idx = all.findIndex(
      (r) => r.app_id === item.app_id && r.escritorio_id === item.escritorio_id
    )
    if (idx === -1) {
      all.push(item)
    } else {
      all[idx] = item
    }
    this.writeAll(all)
    return Promise.resolve(item)
  }

  async delete(id: string): Promise<void> {
    this.writeAll(this.readAll().filter((r) => r.id !== id))
    return Promise.resolve()
  }
}

export const commissionRuleRepo = new LocalCommissionRuleRepository()
