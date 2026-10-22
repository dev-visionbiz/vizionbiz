import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { v4 as uuid } from 'uuid'
import { format, differenceInDays, parseISO } from 'date-fns'
import { certificadoRepo } from '@/data/repositories/guiasProvider'
import { ocorrenciaRepo, tarefaRepo } from '@/data/repositories/operacoesProvider'
import type { CertificadoDigital, CertificadoStatus } from '@/domain/types'

export function derivarStatusCertificado(validade: string): CertificadoStatus {
  const hoje = new Date()
  const venc = parseISO(validade)
  const dias = differenceInDays(venc, hoje)
  if (dias < 0) return 'vencido'
  if (dias <= 30) return 'vencendo'
  return 'valido'
}

export function useCertificadosByCliente(tenantId: string, clienteId: string) {
  return useQuery({
    queryKey: ['certificados', tenantId, clienteId],
    queryFn: async () => {
      const certs = await certificadoRepo.findByCliente(tenantId, clienteId)
      return certs.map((c) => ({ ...c, status: derivarStatusCertificado(c.validade) }))
    },
    enabled: !!tenantId && !!clienteId,
  })
}

export function useCertificadosVencendo(tenantId: string, diasLimite = 90) {
  return useQuery({
    queryKey: ['certificados', tenantId, 'vencendo', diasLimite],
    queryFn: async () => {
      const certs = await certificadoRepo.findVencendo(tenantId, diasLimite)
      return certs.map((c) => ({ ...c, status: derivarStatusCertificado(c.validade) }))
    },
    enabled: !!tenantId,
  })
}

export function useCreateCertificado() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<CertificadoDigital, 'id' | 'status'>) =>
      certificadoRepo.create({
        ...data,
        id: uuid(),
        status: derivarStatusCertificado(data.validade),
      }),
    onSuccess: (_r, vars) => {
      qc.invalidateQueries({ queryKey: ['certificados', vars.tenant_id] })
    },
  })
}

export function useUpdateCertificado() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CertificadoDigital> }) =>
      certificadoRepo.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['certificados'] }),
  })
}

export function useDeleteCertificado() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => certificadoRepo.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['certificados'] }),
  })
}

// Cria Ocorrência de solicitação de renovação feita pelo próprio cliente (RF-C07)
export function useSolicitarRenovacaoCertificado() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (cert: CertificadoDigital) => {
      if (cert.status === 'renovacao_solicitada') {
        throw new Error('Já existe uma solicitação de renovação para este certificado.')
      }

      const ocorrenciaId = uuid()
      await ocorrenciaRepo.create({
        id: ocorrenciaId,
        tenant_id: cert.tenant_id,
        cliente_id: cert.cliente_id,
        titulo: `Renovação de certificado digital — ${cert.titular}`,
        descricao: `Solicitação de renovação enviada pelo cliente. Certificado ${cert.tipo.toUpperCase()} de ${cert.titular} vence em ${cert.validade}.`,
        categoria: 'contabil',
        status: 'pendente',
        origem: 'cliente',
        data_prevista: cert.validade,
        criado_por: cert.cliente_id,
        criado_em: new Date().toISOString(),
      })

      await certificadoRepo.update(cert.id, { status: 'renovacao_solicitada' })
      return ocorrenciaId
    },
    onSuccess: (_r, vars) => {
      qc.invalidateQueries({ queryKey: ['certificados', vars.tenant_id] })
      qc.invalidateQueries({ queryKey: ['ocorrencias'] })
    },
  })
}

// Cria uma Ocorrência de alerta de vencimento para um certificado (tarefas.gerador)
export function useAlertarVencimento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (cert: CertificadoDigital) => {
      const hoje = format(new Date(), 'yyyy-MM-dd')
      const ocorrenciaId = uuid()

      await ocorrenciaRepo.create({
        id: ocorrenciaId,
        tenant_id: cert.tenant_id,
        cliente_id: cert.cliente_id,
        titulo: `Renovar certificado digital — ${cert.titular}`,
        descricao: `Certificado ${cert.tipo.toUpperCase()} de ${cert.titular} vence em ${cert.validade}. Acionar renovação com antecedência.`,
        categoria: 'contabil',
        status: 'pendente',
        origem: 'rotina',
        data_prevista: cert.validade,
        criado_por: 'app:certificado-digital',
        criado_em: new Date().toISOString(),
      })

      await tarefaRepo.create({
        id: uuid(),
        tenant_id: cert.tenant_id,
        ocorrencia_id: ocorrenciaId,
        nome: `Contatar cliente para renovação do certificado`,
        status: 'pendente',
        data_prevista: cert.validade,
        ordem: 1,
      })

      // Marca o certificado com o id da ocorrência de alerta
      await certificadoRepo.update(cert.id, { ocorrencia_alerta_id: ocorrenciaId })
      return ocorrenciaId
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['certificados'] })
      qc.invalidateQueries({ queryKey: ['ocorrencias'] })
      qc.invalidateQueries({ queryKey: ['tarefas'] })
    },
  })
}
