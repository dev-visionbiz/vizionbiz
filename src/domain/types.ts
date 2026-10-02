export type UserRole = 'escritorio_admin' | 'escritorio_colaborador' | 'cliente'
export type ContrataNatureza = 'principal' | 'avulso' | 'gestao_provisoria' | 'emissao'
export type PortalSecao = 'inicio' | 'documentos' | 'financeiro'
export type ModuloEscritorio = 'clientes' | 'grupos' | 'documentos' | 'financeiro' | 'tarefas'
export type SubModuloTarefas = 'ocorrencias' | 'rotinas'
export type PapelPortalCliente = 'responsavel' | 'membro'
export type InvoiceStatus = 'aberta' | 'vencida' | 'paga' | 'cancelada' | 'renegociada'
export type InvoiceOrigin = 'contrato' | 'avulsa' | 'renegociacao'
export type FolderType = 'fiscal' | 'dp' | 'contabil' | 'societario' | 'outros'
export type PaymentMethod = 'pix' | 'boleto' | 'cartao'
export type AccessMode = 'informativo' | 'parcial' | 'total'
export type CorrectionIndex = 'ipca' | 'nenhum'
export type ChargeType = 'fixo' | 'pct' | 'nenhum'
export type ContractStatus = 'rascunho' | 'ativo' | 'suspenso' | 'encerrado'
export type TipoCobrancaServico = 'mensal' | 'avulso'
export type ContratoItemOrigem = 'plano' | 'servico' | 'manual'
export type ClientStatus = 'ativo' | 'inativo'
export type RenegotiationStatus = 'pendente' | 'aceita' | 'cancelada'
export type DocumentEventType = 'upload' | 'download' | 'view' | 'share'
export type TipoPessoa = 'fisica' | 'juridica'
export type PapelPessoa = 'socio' | 'administrador' | 'procurador' | 'contato_financeiro' | 'contato_principal'
export type TipoGrupo = 'grupo_economico' | 'carteira' | 'segmento' | 'tag'
export type ModuloSlug = 'contabil' | 'limpeza' | (string & {})

export interface Vocabulario {
  empresa: string
  cliente: string
  colaborador: string
  servico: string
  obrigacao: string
}

export interface Tenant {
  id: string
  nome: string
  razao_social?: string
  cnpj: string
  cor_primaria: string
  logo_url: string | null
  dominio: string
  email?: string
  telefone?: string
  crc?: string
  responsavel?: string
  endereco_logradouro?: string
  endereco_numero?: string
  endereco_complemento?: string
  endereco_bairro?: string
  endereco_cidade?: string
  endereco_estado?: string
  endereco_cep?: string
  contador_nome?: string
  contador_crc?: string
  contador_cpf?: string
  contador_email?: string
  contador_telefone?: string
  modulos?: ModuloSlug[]
  submodulos_tarefas?: SubModuloTarefas[]
  vocabulario?: Partial<Vocabulario>
}

export interface User {
  id: string
  tenant_id: string
  nome: string
  email: string
  papel: UserRole
  client_id?: string
  ativo: boolean
  senha_hash?: string
  // escritorio_colaborador: módulos liberados (undefined = todos)
  modulos?: ModuloEscritorio[]
  // cliente: papel no portal e seções liberadas
  papel_portal?: PapelPortalCliente
  secoes_portal?: PortalSecao[]
}

export interface Pessoa {
  id: string
  tenant_id: string
  tipo: TipoPessoa
  nome: string
  fantasia?: string
  cpf?: string
  cnpj?: string
  rg?: string
  data_nascimento?: string
  email?: string
  telefone?: string
}

export interface EmpresaPessoa {
  id: string
  tenant_id: string
  empresa_id: string
  pessoa_id: string
  papel: PapelPessoa
  principal: boolean
}

export interface Grupo {
  id: string
  tenant_id: string
  nome: string
  tipo: TipoGrupo
  cor?: string
  observacao?: string
}

export interface GrupoEmpresa {
  id: string
  tenant_id: string
  grupo_id: string
  empresa_id: string
}

