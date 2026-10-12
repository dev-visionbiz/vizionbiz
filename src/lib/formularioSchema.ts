import type { FormularioDestino, FormularioCampoTemplate } from '@/domain/types'

const UF_OPTIONS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

// Campos de endereço reutilizados em vários destinos
const CAMPOS_ENDERECO: FormularioCampoTemplate[] = [
  { id: 'cep',         rotulo: 'CEP',         tipo: 'cep',    obrigatorio: false, ordem: 20 },
  { id: 'logradouro',  rotulo: 'Logradouro',  tipo: 'texto',  obrigatorio: false, ordem: 21 },
  { id: 'numero',      rotulo: 'Número',      tipo: 'texto',  obrigatorio: false, ordem: 22 },
  { id: 'complemento', rotulo: 'Complemento', tipo: 'texto',  obrigatorio: false, ordem: 23 },
  { id: 'bairro',      rotulo: 'Bairro',      tipo: 'texto',  obrigatorio: false, ordem: 24 },
  { id: 'cidade',      rotulo: 'Cidade',      tipo: 'texto',  obrigatorio: false, ordem: 25 },
  { id: 'estado',      rotulo: 'UF',          tipo: 'select', obrigatorio: false, ordem: 26, opcoes: UF_OPTIONS },
]

export interface CampoSchema extends Omit<FormularioCampoTemplate, 'obrigatorio'> {
  obrigatorio: boolean
  habilitadoPorPadrao: boolean
  dica?: string
}

