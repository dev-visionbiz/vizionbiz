import type {
  Carteira, Client, ClientStatus, ClientVinculo, Competencia, Contract, ContratoItem, Document,
  DocumentEventRecord, DocumentType, EmpresaPessoa, EtapaObrigacao, FichaBloco, FichaCampo,
  Folder, Grupo, GrupoEmpresa, HistoricoStatusCliente, Invoice, InvoiceStatus, ClienteObrigacao,
  LogAtividadeCliente, Obrigacao, Payment, BillingPolicy, Pessoa, Plano, Renegotiation, Servico,
  ShareLink, TarefaObrigacao, Tenant, User,
  DemandaTemplate, EtapaDemandaTemplate, DemandaEspecifica, EtapaDemandaEspecifica, DemandaStatus
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

export interface ObrigacaoRepository extends Repository<Obrigacao> {
  findAtivas(tenantId: string): Promise<Obrigacao[]>
}

export interface EtapaObrigacaoRepository extends Repository<EtapaObrigacao> {
  findByObrigacao(tenantId: string, obrigacaoId: string): Promise<EtapaObrigacao[]>
}

export interface ClienteObrigacaoRepository extends Repository<ClienteObrigacao> {
  findByCliente(tenantId: string, clienteId: string): Promise<ClienteObrigacao[]>
  findByObrigacao(tenantId: string, obrigacaoId: string): Promise<ClienteObrigacao[]>
  findAtivos(tenantId: string, obrigacaoId: string): Promise<ClienteObrigacao[]>
}

export interface CompetenciaRepository extends Repository<Competencia> {
  findByObrigacao(tenantId: string, obrigacaoId: string): Promise<Competencia[]>
  findByPeriodo(tenantId: string, obrigacaoId: string, periodo: string): Promise<Competencia | null>
}

export interface TarefaObrigacaoRepository extends Repository<TarefaObrigacao> {
  findByCompetencia(tenantId: string, competenciaId: string): Promise<TarefaObrigacao[]>
  findByCompetenciaEtapa(tenantId: string, competenciaId: string, etapaId: string): Promise<TarefaObrigacao[]>
  findByCliente(tenantId: string, clienteId: string): Promise<TarefaObrigacao[]>
}

export interface LogAtividadeClienteRepository {
  findByClient(tenantId: string, clientId: string): Promise<LogAtividadeCliente[]>
  create(item: LogAtividadeCliente): Promise<LogAtividadeCliente>
}

export interface DemandaTemplateRepository extends Repository<DemandaTemplate> {
  findAtivas(tenantId: string): Promise<DemandaTemplate[]>
}

export interface EtapaDemandaTemplateRepository extends Repository<EtapaDemandaTemplate> {
  findByTemplate(tenantId: string, templateId: string): Promise<EtapaDemandaTemplate[]>
}

export interface DemandaEspecificaRepository extends Repository<DemandaEspecifica> {
  findByCliente(tenantId: string, clienteId: string): Promise<DemandaEspecifica[]>
  findByStatus(tenantId: string, status: DemandaStatus): Promise<DemandaEspecifica[]>
}

export interface EtapaDemandaEspecificaRepository extends Repository<EtapaDemandaEspecifica> {
  findByDemanda(tenantId: string, demandaId: string): Promise<EtapaDemandaEspecifica[]>
}
