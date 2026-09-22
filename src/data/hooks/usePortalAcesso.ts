import { useAuth } from '@/auth/AuthProvider'
import type { PortalSecao, PapelPortalCliente } from '@/domain/types'

const TODAS: PortalSecao[] = ['inicio', 'documentos', 'financeiro']

interface PortalAcesso {
  secoesPermitidas: PortalSecao[]
  papelPortal: PapelPortalCliente
  isLoading: false
}

export function usePortalAcesso(): PortalAcesso {
  const { currentUser } = useAuth()

  if (!currentUser || currentUser.papel !== 'cliente') {
    return { secoesPermitidas: TODAS, papelPortal: 'responsavel', isLoading: false }
  }

  const papelPortal: PapelPortalCliente = currentUser.papel_portal ?? 'responsavel'

  const secoesPermitidas: PortalSecao[] =
    papelPortal === 'responsavel'
      ? TODAS
      : (currentUser.secoes_portal?.length ? currentUser.secoes_portal : TODAS)

  return { secoesPermitidas, papelPortal, isLoading: false }
}
