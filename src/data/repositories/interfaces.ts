import type {
  Carteira, Client, ClientStatus, ClientVinculo, Contract, ContratoItem, Document,
  DocumentEventRecord, DocumentType, EmpresaPessoa, FichaBloco, FichaCampo,
  Folder, Grupo, GrupoEmpresa, HistoricoStatusCliente, Invoice, InvoiceStatus,
  LogAtividadeCliente, Payment, BillingPolicy, Pessoa, Plano, Renegotiation, Servico,
  ShareLink, Tenant, User,
  HistoricoTarefa,
  Fluxo, FluxoTarefa, Rotina, RotinaCliente, Ciclo, Ocorrencia, Tarefa, OcorrenciaStatus,
  OcorrenciaDocumento,
  GuiaRecolhimento, GuiaStatus, TipoGuia,
  LoteImportacao,
} from '@/domain/types'

export interface Repository<T> {
  findAll(tenantId: string): Promise<T[]>
  findById(id: string): Promise<T | null>
  create(item: T): Promise<T>
  update(id: string, data: Partial<T>): Promise<T>
  delete(id: string): Promise<void>
}

export interface TenantRepository {
  findById(id: string): Promise<Tenant | null>
  update(id: string, data: Partial<Tenant>): Promise<Tenant>
  create(item: Tenant): Promise<Tenant>
}

export interface UserRepository {
  findAll(tenantId: string, options?: { includeInactive?: boolean }): Promise<User[]>
  findById(id: string): Promise<User | null>
  findByEmail(email: string): Promise<User | null>
  create(item: User): Promise<User>
  update(id: string, data: Partial<User>): Promise<User>
}

export interface ClientRepository extends Repository<Client> {
  findActive(tenantId: string): Promise<Client[]>
  findByStatus(tenantId: string, status: ClientStatus): Promise<Client[]>
}

export interface FolderRepository extends Repository<Folder> {
  findByClient(tenantId: string, clientId: string): Promise<Folder[]>
  findChildren(parentId: string): Promise<Folder[]>
}

export interface DocumentTypeRepository extends Repository<DocumentType> {}

export interface DocumentRepository extends Repository<Document> {
  findByClient(tenantId: string, clientId: string): Promise<Document[]>
  findByFolder(folderId: string): Promise<Document[]>
  findByCompetencia(tenantId: string, competencia: string): Promise<Document[]>
}

export interface DocumentEventRepository {
  findByDocument(documentId: string): Promise<DocumentEventRecord[]>
  findByClient(tenantId: string, clientId: string): Promise<DocumentEventRecord[]>
  create(item: DocumentEventRecord): Promise<DocumentEventRecord>
}

export interface ShareLinkRepository {
  findByDocument(documentId: string): Promise<ShareLink[]>
  findByToken(token: string): Promise<ShareLink | null>
  create(item: ShareLink): Promise<ShareLink>
  delete(id: string): Promise<void>
}

export interface ContractRepository extends Repository<Contract> {
  findByClient(tenantId: string, clientId: string): Promise<Contract[]>
  findActive(tenantId: string): Promise<Contract[]>
  findPrincipalAtivo(tenantId: string, clientId: string): Promise<Contract | null>
}

export interface CarteiraRepository extends Repository<Carteira> {}

export interface HistoricoStatusClienteRepository extends Repository<HistoricoStatusCliente> {
  findByClient(tenantId: string, clientId: string): Promise<HistoricoStatusCliente[]>
}

export interface InvoiceRepository extends Repository<Invoice> {
  findByClient(tenantId: string, clientId: string): Promise<Invoice[]>
  findByStatus(tenantId: string, status: InvoiceStatus): Promise<Invoice[]>
  findOverdue(tenantId: string, hoje: string): Promise<Invoice[]>
  findByCompetencia(tenantId: string, competencia: string): Promise<Invoice[]>
}

export interface PaymentRepository {
  findByInvoice(invoiceId: string): Promise<Payment[]>
  create(item: Payment): Promise<Payment>
}

export interface BillingPolicyRepository {
  findByTenant(tenantId: string): Promise<BillingPolicy | null>
  upsert(policy: BillingPolicy): Promise<BillingPolicy>
}

export interface RenegotiationRepository extends Repository<Renegotiation> {
  findByClient(tenantId: string, clientId: string): Promise<Renegotiation[]>
}

export interface PessoaRepository extends Repository<Pessoa> {}

export interface EmpresaPessoaRepository extends Repository<EmpresaPessoa> {
  findByEmpresa(tenantId: string, empresaId: string): Promise<EmpresaPessoa[]>
  findByPessoa(tenantId: string, pessoaId: string): Promise<EmpresaPessoa[]>
}

export interface GrupoRepository extends Repository<Grupo> {}

