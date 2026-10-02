import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { v4 as uuid } from 'uuid'
import { addDays, format, parseISO } from 'date-fns'
import { rotinaRepo } from '@/data/repositories/localStorage/RotinaRepository'
import { rotinaClienteRepo } from '@/data/repositories/localStorage/RotinaClienteRepository'
import { cicloRepo } from '@/data/repositories/localStorage/CicloRepository'
import { fluxoRepo } from '@/data/repositories/localStorage/FluxoRepository'
import { fluxoTarefaRepo } from '@/data/repositories/localStorage/FluxoTarefaRepository'
import { ocorrenciaRepo } from '@/data/repositories/localStorage/OcorrenciaRepository'
import { tarefaRepo } from '@/data/repositories/localStorage/TarefaRepository'
import { calcularVencimento } from '@/domain/obrigacoes/calcularVencimento'
import type { Rotina, RotinaCliente, Ciclo, Fluxo, FluxoTarefa, Ocorrencia, Tarefa } from '@/domain/types'

// ─── Rotina ──────────────────────────────────────────────────────────────────

export function useRotinas(tenantId: string) {
  return useQuery({
    queryKey: ['rotinas', tenantId],
    queryFn: () => rotinaRepo.findAll(tenantId),
    enabled: !!tenantId,
  })
}

export function useRotinasAtivas(tenantId: string) {
  return useQuery({
    queryKey: ['rotinas', 'ativas', tenantId],
    queryFn: () => rotinaRepo.findAtivas(tenantId),
    enabled: !!tenantId,
  })
}

export function useCreateRotinaCompleta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      rotina,
      etapas,
    }: {
      rotina: Omit<Rotina, 'id' | 'fluxo_id'>
      etapas: Omit<FluxoTarefa, 'id' | 'fluxo_id' | 'tenant_id'>[]
    }) => {
      const fluxoId = uuid()
      const rotinaId = uuid()

      const fluxo: Fluxo = {
        id: fluxoId,
        tenant_id: rotina.tenant_id,
        nome: rotina.nome,
        categoria: 'fiscal',
        prazo_dias_padrao: 0,
        ativo: rotina.ativo,
      }
      await fluxoRepo.create(fluxo)

      for (let i = 0; i < etapas.length; i++) {
        await fluxoTarefaRepo.create({
          ...etapas[i],
          id: uuid(),
          tenant_id: rotina.tenant_id,
          fluxo_id: fluxoId,
          ordem: i + 1,
        })
      }

      return rotinaRepo.create({ ...rotina, id: rotinaId, fluxo_id: fluxoId, criado_em: new Date().toISOString() })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rotinas'] })
      qc.invalidateQueries({ queryKey: ['fluxos'] })
      qc.invalidateQueries({ queryKey: ['fluxo-tarefas'] })
    },
  })
}

export function useUpdateRotina() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Rotina> }) =>
      rotinaRepo.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rotinas'] }),
  })
}

export function useDeleteRotina() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => rotinaRepo.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rotinas'] }),
  })
}

// ─── RotinaCliente ────────────────────────────────────────────────────────────

export function useRotinaClientes(tenantId: string, rotinaId: string) {
  return useQuery({
    queryKey: ['rotina-clientes', tenantId, rotinaId],
    queryFn: () => rotinaClienteRepo.findByRotina(tenantId, rotinaId),
    enabled: !!tenantId && !!rotinaId,
  })
}

export function useAllRotinaClientes(tenantId: string) {
  return useQuery({
    queryKey: ['rotina-clientes', tenantId, 'all'],
    queryFn: () => rotinaClienteRepo.findAll(tenantId),
    enabled: !!tenantId,
  })
}

export function useCreateRotinaCliente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<RotinaCliente, 'id'>) =>
      rotinaClienteRepo.create({ ...data, id: uuid() }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rotina-clientes'] }),
  })
}

export function useDeleteRotinaCliente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => rotinaClienteRepo.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rotina-clientes'] }),
  })
}

export function useUpdateRotinaCliente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<RotinaCliente> }) =>
      rotinaClienteRepo.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rotina-clientes'] }),
  })
}

