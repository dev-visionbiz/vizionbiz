import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { v4 as uuid } from 'uuid'
import {
  formularioTemplateRepo,
  formularioRespostaRepo,
} from '@/data/repositories/localStorage/FormularioTemplateRepository'
import type { FormularioTemplate, FormularioResposta } from '@/domain/types'

export function useFormulariosTemplate(tenantId: string) {
  return useQuery({
    queryKey: ['formularios_template', tenantId],
    queryFn: () => formularioTemplateRepo.findAtivos(tenantId),
    enabled: !!tenantId,
  })
}

export function useAllFormulariosTemplate(tenantId: string) {
  return useQuery({
    queryKey: ['formularios_template', tenantId, 'all'],
    queryFn: () => formularioTemplateRepo.findAll(tenantId),
    enabled: !!tenantId,
  })
}

export function useFormularioTemplateById(id: string | undefined) {
  return useQuery({
    queryKey: ['formularios_template', 'id', id],
    queryFn: () => formularioTemplateRepo.findById(id!),
    enabled: !!id,
  })
}

export function useCreateFormularioTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<FormularioTemplate, 'id' | 'criado_em'>) =>
      formularioTemplateRepo.create({
        ...data,
        id: uuid(),
        criado_em: new Date().toISOString(),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['formularios_template'] }),
  })
}

export function useUpdateFormularioTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FormularioTemplate> }) =>
      formularioTemplateRepo.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['formularios_template'] }),
  })
}

export function useDeleteFormularioTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => formularioTemplateRepo.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['formularios_template'] }),
  })
}

export function useRespostasByTemplate(tenantId: string, templateId: string | undefined) {
  return useQuery({
    queryKey: ['formularios_resposta', tenantId, 'template', templateId],
    queryFn: () => formularioRespostaRepo.findByTemplate(tenantId, templateId!),
    enabled: !!tenantId && !!templateId,
  })
}

export function useSalvarRespostaFormulario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<FormularioResposta, 'id' | 'criado_em'>) =>
      formularioRespostaRepo.create({
        ...data,
        id: uuid(),
        criado_em: new Date().toISOString(),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['formularios_resposta'] })
      qc.invalidateQueries({ queryKey: ['solicitacoes_servico'] })
    },
  })
}
