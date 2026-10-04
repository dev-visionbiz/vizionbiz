import {
  FileText, Store, Users, Briefcase, MapPin, Building2, Flame, ShieldCheck, File,
  Receipt,
} from 'lucide-react'
import type { TipoGuia, GuiaStatus } from '@/domain/types'

export const TIPO_GUIA_CONFIG: Record<TipoGuia, {
  label: string
  labelCurto: string
  icon: React.ElementType
  cor: string        // tailwind bg class
  corTexto: string   // tailwind text class
  corBorda: string   // tailwind border class
}> = {
  darf: {
    label: 'DARF',
    labelCurto: 'DARF',
    icon: FileText,
    cor: 'bg-blue-100',
    corTexto: 'text-blue-700',
    corBorda: 'border-blue-200',
  },
  das: {
    label: 'DAS – Simples Nacional',
    labelCurto: 'DAS',
    icon: Store,
    cor: 'bg-emerald-100',
    corTexto: 'text-emerald-700',
    corBorda: 'border-emerald-200',
  },
  dae: {
    label: 'DAE – eSocial',
    labelCurto: 'DAE',
    icon: Briefcase,
    cor: 'bg-indigo-100',
    corTexto: 'text-indigo-700',
    corBorda: 'border-indigo-200',
  },
  darf_simples: {
    label: 'DARF Simples',
    labelCurto: 'DARF S.',
    icon: FileText,
    cor: 'bg-sky-100',
    corTexto: 'text-sky-700',
    corBorda: 'border-sky-200',
  },
  fgts: {
    label: 'FGTS',
    labelCurto: 'FGTS',
    icon: Users,
    cor: 'bg-purple-100',
    corTexto: 'text-purple-700',
    corBorda: 'border-purple-200',
  },
  gnre: {
    label: 'GNRE – Tributos Estaduais',
    labelCurto: 'GNRE',
    icon: MapPin,
    cor: 'bg-orange-100',
    corTexto: 'text-orange-700',
    corBorda: 'border-orange-200',
  },
  iss: {
    label: 'ISS – Imposto Sobre Serviços',
    labelCurto: 'ISS',
    icon: Building2,
    cor: 'bg-amber-100',
    corTexto: 'text-amber-700',
    corBorda: 'border-amber-200',
  },
  iptu: {
    label: 'IPTU',
    labelCurto: 'IPTU',
    icon: Building2,
    cor: 'bg-yellow-100',
    corTexto: 'text-yellow-700',
    corBorda: 'border-yellow-200',
  },
  boleto_prefeitura: {
    label: 'Boleto Prefeitura',
    labelCurto: 'Pref.',
    icon: Building2,
    cor: 'bg-amber-100',
    corTexto: 'text-amber-700',
    corBorda: 'border-amber-200',
  },
  bombeiros: {
    label: 'Corpo de Bombeiros',
    labelCurto: 'CBMSP',
    icon: Flame,
    cor: 'bg-red-100',
    corTexto: 'text-red-700',
    corBorda: 'border-red-200',
  },
  vigilancia_sanitaria: {
    label: 'Vigilância Sanitária',
    labelCurto: 'VISA',
    icon: ShieldCheck,
    cor: 'bg-teal-100',
    corTexto: 'text-teal-700',
    corBorda: 'border-teal-200',
  },
  outro: {
    label: 'Outro',
    labelCurto: 'Outro',
    icon: File,
    cor: 'bg-zinc-100',
    corTexto: 'text-zinc-600',
    corBorda: 'border-zinc-200',
  },
}

export const STATUS_GUIA_CONFIG: Record<GuiaStatus, {
  label: string
  cor: string
  corTexto: string
  corBg: string
}> = {
  aguardando_emissao: {
    label: 'Ag. Emissão',
    cor: 'bg-zinc-100',
    corTexto: 'text-zinc-600',
    corBg: 'bg-zinc-50',
  },
  emitida: {
    label: 'Emitida',
    cor: 'bg-blue-100',
    corTexto: 'text-blue-700',
    corBg: 'bg-blue-50',
  },
  paga: {
    label: 'Paga',
    cor: 'bg-green-100',
    corTexto: 'text-green-700',
    corBg: 'bg-green-50',
  },
  vencida: {
    label: 'Vencida',
    cor: 'bg-red-100',
    corTexto: 'text-red-700',
    corBg: 'bg-red-50',
  },
  cancelada: {
    label: 'Cancelada',
    cor: 'bg-zinc-100',
    corTexto: 'text-zinc-500',
    corBg: 'bg-zinc-50',
  },
  em_retificacao: {
    label: 'Em Retificação',
    cor: 'bg-orange-100',
    corTexto: 'text-orange-700',
    corBg: 'bg-orange-50',
  },
}

export const SEGUNDA_VIA_CONFIG = {
  nao_solicitada: { label: 'Não solicitada', cor: 'text-muted-foreground' },
  solicitada:    { label: 'Solicitada',      cor: 'text-amber-600' },
  disponivel:    { label: 'Disponível',       cor: 'text-green-600' },
  enviada:       { label: 'Enviada',          cor: 'text-blue-600' },
}

export const TIPOS_GUIA_ORDENADOS: TipoGuia[] = [
  'darf', 'das', 'dae', 'darf_simples', 'fgts', 'gnre', 'iss', 'iptu',
  'boleto_prefeitura', 'bombeiros', 'vigilancia_sanitaria', 'outro',
]

export const CAMPOS_ESPECIFICOS: Partial<Record<TipoGuia, { codigo_receita?: boolean; periodo_apuracao?: boolean; numero_referencia?: boolean }>> = {
  darf:        { codigo_receita: true, periodo_apuracao: true, numero_referencia: true },
  darf_simples:{ codigo_receita: true, periodo_apuracao: true },
  das:         { periodo_apuracao: true },
  fgts:        { periodo_apuracao: true, numero_referencia: true },
}

// Icon component for receipt/guia generic
export { Receipt as GuiaIcon }
