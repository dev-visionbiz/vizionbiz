import { useMutation, useQueryClient } from '@tanstack/react-query'
import { v4 as uuid } from 'uuid'
import { format } from 'date-fns'
import { loteRepo } from '@/data/repositories/localStorage/LoteImportacaoRepository'
import type { LoteImportacao } from '@/domain/types'

export function useCreateLote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<LoteImportacao, 'id'>) =>
      loteRepo.create({ ...data, id: uuid() }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lotes'] }),
  })
}

export function useUpdateLote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<LoteImportacao> }) =>
      loteRepo.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lotes'] }),
  })
}

export function useCriarLoteComGuias() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (params: {
      tenantId: string
      userId: string
      totalArquivos: number
      organizados: number
      paraRevisar: number
      comErro: number
      duplicatasIgnoradas: number
    }) => {
      const agora = format(new Date(), "yyyy-MM-dd'T'HH:mm:ss")
      return loteRepo.create({
        id: uuid(),
        tenant_id: params.tenantId,
        enviado_por: params.userId,
        total_arquivos: params.totalArquivos,
        organizados: params.organizados,
        para_revisar: params.paraRevisar,
        com_erro: params.comErro,
        duplicatas_ignoradas: params.duplicatasIgnoradas,
        status: 'concluido',
        created_at: agora,
        concluido_em: agora,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lotes'] })
      qc.invalidateQueries({ queryKey: ['guias'] })
    },
  })
}