export interface ClientVinculo {
  id: string
  tenant_id: string
  client_pj_id: string
  client_pf_id: string
  papel: PapelPessoa
  principal: boolean
}

export interface Carteira {
  id: string
  tenant_id: string
  nome: string
  descricao?: string
  cor?: string
}

export interface HistoricoStatusCliente {
  id: string
  tenant_id: string
  client_id: string
  status: ClientStatus
  motivo: string
  alterado_por: string
  data: string
}

export interface Client {
  id: string
  tenant_id: string
  tipo: TipoPessoa
  razao_social: string  // PJ: razão social | PF: nome completo
  cnpj?: string         // PJ
  cpf?: string          // PF
  fantasia?: string     // PJ: nome fantasia
  regime: string
  status: ClientStatus
  email?: string
  telefone?: string
  carteira_id?: string
}

export interface Folder {
  id: string
  tenant_id: string
  client_id: string
  parent_id: string | null
  nome: string
  tipo_padrao: FolderType
  sistema?: boolean
}

export interface DocumentType {
  id: string
  tenant_id: string
  nome: string
  essencial: boolean
  tem_validade?: boolean
}

export type StorageProviderType = 'local' | 'supabase' | 'google_drive' | 'onedrive' | 'dropbox'
export type StorageStatus = 'ok' | 'arquivo_ausente'
export type StorageConnectionStatus = 'conectado' | 'reconectar' | 'desconectado'

export interface StorageConnection {
  id: string
  escritorio_id: string
  provider: StorageProviderType
  status: StorageConnectionStatus
  conta_email?: string
  root_folder_id?: string
  conectado_por: string
  conectado_em: string
  updated_at: string
}

export interface Document {
  id: string
  tenant_id: string
  client_id: string
  folder_id: string
  type_id: string
  nome: string
  competencia: string
  versao: number
  storage_key: string
  tamanho: number
  mime: string
  criado_por: string
  criado_em: string
  invoice_id?: string
  download_apos_pagamento?: boolean
  data_validade?: string
  // campos de provedor plugável (opcionais — retrocompatível com dados legados)
  provider?: StorageProviderType
  provider_file_id?: string
  storage_status?: StorageStatus
}

export interface DocumentEventRecord {
  id: string
  document_id: string
  user_id: string
  evento: DocumentEventType
  ip: string
  em: string
}

export interface ShareLink {
  id: string
  document_id: string
  token: string
  expira_em: string
  senha?: string
}

export interface Contract {
  id: string
  tenant_id: string
  client_id: string
  natureza?: ContrataNatureza
  valor_mensal: number
  dia_vencimento: number
  inicio: string
  fim?: string
  indice_reajuste: string
  status: ContractStatus
  apenas_reajuste_positivo?: boolean
  desconto_valor?: number
  data_encerramento?: string
  motivo_encerramento?: string
  observacao_encerramento?: string
  ultima_competencia_cobrada?: string
  criado_em?: string
  atualizado_em?: string
}

export interface Servico {
  id: string
  tenant_id: string
  nome: string
  descricao?: string
  valor_padrao: number
  tipo_cobranca_padrao: TipoCobrancaServico
  ativo: boolean
}

export interface PlanoItem {
  servico_id: string
  quantidade: number
}

export interface Plano {
  id: string
  tenant_id: string
  nome: string
  descricao?: string
  valor: number
  ativo: boolean
  itens: PlanoItem[]
}

export interface ContratoItem {
  id: string
  tenant_id: string
  contrato_id: string
  origem: ContratoItemOrigem
  origem_id?: string
  nome: string
  valor_unitario: number
  quantidade: number
}

export interface Invoice {
  id: string
  tenant_id: string
  client_id: string
  contract_id?: string
  competencia: string
  vencimento: string
  valor_original: number
  status: InvoiceStatus
  origem: InvoiceOrigin
  renegotiation_id?: string
}

export interface Payment {
  id: string
  invoice_id: string
  valor: number
  metodo: PaymentMethod
  pago_em: string
  gateway_ref: string
}

