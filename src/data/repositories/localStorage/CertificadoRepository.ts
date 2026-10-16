import { BaseLocalStorageRepository } from './BaseLocalStorageRepository'
import type { CertificadoDigital } from '@/domain/types'

export class LocalCertificadoRepository extends BaseLocalStorageRepository<CertificadoDigital> {
  constructor() {
    super('certificados_digitais')
  }

  async findByCliente(tenantId: string, clienteId: string): Promise<CertificadoDigital[]> {
    return Promise.resolve(
      this.readAll().filter((c) => c.tenant_id === tenantId && c.cliente_id === clienteId)
    )
  }

  async findVencendo(tenantId: string, diasLimite: number): Promise<CertificadoDigital[]> {
    const hoje = new Date()
    const limite = new Date()
    limite.setDate(hoje.getDate() + diasLimite)
    const hojeStr = hoje.toISOString().slice(0, 10)
    const limiteStr = limite.toISOString().slice(0, 10)
    return Promise.resolve(
      this.readAll().filter(
        (c) => c.tenant_id === tenantId && c.validade >= hojeStr && c.validade <= limiteStr
      )
    )
  }

  async findVencidos(tenantId: string): Promise<CertificadoDigital[]> {
    const hojeStr = new Date().toISOString().slice(0, 10)
    return Promise.resolve(
      this.readAll().filter((c) => c.tenant_id === tenantId && c.validade < hojeStr)
    )
  }
}

export const certificadoRepo = new LocalCertificadoRepository()
