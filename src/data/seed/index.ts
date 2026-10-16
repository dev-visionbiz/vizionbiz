import { v4 as uuidv4 } from 'uuid'
import { subMonths, format, addDays, subDays } from 'date-fns'
import type {
  Tenant, User, Client, Folder, DocumentType, Document,
  Contract, ContratoItem, Invoice, BillingPolicy,
  Pessoa, EmpresaPessoa, Grupo, GrupoEmpresa, Servico, Plano,
  StorageConnection, FichaBloco, FichaCampo,
  Fluxo, FluxoTarefa, Rotina, RotinaCliente, Ciclo, Ocorrencia, Tarefa,
  ChecklistItemTemplate, GuiaRecolhimento,
  ClienteEndereco, ClienteContato, ClienteCnae,
  ProcessoAbertura, ProcessoAlteracao,
  App, AppVersion, AppPlan, AppInstallation, AppGrant, AppVisibility,
  CertificadoDigital,
  CommissionRule, Subscription, LedgerEntry,
} from '@/domain/types'

const TENANT_ID = 'tenant-001'
const TENANT2_ID = 'tenant-002'
const SEED_KEY = 'vb_seeded_v28'

// suppress unused import warning
const _uuidv4 = uuidv4

function competencia(monthsAgo: number): string {
  return format(subMonths(new Date(), monthsAgo), 'yyyy-MM')
}

function vencimento(monthsAgo: number, diaVencimento: number): string {
  const date = subMonths(new Date(), monthsAgo)
  date.setDate(diaVencimento)
  return format(date, 'yyyy-MM-dd')
}