export interface BillingPolicy {
  id: string
  tenant_id: string
  multa_pct: number
  juros_mes_pct: number
  indice_correcao: CorrectionIndex
  carencia_dias: number
  encargo_renegociacao_tipo: ChargeType
  encargo_renegociacao_valor: number
  encargo_teto: number
  parcelas_max: number
  desconto_avista_encargos_pct: number
  modo_acesso: AccessMode
  multa_acima_2_aceite?: {
    aceito: boolean
    data: string
    user_id: string
  }
}

export interface Renegotiation {
  id: string
  tenant_id: string
  client_id: string
  invoice_ids: string[]
  saldo_principal: number
  multa: number
  juros: number
  correcao: number
  encargo: number
  total: number
  parcelas: number
  termo_hash: string
  aceite: {
    ip: string
    em: string
    user_id: string
  }
  status: RenegotiationStatus
}

export interface ChargeCalculation {
  invoice_id: string
  valor_original: number
  dias_atraso: number
  dentro_carencia: boolean
  multa: number
  juros: number
  correcao: number
  total: number
  memoria: Array<{
    descricao: string
    base: number
    taxa: number
    dias: number
    valor: number
  }>
}

export interface RenegotiationSimulation {
  invoice_ids: string[]
  saldo_principal: number
  multa: number
  juros: number
  correcao: number
  encargo: number
  desconto_aplicado: number
  total: number
  parcelas: number
  valor_parcela: number
  memoria: ChargeCalculation[]
}

// --- Ficha Rápida ---

export type FichaCampoTipo =
  | 'texto' | 'cnpj' | 'cpf' | 'telefone' | 'email'
  | 'cep' | 'pis' | 'titulo_eleitor' | 'senha' | 'url'

export const FICHA_CAMPO_TIPOS_DUPLOS: FichaCampoTipo[] = [
  'cnpj', 'cpf', 'cep', 'pis', 'titulo_eleitor',
]

export interface FichaBloco {
  id: string
  tenant_id: string
  client_id: string
  titulo: string
  ordem: number
}

export interface FichaCampo {
  id: string
  tenant_id: string
  bloco_id: string
  rotulo: string
  valor: string
  tipo: FichaCampoTipo
  sensivel: boolean
  ordem: number
}

// --- Log de Atividades do Cliente ---

export type LogAtividadeAcao =
  | 'cadastro_criado'
  | 'dados_editados'
  | 'status_alterado'
  | 'fatura_criada'
  | 'fatura_baixada'
  | 'fatura_cancelada'
  | 'contrato_criado'
  | 'contrato_ativado'
  | 'contrato_suspenso'
  | 'contrato_encerrado'
  | 'documento_enviado'
  | 'ficha_rapida_alterada'
  | 'tarefa_concluida'
  | 'tarefa_atualizada'
  | 'vinculo_adicionado'
  | 'vinculo_removido'
  | 'demanda_criada'
  | 'demanda_concluida'
  | 'etapa_demanda_atualizada'

export interface LogAtividadeCliente {
  id: string
  tenant_id: string
  client_id: string
  acao: LogAtividadeAcao
  descricao: string
  usuario_id: string
  usuario_nome: string
  em: string
}

// --- Checklist ---

export interface ChecklistItemTemplate {
  id: string
  ordem: number
  nome: string
}

export interface ChecklistItemProgresso {
  id: string
  item_id?: string
  nome: string
  ordem: number
  concluido: boolean
  concluido_em?: string
  inicio_em?: string
  tempo_estimado_min?: number
  usar_timer?: boolean
  timer_pausado_em?: string
  tempo_pausado_acumulado_ms?: number
  origem: 'template' | 'custom'
}

// --- Módulo de Obrigações ---

export type Periodicidade = 'mensal' | 'trimestral' | 'anual'
export type TarefaStatus = 'pendente' | 'em_andamento' | 'concluida' | 'atrasada' | 'nao_se_aplica' | 'impedido'
export type CompetenciaStatus = 'aberta' | 'encerrada'

// --- Histórico de Tarefas ---

