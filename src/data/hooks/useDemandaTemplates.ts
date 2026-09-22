import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { v4 as uuid } from 'uuid'
import { demandaTemplateRepo } from '@/data/repositories/localStorage/DemandaTemplateRepository'
import { etapaDemandaTemplateRepo } from '@/data/repositories/localStorage/EtapaDemandaTemplateRepository'
import type { DemandaTemplate, EtapaDemandaTemplate } from '@/domain/types'

export function useDemandaTemplates(tenantId: string) {
  return useQuery({
    queryKey: ['demanda-templates', tenantId],
    queryFn: () => demandaTemplateRepo.findAll(tenantId),
    enabled: !!tenantId,
  })
}

export function useDemandaTemplatesAtivos(tenantId: string) {
  return useQuery({
    queryKey: ['demanda-templates', 'ativos', tenantId],
    queryFn: () => demandaTemplateRepo.findAtivas(tenantId),
    enabled: !!tenantId,
  })
}

export function useEtapasDemandaTemplate(tenantId: string, templateId: string) {
  return useQuery({
    queryKey: ['etapas-demanda-template', tenantId, templateId],
    queryFn: () => etapaDemandaTemplateRepo.findByTemplate(tenantId, templateId),
    enabled: !!tenantId && !!templateId,
  })
}

export function useCreateDemandaTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<DemandaTemplate, 'id'>) =>
      demandaTemplateRepo.create({ ...data, id: uuid() }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['demanda-templates'] }),
  })
}

export function useUpdateDemandaTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<DemandaTemplate> }) =>
      demandaTemplateRepo.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['demanda-templates'] }),
  })
}

export function useDeleteDemandaTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => demandaTemplateRepo.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['demanda-templates'] }),
  })
}

export function useCreateEtapaDemandaTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<EtapaDemandaTemplate, 'id'>) =>
      etapaDemandaTemplateRepo.create({ ...data, id: uuid() }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['etapas-demanda-template'] }),
  })
}

export function useUpdateEtapaDemandaTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<EtapaDemandaTemplate> }) =>
      etapaDemandaTemplateRepo.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['etapas-demanda-template'] }),
  })
}

export function useDeleteEtapaDemandaTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => etapaDemandaTemplateRepo.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['etapas-demanda-template'] }),
  })
}