// ─── Ciclo ────────────────────────────────────────────────────────────────────

export function useCiclos(tenantId: string, rotinaId: string) {
  return useQuery({
    queryKey: ['ciclos', tenantId, rotinaId],
    queryFn: () => cicloRepo.findByRotina(tenantId, rotinaId),
    enabled: !!tenantId && !!rotinaId,
  })
}

export function useAllCiclos(tenantId: string) {
  return useQuery({
    queryKey: ['ciclos', tenantId, 'all'],
    queryFn: () => cicloRepo.findAll(tenantId),
    enabled: !!tenantId,
  })
}

export function useUpdateCiclo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Ciclo> }) =>
      cicloRepo.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ciclos'] }),
  })
}

// ─── useGerarCiclo ────────────────────────────────────────────────────────────

export function useGerarCiclo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      tenantId,
      rotina,
      periodo,
    }: {
      tenantId: string
      rotina: Rotina
      periodo: string
    }) => {
      const dataVencimento = calcularVencimento(rotina.regra_vencimento, periodo)

      let ciclo: Ciclo
      const existente = await cicloRepo.findByPeriodo(tenantId, rotina.id, periodo)
      if (existente) {
        ciclo = existente
      } else {
        ciclo = await cicloRepo.create({
          id: uuid(),
          tenant_id: tenantId,
          rotina_id: rotina.id,
          periodo,
          data_vencimento: dataVencimento,
          status: 'aberta',
        })
      }

      if (!rotina.fluxo_id) {
        return { ciclo, ocorrenciasCriadas: 0, tarefasCriadas: 0 }
      }

      const vinculosAtivos = await rotinaClienteRepo.findAtivos(tenantId, rotina.id)
      const clienteIds = vinculosAtivos
        .filter((v) => !v.data_inicio || v.data_inicio.slice(0, 7) <= periodo)
        .map((v) => v.cliente_id)

      if (clienteIds.length === 0) {
        return { ciclo, ocorrenciasCriadas: 0, tarefasCriadas: 0 }
      }

      const [fluxoTarefas, ocorrenciasExistentes] = await Promise.all([
        fluxoTarefaRepo.findByFluxo(tenantId, rotina.fluxo_id),
        ocorrenciaRepo.findByCiclo(tenantId, ciclo.id),
      ])

      const clientesJaCriados = new Set(ocorrenciasExistentes.map((o) => o.cliente_id))
      const vencimento = parseISO(dataVencimento)
      let ocorrenciasCriadas = 0
      let tarefasCriadas = 0

      for (const clienteId of clienteIds) {
        if (clientesJaCriados.has(clienteId)) continue

        const ocorrenciaId = uuid()
        const ocorrencia: Ocorrencia = {
          id: ocorrenciaId,
          tenant_id: tenantId,
          titulo: `${rotina.nome} — ${periodo}`,
          cliente_id: clienteId,
          origem: 'rotina',
          fluxo_id: rotina.fluxo_id,
          rotina_id: rotina.id,
          ciclo_id: ciclo.id,
          data_prevista: dataVencimento,
          status: 'pendente',
          criado_por: 'system',
          criado_em: new Date().toISOString(),
        }
        await ocorrenciaRepo.create(ocorrencia)
        ocorrenciasCriadas++

        for (const ft of fluxoTarefas) {
          const dataPrevista = format(addDays(vencimento, ft.prazo_relativo_dias), 'yyyy-MM-dd')
          const tarefa: Tarefa = {
            id: uuid(),
            tenant_id: tenantId,
            ocorrencia_id: ocorrenciaId,
            fluxo_tarefa_id: ft.id,
            ordem: ft.ordem,
            nome: ft.nome,
            descricao: ft.descricao,
            data_prevista: dataPrevista,
            status: 'pendente',
            responsavel_id: ft.responsavel_padrao,
          }
          await tarefaRepo.create(tarefa)
          tarefasCriadas++
        }
      }

      return { ciclo, ocorrenciasCriadas, tarefasCriadas }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ciclos'] })
      qc.invalidateQueries({ queryKey: ['ocorrencias'] })
      qc.invalidateQueries({ queryKey: ['tarefas'] })
    },
  })
}