export type HistoricoTipoEvento =
  | 'criacao'
  | 'status_alterado'
  | 'responsavel_alterado'
  | 'impedimento_registrado'
  | 'impedimento_resolvido'
  | 'comentario'
  | 'checklist_completo'
  | 'inicio_item_checklist'
  | 'conclusao_item_checklist'
  | 'pausa_item_checklist'
  | 'retomada_item_checklist'
  | 'cancelamento_item_checklist'

export interface HistoricoTarefa {
  id: string
  tenant_id: string
  tarefa_tipo: 'tarefa'
  tarefa_id: string
  tipo: HistoricoTipoEvento
  autor_id?: string
  autor_nome?: string
  conteudo?: string
  meta?: {
    status_anterior?: TarefaStatus
    status_novo?: TarefaStatus
    responsavel_anterior_nome?: string
    responsavel_novo_nome?: string
    checklist_item_nome?: string
    tempo_decorrido_min?: number
  }
  criado_em: string
}

// --- Módulo Unificado de Tarefas ---

export type CategoriaDemanda = 'societario' | 'fiscal' | 'dp' | 'contabil' | 'outros'

export type OcorrenciaStatus = 'pendente' | 'em_andamento' | 'concluida' | 'cancelada'
export type OcorrenciaOrigem = 'manual' | 'fluxo' | 'rotina'

export interface Fluxo {
  id: string
  tenant_id: string
  nome: string
  descricao?: string
  instrucoes?: string
  categoria: CategoriaDemanda
  prazo_dias_padrao: number
  valor_sugerido?: number
  ativo: boolean
}

export type OcorrenciaDocumentoTipo = 'entrada' | 'saida' | 'referencia'

export interface OcorrenciaDocumentoConfig {
  id: string
  label: string
  tipo: OcorrenciaDocumentoTipo
  obrigatorio: boolean
  pasta_padrao_id?: string
  tipo_documento_id?: string
}

export interface OcorrenciaDocumento {
  id: string
  tenant_id: string
  ocorrencia_id: string
  client_id: string
  tarefa_id?: string
  config_id?: string
  document_id?: string
  storage_key?: string
  nome: string
  tipo: OcorrenciaDocumentoTipo
  criado_em: string
  criado_por: string
}

export interface FluxoTarefa {
  id: string
  tenant_id: string
  fluxo_id: string
  ordem: number
  nome: string
  descricao?: string
  prazo_relativo_dias: number
  responsavel_padrao?: string
  checklist?: ChecklistItemTemplate[]
  documentos_config?: OcorrenciaDocumentoConfig[]
}

export interface Rotina {
  id: string
  tenant_id: string
  nome: string
  fluxo_id?: string
  periodicidade: Periodicidade
  regra_vencimento: string
  regime?: string
  ativo: boolean
  criado_em?: string
}

export interface RotinaCliente {
  id: string
  tenant_id: string
  rotina_id: string
  cliente_id: string
  ativo: boolean
  data_inicio?: string
  data_fim?: string
}

export interface Ciclo {
  id: string
  tenant_id: string
  rotina_id: string
  periodo: string
  data_vencimento: string
  status: CompetenciaStatus
}

export interface Ocorrencia {
  id: string
  tenant_id: string
  titulo: string
  cliente_id?: string
  origem: OcorrenciaOrigem
  fluxo_id?: string
  rotina_id?: string
  ciclo_id?: string
  lote_id?: string
  categoria?: CategoriaDemanda
  valor?: number
  data_solicitacao?: string
  data_prevista: string
  data_conclusao?: string
  status: OcorrenciaStatus
  responsavel_id?: string
  criado_por: string
  criado_em: string
  invoice_id?: string
}

export interface Tarefa {
  id: string
  tenant_id: string
  ocorrencia_id: string
  fluxo_tarefa_id?: string
  ordem: number
  nome: string
  descricao?: string
  data_prevista: string
  data_conclusao?: string
  status: TarefaStatus
  responsavel_id?: string
  observacoes?: string
  impedimento_descricao?: string
  impedimento_responsavel?: string
  impedimento_data?: string
  checklist_progresso?: ChecklistItemProgresso[]
  documentos_config?: OcorrenciaDocumentoConfig[]
}
