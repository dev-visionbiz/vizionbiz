import { useAuth } from '@/auth/AuthProvider'
import type { PortalSecao, PapelPortalCliente } from '@/domain/types'

const TODAS: PortalSecao[] = ['inicio', 'cadastro', 'solicitacoes', 'documentos', 'financeiro', 'guias', 'pesquisas', 'apps', 'certificados']

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

  // Multi-empresa: lê config da empresa ativa em clientes[]
  const acesso = currentUser.clientes?.find(c => c.client_id === currentUser.client_id)
  const papelPortal: PapelPortalCliente =
    acesso?.papel_portal ?? currentUser.papel_portal ?? 'responsavel'
  const secoesPortal = acesso?.secoes_portal ?? currentUser.secoes_portal

  const secoesPermitidas: PortalSecao[] =
    papelPortal === 'responsavel'
      ? TODAS
      : (secoesPortal?.length ? secoesPortal : TODAS)

  return { secoesPermitidas, papelPortal, isLoading: false }
}
