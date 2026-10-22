import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { v4 as uuid } from 'uuid'
import { format } from 'date-fns'
import {
  appRepo,
  appVersionRepo,
  appPlanRepo,
  appInstallationRepo,
  appGrantRepo,
  appVisibilityRepo,
} from '@/data/repositories/appsProvider'
import type {
  App, AppVersion, AppInstallation, AppGrant, AppVisibility,
  AppEscopoSlug, AppPlan,
} from '@/domain/types'

// --- Consultas ---

export function useApps() {
  return useQuery({
    queryKey: ['apps'],
    queryFn: () => appRepo.findAll(),
  })
}

export function useAppById(appId: string) {
  return useQuery({
    queryKey: ['apps', appId],
    queryFn: () => appRepo.findById(appId),
    enabled: !!appId,
  })
}

export function useAppVersion(appId: string) {
  return useQuery({
    queryKey: ['app_versions', appId, 'latest'],
    queryFn: () => appVersionRepo.findLatest(appId),
    enabled: !!appId,
  })
}

export function useAppPlans(appId: string) {
  return useQuery({
    queryKey: ['app_plans', appId],
    queryFn: () => appPlanRepo.findByApp(appId),
    enabled: !!appId,
  })
}

export function useAppInstallations(escritorioId: string) {
  return useQuery({
    queryKey: ['app_installations', escritorioId],
    queryFn: () => appInstallationRepo.findByEscritorio(escritorioId),
    enabled: !!escritorioId,
  })
}

export function useAppInstallacaoByApp(escritorioId: string, appId: string) {
  return useQuery({
    queryKey: ['app_installations', escritorioId, 'app', appId],
    queryFn: () => appInstallationRepo.findByApp(escritorioId, appId),
    enabled: !!escritorioId && !!appId,
  })
}

export function useAppGrants(installationId: string) {
  return useQuery({
    queryKey: ['app_grants', installationId],
    queryFn: () => appGrantRepo.findActive(installationId),
    enabled: !!installationId,
  })
}

export function useAppVisibility(escritorioId: string) {
  return useQuery({
    queryKey: ['app_visibility', escritorioId],
    queryFn: () => appVisibilityRepo.findByEscritorio(escritorioId),
    enabled: !!escritorioId,
  })
}

// --- Instalar app (escritório) ---

export function useInstalarApp() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      escritorioId,
      appId,
      escopos,
      instaladoPor,
    }: {
      escritorioId: string
      appId: string
      escopos: AppEscopoSlug[]
      instaladoPor: string
    }) => {
      const version = await appVersionRepo.findLatest(appId)
      if (!version) throw new Error('Versão do app não encontrada')

      const installationId = uuid()
      const agora = new Date().toISOString()

      const installation = await appInstallationRepo.create({
        id: installationId,
        app_id: appId,
        app_version_id: version.id,
        escritorio_id: escritorioId,
        instalado_por: instaladoPor,
        status: 'ativa',
        instalado_em: agora,
      })

      await Promise.all(
        escopos.map((escopo) =>
          appGrantRepo.create({
            id: uuid(),
            installation_id: installationId,
            escopo,
            concedido_em: agora,
          })
        )
      )

      return installation
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['app_installations', vars.escritorioId] })
      qc.invalidateQueries({ queryKey: ['app_grants'] })
    },
  })
}

// --- Desinstalar app (revoga grants + marca instalação como revogada) ---

export function useDesinstalarApp() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      installationId,
      escritorioId,
    }: {
      installationId: string
      escritorioId: string
    }) => {
      const agora = new Date().toISOString()
      await appGrantRepo.revokeAll(installationId, agora)
      await appInstallationRepo.update(installationId, { status: 'revogada', revogado_em: agora })
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['app_installations', vars.escritorioId] })
      qc.invalidateQueries({ queryKey: ['app_grants'] })
    },
  })
}

// --- Instalações no nível do cliente ---

export function useAppInstallationsByCliente(escritorioId: string, clienteId: string) {
  return useQuery({
    queryKey: ['app_installations', escritorioId, 'cliente', clienteId],
    queryFn: () => appInstallationRepo.findByCliente(escritorioId, clienteId),
    enabled: !!escritorioId && !!clienteId,
  })
}

export function useConectarAppCliente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      escritorioId,
      clienteId,
      appId,
      escopos,
      conectadoPor,
    }: {
      escritorioId: string
      clienteId: string
      appId: string
      escopos: AppEscopoSlug[]
      conectadoPor: string
    }) => {
      const version = await appVersionRepo.findLatest(appId)
      if (!version) throw new Error('Versão do serviço não encontrada')

      const installationId = uuid()
      const agora = new Date().toISOString()

      const installation = await appInstallationRepo.create({
        id: installationId,
        app_id: appId,
        app_version_id: version.id,
        escritorio_id: escritorioId,
        cliente_id: clienteId,
        instalado_por: conectadoPor,
        status: 'ativa',
        instalado_em: agora,
      })

      await Promise.all(
        escopos.map((escopo) =>
          appGrantRepo.create({
            id: uuid(),
            installation_id: installationId,
            escopo,
            concedido_em: agora,
          })
        )
      )

      return installation
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['app_installations', vars.escritorioId, 'cliente', vars.clienteId] })
      qc.invalidateQueries({ queryKey: ['app_grants'] })
    },
  })
}

export function useDesconectarAppCliente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      installationId,
      escritorioId,
      clienteId,
    }: {
      installationId: string
      escritorioId: string
      clienteId: string
    }) => {
      const agora = new Date().toISOString()
      await appGrantRepo.revokeAll(installationId, agora)
      await appInstallationRepo.update(installationId, { status: 'revogada', revogado_em: agora })
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['app_installations', vars.escritorioId, 'cliente', vars.clienteId] })
      qc.invalidateQueries({ queryKey: ['app_grants'] })
    },
  })
}

// --- Visibilidade: escritório controla quais apps aparecem para seus clientes ---

export function useSetAppVisibility() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      escritorioId,
      appId,
      visivel,
      destaque,
    }: {
      escritorioId: string
      appId: string
      visivel: boolean
      destaque: boolean
    }) => {
      const existing = await appVisibilityRepo.findByApp(escritorioId, appId)
      return appVisibilityRepo.upsert({
        id: existing?.id ?? uuid(),
        escritorio_id: escritorioId,
        app_id: appId,
        visivel,
        destaque,
      })
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['app_visibility', vars.escritorioId] })
    },
  })
}