export function runSeed(): void {
  if (localStorage.getItem(SEED_KEY)) return

  // --- Tenants ---
  const tenant: Tenant = {
    id: TENANT_ID,
    nome: 'Contábil Fidelis & Associados',
    razao_social: 'Contábil Fidelis & Associados S/S Ltda',
    cnpj: '12.345.678/0001-90',
    cor_primaria: '221 83% 53%',
    logo_url: null,
    dominio: 'fidelis.visionbiz.app',
    email: 'contato@fidelis.com.br',
    telefone: '(11) 3000-1234',
    responsavel: 'Carlos Fidelis',
    endereco_cidade: 'São Paulo',
    endereco_estado: 'SP',
    modulos: ['contabil'],
    status: 'ativo',
    plano: 'pro',
    data_cadastro: '2024-03-15',
  }
  const tenant2: Tenant = {
    id: TENANT2_ID,
    nome: 'Escritório Omega Contabilidade',
    razao_social: 'Omega Contabilidade Ltda',
    cnpj: '98.765.432/0001-10',
    cor_primaria: '142 72% 42%',
    logo_url: null,
    dominio: 'omega.visionbiz.app',
    email: 'suporte@omegacontab.com.br',
    telefone: '(21) 2500-9876',
    responsavel: 'Beatriz Omega',
    endereco_cidade: 'Rio de Janeiro',
    endereco_estado: 'RJ',
    status: 'trial',
    plano: 'starter',
    data_cadastro: '2026-09-01',
    data_expiracao: '2026-11-01',
  }
  localStorage.setItem('vb_tenants', JSON.stringify([tenant, tenant2]))

  // --- Clients ---
  const client1: Client = {
    id: 'client-001',
    tenant_id: TENANT_ID,
    tipo: 'juridica',
    razao_social: 'Padaria São Bento Ltda',
    fantasia: 'Padaria São Bento',
    cnpj: '11.222.333/0001-44',
    regime: 'Simples Nacional',
    status: 'ativo',
    email: 'contato@padariasbento.com',
    telefone: '(11) 3333-1111',
    inscricao_estadual: '111.222.333.444',
    inscricao_municipal: '1234567',
  }
  const client2: Client = {
    id: 'client-002',
    tenant_id: TENANT_ID,
    tipo: 'juridica',
    razao_social: 'Tech Solutions ME',
    cnpj: '22.333.444/0001-55',
    regime: 'Lucro Presumido',
    status: 'ativo',
    email: 'contato@techsolutions.com',
    inscricao_estadual: 'Isento',
  }
  const client3: Client = {
    id: 'client-003',
    tenant_id: TENANT_ID,
    tipo: 'juridica',
    razao_social: 'Comércio Geral ABC Ltda',
    fantasia: 'ABC Comércio',
    cnpj: '33.444.555/0001-66',
    regime: 'Simples Nacional',
    status: 'ativo',
  }
  // Cliente PF — autônomo/MEI com contrato direto
  const client4: Client = {
    id: 'client-004',
    tenant_id: TENANT_ID,
    tipo: 'fisica',
    razao_social: 'João Bento',
    cpf: '111.222.333-44',
    regime: 'MEI',
    status: 'ativo',
    email: 'joao@padariasbento.com',
    telefone: '(11) 99999-1111',
  }
  // Cliente em abertura — sem CNPJ ainda
  const clientAbertura: Client = {
    id: 'client-abertura-001',
    tenant_id: TENANT_ID,
    tipo: 'juridica',
    razao_social: 'Restaurante do João (em abertura)',
    regime: 'Simples Nacional',
    status: 'em_abertura',
    email: 'joao@exemplo.com',
    telefone: '(11) 98888-1234',
  }
  localStorage.setItem('vb_clients', JSON.stringify([client1, client2, client3, client4, clientAbertura]))

  const processoAbertura: ProcessoAbertura = {
    id: 'processo-abertura-001',
    tenant_id: TENANT_ID,
    client_id: 'client-abertura-001',
    status: 'coleta_dados',
    tipo_empresa: 'LTDA',
    capital_social: 30000,
    data_abertura_desejada: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
    formulario_status: 'nao_enviado',
    observacoes: 'Cliente indicado pelo João Bento. Pretende abrir restaurante no centro.',
    criado_por: 'user-admin',
    criado_em: subDays(new Date(), 5).toISOString(),
  }
  localStorage.setItem('vb_processos_abertura', JSON.stringify([processoAbertura]))

  // --- Processos de Alteração ---
  const processoAlteracao: ProcessoAlteracao = {
    id: 'processo-alteracao-001',
    tenant_id: TENANT_ID,
    client_id: 'client-001',
    tipo: 'endereco',
    descricao: 'Mudamos para o novo endereço no bairro Centro.',
    status: 'aguardando_envio',
    solicitado_por: 'cliente',
    criado_por: 'user-cliente',
    criado_em: subDays(new Date(), 2).toISOString(),
  }
  localStorage.setItem('vb_processos_alteracao', JSON.stringify([processoAlteracao]))

  // --- Pessoas ---
  const pessoas: Pessoa[] = [
    { id: 'pessoa-001', tenant_id: TENANT_ID, tipo: 'fisica', nome: 'João Bento', email: 'joao@padariasbento.com', telefone: '(11) 99999-1111' },
    { id: 'pessoa-002', tenant_id: TENANT_ID, tipo: 'fisica', nome: 'Maria Tech', email: 'maria@techsolutions.com', telefone: '(11) 99999-2222' },
    { id: 'pessoa-003', tenant_id: TENANT_ID, tipo: 'fisica', nome: 'Carlos ABC', email: 'carlos@comercioabc.com', telefone: '(11) 99999-3333' },
    { id: 'pessoa-004', tenant_id: TENANT_ID, tipo: 'juridica' as const, nome: 'Holding Bento Participações Ltda', fantasia: 'Holding Bento', cnpj: '44.555.666/0001-77', email: 'holding@bento.com.br', telefone: '(11) 4444-0000' },
  ]
  localStorage.setItem('vb_pessoas', JSON.stringify(pessoas))

  // --- Vínculos empresa ↔ pessoa ---
  const empresaPessoas: EmpresaPessoa[] = [
    { id: 'ep-001', tenant_id: TENANT_ID, empresa_id: 'client-001', pessoa_id: 'pessoa-001', papel: 'socio', principal: true },
    { id: 'ep-002', tenant_id: TENANT_ID, empresa_id: 'client-002', pessoa_id: 'pessoa-002', papel: 'administrador', principal: true },
    { id: 'ep-003', tenant_id: TENANT_ID, empresa_id: 'client-003', pessoa_id: 'pessoa-003', papel: 'socio', principal: true },
    { id: 'ep-004', tenant_id: TENANT_ID, empresa_id: 'client-001', pessoa_id: 'pessoa-004', papel: 'socio' as const, principal: false },
  ]
  localStorage.setItem('vb_empresa_pessoas', JSON.stringify(empresaPessoas))

  // --- Grupos ---
  const grupos: Grupo[] = [
    { id: 'grupo-001', tenant_id: TENANT_ID, nome: 'Simples Nacional', tipo: 'segmento', cor: '#22c55e', observacao: 'Clientes no regime Simples Nacional' },
    { id: 'grupo-002', tenant_id: TENANT_ID, nome: 'Carteira Ativa', tipo: 'carteira', cor: '#3b82f6' },
  ]
  localStorage.setItem('vb_grupos', JSON.stringify(grupos))

  // --- Vínculos grupo ↔ empresa ---
  const grupoEmpresas: GrupoEmpresa[] = [
    { id: 'ge-001', tenant_id: TENANT_ID, grupo_id: 'grupo-001', empresa_id: 'client-001' },
    { id: 'ge-002', tenant_id: TENANT_ID, grupo_id: 'grupo-001', empresa_id: 'client-003' },
    { id: 'ge-003', tenant_id: TENANT_ID, grupo_id: 'grupo-002', empresa_id: 'client-001' },
    { id: 'ge-004', tenant_id: TENANT_ID, grupo_id: 'grupo-002', empresa_id: 'client-002' },
    { id: 'ge-005', tenant_id: TENANT_ID, grupo_id: 'grupo-002', empresa_id: 'client-003' },
    { id: 'ge-006', tenant_id: TENANT_ID, grupo_id: 'grupo-002', empresa_id: 'client-004' },
  ]
  localStorage.setItem('vb_grupo_empresas', JSON.stringify(grupoEmpresas))

  // --- Users ---
  const users: User[] = [
    { id: 'vb-admin', tenant_id: '', nome: 'Admin VisionBiz', email: 'admin@visionbiz.com.br', papel: 'visionbiz_admin', ativo: true, senha_hash: 'admin123' },
    { id: 'user-admin', tenant_id: TENANT_ID, nome: 'Admin Fidelis', email: 'admin@fidelis.com', papel: 'escritorio_admin', ativo: true, senha_hash: 'senha123' },
    { id: 'user-colab', tenant_id: TENANT_ID, nome: 'Ana Colaboradora', email: 'colaborador@fidelis.com', papel: 'escritorio_colaborador', ativo: true, senha_hash: 'senha123', modulos: ['clientes', 'documentos'] },
    // João Bento: acessa Padaria São Bento (PJ) e João Bento MEI (PF) — demo multi-empresa
    {
      id: 'user-c1', tenant_id: TENANT_ID, nome: 'João Bento',
      email: 'cliente@padariasbento.com', papel: 'cliente', ativo: true, senha_hash: 'senha123',
      clientes: [
        { client_id: 'client-001', papel_portal: 'responsavel' },
        { client_id: 'client-004', papel_portal: 'responsavel' },
      ],
    },
    { id: 'user-c2', tenant_id: TENANT_ID, nome: 'Maria Tech', email: 'cliente@techsolutions.com', papel: 'cliente', client_id: 'client-002', ativo: true, senha_hash: 'senha123', papel_portal: 'membro', secoes_portal: ['inicio', 'documentos'] },
    { id: 'user-c3', tenant_id: TENANT_ID, nome: 'Carlos ABC', email: 'cliente@comercioabc.com', papel: 'cliente', client_id: 'client-003', ativo: true, senha_hash: 'senha123', papel_portal: 'responsavel' },
    { id: 'user-omega-admin', tenant_id: TENANT2_ID, nome: 'Beatriz Omega', email: 'admin@omegacontab.com.br', papel: 'escritorio_admin', ativo: true, senha_hash: 'senha123' },
  ]
  localStorage.setItem('vb_users', JSON.stringify(users))

  // --- Catálogo: Serviços ---
  const servicos: Servico[] = [
    { id: 'svc-001', tenant_id: TENANT_ID, nome: 'Escrituração Fiscal', descricao: 'Apuração e entrega de obrigações fiscais mensais', valor_padrao: 350, tipo_cobranca_padrao: 'mensal', ativo: true },
    { id: 'svc-002', tenant_id: TENANT_ID, nome: 'Escrituração Contábil', descricao: 'Lançamentos contábeis e demonstrações financeiras', valor_padrao: 400, tipo_cobranca_padrao: 'mensal', ativo: true },
    { id: 'svc-003', tenant_id: TENANT_ID, nome: 'Departamento Pessoal', descricao: 'Folha de pagamento, admissões e demissões', valor_padrao: 280, tipo_cobranca_padrao: 'mensal', ativo: true },
    { id: 'svc-004', tenant_id: TENANT_ID, nome: 'Consultoria Tributária', descricao: 'Orientação e planejamento tributário', valor_padrao: 150, tipo_cobranca_padrao: 'mensal', ativo: true },
    { id: 'svc-005', tenant_id: TENANT_ID, nome: 'Imposto de Renda PF', descricao: 'Declaração anual de IRPF', valor_padrao: 250, tipo_cobranca_padrao: 'avulso', ativo: true },
    { id: 'svc-006', tenant_id: TENANT_ID, nome: 'Abertura de Empresa', descricao: 'Registro e constituição de pessoa jurídica', valor_padrao: 900, tipo_cobranca_padrao: 'avulso', ativo: true },
  ]
  localStorage.setItem('vb_servicos', JSON.stringify(servicos))

  // --- Catálogo: Planos ---
  const planos: Plano[] = [
    {
      id: 'plano-001', tenant_id: TENANT_ID, nome: 'Plano Básico', descricao: 'Fiscal + Contábil para Simples Nacional', valor: 750, ativo: true,
      itens: [{ servico_id: 'svc-001', quantidade: 1 }, { servico_id: 'svc-002', quantidade: 1 }],
    },
    {
      id: 'plano-002', tenant_id: TENANT_ID, nome: 'Plano Intermediário', descricao: 'Fiscal + Contábil + DP', valor: 1030, ativo: true,
      itens: [{ servico_id: 'svc-001', quantidade: 1 }, { servico_id: 'svc-002', quantidade: 1 }, { servico_id: 'svc-003', quantidade: 1 }],
    },
    {
      id: 'plano-003', tenant_id: TENANT_ID, nome: 'Plano Completo', descricao: 'Fiscal + Contábil + DP + Consultoria', valor: 1180, ativo: true,
      itens: [{ servico_id: 'svc-001', quantidade: 1 }, { servico_id: 'svc-002', quantidade: 1 }, { servico_id: 'svc-003', quantidade: 1 }, { servico_id: 'svc-004', quantidade: 1 }],
    },
  ]
  localStorage.setItem('vb_planos', JSON.stringify(planos))

  // --- Contracts ---
  const contracts: Contract[] = [
    {
      id: 'contract-001', tenant_id: TENANT_ID, client_id: 'client-001',
      valor_mensal: 890, dia_vencimento: 10, inicio: '2024-01-01',
      indice_reajuste: 'INPC', status: 'ativo',
      apenas_reajuste_positivo: true,
      criado_em: '2024-01-01T00:00:00Z', atualizado_em: '2024-01-01T00:00:00Z',
    },
    {
      id: 'contract-002', tenant_id: TENANT_ID, client_id: 'client-002',
      valor_mensal: 1450, dia_vencimento: 15, inicio: '2023-06-01',
      indice_reajuste: 'IPCA', status: 'ativo',
      apenas_reajuste_positivo: true,
      criado_em: '2023-06-01T00:00:00Z', atualizado_em: '2023-06-01T00:00:00Z',
    },
    {
      id: 'contract-003', tenant_id: TENANT_ID, client_id: 'client-003',
      valor_mensal: 620, dia_vencimento: 5, inicio: '2024-03-01',
      indice_reajuste: 'INPC', status: 'ativo',
      apenas_reajuste_positivo: true,
      criado_em: '2024-03-01T00:00:00Z', atualizado_em: '2024-03-01T00:00:00Z',
    },
  ]
  localStorage.setItem('vb_contracts', JSON.stringify(contracts))

  // --- Itens dos Contratos (snapshot) ---
  const contratoItems: ContratoItem[] = [
    // contract-001: Padaria (R$ 890) — Fiscal + Contábil + DP parcial
    { id: 'ci-001-1', tenant_id: TENANT_ID, contrato_id: 'contract-001', origem: 'servico', origem_id: 'svc-001', nome: 'Escrituração Fiscal', valor_unitario: 350, quantidade: 1 },
    { id: 'ci-001-2', tenant_id: TENANT_ID, contrato_id: 'contract-001', origem: 'servico', origem_id: 'svc-002', nome: 'Escrituração Contábil', valor_unitario: 400, quantidade: 1 },
    { id: 'ci-001-3', tenant_id: TENANT_ID, contrato_id: 'contract-001', origem: 'manual', nome: 'Departamento Pessoal (reduzido)', valor_unitario: 140, quantidade: 1 },
    // contract-002: Tech Solutions (R$ 1450) — Contábil + DP + Consultoria
    { id: 'ci-002-1', tenant_id: TENANT_ID, contrato_id: 'contract-002', origem: 'servico', origem_id: 'svc-001', nome: 'Escrituração Fiscal', valor_unitario: 420, quantidade: 1 },
    { id: 'ci-002-2', tenant_id: TENANT_ID, contrato_id: 'contract-002', origem: 'servico', origem_id: 'svc-002', nome: 'Escrituração Contábil', valor_unitario: 500, quantidade: 1 },
    { id: 'ci-002-3', tenant_id: TENANT_ID, contrato_id: 'contract-002', origem: 'servico', origem_id: 'svc-003', nome: 'Departamento Pessoal', valor_unitario: 280, quantidade: 1 },
    { id: 'ci-002-4', tenant_id: TENANT_ID, contrato_id: 'contract-002', origem: 'servico', origem_id: 'svc-004', nome: 'Consultoria Tributária', valor_unitario: 150, quantidade: 1 },
    { id: 'ci-002-5', tenant_id: TENANT_ID, contrato_id: 'contract-002', origem: 'manual', nome: 'Declarações Acessórias', valor_unitario: 100, quantidade: 1 },
    // contract-003: Comércio ABC (R$ 620) — Fiscal + Contábil
    { id: 'ci-003-1', tenant_id: TENANT_ID, contrato_id: 'contract-003', origem: 'servico', origem_id: 'svc-001', nome: 'Escrituração Fiscal', valor_unitario: 350, quantidade: 1 },
    { id: 'ci-003-2', tenant_id: TENANT_ID, contrato_id: 'contract-003', origem: 'servico', origem_id: 'svc-002', nome: 'Escrituração Contábil', valor_unitario: 270, quantidade: 1 },
  ]
  localStorage.setItem('vb_contrato_items', JSON.stringify(contratoItems))

  // --- Invoices ---
  const invoices: Invoice[] = []

  // Cliente 1 (Padaria) - todas pagas (últimos 5 meses)
  for (let i = 5; i >= 1; i--) {
    invoices.push({
      id: `inv-c1-${i}`,
      tenant_id: TENANT_ID,
      client_id: 'client-001',
      contract_id: 'contract-001',
      competencia: competencia(i),
      vencimento: vencimento(i, 10),
      valor_original: 890,
      status: 'paga',
      origem: 'contrato',
    })
  }
  // Mês atual - aberta
  invoices.push({
    id: 'inv-c1-0',
    tenant_id: TENANT_ID,
    client_id: 'client-001',
    contract_id: 'contract-001',
    competencia: competencia(0),
    vencimento: format(addDays(new Date(), 10), 'yyyy-MM-dd'),
    valor_original: 890,
    status: 'aberta',
    origem: 'contrato',
  })

  // Cliente 2 (Tech) - 3 pagas + 1 vencida há 45 dias + 1 aberta
  for (let i = 5; i >= 3; i--) {
    invoices.push({
      id: `inv-c2-${i}`,
      tenant_id: TENANT_ID,
      client_id: 'client-002',
      contract_id: 'contract-002',
      competencia: competencia(i),
      vencimento: vencimento(i, 15),
      valor_original: 1450,
      status: 'paga',
      origem: 'contrato',
    })
  }
  invoices.push({
    id: 'inv-c2-2',
    tenant_id: TENANT_ID,
    client_id: 'client-002',
    contract_id: 'contract-002',
    competencia: competencia(2),
    vencimento: format(subDays(new Date(), 45), 'yyyy-MM-dd'),
    valor_original: 1450,
    status: 'vencida',
    origem: 'contrato',
  })
  invoices.push({
    id: 'inv-c2-1',
    tenant_id: TENANT_ID,
    client_id: 'client-002',
    contract_id: 'contract-002',
    competencia: competencia(1),
    vencimento: format(subDays(new Date(), 15), 'yyyy-MM-dd'),
    valor_original: 1450,
    status: 'vencida',
    origem: 'contrato',
  })
  invoices.push({
    id: 'inv-c2-0',
    tenant_id: TENANT_ID,
    client_id: 'client-002',
    contract_id: 'contract-002',
    competencia: competencia(0),
    vencimento: format(addDays(new Date(), 15), 'yyyy-MM-dd'),
    valor_original: 1450,
    status: 'aberta',
    origem: 'contrato',
  })

  // Cliente 3 (ABC) - 2 pagas + 2 vencidas (60 e 30 dias)
  for (let i = 5; i >= 4; i--) {
    invoices.push({
      id: `inv-c3-${i}`,
      tenant_id: TENANT_ID,
      client_id: 'client-003',
      contract_id: 'contract-003',
      competencia: competencia(i),
      vencimento: vencimento(i, 5),
      valor_original: 620,
      status: 'paga',
      origem: 'contrato',
    })
  }
  invoices.push({
    id: 'inv-c3-3',
    tenant_id: TENANT_ID,
    client_id: 'client-003',
    contract_id: 'contract-003',
    competencia: competencia(3),
    vencimento: format(subDays(new Date(), 60), 'yyyy-MM-dd'),
    valor_original: 620,
    status: 'vencida',
    origem: 'contrato',
  })
  invoices.push({
    id: 'inv-c3-2',
    tenant_id: TENANT_ID,
    client_id: 'client-003',
    contract_id: 'contract-003',
    competencia: competencia(2),
    vencimento: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    valor_original: 620,
    status: 'vencida',
    origem: 'contrato',
  })
  invoices.push({
    id: 'inv-c3-0',
    tenant_id: TENANT_ID,
    client_id: 'client-003',
    contract_id: 'contract-003',
    competencia: competencia(0),
    vencimento: format(addDays(new Date(), 5), 'yyyy-MM-dd'),
    valor_original: 620,
    status: 'aberta',
    origem: 'contrato',
  })

  localStorage.setItem('vb_invoices', JSON.stringify(invoices))

  // --- Document Types ---
  const docTypes: DocumentType[] = [
    { id: 'dt-001', tenant_id: TENANT_ID, nome: 'Guia de Pagamento', essencial: true, tem_validade: true },
    { id: 'dt-002', tenant_id: TENANT_ID, nome: 'DARF', essencial: true, tem_validade: true },
    { id: 'dt-003', tenant_id: TENANT_ID, nome: 'Nota Fiscal', essencial: false },
    { id: 'dt-004', tenant_id: TENANT_ID, nome: 'Balancete', essencial: false },
    { id: 'dt-005', tenant_id: TENANT_ID, nome: 'Folha de Pagamento', essencial: true },
    { id: 'dt-006', tenant_id: TENANT_ID, nome: 'Contrato Social', essencial: true },
    { id: 'dt-007', tenant_id: TENANT_ID, nome: 'Alvará de Funcionamento', essencial: true, tem_validade: true },
    { id: 'dt-008', tenant_id: TENANT_ID, nome: 'Certidão Negativa', essencial: false, tem_validade: true },
  ]
  localStorage.setItem('vb_document_types', JSON.stringify(docTypes))

  // --- Folders ---
  const folders: Folder[] = []
  const folderTypes: Array<{ nome: string; tipo: 'fiscal' | 'dp' | 'contabil' | 'societario' | 'outros' }> = [
    { nome: 'Fiscal', tipo: 'fiscal' },
    { nome: 'Departamento Pessoal', tipo: 'dp' },
    { nome: 'Contábil', tipo: 'contabil' },
    { nome: 'Societário', tipo: 'societario' },
    { nome: 'Outros', tipo: 'outros' },
  ]

  const clientFolderIds: Record<string, Record<string, string>> = {}
  for (const client of [client1, client2, client3, client4]) {
    clientFolderIds[client.id] = {}
    for (const ft of folderTypes) {
      const fid = `folder-${client.id}-${ft.tipo}`
      clientFolderIds[client.id][ft.tipo] = fid
      folders.push({
        id: fid,
        tenant_id: TENANT_ID,
        client_id: client.id,
        parent_id: null,
        nome: ft.nome,
        tipo_padrao: ft.tipo,
        sistema: true,
      })
    }
  }
  localStorage.setItem('vb_folders', JSON.stringify(folders))

  // --- Documents (metadados apenas - sem arquivo real) ---
  const documents: Document[] = [
    {
      id: 'doc-001', tenant_id: TENANT_ID, client_id: 'client-001',
      folder_id: clientFolderIds['client-001']['fiscal'],
      type_id: 'dt-002', nome: `DARF IRPJ - ${format(new Date(), 'MMMM yyyy')}.pdf`,
      competencia: format(new Date(), 'yyyy-MM'), versao: 1, storage_key: 'doc-001',
      tamanho: 45000, mime: 'application/pdf',
      criado_por: 'user-colab', criado_em: subDays(new Date(), 1).toISOString(),
      provider: 'local', provider_file_id: 'doc-001', storage_status: 'ok',
    },
    {
      id: 'doc-002', tenant_id: TENANT_ID, client_id: 'client-001',
      folder_id: clientFolderIds['client-001']['dp'],
      type_id: 'dt-005', nome: `Folha Pagamento - ${format(new Date(), 'MMMM yyyy')}.xlsx`,
      competencia: format(new Date(), 'yyyy-MM'), versao: 1, storage_key: 'doc-002',
      tamanho: 120000, mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      criado_por: 'user-colab', criado_em: subDays(new Date(), 3).toISOString(),
      provider: 'local', provider_file_id: 'doc-002', storage_status: 'ok',
    },
    {
      id: 'doc-003', tenant_id: TENANT_ID, client_id: 'client-002',
      folder_id: clientFolderIds['client-002']['fiscal'],
      type_id: 'dt-001', nome: `Guia ISSQN - ${format(new Date(), 'MMMM yyyy')}.pdf`,
      competencia: format(new Date(), 'yyyy-MM'), versao: 1, storage_key: 'doc-003',
      tamanho: 38000, mime: 'application/pdf',
      criado_por: 'user-colab', criado_em: new Date().toISOString(),
      provider: 'local', provider_file_id: 'doc-003', storage_status: 'ok',
    },
    {
      id: 'doc-004', tenant_id: TENANT_ID, client_id: 'client-002',
      folder_id: clientFolderIds['client-002']['contabil'],
      type_id: 'dt-004', nome: `Balancete ${format(subMonths(new Date(), 1), 'MMMM yyyy')}.pdf`,
      competencia: format(subMonths(new Date(), 1), 'yyyy-MM'), versao: 1, storage_key: 'doc-004',
      tamanho: 95000, mime: 'application/pdf',
      criado_por: 'user-colab', criado_em: subDays(new Date(), 5).toISOString(),
      provider: 'local', provider_file_id: 'doc-004', storage_status: 'ok',
    },
    {
      id: 'doc-005', tenant_id: TENANT_ID, client_id: 'client-003',
      folder_id: clientFolderIds['client-003']['fiscal'],
      type_id: 'dt-002', nome: 'DARF PIS/COFINS - Agosto 2025.pdf',
      competencia: '2025-08', versao: 1, storage_key: 'doc-005',
      tamanho: 42000, mime: 'application/pdf',
      criado_por: 'user-colab', criado_em: '2025-08-12T11:00:00Z',
      provider: 'local', provider_file_id: 'doc-005', storage_status: 'ok',
    },
    {
      id: 'doc-006', tenant_id: TENANT_ID, client_id: 'client-003',
      folder_id: clientFolderIds['client-003']['societario'],
      type_id: 'dt-006', nome: 'Contrato Social - Alteração 2024.pdf',
      competencia: '2024-03', versao: 2, storage_key: 'doc-006',
      tamanho: 280000, mime: 'application/pdf',
      criado_por: 'user-colab', criado_em: '2024-03-15T09:00:00Z',
      provider: 'local', provider_file_id: 'doc-006', storage_status: 'ok',
    },
    // Exemplos de validade: vencido
    {
      id: 'doc-007', tenant_id: TENANT_ID, client_id: 'client-001',
      folder_id: clientFolderIds['client-001']['societario'],
      type_id: 'dt-007', nome: 'Alvará de Funcionamento 2024.pdf',
      competencia: '2024-01', versao: 1, storage_key: 'doc-007',
      tamanho: 62000, mime: 'application/pdf',
      criado_por: 'user-colab', criado_em: '2024-01-10T10:00:00Z',
      data_validade: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
      provider: 'local', provider_file_id: 'doc-007', storage_status: 'ok',
    },
    // Expirando em breve (15 dias)
    {
      id: 'doc-008', tenant_id: TENANT_ID, client_id: 'client-002',
      folder_id: clientFolderIds['client-002']['fiscal'],
      type_id: 'dt-008', nome: 'Certidão Negativa Federal.pdf',
      competencia: format(subMonths(new Date(), 6), 'yyyy-MM'),
      versao: 1, storage_key: 'doc-008',
      tamanho: 48000, mime: 'application/pdf',
      criado_por: 'user-colab', criado_em: format(subMonths(new Date(), 6), "yyyy-MM-dd'T'HH:mm:ss'Z'"),
      data_validade: format(addDays(new Date(), 15), 'yyyy-MM-dd'),
      provider: 'local', provider_file_id: 'doc-008', storage_status: 'ok',
    },
    // Válido por mais de 30 dias
    {
      id: 'doc-009', tenant_id: TENANT_ID, client_id: 'client-003',
      folder_id: clientFolderIds['client-003']['societario'],
      type_id: 'dt-007', nome: 'Alvará de Funcionamento 2026.pdf',
      competencia: format(new Date(), 'yyyy-MM'),
      versao: 1, storage_key: 'doc-009',
      tamanho: 65000, mime: 'application/pdf',
      criado_por: 'user-colab', criado_em: new Date().toISOString(),
      data_validade: format(addDays(new Date(), 120), 'yyyy-MM-dd'),
      provider: 'local', provider_file_id: 'doc-009', storage_status: 'ok',
    },
  ]
  localStorage.setItem('vb_documents', JSON.stringify(documents))

  // --- Billing Policy ---
  const policy: BillingPolicy = {
    id: 'policy-001',
    tenant_id: TENANT_ID,
    multa_pct: 2,
    juros_mes_pct: 1,
    indice_correcao: 'ipca',
    carencia_dias: 3,
    encargo_renegociacao_tipo: 'pct',
    encargo_renegociacao_valor: 5,
    encargo_teto: 500,
    parcelas_max: 12,
    desconto_avista_encargos_pct: 10,
    modo_acesso: 'parcial',
  }
  localStorage.setItem('vb_billing_policies', JSON.stringify([policy]))

  // --- StorageConnection padrão ---
  const storageConn: StorageConnection = {
    id: 'sc-001',
    escritorio_id: TENANT_ID,
    provider: 'local',
    status: 'conectado',
    conectado_por: 'user-admin',
    conectado_em: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  }
  localStorage.setItem('vb_storage_connections', JSON.stringify([storageConn]))

  // --- Ficha Rápida: Blocos e Campos para Padaria São Bento (client-001) ---
  const fichaBlocos: FichaBloco[] = [
    {
      id: 'ficha-bloco-001',
      tenant_id: TENANT_ID,
      client_id: 'client-001',
      titulo: 'Receita Federal',
      ordem: 0,
    },
    {
      id: 'ficha-bloco-002',
      tenant_id: TENANT_ID,
      client_id: 'client-001',
      titulo: 'Simples Nacional',
      ordem: 1,
    },
  ]
  localStorage.setItem('vb_ficha_blocos', JSON.stringify(fichaBlocos))

  const fichaCampos: FichaCampo[] = [
    // Bloco: Receita Federal
    {
      id: 'ficha-campo-001',
      tenant_id: TENANT_ID,
      bloco_id: 'ficha-bloco-001',
      rotulo: 'CNPJ',
      valor: '11222333000144',
      tipo: 'cnpj',
      sensivel: false,
      ordem: 0,
    },
    {
      id: 'ficha-campo-002',
      tenant_id: TENANT_ID,
      bloco_id: 'ficha-bloco-001',
      rotulo: 'Código de Acesso e-CAC',
      valor: 'SB2024#ecac',
      tipo: 'senha',
      sensivel: true,
      ordem: 1,
    },
    {
      id: 'ficha-campo-003',
      tenant_id: TENANT_ID,
      bloco_id: 'ficha-bloco-001',
      rotulo: 'Link e-CAC',
      valor: 'https://cav.receita.fazenda.gov.br',
      tipo: 'url',
      sensivel: false,
      ordem: 2,
    },
    // Bloco: Simples Nacional
    {
      id: 'ficha-campo-004',
      tenant_id: TENANT_ID,
      bloco_id: 'ficha-bloco-002',
      rotulo: 'CNPJ',
      valor: '11222333000144',
      tipo: 'cnpj',
      sensivel: false,
      ordem: 0,
    },
    {
      id: 'ficha-campo-005',
      tenant_id: TENANT_ID,
      bloco_id: 'ficha-bloco-002',
      rotulo: 'Código de Acesso PGDAS',
      valor: 'SB2024#pgdas',
      tipo: 'senha',
      sensivel: true,
      ordem: 1,
    },
    {
      id: 'ficha-campo-006',
      tenant_id: TENANT_ID,
      bloco_id: 'ficha-bloco-002',
      rotulo: 'Link PGDAS',
      valor: 'https://www8.receita.fazenda.gov.br/SimplesNacional',
      tipo: 'url',
      sensivel: false,
      ordem: 2,
    },
  ]
  localStorage.setItem('vb_ficha_campos', JSON.stringify(fichaCampos))

  // --- Fluxos (templates de processo) ---

  const checklistCalcularPGDAS: ChecklistItemTemplate[] = [
    { id: 'cl-pgdas-1', ordem: 1, nome: 'Acessar a plataforma (e-CAC)' },
    { id: 'cl-pgdas-2', ordem: 2, nome: 'Selecionar tipo de acesso (Direto / Procuração)' },
    { id: 'cl-pgdas-3', ordem: 3, nome: 'Realizar lançamentos / Conferir faturamento' },
    { id: 'cl-pgdas-4', ordem: 4, nome: 'Transmitir PGDAS-D' },
  ]

  const checklistGerarDAS: ChecklistItemTemplate[] = [
    { id: 'cl-das-1', ordem: 1, nome: 'Acessar o portal e-CAC' },
    { id: 'cl-das-2', ordem: 2, nome: 'Navegar até a área do PGDAS' },
    { id: 'cl-das-3', ordem: 3, nome: 'Gerar a DAS' },
    { id: 'cl-das-4', ordem: 4, nome: 'Salvar e enviar ao cliente' },
  ]

  const fluxos: Fluxo[] = [
    { id: 'flx-001', tenant_id: TENANT_ID, nome: 'PGDAS-D', categoria: 'fiscal', prazo_dias_padrao: 0, ativo: true },
    { id: 'flx-002', tenant_id: TENANT_ID, nome: 'DCTFWeb', categoria: 'fiscal', prazo_dias_padrao: 0, ativo: true },
    { id: 'flx-003', tenant_id: TENANT_ID, nome: 'DEFIS', categoria: 'fiscal', prazo_dias_padrao: 0, ativo: true },
    { id: 'flx-004', tenant_id: TENANT_ID, nome: 'Alteração de Contrato Social', descricao: 'Alteração de dados societários na Junta Comercial', categoria: 'societario', prazo_dias_padrao: 15, valor_sugerido: 450, ativo: true },
    { id: 'flx-005', tenant_id: TENANT_ID, nome: 'Abertura de Empresa', descricao: 'Constituição de nova pessoa jurídica', categoria: 'societario', prazo_dias_padrao: 25, valor_sugerido: 900, ativo: true },
    { id: 'flx-006', tenant_id: TENANT_ID, nome: 'Declaração IRPF', descricao: 'Elaboração e transmissão da Declaração de Ajuste Anual', categoria: 'fiscal', prazo_dias_padrao: 10, valor_sugerido: 250, ativo: true },
    { id: 'flx-007', tenant_id: TENANT_ID, nome: 'Admissão de Funcionário', descricao: 'Registro de novo colaborador na empresa', categoria: 'dp', prazo_dias_padrao: 5, valor_sugerido: 80, ativo: true },
  ]
  localStorage.setItem('vb_fluxos', JSON.stringify(fluxos))

  const fluxoTarefas: FluxoTarefa[] = [
    // PGDAS-D (flx-001)
    { id: 'ft-001', tenant_id: TENANT_ID, fluxo_id: 'flx-001', ordem: 1, nome: 'Recolher informações do cliente', prazo_relativo_dias: -10 },
    { id: 'ft-002', tenant_id: TENANT_ID, fluxo_id: 'flx-001', ordem: 2, nome: 'Calcular e transmitir PGDAS', prazo_relativo_dias: -4, checklist: checklistCalcularPGDAS },
    { id: 'ft-003', tenant_id: TENANT_ID, fluxo_id: 'flx-001', ordem: 3, nome: 'Gerar guia DAS', prazo_relativo_dias: -2, checklist: checklistGerarDAS },
    { id: 'ft-004', tenant_id: TENANT_ID, fluxo_id: 'flx-001', ordem: 4, nome: 'Confirmar pagamento', prazo_relativo_dias: 0 },
    // DCTFWeb (flx-002)
    { id: 'ft-005', tenant_id: TENANT_ID, fluxo_id: 'flx-002', ordem: 1, nome: 'Levantar dados da folha', prazo_relativo_dias: -7 },
    { id: 'ft-006', tenant_id: TENANT_ID, fluxo_id: 'flx-002', ordem: 2, nome: 'Transmitir DCTFWeb', prazo_relativo_dias: -2 },
    // Alteração Contrato Social (flx-004)
    { id: 'ft-010', tenant_id: TENANT_ID, fluxo_id: 'flx-004', ordem: 1, nome: 'Coletar documentos dos sócios', prazo_relativo_dias: -12 },
    { id: 'ft-011', tenant_id: TENANT_ID, fluxo_id: 'flx-004', ordem: 2, nome: 'Elaborar minuta do contrato social', prazo_relativo_dias: -8 },
    { id: 'ft-012', tenant_id: TENANT_ID, fluxo_id: 'flx-004', ordem: 3, nome: 'Registro na Junta Comercial', prazo_relativo_dias: -3 },
    { id: 'ft-013', tenant_id: TENANT_ID, fluxo_id: 'flx-004', ordem: 4, nome: 'Entregar ao cliente', prazo_relativo_dias: 0 },
    // Abertura de Empresa (flx-005)
    { id: 'ft-014', tenant_id: TENANT_ID, fluxo_id: 'flx-005', ordem: 1, nome: 'Pesquisa de viabilidade de nome', prazo_relativo_dias: -22 },
    { id: 'ft-015', tenant_id: TENANT_ID, fluxo_id: 'flx-005', ordem: 2, nome: 'Elaborar contrato social', prazo_relativo_dias: -18 },
    { id: 'ft-016', tenant_id: TENANT_ID, fluxo_id: 'flx-005', ordem: 3, nome: 'Registro na Junta Comercial', prazo_relativo_dias: -12 },
    { id: 'ft-017', tenant_id: TENANT_ID, fluxo_id: 'flx-005', ordem: 4, nome: 'Inscrição CNPJ na Receita Federal', prazo_relativo_dias: -5 },
    { id: 'ft-018', tenant_id: TENANT_ID, fluxo_id: 'flx-005', ordem: 5, nome: 'Alvará e licenças municipais', prazo_relativo_dias: 0 },
    // Declaração IRPF (flx-006)
    { id: 'ft-019', tenant_id: TENANT_ID, fluxo_id: 'flx-006', ordem: 1, nome: 'Coletar documentos (informes, notas)', prazo_relativo_dias: -8 },
    { id: 'ft-020', tenant_id: TENANT_ID, fluxo_id: 'flx-006', ordem: 2, nome: 'Preencher declaração', prazo_relativo_dias: -4 },
    { id: 'ft-021', tenant_id: TENANT_ID, fluxo_id: 'flx-006', ordem: 3, nome: 'Revisar com cliente', prazo_relativo_dias: -2 },
    { id: 'ft-022', tenant_id: TENANT_ID, fluxo_id: 'flx-006', ordem: 4, nome: 'Transmitir à Receita Federal', prazo_relativo_dias: 0 },
    // Admissão de Funcionário (flx-007)
    { id: 'ft-023', tenant_id: TENANT_ID, fluxo_id: 'flx-007', ordem: 1, nome: 'Coletar documentos e exame admissional', prazo_relativo_dias: -4 },
    { id: 'ft-024', tenant_id: TENANT_ID, fluxo_id: 'flx-007', ordem: 2, nome: 'Registrar na CTPS e e-Social', prazo_relativo_dias: -1 },
    { id: 'ft-025', tenant_id: TENANT_ID, fluxo_id: 'flx-007', ordem: 3, nome: 'Configurar na folha de pagamento', prazo_relativo_dias: 0 },
  ]
  localStorage.setItem('vb_fluxo_tarefas', JSON.stringify(fluxoTarefas))

  // --- Rotinas ---

  const rotinas: Rotina[] = [
    { id: 'rot-001', tenant_id: TENANT_ID, nome: 'PGDAS-D', fluxo_id: 'flx-001', periodicidade: 'mensal', regra_vencimento: JSON.stringify({ tipo: 'dia_mes_seguinte', dia: 20 }), regime: 'Simples Nacional', ativo: true, criado_em: '2026-01-01T00:00:00.000Z' },
    { id: 'rot-002', tenant_id: TENANT_ID, nome: 'DCTFWeb', fluxo_id: 'flx-002', periodicidade: 'mensal', regra_vencimento: JSON.stringify({ tipo: 'dia_mes_seguinte', dia: 15 }), ativo: true, criado_em: '2026-01-01T00:00:00.000Z' },
    { id: 'rot-003', tenant_id: TENANT_ID, nome: 'DEFIS', fluxo_id: 'flx-003', periodicidade: 'anual', regra_vencimento: JSON.stringify({ tipo: 'dia_mes_seguinte', dia: 31 }), regime: 'Simples Nacional', ativo: true, criado_em: '2026-01-01T00:00:00.000Z' },
  ]
  localStorage.setItem('vb_rotinas', JSON.stringify(rotinas))

  const rotinaClientes: RotinaCliente[] = [
    { id: 'rc-001', tenant_id: TENANT_ID, rotina_id: 'rot-001', cliente_id: 'client-001', ativo: true, data_inicio: '2026-01-01' },
    { id: 'rc-002', tenant_id: TENANT_ID, rotina_id: 'rot-001', cliente_id: 'client-003', ativo: true, data_inicio: '2026-01-01' },
  ]
  localStorage.setItem('vb_rotina_clientes', JSON.stringify(rotinaClientes))

  const ciclos: Ciclo[] = [
    { id: 'cic-001', tenant_id: TENANT_ID, rotina_id: 'rot-001', periodo: '2026-09', data_vencimento: '2026-10-20', status: 'aberta' },
  ]
  localStorage.setItem('vb_ciclos', JSON.stringify(ciclos))

  // --- Ocorrências e Tarefas ---

  const ocorrencias: Ocorrencia[] = [
    {
      id: 'occ-001', tenant_id: TENANT_ID, titulo: 'PGDAS-D — 2026-09',
      cliente_id: 'client-001', origem: 'rotina', fluxo_id: 'flx-001', rotina_id: 'rot-001', ciclo_id: 'cic-001',
      data_prevista: '2026-10-20', status: 'em_andamento', criado_por: 'system', criado_em: '2026-10-01T00:00:00.000Z',
    },
    {
      id: 'occ-002', tenant_id: TENANT_ID, titulo: 'PGDAS-D — 2026-09',
      cliente_id: 'client-003', origem: 'rotina', fluxo_id: 'flx-001', rotina_id: 'rot-001', ciclo_id: 'cic-001',
      data_prevista: '2026-10-20', status: 'em_andamento', criado_por: 'system', criado_em: '2026-10-01T00:00:00.000Z',
    },
    {
      id: 'occ-003', tenant_id: TENANT_ID, titulo: 'Alteração de Contrato Social — Entrada de novo sócio',
      cliente_id: 'client-001', origem: 'fluxo', fluxo_id: 'flx-004', categoria: 'societario', valor: 450,
      data_solicitacao: '2026-09-15', data_prevista: '2026-09-30', status: 'em_andamento',
      criado_por: 'user-admin', criado_em: '2026-09-15T09:00:00.000Z',
    },
  ]
  localStorage.setItem('vb_ocorrencias', JSON.stringify(ocorrencias))

  const tarefas: Tarefa[] = [
    // occ-001: Padaria PGDAS-D Set/2026 (etapas 1+2 concluídas)
    { id: 'tar-001', tenant_id: TENANT_ID, ocorrencia_id: 'occ-001', fluxo_tarefa_id: 'ft-001', ordem: 1, nome: 'Recolher informações do cliente', data_prevista: '2026-10-10', status: 'concluida', data_conclusao: '2026-10-09' },
    { id: 'tar-002', tenant_id: TENANT_ID, ocorrencia_id: 'occ-001', fluxo_tarefa_id: 'ft-002', ordem: 2, nome: 'Calcular e transmitir PGDAS', data_prevista: '2026-10-16', status: 'concluida', data_conclusao: '2026-10-15' },
    { id: 'tar-003', tenant_id: TENANT_ID, ocorrencia_id: 'occ-001', fluxo_tarefa_id: 'ft-003', ordem: 3, nome: 'Gerar guia DAS', data_prevista: '2026-10-18', status: 'pendente' },
    { id: 'tar-004', tenant_id: TENANT_ID, ocorrencia_id: 'occ-001', fluxo_tarefa_id: 'ft-004', ordem: 4, nome: 'Confirmar pagamento', data_prevista: '2026-10-20', status: 'pendente' },
    // occ-002: ABC PGDAS-D Set/2026 (etapa 1 concluída)
    { id: 'tar-005', tenant_id: TENANT_ID, ocorrencia_id: 'occ-002', fluxo_tarefa_id: 'ft-001', ordem: 1, nome: 'Recolher informações do cliente', data_prevista: '2026-10-10', status: 'concluida', data_conclusao: '2026-10-10' },
    { id: 'tar-006', tenant_id: TENANT_ID, ocorrencia_id: 'occ-002', fluxo_tarefa_id: 'ft-002', ordem: 2, nome: 'Calcular e transmitir PGDAS', data_prevista: '2026-10-16', status: 'pendente' },
    { id: 'tar-007', tenant_id: TENANT_ID, ocorrencia_id: 'occ-002', fluxo_tarefa_id: 'ft-003', ordem: 3, nome: 'Gerar guia DAS', data_prevista: '2026-10-18', status: 'pendente' },
    { id: 'tar-008', tenant_id: TENANT_ID, ocorrencia_id: 'occ-002', fluxo_tarefa_id: 'ft-004', ordem: 4, nome: 'Confirmar pagamento', data_prevista: '2026-10-20', status: 'pendente' },
    // occ-003: Alteração Contrato Social (etapa 1 concluída, etapa 2 em andamento)
    { id: 'tar-009', tenant_id: TENANT_ID, ocorrencia_id: 'occ-003', fluxo_tarefa_id: 'ft-010', ordem: 1, nome: 'Coletar documentos dos sócios', data_prevista: '2026-09-18', status: 'concluida', data_conclusao: '2026-09-17' },
    { id: 'tar-010', tenant_id: TENANT_ID, ocorrencia_id: 'occ-003', fluxo_tarefa_id: 'ft-011', ordem: 2, nome: 'Elaborar minuta do contrato social', data_prevista: '2026-09-22', status: 'em_andamento' },
    { id: 'tar-011', tenant_id: TENANT_ID, ocorrencia_id: 'occ-003', fluxo_tarefa_id: 'ft-012', ordem: 3, nome: 'Registro na Junta Comercial', data_prevista: '2026-09-27', status: 'pendente' },
    { id: 'tar-012', tenant_id: TENANT_ID, ocorrencia_id: 'occ-003', fluxo_tarefa_id: 'ft-013', ordem: 4, nome: 'Entregar ao cliente', data_prevista: '2026-09-30', status: 'pendente' },
  ]
  localStorage.setItem('vb_tarefas', JSON.stringify(tarefas))

  // --- Guias e Recolhimentos ---
  const guias: GuiaRecolhimento[] = [
    // DAS Padaria São Bento — paga
    {
      id: 'guia-001', tenant_id: TENANT_ID, cliente_id: 'client-001',
      tipo: 'das', descricao: 'DAS ' + competencia(1),
      competencia: competencia(1), vencimento: vencimento(1, 20),
      valor: 892.50, status: 'paga', origem: 'manual',
      segunda_via_status: 'nao_solicitada',
      pago_em: vencimento(1, 18), pago_valor: 892.50, pago_por: 'user-colab',
      codigo_receita: '0651', periodo_apuracao: competencia(1),
      criado_em: vencimento(1, 15), criado_por: 'user-colab',
    },
    // DAS Padaria São Bento — emitida (mês atual)
    {
      id: 'guia-002', tenant_id: TENANT_ID, cliente_id: 'client-001',
      tipo: 'das', descricao: 'DAS ' + competencia(0),
      competencia: competencia(0), vencimento: format(addDays(new Date(), 12), 'yyyy-MM-dd'),
      valor: 1024.80, status: 'emitida', origem: 'manual',
      segunda_via_status: 'nao_solicitada',
      codigo_receita: '0651', periodo_apuracao: competencia(0),
      linha_digitavel: '07690.00018 10000.100510 81600.000025 1 00000000000000',
      criado_em: format(subDays(new Date(), 5), 'yyyy-MM-dd'), criado_por: 'user-colab',
    },
    // FGTS Padaria — emitida
    {
      id: 'guia-003', tenant_id: TENANT_ID, cliente_id: 'client-001',
      tipo: 'fgts', descricao: 'FGTS ' + competencia(0),
      competencia: competencia(0), vencimento: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
      valor: 340.00, status: 'emitida', origem: 'manual',
      segunda_via_status: 'nao_solicitada',
      periodo_apuracao: competencia(0),
      criado_em: format(subDays(new Date(), 3), 'yyyy-MM-dd'), criado_por: 'user-colab',
    },
    // DARF Tech Solutions — vencida
    {
      id: 'guia-004', tenant_id: TENANT_ID, cliente_id: 'client-002',
      tipo: 'darf', descricao: 'DARF IRPJ ' + competencia(2),
      competencia: competencia(2), vencimento: vencimento(2, 20),
      valor: 3200.00, valor_multa: 64.00, valor_juros: 48.00,
      status: 'vencida', origem: 'manual',
      segunda_via_status: 'solicitada',
      segunda_via_solicitada_em: format(subDays(new Date(), 5), 'yyyy-MM-dd'),
      codigo_receita: '2362', periodo_apuracao: competencia(2),
      numero_referencia: 'TRIM-2026-3',
      criado_em: vencimento(2, 10), criado_por: 'user-admin',
      atualizado_em: format(subDays(new Date(), 5), 'yyyy-MM-dd'),
    },
    // Bombeiros ABC Comércio — aguardando emissão
    {
      id: 'guia-005', tenant_id: TENANT_ID, cliente_id: 'client-003',
      tipo: 'bombeiros', descricao: 'Taxa Vistoria Bombeiros 2026',
      competencia: competencia(0), vencimento: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
      valor: 280.00, status: 'aguardando_emissao', origem: 'manual',
      segunda_via_status: 'nao_solicitada',
      observacoes: 'Aguardando vistoria agendada para próximo mês',
      criado_em: format(subDays(new Date(), 2), 'yyyy-MM-dd'), criado_por: 'user-admin',
    },
    // ISS ABC Comércio — paga
    {
      id: 'guia-006', tenant_id: TENANT_ID, cliente_id: 'client-003',
      tipo: 'iss', descricao: 'ISS ' + competencia(1),
      competencia: competencia(1), vencimento: vencimento(1, 10),
      valor: 150.00, status: 'paga', origem: 'manual',
      segunda_via_status: 'nao_solicitada',
      pago_em: vencimento(1, 9), pago_valor: 150.00, pago_por: 'user-colab',
      criado_em: vencimento(1, 5), criado_por: 'user-colab',
    },
    // DARF CSLL Tech Solutions — emitida
    {
      id: 'guia-007', tenant_id: TENANT_ID, cliente_id: 'client-002',
      tipo: 'darf', descricao: 'DARF CSLL ' + competencia(0),
      competencia: competencia(0), vencimento: format(addDays(new Date(), 18), 'yyyy-MM-dd'),
      valor: 980.00, status: 'emitida', origem: 'manual',
      segunda_via_status: 'nao_solicitada',
      codigo_receita: '2484', periodo_apuracao: competencia(0),
      linha_digitavel: '85890000009 80000000001 02430000054 6 93040000098000',
      criado_em: format(subDays(new Date(), 4), 'yyyy-MM-dd'), criado_por: 'user-admin',
    },
    // DAS ABC Comércio — emitida
    {
      id: 'guia-008', tenant_id: TENANT_ID, cliente_id: 'client-003',
      tipo: 'das', descricao: 'DAS ' + competencia(0),
      competencia: competencia(0), vencimento: format(addDays(new Date(), 15), 'yyyy-MM-dd'),
      valor: 420.30, status: 'emitida', origem: 'manual',
      segunda_via_status: 'nao_solicitada',
      codigo_receita: '0651', periodo_apuracao: competencia(0),
      criado_em: format(subDays(new Date(), 6), 'yyyy-MM-dd'), criado_por: 'user-colab',
    },
  ]
  localStorage.setItem('vb_guias', JSON.stringify(guias))

  // --- Endereços ---
  const enderecos: ClienteEndereco[] = [
    {
      id: 'end-001', tenant_id: TENANT_ID, cliente_id: 'client-001',
      tipo: 'fiscal', cep: '01310-100', logradouro: 'Av. Paulista', numero: '1000',
      complemento: 'Sala 5', bairro: 'Bela Vista', cidade: 'São Paulo', estado: 'SP', principal: true,
    },
    {
      id: 'end-002', tenant_id: TENANT_ID, cliente_id: 'client-001',
      tipo: 'correspondencia', cep: '01310-200', logradouro: 'Rua Augusta', numero: '200',
      bairro: 'Consolação', cidade: 'São Paulo', estado: 'SP', principal: false,
    },
    {
      id: 'end-003', tenant_id: TENANT_ID, cliente_id: 'client-002',
      tipo: 'fiscal', cep: '04538-132', logradouro: 'Av. Brigadeiro Faria Lima', numero: '3900',
      bairro: 'Itaim Bibi', cidade: 'São Paulo', estado: 'SP', principal: true,
    },
  ]
  localStorage.setItem('vb_cliente_enderecos', JSON.stringify(enderecos))

  // --- Contatos ---
  const contatos: ClienteContato[] = [
    {
      id: 'ct-001', tenant_id: TENANT_ID, cliente_id: 'client-001',
      nome: 'Carlos Mendes', setor: 'Financeiro', cargo: 'Gerente',
      telefone: '5511933331111', email: 'carlos@padariasbento.com', principal: true,
    },
    {
      id: 'ct-002', tenant_id: TENANT_ID, cliente_id: 'client-001',
      nome: 'Ana Lima', setor: 'Administrativo', cargo: 'Assistente',
      telefone: '5511933332222', email: 'ana@padariasbento.com', principal: false,
    },
    {
      id: 'ct-003', tenant_id: TENANT_ID, cliente_id: 'client-002',
      nome: 'Roberto Silva', setor: 'Diretoria', cargo: 'Sócio',
      telefone: '5511988887777', email: 'roberto@techsolutions.com', principal: true,
    },
  ]
  localStorage.setItem('vb_cliente_contatos', JSON.stringify(contatos))

  // --- CNAEs ---
  const cnaes: ClienteCnae[] = [
    {
      id: 'cnae-001', tenant_id: TENANT_ID, cliente_id: 'client-001',
      codigo: '1091-1/02', descricao: 'Fabricação de produtos de padaria e confeitaria com predominância de produção própria', principal: true,
    },
    {
      id: 'cnae-002', tenant_id: TENANT_ID, cliente_id: 'client-001',
      codigo: '4721-1/02', descricao: 'Padaria, confeitaria e outros comércios varejistas de pães', principal: false,
    },
    {
      id: 'cnae-003', tenant_id: TENANT_ID, cliente_id: 'client-002',
      codigo: '6209-1/00', descricao: 'Suporte técnico, manutenção e outros serviços em tecnologia da informação', principal: true,
    },
  ]
  localStorage.setItem('vb_cliente_cnaes', JSON.stringify(cnaes))

  // --- App Store ---

  const apps: App[] = [
    {
      id: 'app-cert-digital',
      slug: 'certificado-digital',
      nome: 'Certificado Digital',
      descricao: 'Armazene certificados, acompanhe vencimentos e solicite renovação com antecedência.',
      descricao_longa: 'O app Certificado Digital centraliza o controle de todos os certificados A1, A3, NF-e, e-CNPJ e e-CPF dos seus clientes em um único painel.\n\nReceba alertas automáticos quando um certificado está próximo do vencimento — com 90, 60 e 30 dias de antecedência — e crie ocorrências de renovação com um único clique, diretamente integradas ao fluxo de tarefas do VisionBiz.\n\nNunca mais deixe um cliente ser surpreendido por um certificado vencido. Ganhe tempo, reduza erros e ofereça um serviço proativo que diferencia o seu escritório.',
      tipo: 'embarcado',
      icone: '🔐',
      categoria: 'Compliance',
      tags: ['certificado', 'segurança', 'A1', 'A3', 'NF-e', 'vencimento', 'renovação'],
      recursos: [
        'Painel unificado de todos os certificados digitais dos clientes',
        'Alertas automáticos com 90, 60 e 30 dias antes do vencimento',
        'Suporte a A1, A3, NF-e, e-CNPJ e e-CPF',
        'Criação automática de ocorrência e tarefa de renovação',
        'Histórico completo por cliente e tipo de certificado',
        'Card de vencimentos no dashboard do escritório',
      ],
      screenshots: [
        'https://placehold.co/800x500/EEF2FF/4F46E5?text=Painel+de+Certificados',
        'https://placehold.co/800x500/F0FDF4/16A34A?text=Alertas+de+Vencimento',
        'https://placehold.co/800x500/FFF7ED/EA580C?text=Aba+na+Ficha+do+Cliente',
      ],
      desenvolvedor: 'VisionBiz',
      avaliacao: 4.8,
      instalacoes_count: 234,
      destaque: true,
      status: 'publicado',
      criado_em: '2026-01-01T00:00:00Z',
    },
    {
      id: 'app-ondesc',
      slug: 'ondesc',
      nome: 'OnDesc',
      descricao: 'Conecte seus clientes a descontos em energia elétrica e ganhe comissão por lead.',
      descricao_longa: 'O OnDesc conecta escritórios contábeis e seus clientes empresariais ao mercado livre de energia, onde empresas podem reduzir em até 35% o custo com energia elétrica.\n\nVocê configura o app no VisionBiz e cada cliente pode simular e ativar o desconto diretamente pelo portal. Para cada lead qualificado, você recebe comissão — sem nenhum custo mensal.\n\nO modelo é simples: você agrega valor ao cliente, diversifica a receita do escritório e não precisa entender nada de energia.',
      tipo: 'conectado',
      icone: '⚡',
      categoria: 'Benefícios',
      tags: ['energia', 'desconto', 'comissão', 'benefícios', 'mercado livre', 'lead'],
      recursos: [
        'Simulação de economia de energia em segundos',
        'Proposta automática por WhatsApp ou e-mail',
        'Acompanhamento de leads e comissões em tempo real',
        'Sem mensalidade — 100% baseado em resultado',
        'Painel dedicado no portal do cliente',
        'Suporte a CNPJ com consumo acima de 500 kWh/mês',
      ],
      screenshots: [
        'https://placehold.co/800x500/FEFCE8/CA8A04?text=Simulador+de+Energia',
        'https://placehold.co/800x500/F0FDF4/16A34A?text=Painel+de+Comissões',
        'https://placehold.co/800x500/EFF6FF/2563EB?text=Portal+do+Cliente',
      ],
      desenvolvedor: 'OnDesc Energia',
      site_desenvolvedor: 'https://ondesc.com.br',
      avaliacao: 4.5,
      instalacoes_count: 89,
      destaque: true,
      status: 'publicado',
      criado_em: '2026-03-01T00:00:00Z',
    },
    {
      id: 'app-nf-facil',
      slug: 'nota-fiscal-facil',
      nome: 'Nota Fiscal Fácil',
      descricao: 'Emita NFS-e e NF-e diretamente pelo VisionBiz, sem acessar outros sistemas.',
      descricao_longa: 'Emissão de notas fiscais de serviço (NFS-e) e produto (NF-e) totalmente integrada ao fluxo de contratos e cobranças do VisionBiz. Suporte a mais de 500 municípios brasileiros.',
      tipo: 'conectado',
      icone: '🧾',
      categoria: 'Fiscal',
      tags: ['nota fiscal', 'NFS-e', 'NF-e', 'fiscal', 'tributário'],
      recursos: [
        'Emissão de NFS-e para mais de 500 municípios',
        'Integração direta com contratos e cobranças',
        'Envio automático da nota ao cliente por e-mail',
        'Cancelamento e substituição de notas',
        'Relatório fiscal por período e por cliente',
      ],
      desenvolvedor: 'VisionBiz',
      avaliacao: 0,
      instalacoes_count: 0,
      destaque: false,
      status: 'em_revisao',
      criado_em: '2026-06-01T00:00:00Z',
    },
    {
      id: 'app-socios',
      slug: 'gestao-socios',
      nome: 'Gestão de Sócios',
      descricao: 'Mapa societário completo com histórico de alterações, procuradores e controle de participação.',
      descricao_longa: 'Controle societário integrado ao cadastro do cliente. Registre sócios, administradores, procuradores e histórico de alterações contratuais em um único lugar.',
      tipo: 'embarcado',
      icone: '👥',
      categoria: 'Societário',
      tags: ['sócios', 'societário', 'contrato social', 'procuração', 'quadro societário'],
      recursos: [
        'Quadro societário com histórico de alterações',
        'Gestão de procuradores e representantes legais',
        'Controle de participação percentual',
        'Alertas de vencimento de mandatos',
        'Exportação para PDF e integração com contratos',
      ],
      desenvolvedor: 'VisionBiz',
      avaliacao: 0,
      instalacoes_count: 0,
      destaque: false,
      status: 'em_revisao',
      criado_em: '2026-06-01T00:00:00Z',
    },
  ]
  localStorage.setItem('vb_apps', JSON.stringify(apps))

  const appVersions: AppVersion[] = [
    {
      id: 'appv-cert-1',
      app_id: 'app-cert-digital',
      versao: '1.0.0',
      manifesto: {
        slug: 'certificado-digital',
        nome: 'Certificado Digital',
        tipo: 'embarcado',
        versao: '1.0.0',
        descricao: 'Armazene certificados, acompanhe vencimentos e solicite renovação com antecedência.',
        icone: '🔐',
        categoria: 'Compliance',
        escopos: ['clientes:read', 'documentos:read', 'documentos:write', 'financeiro:write', 'tarefas:write', 'notificacoes:send'],
        slots: ['cliente.aba', 'dashboard.card', 'tarefas.gerador'],
        eventos_assinados: ['cliente.criado', 'cobranca.paga'],
        planos: [
          { id: 'cert-gratuito', nome: 'Controle de vencimentos', tipo_cobranca: 'gratuito', valor: 0 },
          { id: 'cert-renovacao', nome: 'Emissão / Renovação', tipo_cobranca: 'por_uso', valor: null },
        ],
        comissao_padrao_sugerida: { tipo: 'percentual' },
      },
      publicado_em: '2026-01-01T00:00:00Z',
    },
    {
      id: 'appv-ondesc-1',
      app_id: 'app-ondesc',
      versao: '1.0.0',
      manifesto: {
        slug: 'ondesc',
        nome: 'OnDesc',
        tipo: 'conectado',
        versao: '1.0.0',
        descricao: 'Conecte seus clientes a descontos em energia elétrica e ganhe comissão por lead.',
        icone: '⚡',
        categoria: 'Benefícios',
        escopos: ['clientes:read', 'notificacoes:send'],
        slots: ['dashboard.card', 'cliente.aba'],
        eventos_assinados: ['cliente.criado'],
        planos: [
          { id: 'ondesc-gratuito', nome: 'Gratuito', tipo_cobranca: 'gratuito', valor: 0 },
        ],
        comissao_padrao_sugerida: { tipo: 'fixo' },
      },
      publicado_em: '2026-03-01T00:00:00Z',
    },
  ]
  localStorage.setItem('vb_app_versions', JSON.stringify(appVersions))

  const appPlans: AppPlan[] = [
    { id: 'cert-gratuito', app_id: 'app-cert-digital', nome: 'Controle de vencimentos', tipo_cobranca: 'gratuito', valor: 0 },
    { id: 'cert-renovacao', app_id: 'app-cert-digital', nome: 'Emissão / Renovação', tipo_cobranca: 'por_uso', valor: null },
    { id: 'ondesc-gratuito', app_id: 'app-ondesc', nome: 'Gratuito', tipo_cobranca: 'gratuito', valor: 0 },
  ]
  localStorage.setItem('vb_app_plans', JSON.stringify(appPlans))

  // tenant-001 já tem certificado-digital instalado (app piloto)
  const appInstallations: AppInstallation[] = [
    {
      id: 'inst-cert-t001',
      app_id: 'app-cert-digital',
      app_version_id: 'appv-cert-1',
      escritorio_id: TENANT_ID,
      instalado_por: 'user-admin-001',
      status: 'ativa',
      instalado_em: '2026-01-15T10:00:00Z',
    },
  ]
  localStorage.setItem('vb_app_installations', JSON.stringify(appInstallations))

  const appGrants: AppGrant[] = [
    { id: 'grant-cert-1', installation_id: 'inst-cert-t001', escopo: 'clientes:read', concedido_em: '2026-01-15T10:00:00Z' },
    { id: 'grant-cert-2', installation_id: 'inst-cert-t001', escopo: 'documentos:read', concedido_em: '2026-01-15T10:00:00Z' },
    { id: 'grant-cert-3', installation_id: 'inst-cert-t001', escopo: 'documentos:write', concedido_em: '2026-01-15T10:00:00Z' },
    { id: 'grant-cert-4', installation_id: 'inst-cert-t001', escopo: 'financeiro:write', concedido_em: '2026-01-15T10:00:00Z' },
    { id: 'grant-cert-5', installation_id: 'inst-cert-t001', escopo: 'tarefas:write', concedido_em: '2026-01-15T10:00:00Z' },
    { id: 'grant-cert-6', installation_id: 'inst-cert-t001', escopo: 'notificacoes:send', concedido_em: '2026-01-15T10:00:00Z' },
  ]
  localStorage.setItem('vb_app_grants', JSON.stringify(appGrants))

  const appVisibility: AppVisibility[] = [
    { id: 'vis-cert-t001', escritorio_id: TENANT_ID, app_id: 'app-cert-digital', visivel: true, destaque: true },
    { id: 'vis-ondesc-t001', escritorio_id: TENANT_ID, app_id: 'app-ondesc', visivel: true, destaque: false },
  ]
  localStorage.setItem('vb_app_visibility', JSON.stringify(appVisibility))

  // --- Certificados Digitais (app piloto) ---
  const hoje = new Date()
  function addDiasStr(d: number): string {
    const dt = new Date(hoje)
    dt.setDate(dt.getDate() + d)
    return format(dt, 'yyyy-MM-dd')
  }

  const certificados: CertificadoDigital[] = [
    {
      id: 'cert-001',
      tenant_id: TENANT_ID,
      cliente_id: 'client-001',
      tipo: 'ecnpj_a3',
      titular: 'Padaria São Bento Ltda',
      cnpj_cpf: '11.222.333/0001-44',
      validade: addDiasStr(25),   // vence em 25 dias — alerta vermelho
      status: 'vencendo',
      criado_por: 'user-admin-001',
      criado_em: '2025-01-10T10:00:00Z',
    },
    {
      id: 'cert-002',
      tenant_id: TENANT_ID,
      cliente_id: 'client-001',
      tipo: 'ecpf_a1',
      titular: 'Carlos Bento',
      cnpj_cpf: '111.222.333-44',
      validade: addDiasStr(55),   // vence em 55 dias — alerta laranja
      status: 'vencendo',
      criado_por: 'user-admin-001',
      criado_em: '2025-01-10T10:00:00Z',
    },
    {
      id: 'cert-003',
      tenant_id: TENANT_ID,
      cliente_id: 'client-002',
      tipo: 'ecnpj_a1',
      titular: 'Tech Solutions Ltda',
      cnpj_cpf: '22.333.444/0001-55',
      validade: addDiasStr(85),   // vence em 85 dias — alerta amarelo
      status: 'vencendo',
      criado_por: 'user-admin-001',
      criado_em: '2025-03-01T10:00:00Z',
    },
    {
      id: 'cert-004',
      tenant_id: TENANT_ID,
      cliente_id: 'client-003',
      tipo: 'ecnpj_a3',
      titular: 'ABC Comércio Ltda',
      cnpj_cpf: '33.444.555/0001-66',
      validade: addDiasStr(180),  // válido — não aparece no card dos 90 dias
      status: 'valido',
      criado_por: 'user-admin-001',
      criado_em: '2025-06-01T10:00:00Z',
    },
  ]
  localStorage.setItem('vb_certificados_digitais', JSON.stringify(certificados))

  // --- Fase 3: Comissões, Assinaturas e Ledger ---

  const commissionRules: CommissionRule[] = [
    {
      id: 'rule-cert-padrao',
      app_id: 'app-cert-digital',
      tipo: 'percentual',
      valor: 20,    // 20% da receita vai para o escritório
    },
    {
      id: 'rule-ondesc-padrao',
      app_id: 'app-ondesc',
      tipo: 'fixo',
      valor: 50,    // R$50 por lead
    },
  ]
  localStorage.setItem('vb_commission_rules', JSON.stringify(commissionRules))

  // tenant-001 tem assinatura ativa no plano gratuito do certificado-digital
  const subscriptions: Subscription[] = [
    {
      id: 'sub-cert-t001',
      installation_id: 'inst-cert-t001',
      plan_id: 'cert-gratuito',
      escritorio_id: TENANT_ID,
      app_id: 'app-cert-digital',
      status: 'ativa',
      inicio: '2026-01-15',
      criado_em: '2026-01-15T10:00:00Z',
    },
  ]
  localStorage.setItem('vb_app_subscriptions', JSON.stringify(subscriptions))

  // Ledger: exemplo de uma cobrança por emissão já registrada
  const ledgerEntries: LedgerEntry[] = [
    {
      id: 'led-001',
      tipo: 'receita',
      subscription_id: 'sub-cert-t001',
      escritorio_id: TENANT_ID,
      app_id: 'app-cert-digital',
      valor: 150.00,
      referencia: 'Emissão de certificado e-CNPJ A3 — Padaria São Bento Ltda',
      criado_em: '2026-03-10T14:22:00Z',
    },
    {
      id: 'led-002',
      tipo: 'comissao_escritorio',
      subscription_id: 'sub-cert-t001',
      escritorio_id: TENANT_ID,
      app_id: 'app-cert-digital',
      valor: 30.00,
      referencia: 'Comissão 20% — Emissão e-CNPJ A3',
      criado_em: '2026-03-10T14:22:00Z',
    },
    {
      id: 'led-003',
      tipo: 'receita',
      subscription_id: 'sub-cert-t001',
      escritorio_id: TENANT_ID,
      app_id: 'app-cert-digital',
      valor: 120.00,
      referencia: 'Emissão de certificado e-CPF A1 — Carlos Bento',
      criado_em: '2026-04-02T09:15:00Z',
    },
    {
      id: 'led-004',
      tipo: 'comissao_escritorio',
      subscription_id: 'sub-cert-t001',
      escritorio_id: TENANT_ID,
      app_id: 'app-cert-digital',
      valor: 24.00,
      referencia: 'Comissão 20% — Emissão e-CPF A1',
      criado_em: '2026-04-02T09:15:00Z',
    },
  ]
  localStorage.setItem('vb_ledger', JSON.stringify(ledgerEntries))

  // Marca seed como executado
  localStorage.setItem(SEED_KEY, new Date().toISOString())
}