export const SCHEMA_POR_DESTINO: Record<Exclude<FormularioDestino, 'generico'>, CampoSchema[]> = {
  socio_novo: [
    { id: 'nome',            rotulo: 'Nome completo',     tipo: 'texto',     obrigatorio: true,  habilitadoPorPadrao: true,  ordem: 1 },
    { id: 'cpf',             rotulo: 'CPF',               tipo: 'cpf',       obrigatorio: true,  habilitadoPorPadrao: true,  ordem: 2 },
    { id: 'data_nascimento', rotulo: 'Data de nascimento',tipo: 'data',      obrigatorio: false, habilitadoPorPadrao: true,  ordem: 3 },
    { id: 'email',           rotulo: 'E-mail',            tipo: 'email',     obrigatorio: false, habilitadoPorPadrao: true,  ordem: 4 },
    { id: 'telefone',        rotulo: 'Telefone',          tipo: 'telefone',  obrigatorio: false, habilitadoPorPadrao: true,  ordem: 5 },
    { id: 'participacao_pct',rotulo: 'Participação (%)',  tipo: 'percentual',obrigatorio: true,  habilitadoPorPadrao: true,  ordem: 6 },
    { id: 'cargo',           rotulo: 'Cargo / Qualificação',tipo: 'texto',   obrigatorio: false, habilitadoPorPadrao: true,  ordem: 7 },
    { id: 'data_entrada',    rotulo: 'Data de entrada',   tipo: 'data',      obrigatorio: true,  habilitadoPorPadrao: true,  ordem: 8 },
    ...CAMPOS_ENDERECO.map(c => ({ ...c, habilitadoPorPadrao: false })),
  ],

  socio_saida: [
    { id: 'cpf',               rotulo: 'CPF do sócio',           tipo: 'cpf',        obrigatorio: true,  habilitadoPorPadrao: true,  ordem: 1 },
    { id: 'nome',              rotulo: 'Nome do sócio',          tipo: 'texto',      obrigatorio: true,  habilitadoPorPadrao: true,  ordem: 2 },
    { id: 'data_saida',        rotulo: 'Data de saída',          tipo: 'data',       obrigatorio: true,  habilitadoPorPadrao: true,  ordem: 3 },
    { id: 'participacao_pct',  rotulo: 'Participação cedida (%)',tipo: 'percentual', obrigatorio: false, habilitadoPorPadrao: true,  ordem: 4 },
    { id: 'motivo',            rotulo: 'Motivo da saída',        tipo: 'texto_longo',obrigatorio: false, habilitadoPorPadrao: false, ordem: 5 },
  ],

  cliente_pj: [
    { id: 'razao_social',       rotulo: 'Razão social',        tipo: 'texto',    obrigatorio: false, habilitadoPorPadrao: false, ordem: 1 },
    { id: 'nome_fantasia',      rotulo: 'Nome fantasia',       tipo: 'texto',    obrigatorio: false, habilitadoPorPadrao: true,  ordem: 2 },
    { id: 'email',              rotulo: 'E-mail',              tipo: 'email',    obrigatorio: false, habilitadoPorPadrao: true,  ordem: 3 },
    { id: 'telefone',           rotulo: 'Telefone',            tipo: 'telefone', obrigatorio: false, habilitadoPorPadrao: true,  ordem: 4 },
    { id: 'inscricao_estadual', rotulo: 'Inscrição Estadual',  tipo: 'texto',    obrigatorio: false, habilitadoPorPadrao: false, ordem: 5 },
    { id: 'inscricao_municipal',rotulo: 'Inscrição Municipal', tipo: 'texto',    obrigatorio: false, habilitadoPorPadrao: false, ordem: 6 },
    ...CAMPOS_ENDERECO.map(c => ({ ...c, habilitadoPorPadrao: true })),
  ],

  cliente_pf: [
    { id: 'nome',            rotulo: 'Nome completo',      tipo: 'texto',    obrigatorio: true,  habilitadoPorPadrao: true,  ordem: 1 },
    { id: 'cpf',             rotulo: 'CPF',                tipo: 'cpf',      obrigatorio: true,  habilitadoPorPadrao: true,  ordem: 2 },
    { id: 'data_nascimento', rotulo: 'Data de nascimento', tipo: 'data',     obrigatorio: false, habilitadoPorPadrao: true,  ordem: 3 },
    { id: 'email',           rotulo: 'E-mail',             tipo: 'email',    obrigatorio: false, habilitadoPorPadrao: true,  ordem: 4 },
    { id: 'telefone',        rotulo: 'Telefone',           tipo: 'telefone', obrigatorio: false, habilitadoPorPadrao: true,  ordem: 5 },
    ...CAMPOS_ENDERECO.map(c => ({ ...c, habilitadoPorPadrao: false })),
  ],

  processo_alteracao: [
    {
      id: 'tipo_alteracao', rotulo: 'Tipo de alteração', tipo: 'select', obrigatorio: true, habilitadoPorPadrao: true, ordem: 1,
      opcoes: ['Capital social', 'Endereço fiscal', 'Nome fantasia', 'Atividade econômica', 'Sócios', 'Administrador', 'Outros'],
    },
    { id: 'descricao',     rotulo: 'Descrição detalhada', tipo: 'texto_longo', obrigatorio: true,  habilitadoPorPadrao: true,  ordem: 2 },
    { id: 'data_vigencia', rotulo: 'Data de vigência',    tipo: 'data',        obrigatorio: false, habilitadoPorPadrao: false, ordem: 3 },
    { id: 'capital_social',rotulo: 'Novo capital social', tipo: 'moeda',       obrigatorio: false, habilitadoPorPadrao: false, ordem: 4 },
    { id: 'observacoes',   rotulo: 'Observações',         tipo: 'texto_longo', obrigatorio: false, habilitadoPorPadrao: false, ordem: 5 },
  ],
}

export function isDestinoEstruturado(destino: FormularioDestino): destino is Exclude<FormularioDestino, 'generico'> {
  return destino !== 'generico'
}

/** Retorna os campos padrão para um destino estruturado (apenas os habilitadoPorPadrao) */
export function getCamposPadrao(destino: Exclude<FormularioDestino, 'generico'>): FormularioCampoTemplate[] {
  return SCHEMA_POR_DESTINO[destino]
    .filter(c => c.habilitadoPorPadrao)
    .map(({ habilitadoPorPadrao: _, dica: __, ...campo }) => campo)
}
