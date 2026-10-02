import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { v4 as uuid } from 'uuid'
import { format } from 'date-fns'
import { ocorrenciaDocumentoRepo } from '@/data/repositories/localStorage/OcorrenciaDocumentoRepository'
import { LocalDocumentRepository } from '@/data/repositories/localStorage'
import { LocalDocumentEventRepository } from '@/data/repositories/localStorage'
import { obterProvedorStorage } from '@/lib/storage'
import { storageService } from '@/lib/storage'
import { gerarThumbnailPdf } from '@/lib/pdf-thumbnail'
import { gerarThumbnailArquivo } from '@/lib/file-icon-thumbnail'
import type { OcorrenciaDocumento, OcorrenciaDocumentoTipo } from '@/domain/types'

const docRepo = new LocalDocumentRepository()
const docEventRepo = new LocalDocumentEventRepository()

export function useOcorrenciaDocumentos(tenantId: string, ocorrenciaId: string) {
  return useQuery({
    queryKey: ['ocorrencia_documentos', tenantId, ocorrenciaId],
    queryFn: () => ocorrenciaDocumentoRepo.findByOcorrencia(tenantId, ocorrenciaId),
    enabled: !!tenantId && !!ocorrenciaId,
  })
}

export function useTarefaDocumentos(tenantId: string, tarefaId: string) {
  return useQuery({
    queryKey: ['ocorrencia_documentos', tenantId, 'tarefa', tarefaId],
    queryFn: () => ocorrenciaDocumentoRepo.findByTarefa(tenantId, tarefaId),
    enabled: !!tenantId && !!tarefaId,
  })
}

export function useVincularDocumento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      tenantId,
      ocorrenciaId,
      clienteId,
      documentId,
      tarefaId,
      configId,
      tipo,
      nome,
      userId,
    }: {
      tenantId: string
      ocorrenciaId: string
      clienteId: string
      documentId: string
      tarefaId?: string
      configId?: string
      tipo: OcorrenciaDocumentoTipo
      nome: string
      userId: string
    }) => {
      const vinculo: OcorrenciaDocumento = {
        id: uuid(),
        tenant_id: tenantId,
        ocorrencia_id: ocorrenciaId,
        client_id: clienteId,
        tarefa_id: tarefaId,
        config_id: configId,
        document_id: documentId,
        tipo,
        nome,
        criado_em: new Date().toISOString(),
        criado_por: userId,
      }
      return ocorrenciaDocumentoRepo.create(vinculo)
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['ocorrencia_documentos', vars.tenantId, vars.ocorrenciaId] })
      if (vars.tarefaId) {
        qc.invalidateQueries({ queryKey: ['ocorrencia_documentos', vars.tenantId, 'tarefa', vars.tarefaId] })
      }
    },
  })
}

export function useUploadEVincularDocumento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      arquivo,
      tenantId,
      ocorrenciaId,
      clienteId,
      folderId,
      typeId,
      nome,
      competencia,
      tarefaId,
      configId,
      tipo,
      userId,
    }: {
      arquivo: File
      tenantId: string
      ocorrenciaId: string
      clienteId: string
      folderId: string
      typeId: string
      nome: string
      competencia?: string
      tarefaId?: string
      configId?: string
      tipo: OcorrenciaDocumentoTipo
      userId: string
    }) => {
      const provedor = await obterProvedorStorage(tenantId)
      const result = await provedor.enviar(arquivo, {
        escritorioId: tenantId,
        clienteId,
        nomeCliente: clienteId,
        ano: new Date().getFullYear(),
        tipoDoc: typeId,
      })

      try {
        const thumb = arquivo.type === 'application/pdf'
          ? await gerarThumbnailPdf(arquivo)
          : await gerarThumbnailArquivo(arquivo)
        await storageService.salvarThumbnail(result.provider_file_id, thumb)
      } catch {
        // thumbnail é opcional
      }

      const docId = uuid()
      const comp = competencia ?? format(new Date(), 'yyyy-MM')

      await docRepo.create({
        id: docId,
        tenant_id: tenantId,
        client_id: clienteId,
        folder_id: folderId,
        type_id: typeId,
        nome,
        competencia: comp,
        versao: 1,
        storage_key: result.provider_file_id,
        tamanho: result.tamanho_bytes,
        mime: result.mime_type,
        criado_por: userId,
        criado_em: new Date().toISOString(),
        provider: 'local',
        provider_file_id: result.provider_file_id,
        storage_status: 'ok',
      })

      await docEventRepo.create({
        id: uuid(),
        document_id: docId,
        user_id: userId,
        evento: 'upload',
        ip: '127.0.0.1',
        em: new Date().toISOString(),
      })

      const vinculo: OcorrenciaDocumento = {
        id: uuid(),
        tenant_id: tenantId,
        ocorrencia_id: ocorrenciaId,
        client_id: clienteId,
        tarefa_id: tarefaId,
        config_id: configId,
        document_id: docId,
        storage_key: result.provider_file_id,
        tipo,
        nome,
        criado_em: new Date().toISOString(),
        criado_por: userId,
      }
      return ocorrenciaDocumentoRepo.create(vinculo)
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['ocorrencia_documentos', vars.tenantId, vars.ocorrenciaId] })
      qc.invalidateQueries({ queryKey: ['documents'] })
      if (vars.tarefaId) {
        qc.invalidateQueries({ queryKey: ['ocorrencia_documentos', vars.tenantId, 'tarefa', vars.tarefaId] })
      }
    },
  })
}

export function useDesvincularDocumento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: { id: string; tenantId: string; ocorrenciaId: string; tarefaId?: string }) =>
      ocorrenciaDocumentoRepo.delete(id),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['ocorrencia_documentos', vars.tenantId, vars.ocorrenciaId] })
      qc.invalidateQueries({ queryKey: ['documents'] })
      if (vars.tarefaId) {
        qc.invalidateQueries({ queryKey: ['ocorrencia_documentos', vars.tenantId, 'tarefa', vars.tarefaId] })
      }
    },
  })
}
