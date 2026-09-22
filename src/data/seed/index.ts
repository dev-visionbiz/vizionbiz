import { v4 as uuidv4 } from 'uuid'
import { subMonths, format, addDays, subDays } from 'date-fns'
import type {
  Tenant, User, Client, Folder, DocumentType, Document,
  Contract, ContratoItem, Invoice, BillingPolicy,
  Pessoa, EmpresaPessoa, Grupo, GrupoEmpresa, Servico, Plano,
  StorageConnection, FichaBloco, FichaCampo,
  Obrigacao, EtapaObrigacao, ClienteObrigacao, Competencia, TarefaObrigacao,
  DemandaTemplate, EtapaDemandaTemplate, DemandaEspecifica, EtapaDemandaEspecifica,
} from '@/domain/types'

const TENANT_ID = 'tenant-001'
const SEED_KEY = 'vb_seeded_v16'

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

  // --- Tenant ---
  const tenant: Tenant = {
    id: TENANT_ID,
    nome: 'Contábil Fidelis & Associados',
    cnpj: '12.345.678/0001-90',
    cor_primaria: '221 83% 53%',
    logo_url: null,
    dominio: 'fidelis.visionbiz.app',
    modulos: ['contabil'],
  }
  localStorage.setItem('vb_tenants', JSON.stringify([tenant]))

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
  localStorage.setItem('vb_clients', JSON.stringify([client1, client2, client3, client4]))

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
    { id: 'user-admin', tenant_id: TENANT_ID, nome: 'Admin Fidelis', email: 'admin@fidelis.com', papel: 'escritorio_admin', ativo: true, senha_hash: 'senha123' },
    { id: 'user-colab', tenant_id: TENANT_ID, nome: 'Ana Colaboradora', email: 'colaborador@fidelis.com', papel: 'escritorio_colaborador', ativo: true, senha_hash: 'senha123', modulos: ['clientes', 'documentos'] },
    { id: 'user-c1', tenant_id: TENANT_ID, nome: 'João Bento', email: 'cliente@padariasbento.com', papel: 'cliente', client_id: 'client-001', ativo: true, senha_hash: 'senha123', papel_portal: 'responsavel' },
    { id: 'user-c2', tenant_id: TENANT_ID, nome: 'Maria Tech', email: 'cliente@techsolutions.com', papel: 'cliente', client_id: 'client-002', ativo: true, senha_hash: 'senha123', papel_portal: 'membro', secoes_portal: ['inicio', 'documentos'] },
    { id: 'user-c3', tenant_id: TENANT_ID, nome: 'Carlos ABC', email: 'cliente@comercioabc.com', papel: 'cliente', client_id: 'client-003', ativo: true, senha_hash: 'senha123', papel_portal: 'responsavel' },
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

  // --- Módulo de Obrigações ---

  const obrigacoes: Obrigacao[] = [
    {
      id: 'obs-001', tenant_id: TENANT_ID, nome: 'PGDAS-D', periodicidade: 'mensal',
      regra_vencimento: JSON.stringify({ tipo: 'dia_mes_seguinte', dia: 20 }),
      regime: 'Simples Nacional', ativo: true,
    },
    {
      id: 'obs-002', tenant_id: TENANT_ID, nome: 'DCTFWeb', periodicidade: 'mensal',
      regra_vencimento: JSON.stringify({ tipo: 'dia_mes_seguinte', dia: 15 }),
      ativo: true,
    },
    {
      id: 'obs-003', tenant_id: TENANT_ID, nome: 'DEFIS', periodicidade: 'anual',
      regra_vencimento: JSON.stringify({ tipo: 'dia_mes_seguinte', dia: 31 }),
      regime: 'Simples Nacional', ativo: true,
    },
  ]
  localStorage.setItem('vb_obrigacoes', JSON.stringify(obrigacoes))

  const etapas: EtapaObrigacao[] = [
    // PGDAS-D
    { id: 'etapa-001', tenant_id: TENANT_ID, obrigacao_id: 'obs-001', ordem: 1, nome: 'Recolher informações do cliente', prazo_relativo_dias: -10 },
    { id: 'etapa-002', tenant_id: TENANT_ID, obrigacao_id: 'obs-001', ordem: 2, nome: 'Calcular e transmitir PGDAS', prazo_relativo_dias: -4 },
    { id: 'etapa-003', tenant_id: TENANT_ID, obrigacao_id: 'obs-001', ordem: 3, nome: 'Gerar guia DAS', prazo_relativo_dias: -2 },
    { id: 'etapa-004', tenant_id: TENANT_ID, obrigacao_id: 'obs-001', ordem: 4, nome: 'Confirmar pagamento', prazo_relativo_dias: 0 },
    // DCTFWeb
    { id: 'etapa-005', tenant_id: TENANT_ID, obrigacao_id: 'obs-002', ordem: 1, nome: 'Levantar dados da folha', prazo_relativo_dias: -7 },
    { id: 'etapa-006', tenant_id: TENANT_ID, obrigacao_id: 'obs-002', ordem: 2, nome: 'Transmitir DCTFWeb', prazo_relativo_dias: -2 },
  ]
  localStorage.setItem('vb_etapas_obrigacao', JSON.stringify(etapas))

  const clienteObrigacoes: ClienteObrigacao[] = [
    { id: 'co-001', tenant_id: TENANT_ID, cliente_id: 'client-001', obrigacao_id: 'obs-001', ativo: true, data_inicio: '2026-01-01' },
    { id: 'co-002', tenant_id: TENANT_ID, cliente_id: 'client-003', obrigacao_id: 'obs-001', ativo: true, data_inicio: '2026-01-01' },
  ]
  localStorage.setItem('vb_cliente_obrigacao', JSON.stringify(clienteObrigacoes))

  const competencias: Competencia[] = [
    { id: 'comp-001', tenant_id: TENANT_ID, obrigacao_id: 'obs-001', periodo: '2026-09', data_vencimento: '2026-10-20', status: 'aberta' },
  ]
  localStorage.setItem('vb_competencias', JSON.stringify(competencias))

  // 8 tarefas: client-001 e client-003 × 4 etapas do PGDAS-D
  // Etapa 1 e 2 de client-001 já concluídas para ilustrar o painel
  const tarefas: TarefaObrigacao[] = [
    { id: 'tar-001', tenant_id: TENANT_ID, cliente_id: 'client-001', competencia_id: 'comp-001', etapa_id: 'etapa-001', data_prevista: '2026-10-10', status: 'concluida', data_conclusao: '2026-10-09' },
    { id: 'tar-002', tenant_id: TENANT_ID, cliente_id: 'client-001', competencia_id: 'comp-001', etapa_id: 'etapa-002', data_prevista: '2026-10-16', status: 'concluida', data_conclusao: '2026-10-15' },
    { id: 'tar-003', tenant_id: TENANT_ID, cliente_id: 'client-001', competencia_id: 'comp-001', etapa_id: 'etapa-003', data_prevista: '2026-10-18', status: 'pendente' },
    { id: 'tar-004', tenant_id: TENANT_ID, cliente_id: 'client-001', competencia_id: 'comp-001', etapa_id: 'etapa-004', data_prevista: '2026-10-20', status: 'pendente' },
    { id: 'tar-005', tenant_id: TENANT_ID, cliente_id: 'client-003', competencia_id: 'comp-001', etapa_id: 'etapa-001', data_prevista: '2026-10-10', status: 'concluida', data_conclusao: '2026-10-10' },
    { id: 'tar-006', tenant_id: TENANT_ID, cliente_id: 'client-003', competencia_id: 'comp-001', etapa_id: 'etapa-002', data_prevista: '2026-10-16', status: 'pendente' },
    { id: 'tar-007', tenant_id: TENANT_ID, cliente_id: 'client-003', competencia_id: 'comp-001', etapa_id: 'etapa-003', data_prevista: '2026-10-18', status: 'pendente' },
    { id: 'tar-008', tenant_id: TENANT_ID, cliente_id: 'client-003', competencia_id: 'comp-001', etapa_id: 'etapa-004', data_prevista: '2026-10-20', status: 'pendente' },
  ]
  localStorage.setItem('vb_tarefas_obrigacao', JSON.stringify(tarefas))

  // --- Templates de Demandas Específicas ---
  const demandaTemplates: DemandaTemplate[] = [
    { id: 'dt-001', tenant_id: TENANT_ID, nome: 'Alteração de Contrato Social', descricao: 'Alteração de dados societários na Junta Comercial', categoria: 'societario', prazo_dias_padrao: 15, valor_sugerido: 450, ativo: true },
    { id: 'dt-002', tenant_id: TENANT_ID, nome: 'Abertura de Empresa', descricao: 'Constituição de nova pessoa jurídica', categoria: 'societario', prazo_dias_padrao: 25, valor_sugerido: 900, ativo: true },
    { id: 'dt-003', tenant_id: TENANT_ID, nome: 'Declaração IRPF', descricao: 'Elaboração e transmissão da Declaração de Ajuste Anual', categoria: 'fiscal', prazo_dias_padrao: 10, valor_sugerido: 250, ativo: true },
    { id: 'dt-004', tenant_id: TENANT_ID, nome: 'Admissão de Funcionário', descricao: 'Registro de novo colaborador na empresa', categoria: 'dp', prazo_dias_padrao: 5, valor_sugerido: 80, ativo: true },
  ]
  localStorage.setItem('vb_demanda_templates', JSON.stringify(demandaTemplates))

  const etapasDemandaTemplate: EtapaDemandaTemplate[] = [
    // Alteração de Contrato Social (dt-001)
    { id: 'edt-001', tenant_id: TENANT_ID, template_id: 'dt-001', ordem: 1, nome: 'Coletar documentos dos sócios', prazo_relativo_dias: -12 },
    { id: 'edt-002', tenant_id: TENANT_ID, template_id: 'dt-001', ordem: 2, nome: 'Elaborar minuta do contrato social', prazo_relativo_dias: -8 },
    { id: 'edt-003', tenant_id: TENANT_ID, template_id: 'dt-001', ordem: 3, nome: 'Registro na Junta Comercial', prazo_relativo_dias: -3 },
    { id: 'edt-004', tenant_id: TENANT_ID, template_id: 'dt-001', ordem: 4, nome: 'Entregar ao cliente', prazo_relativo_dias: 0 },
    // Abertura de Empresa (dt-002)
    { id: 'edt-005', tenant_id: TENANT_ID, template_id: 'dt-002', ordem: 1, nome: 'Pesquisa de viabilidade de nome', prazo_relativo_dias: -22 },
    { id: 'edt-006', tenant_id: TENANT_ID, template_id: 'dt-002', ordem: 2, nome: 'Elaborar contrato social', prazo_relativo_dias: -18 },
    { id: 'edt-007', tenant_id: TENANT_ID, template_id: 'dt-002', ordem: 3, nome: 'Registro na Junta Comercial', prazo_relativo_dias: -12 },
    { id: 'edt-008', tenant_id: TENANT_ID, template_id: 'dt-002', ordem: 4, nome: 'Inscrição CNPJ na Receita Federal', prazo_relativo_dias: -5 },
    { id: 'edt-009', tenant_id: TENANT_ID, template_id: 'dt-002', ordem: 5, nome: 'Alvará e licenças municipais', prazo_relativo_dias: 0 },
    // Declaração IRPF (dt-003)
    { id: 'edt-010', tenant_id: TENANT_ID, template_id: 'dt-003', ordem: 1, nome: 'Coletar documentos (informes, notas)', prazo_relativo_dias: -8 },
    { id: 'edt-011', tenant_id: TENANT_ID, template_id: 'dt-003', ordem: 2, nome: 'Preencher declaração', prazo_relativo_dias: -4 },
    { id: 'edt-012', tenant_id: TENANT_ID, template_id: 'dt-003', ordem: 3, nome: 'Revisar com cliente', prazo_relativo_dias: -2 },
    { id: 'edt-013', tenant_id: TENANT_ID, template_id: 'dt-003', ordem: 4, nome: 'Transmitir à Receita Federal', prazo_relativo_dias: 0 },
    // Admissão de Funcionário (dt-004)
    { id: 'edt-014', tenant_id: TENANT_ID, template_id: 'dt-004', ordem: 1, nome: 'Coletar documentos e exame admissional', prazo_relativo_dias: -4 },
    { id: 'edt-015', tenant_id: TENANT_ID, template_id: 'dt-004', ordem: 2, nome: 'Registrar na CTPS e e-Social', prazo_relativo_dias: -1 },
    { id: 'edt-016', tenant_id: TENANT_ID, template_id: 'dt-004', ordem: 3, nome: 'Configurar na folha de pagamento', prazo_relativo_dias: 0 },
  ]
  localStorage.setItem('vb_etapas_demanda_template', JSON.stringify(etapasDemandaTemplate))

  // --- Demanda de Exemplo: Padaria São Bento — Alteração de Contrato Social ---
  const demandaExemplo: DemandaEspecifica = {
    id: 'dem-001',
    tenant_id: TENANT_ID,
    cliente_id: 'client-001',
    template_id: 'dt-001',
    titulo: 'Alteração de Contrato Social — Entrada de novo sócio',
    descricao: 'Cliente solicita inclusão de novo sócio com 30% de participação.',
    categoria: 'societario',
    valor: 450,
    data_solicitacao: '2026-09-15',
    data_prevista: '2026-09-30',
    status: 'em_andamento',
    criado_por: 'user-002',
    criado_em: '2026-09-15T09:00:00.000Z',
  }
  localStorage.setItem('vb_demandas_especificas', JSON.stringify([demandaExemplo]))

  const etapasDemandaExemplo: EtapaDemandaEspecifica[] = [
    { id: 'ede-001', tenant_id: TENANT_ID, demanda_id: 'dem-001', ordem: 1, nome: 'Coletar documentos dos sócios', data_prevista: '2026-09-18', data_conclusao: '2026-09-17', status: 'concluida' },
    { id: 'ede-002', tenant_id: TENANT_ID, demanda_id: 'dem-001', ordem: 2, nome: 'Elaborar minuta do contrato social', data_prevista: '2026-09-22', status: 'em_andamento' },
    { id: 'ede-003', tenant_id: TENANT_ID, demanda_id: 'dem-001', ordem: 3, nome: 'Registro na Junta Comercial', data_prevista: '2026-09-27', status: 'pendente' },
    { id: 'ede-004', tenant_id: TENANT_ID, demanda_id: 'dem-001', ordem: 4, nome: 'Entregar ao cliente', data_prevista: '2026-09-30', status: 'pendente' },
  ]
  localStorage.setItem('vb_etapas_demanda_especifica', JSON.stringify(etapasDemandaExemplo))

  // Marca seed como executado
  localStorage.setItem(SEED_KEY, new Date().toISOString())
}
