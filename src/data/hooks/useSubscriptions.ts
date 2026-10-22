import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { v4 as uuid } from 'uuid'
import { format } from 'date-fns'
import { subscriptionRepo, commissionRuleRepo, ledgerRepo, appPlanRepo } from '@/data/repositories/appsProvider'
import type { Subscription, CommissionRule, LedgerEntry } from '@/domain/types'

// --- Subscriptions ---

export function useSubscriptionsByEscritorio(escritorioId: string) {
  return useQuery({
    queryKey: ['subscriptions', escritorioId],
    queryFn: () => subscriptionRepo.findByEscritorio(escritorioId),
    enabled: !!escritorioId,
  })
}

export function useSubscriptionByInstallation(installationId: string) {
  return useQuery({
    queryKey: ['subscriptions', 'installation', installationId],
    queryFn: () => subscriptionRepo.findByInstallation(installationId),
    enabled: !!installationId,
  })
}

export function useAssinarPlano() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      installationId,
      planId,
      appId,
      escritorioId,
    }: {
      installationId: string
      planId: string
      appId: string
      escritorioId: string
    }) => {
      const agora = new Date().toISOString()
      const hoje = format(new Date(), 'yyyy-MM-dd')
      const plan = await appPlanRepo.findById(planId)
      if (!plan) throw new Error('Plano não encontrado')

      // Cancela assinatura ativa anterior, se houver
      const anterior = await subscriptionRepo.findByInstallation(installationId)
      if (anterior) {
        await subscriptionRepo.update(anterior.id, { status: 'cancelada', fim: hoje })
      }

      const subscription = await subscriptionRepo.create({
        id: uuid(),
        installation_id: installationId,
        plan_id: planId,
        escritorio_id: escritorioId,
        app_id: appId,
        status: 'ativa',
        inicio: hoje,
        criado_em: agora,
      })

      // Lança no ledger se for plano pago
      if (plan.valor && plan.valor > 0) {
        const rule = await commissionRuleRepo.findEfetiva(appId, escritorioId)
        const valorBruto = plan.valor

        await ledgerRepo.create({
          id: uuid(),
          tipo: 'receita',
          subscription_id: subscription.id,
          escritorio_id: escritorioId,
          app_id: appId,
          valor: valorBruto,
          referencia: `Assinatura ${plan.nome} — ${plan.tipo_cobranca}`,
          criado_em: agora,
        })

        if (rule && rule.tipo !== 'nenhum') {
          const comissao =
            rule.tipo === 'percentual'
              ? (valorBruto * rule.valor) / 100
              : rule.valor

          await ledgerRepo.create({
            id: uuid(),
            tipo: 'comissao_escritorio',
            subscription_id: subscription.id,
            escritorio_id: escritorioId,
            app_id: appId,
            valor: comissao,
            referencia: `Comissão ${rule.tipo === 'percentual' ? rule.valor + '%' : 'R$ ' + rule.valor} — ${plan.nome}`,
            criado_em: agora,
          })
        }
      }

      return subscription
    },
    onSuccess: (_r, vars) => {
      qc.invalidateQueries({ queryKey: ['subscriptions', vars.escritorioId] })
      qc.invalidateQueries({ queryKey: ['subscriptions', 'installation', vars.installationId] })
      qc.invalidateQueries({ queryKey: ['ledger'] })
    },
  })
}

export function useCancelarAssinatura() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ subscriptionId, escritorioId }: { subscriptionId: string; escritorioId: string }) => {
      const hoje = format(new Date(), 'yyyy-MM-dd')
      return subscriptionRepo.update(subscriptionId, { status: 'cancelada', fim: hoje })
    },
    onSuccess: (_r, vars) => {
      qc.invalidateQueries({ queryKey: ['subscriptions', vars.escritorioId] })
      qc.invalidateQueries({ queryKey: ['subscriptions', 'installation'] })
    },
  })
}

// --- Commission Rules ---

export function useCommissionRules(appId?: string) {
  return useQuery({
    queryKey: ['commission_rules', appId ?? 'all'],
    queryFn: () => appId ? commissionRuleRepo.findByApp(appId) : commissionRuleRepo.findAll(),
  })
}

export function useUpsertCommissionRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (rule: CommissionRule) => commissionRuleRepo.upsert(rule),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['commission_rules'] }),
  })
}

export function useDeleteCommissionRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => commissionRuleRepo.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['commission_rules'] }),
  })
}
