import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { v4 as uuid } from 'uuid'
import { competenciaRepo } from '@/data/repositories/localStorage/CompetenciaRepository'
import { tarefaObrigacaoRepo } from '@/data/repositories/localStorage/TarefaObrigacaoRepository'
import { etapaObrigacaoRepo } from '@/data/repositories/localStorage/EtapaObrigacaoRepository'
import { clienteObrigacaoRepo } from '@/data/repositories/localStorage/ClienteObrigacaoRepository'
import { gerarTarefas } from '@/domain/obrigacoes/gerarTarefas'
import { calcularVencimento } from '@/domain/obrigacoes/calcularVencimento'
import type { Competencia, Obrigacao } from '@/domain/types'

export function useTodasCompetencias(tenantId: string) {
  return useQuery({
    queryKey: ['competencias', tenantId, 'todas'],
    queryFn: () => competenciaRepo.findAll(tenantId),
    enabled: !!tenantId,
  })
}

export function useCompetencias(tenantId: string, obrigacaoId: string) {
  return useQuery({
    queryKey: ['competencias', tenantId, obrigacaoId],
    queryFn: () => competenciaRepo.findByObrigacao(tenantId, obrigacaoId),
    enabled: !!tenantId && !!obrigacaoId,
  })
}

export function useUpdateCompetencia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Competencia> }) =>
      competenciaRepo.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['competencias'] }),
  })
}

export function useGerarCompetencia() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      tenantId,
      obrigacao,
      periodo,
    }: {
      tenantId: string
      obrigacao: Obrigacao
      periodo: string
    }) => {
      const existente = await competenciaRepo.findByPeriodo(tenantId, obrigacao.id, periodo)
      const dataVencimento = calcularVencimento(obrigacao.regra_vencimento, periodo)

      let competencia: Competencia
      if (existente) {
        competencia = existente
      } else {
        competencia = await competenciaRepo.create({
          id: uuid(),
          tenant_id: tenantId,
          obrigacao_id: obrigacao.id,
          periodo,
          data_vencimento: dataVencimento,
          status: 'aberta',
        })
      }

      const [etapas, vinculos] = await Promise.all([
        etapaObrigacaoRepo.findByObrigacao(tenantId, obrigacao.id),
        clienteObrigacaoRepo.findAtivos(tenantId, obrigacao.id),
      ])

      const tarefasExistentes = await tarefaObrigacaoRepo.findByCompetencia(tenantId, competencia.id)
      const existentesSet = new Set(
        tarefasExistentes.map((t) => `${t.cliente_id}__${t.etapa_id}`)
      )

      const vinculadosParaPeriodo = vinculos.filter(
        (v) => !v.data_inicio || v.data_inicio.slice(0, 7) <= periodo
      )
      const clienteIds = vinculadosParaPeriodo.map((v) => v.cliente_id)
      const novasTarefas = gerarTarefas(competencia, etapas, clienteIds, tenantId).filter(
        (t) => !existentesSet.has(`${t.cliente_id}__${t.etapa_id}`)
      )

      await Promise.all(novasTarefas.map((t) => tarefaObrigacaoRepo.create(t)))

      return { competencia, tarefasCriadas: novasTarefas.length }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['competencias'] })
      qc.invalidateQueries({ queryKey: ['tarefas-obrigacao'] })
    },
  })
}
