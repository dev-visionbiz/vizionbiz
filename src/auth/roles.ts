import type { User, UserRole, ModuloEscritorio } from '@/domain/types'

export const can = {
  uploadDocuments: (role: UserRole) => role !== 'cliente',
  managePolicy: (role: UserRole) => role === 'escritorio_admin',
  manageBranding: (role: UserRole) => role === 'escritorio_admin',
  manageUsers: (role: UserRole) => role === 'escritorio_admin',
  viewAllClients: (role: UserRole) => role !== 'cliente',
  manualPayoff: (role: UserRole) => role !== 'cliente',
  createInvoice: (role: UserRole) => role !== 'cliente',
  negotiate: (role: UserRole) => role !== 'cliente',
  acceptNegotiation: (role: UserRole) => role === 'cliente',
  viewSettings: (role: UserRole) => role === 'escritorio_admin',
}

export const MODULOS_ESCRITORIO: ModuloEscritorio[] = [
  'clientes', 'grupos', 'documentos', 'financeiro', 'obrigacoes', 'tarefas', 'demandas',
]

export const moduloLabels: Record<ModuloEscritorio, string> = {
  clientes: 'Clientes',
  grupos: 'Grupos',
  documentos: 'Documentos',
  financeiro: 'Financeiro',
  obrigacoes: 'Obrigações',
  tarefas: 'Tarefas',
  demandas: 'Demandas',
}

export function podeAcessarModulo(user: User, modulo: ModuloEscritorio): boolean {
  if (user.papel === 'escritorio_admin') return true
  if (user.papel !== 'escritorio_colaborador') return false
  // sem lista = acesso total (padrão)
  if (!user.modulos || user.modulos.length === 0) return true
  return user.modulos.includes(modulo)
}