export interface GrupoEmpresaRepository extends Repository<GrupoEmpresa> {
  findByGrupo(tenantId: string, grupoId: string): Promise<GrupoEmpresa[]>
  findByEmpresa(tenantId: string, empresaId: string): Promise<GrupoEmpresa[]>
}

export interface ClientVinculoRepository extends Repository<ClientVinculo> {
  findByPJ(tenantId: string, pjId: string): Promise<ClientVinculo[]>
  findByPF(tenantId: string, pfId: string): Promise<ClientVinculo[]>
}

export interface ServicoRepository extends Repository<Servico> {
  findAtivos(tenantId: string): Promise<Servico[]>
}

export interface PlanoRepository extends Repository<Plano> {
  findAtivos(tenantId: string): Promise<Plano[]>
}

export interface ContratoItemRepository extends Repository<ContratoItem> {
  findByContrato(tenantId: string, contratoId: string): Promise<ContratoItem[]>
}

export interface FichaBlocoRepository extends Repository<FichaBloco> {
  findByClient(tenantId: string, clientId: string): Promise<FichaBloco[]>
}

export interface FichaCampoRepository extends Repository<FichaCampo> {
  findByBloco(tenantId: string, blocoId: string): Promise<FichaCampo[]>
  deleteByBloco(blocoId: string): Promise<void>
}

export interface LogAtividadeClienteRepository {
  findByClient(tenantId: string, clientId: string): Promise<LogAtividadeCliente[]>
  create(item: LogAtividadeCliente): Promise<LogAtividadeCliente>
}

export interface HistoricoTarefaRepository {
  findByTarefa(tenantId: string, tarefaId: string): Promise<HistoricoTarefa[]>
  create(item: HistoricoTarefa): Promise<HistoricoTarefa>
}

// --- Repositórios do módulo unificado de Tarefas ---

export interface FluxoRepository extends Repository<Fluxo> {
  findAtivos(tenantId: string): Promise<Fluxo[]>
}

export interface FluxoTarefaRepository extends Repository<FluxoTarefa> {
  findByFluxo(tenantId: string, fluxoId: string): Promise<FluxoTarefa[]>
}

export interface RotinaRepository extends Repository<Rotina> {
  findAtivas(tenantId: string): Promise<Rotina[]>
}

export interface RotinaClienteRepository extends Repository<RotinaCliente> {
  findByRotina(tenantId: string, rotinaId: string): Promise<RotinaCliente[]>
  findByCliente(tenantId: string, clienteId: string): Promise<RotinaCliente[]>
  findAtivos(tenantId: string, rotinaId: string): Promise<RotinaCliente[]>
}

export interface CicloRepository extends Repository<Ciclo> {
  findByRotina(tenantId: string, rotinaId: string): Promise<Ciclo[]>
  findByPeriodo(tenantId: string, rotinaId: string, periodo: string): Promise<Ciclo | null>
}

export interface OcorrenciaRepository extends Repository<Ocorrencia> {
  findByCliente(tenantId: string, clienteId: string): Promise<Ocorrencia[]>
  findByStatus(tenantId: string, status: OcorrenciaStatus): Promise<Ocorrencia[]>
  findByLote(tenantId: string, loteId: string): Promise<Ocorrencia[]>
  findByCiclo(tenantId: string, cicloId: string): Promise<Ocorrencia[]>
}

export interface TarefaRepository extends Repository<Tarefa> {
  findByOcorrencia(tenantId: string, ocorrenciaId: string): Promise<Tarefa[]>
  findByCliente(tenantId: string, clienteId: string): Promise<Tarefa[]>
}

export interface OcorrenciaDocumentoRepository extends Repository<OcorrenciaDocumento> {
  findByOcorrencia(tenantId: string, ocorrenciaId: string): Promise<OcorrenciaDocumento[]>
  findByTarefa(tenantId: string, tarefaId: string): Promise<OcorrenciaDocumento[]>
  findByCliente(tenantId: string, clienteId: string): Promise<OcorrenciaDocumento[]>
  findByDocument(documentId: string): Promise<OcorrenciaDocumento[]>
}

export interface GuiaRecolhimentoRepository extends Repository<GuiaRecolhimento> {
  findByCliente(tenantId: string, clienteId: string): Promise<GuiaRecolhimento[]>
  findByStatus(tenantId: string, status: GuiaStatus): Promise<GuiaRecolhimento[]>
  findByCompetencia(tenantId: string, competencia: string): Promise<GuiaRecolhimento[]>
  findByTipo(tenantId: string, tipo: TipoGuia): Promise<GuiaRecolhimento[]>
  findBySHA256(sha256: string): Promise<GuiaRecolhimento | null>
}

export interface LoteImportacaoRepository extends Repository<LoteImportacao> {
  findByTenant(tenantId: string): Promise<LoteImportacao[]>
}
