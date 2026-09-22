import type { ModuloManifest } from '@/modulos/types'

export const moduloContabil: ModuloManifest = {
  slug: 'contabil',
  nome: 'Contabilidade',
  pastasDefault: [
    { nome: 'Fiscal', tipo: 'fiscal' },
    { nome: 'Departamento Pessoal', tipo: 'dp' },
    { nome: 'Contábil', tipo: 'contabil' },
    { nome: 'Societário', tipo: 'societario' },
    { nome: 'Outros', tipo: 'outros' },
  ],
  vocabulario: {
    empresa: 'Escritório',
    cliente: 'Cliente',
    colaborador: 'Colaborador',
    servico: 'Serviço',
    obrigacao: 'Obrigação',
  },
}
