import { Link } from 'react-router-dom'
import { Store, ArrowLeft, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

// ─── Componentes de layout ────────────────────────────────────────────────────

function DocSection({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 space-y-4">
      {children}
    </section>
  )
}

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xl font-bold border-b pb-2">{children}</h2>
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-base font-semibold mt-6 mb-2">{children}</h3>
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground leading-relaxed">{children}</p>
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="bg-muted text-foreground px-1.5 py-0.5 rounded text-xs font-mono">
      {children}
    </code>
  )
}

function CodeBlock({ lang = 'json', children }: { lang?: string; children: string }) {
  return (
    <div className="rounded-xl border overflow-hidden">
      <div className="flex items-center justify-between bg-muted/70 px-4 py-1.5 border-b">
        <span className="text-xs text-muted-foreground font-mono">{lang}</span>
      </div>
      <pre className="bg-muted/30 px-4 py-3 text-xs font-mono overflow-x-auto leading-relaxed">
        <code>{children}</code>
      </pre>
    </div>
  )
}

function InfoBox({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 space-y-1">
      {title && <p className="font-semibold">{title}</p>}
      <div className="text-blue-700 space-y-1">{children}</div>
    </div>
  )
}

function WarnBox({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 space-y-1">
      {title && <p className="font-semibold">{title}</p>}
      <div className="text-amber-700 space-y-1">{children}</div>
    </div>
  )
}

// ─── Mapa de seções ───────────────────────────────────────────────────────────

const NAV = [
  { id: 'introducao',      label: 'Introdução' },
  { id: 'tipos',           label: 'Tipos de extensor' },
  { id: 'manifesto',       label: 'Manifesto JSON' },
  { id: 'escopos',         label: 'Escopos e permissões' },
  { id: 'slots',           label: 'Slots e widgets' },
  { id: 'jwt',             label: 'Autenticação JWT' },
  { id: 'conectado',       label: 'Extensor Conectado' },
  { id: 'embed',           label: 'Extensor Embed' },
  { id: 'webhooks',        label: 'Webhooks' },
  { id: 'planos',          label: 'Planos e monetização' },
  { id: 'publicacao',      label: 'Como publicar' },
]

// ─── DocsPage ────────────────────────────────────────────────────────────────

export function DocsPage() {
  return (
    <div className="min-h-screen bg-background">

      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/loja" className="flex items-center gap-2 text-sm font-semibold hover:opacity-80">
              <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center shrink-0">
                <Store className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              VisionBiz
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-sm font-medium">Documentação para desenvolvedores</span>
            <Badge variant="secondary" className="text-xs">Beta</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/catalogo" className="gap-2 hidden sm:flex">
                <ArrowLeft className="h-3.5 w-3.5" />
                Voltar ao admin
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 flex gap-12 py-10">

        {/* Sidebar nav */}
        <nav className="hidden lg:block w-52 shrink-0">
          <div className="sticky top-24 space-y-0.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">
              Conteúdo
            </p>
            {NAV.map(({ id, label }) => (
              <a
                key={id}
                href={`#${id}`}
                className="block px-2 py-1.5 text-sm text-muted-foreground rounded-md hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                {label}
              </a>
            ))}
            <div className="mt-6 pt-6 border-t">
              <p className="text-xs text-muted-foreground px-2 mb-2">Links úteis</p>
              <a
                href="mailto:dev@visionbiz.com.br"
                className="flex items-center gap-1.5 px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                Suporte a devs
              </a>
            </div>
          </div>
        </nav>

        {/* Conteúdo */}
        <main className="flex-1 min-w-0 space-y-16">

          {/* ── Introdução ── */}
          <DocSection id="introducao">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-primary uppercase tracking-wider">Guia do desenvolvedor</p>
              <H2>Extensores VisionBiz</H2>
              <P>
                Os extensores são integrações que enriquecem o VisionBiz com funcionalidades de parceiros externos.
                Com um extensor, você pode exibir dados da sua plataforma dentro do painel do escritório contábil,
                criar ações dentro do portal do cliente e receber eventos em tempo real via webhooks —
                tudo sem que o escritório precise sair do VisionBiz.
              </P>
            </div>

            <InfoBox title="Para quem é esta documentação?">
              <p>Para desenvolvedores que querem publicar um extensor no catálogo VisionBiz e disponibilizá-lo para escritórios contábeis.</p>
              <p>Não é necessário nenhum SDK específico — qualquer linguagem que sirva HTTP funciona.</p>
            </InfoBox>

            <H3>Visão geral do ciclo</H3>
            <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
              <li>Você cria um extensor no painel admin e preenche o manifesto (escopos, slots, planos).</li>
              <li>O status passa para <strong>Em revisão</strong>; a equipe VisionBiz valida e aprova.</li>
              <li>Com status <strong>Publicado</strong>, o extensor aparece na loja para todos os escritórios.</li>
              <li>O escritório instala o extensor, aprova as permissões e seus widgets aparecem no VisionBiz.</li>
              <li>Sua API começa a receber requisições autenticadas com JWT do VisionBiz.</li>
            </ol>
          </DocSection>

          {/* ── Tipos ── */}
          <DocSection id="tipos">
            <H2>Tipos de extensor</H2>
            <P>Existem três modelos de integração. Escolha conforme sua arquitetura.</P>

            <div className="space-y-4">
              {/* Conectado */}
              <div className="border rounded-xl p-5 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🌐</span>
                  <div>
                    <p className="font-semibold text-sm">Conectado</p>
                    <p className="text-xs text-muted-foreground">Seu servidor fornece dados; o VisionBiz renderiza</p>
                  </div>
                  <Badge className="ml-auto">Recomendado</Badge>
                </div>
                <P>
                  O VisionBiz consulta um endpoint da sua API em intervalos configurados.
                  O endpoint recebe um JWT com o contexto do escritório/cliente e retorna
                  um JSON padronizado que o VisionBiz renderiza no widget.
                </P>
                <P>
                  <strong>Ideal para:</strong> dashboards de métricas, status de serviços,
                  alertas de vencimento, consultas de situação cadastral.
                </P>
              </div>

              {/* Embed */}
              <div className="border rounded-xl p-5 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🖼️</span>
                  <div>
                    <p className="font-semibold text-sm">Embed (iframe)</p>
                    <p className="text-xs text-muted-foreground">Sua aplicação web abre dentro do VisionBiz</p>
                  </div>
                </div>
                <P>
                  Uma URL da sua aplicação é carregada em um iframe seguro dentro do VisionBiz.
                  O VisionBiz injeta um JWT como parâmetro de URL ou header — seu servidor
                  valida o token e renderiza a interface personalizada para aquele usuário.
                </P>
                <P>
                  <strong>Ideal para:</strong> portais de adesão, calculadoras interativas,
                  sistemas com UI proprietária que não cabe no formato de widget.
                </P>
              </div>

              {/* Embarcado */}
              <div className="border rounded-xl p-5 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">⚙️</span>
                  <div>
                    <p className="font-semibold text-sm">Embarcado</p>
                    <p className="text-xs text-muted-foreground">Componente React nativo do VisionBiz</p>
                  </div>
                  <Badge variant="secondary" className="ml-auto">Parceiros selecionados</Badge>
                </div>
                <P>
                  O extensor é um componente React registrado diretamente no código-fonte do VisionBiz.
                  Oferece integração profunda mas requer aprovação e processo de deploy coordenado.
                  Entre em contato com a equipe de engenharia para este modelo.
                </P>
              </div>
            </div>
          </DocSection>

          {/* ── Manifesto ── */}
          <DocSection id="manifesto">
            <H2>Manifesto JSON</H2>
            <P>
              O manifesto é a especificação técnica do extensor — declara permissões, locais de widget,
              eventos e planos. Ele é armazenado por versão; toda mudança em escopos ou slots deve
              gerar uma nova versão para que os escritórios instalados possam aceitar as novas permissões.
            </P>

            <CodeBlock lang="json">{`{
  "slug": "certdigital-pro",
  "nome": "Certificado Digital Pro",
  "tipo": "conectado",
  "versao": "1.2.0",
  "descricao": "Gerencie certificados A1 e A3 direto no VisionBiz",
  "icone": "🔒",
  "categoria": "Compliance",

  // Permissões solicitadas ao escritório
  "escopos": [
    "clientes:read",
    "documentos:write",
    "tarefas:write",
    "notificacoes:send"
  ],

  // Locais onde o widget aparece
  "slots": [
    "escritorio.dashboard.widget",
    "escritorio.cliente.aba",
    "portal.inicio.servico"
  ],

  // Configuração de cada slot
  "gadgets": [
    {
      "slot": "escritorio.dashboard.widget",
      "scope": "escritorio",
      "tamanho": "medio",
      "dataEndpoint": {
        "url": "https://api.certpro.com.br/gadget/dashboard",
        "method": "GET",
        "authHeader": "Authorization: Bearer {token}",
        "refreshInterval": 300,
        "mapping": {}
      }
    },
    {
      "slot": "escritorio.cliente.aba",
      "scope": "escritorio",
      "tamanho": "grande",
      "dataEndpoint": {
        "url": "https://api.certpro.com.br/gadget/cliente",
        "method": "GET",
        "authHeader": "Authorization: Bearer {token}",
        "refreshInterval": 60,
        "mapping": {}
      }
    }
  ],

  // Eventos que seu webhook receberá
  "eventos_assinados": [
    "cliente.criado",
    "cobranca.paga"
  ],

  // Planos disponíveis (espelho dos AppPlans cadastrados)
  "planos": [
    { "id": "free", "nome": "Gratuito", "tipo_cobranca": "gratuito", "valor": 0 },
    { "id": "pro",  "nome": "Pro",      "tipo_cobranca": "mensal",   "valor": 49 }
  ]
}`}
            </CodeBlock>
          </DocSection>

          {/* ── Escopos ── */}
          <DocSection id="escopos">
            <H2>Escopos e permissões</H2>
            <P>
              Cada escopo concede acesso a um conjunto de dados do escritório.
              O escritório vê e aprova explicitamente cada escopo na tela de instalação.
              Solicite apenas o mínimo necessário — escopos desnecessários reduzem a taxa de instalação.
            </P>

            <div className="overflow-hidden rounded-xl border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Escopo</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">O que permite</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs w-24">Risco</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-xs">
                  {[
                    ['clientes:read',     'Ler nome, CNPJ, e-mail e status dos clientes',       'Baixo'],
                    ['clientes:write',    'Criar e editar dados cadastrais de clientes',          'Alto'],
                    ['contratos:read',    'Ver contratos ativos e serviços contratados',         'Baixo'],
                    ['financeiro:read',   'Ver cobranças, faturas e pagamentos',                  'Médio'],
                    ['financeiro:write',  'Criar cobranças e registrar pagamentos',               'Alto'],
                    ['documentos:read',   'Baixar documentos armazenados no VisionBiz',          'Médio'],
                    ['documentos:write',  'Enviar e atualizar documentos',                        'Médio'],
                    ['tarefas:write',     'Criar tarefas e ocorrências para o escritório',       'Baixo'],
                    ['notificacoes:send', 'Enviar mensagens ao cliente via WhatsApp e e-mail',   'Médio'],
                  ].map(([slug, desc, risco]) => (
                    <tr key={slug} className="hover:bg-muted/20">
                      <td className="px-4 py-2.5 font-mono text-primary">{slug}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{desc}</td>
                      <td className="px-4 py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          risco === 'Alto' ? 'bg-red-100 text-red-700' :
                          risco === 'Médio' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>{risco}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DocSection>

          {/* ── Slots ── */}
          <DocSection id="slots">
            <H2>Slots e widgets</H2>
            <P>
              Os slots definem <em>onde</em> o widget do seu extensor aparece na interface do VisionBiz.
              Cada slot tem um slug único e um contexto (interno para colaboradores ou portal para clientes).
            </P>

            <div className="space-y-4">
              {[
                {
                  group: 'Escritório — Dashboard',
                  color: 'blue',
                  slots: [
                    { slug: 'escritorio.dashboard.widget', desc: 'Card de métricas ou ação rápida na grade do dashboard' },
                    { slug: 'escritorio.dashboard.alerta', desc: 'Banner de alerta no topo do dashboard' },
                  ],
                },
                {
                  group: 'Escritório — Ficha do cliente',
                  color: 'blue',
                  slots: [
                    { slug: 'escritorio.cliente.aba',  desc: 'Aba dedicada na barra de navegação da ficha do cliente' },
                    { slug: 'escritorio.cliente.card', desc: 'Card lateral na sidebar da ficha do cliente' },
                  ],
                },
                {
                  group: 'Portal do cliente — Início',
                  color: 'green',
                  slots: [
                    { slug: 'portal.inicio.servico', desc: 'Botão/card de serviço na tela inicial do portal' },
                    { slug: 'portal.inicio.alerta',  desc: 'Banner de alerta na tela inicial do portal' },
                  ],
                },
                {
                  group: 'Portal do cliente — Página própria',
                  color: 'green',
                  slots: [
                    { slug: 'portal.pagina', desc: 'Rota e página inteira dedicada ao extensor no portal' },
                  ],
                },
              ].map(({ group, color, slots }) => (
                <div key={group} className="border rounded-xl overflow-hidden">
                  <div className={`px-4 py-2.5 border-b text-sm font-medium ${
                    color === 'blue' ? 'bg-blue-50 text-blue-800' : 'bg-emerald-50 text-emerald-800'
                  }`}>{group}</div>
                  <div className="divide-y">
                    {slots.map(({ slug, desc }) => (
                      <div key={slug} className="flex items-center gap-4 px-4 py-2.5">
                        <code className="text-xs font-mono text-primary shrink-0">{slug}</code>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <H3>Tamanhos disponíveis</H3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { v: 'pequeno', label: 'Pequeno',  desc: '1 coluna da grade' },
                { v: 'medio',   label: 'Médio',    desc: '2 colunas (padrão)' },
                { v: 'grande',  label: 'Grande',   desc: '3 colunas' },
              ].map(({ v, label, desc }) => (
                <div key={v} className="border rounded-lg p-3 text-center">
                  <code className="text-xs font-mono text-primary">{v}</code>
                  <p className="text-xs font-medium mt-1">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              ))}
            </div>
          </DocSection>

          {/* ── JWT ── */}
          <DocSection id="jwt">
            <H2>Autenticação JWT</H2>
            <P>
              Toda requisição do VisionBiz ao seu endpoint chega com um JWT assinado no header de autenticação.
              Valide sempre a assinatura antes de processar o pedido.
              A chave pública de assinatura é disponibilizada no painel de desenvolvedor após aprovação do extensor.
            </P>

            <H3>Estrutura do payload</H3>
            <CodeBlock lang="json">{`{
  // Identificação do usuário
  "sub":       "usr_abc123",          // ID único do usuário no VisionBiz
  "nome":      "Ana Paula Ferreira",
  "email":     "ana@escritoriobeta.com.br",
  "papel":     "escritorio_admin",    // escritorio_admin | escritorio_colaborador | cliente

  // Contexto do escritório
  "tenant_id": "esc_xyz789",          // ID do escritório que instalou o extensor

  // Contexto do cliente (presente somente em slots do portal e ficha do cliente)
  "client_id": "cli_456",             // ID do cliente sendo visualizado
  "client_cnpj": "12.345.678/0001-99",
  "client_nome": "Empresa Exemplo Ltda",

  // Extensor
  "app_id":    "app_certpro",         // ID do seu extensor
  "escopos":   ["clientes:read", "documentos:write"],  // escopos aprovados na instalação

  // Controle de validade
  "iat": 1706000000,                  // emitido em (Unix timestamp)
  "exp": 1706000120                   // expira em — padrão: 2 minutos após emissão
}`}
            </CodeBlock>

            <H3>Validação em Node.js</H3>
            <CodeBlock lang="javascript">{`import jwt from 'jsonwebtoken'
import { createPublicKey } from 'crypto'

// Chave pública fornecida pela VisionBiz no painel de desenvolvedor
const publicKey = createPublicKey(process.env.VISIONBIZ_PUBLIC_KEY)

export function validarJWT(authHeader) {
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Header de autenticação ausente ou inválido')
  }

  const token = authHeader.slice(7)

  const payload = jwt.verify(token, publicKey, {
    algorithms: ['RS256'],
    // O app_id deve bater com o ID do seu extensor
    // para evitar reutilização de tokens de outros extensores
  })

  if (payload.app_id !== process.env.APP_ID) {
    throw new Error('Token não pertence a este extensor')
  }

  return payload
}`}
            </CodeBlock>

            <H3>Validação em Python</H3>
            <CodeBlock lang="python">{`import jwt
import os

PUBLIC_KEY = os.environ["VISIONBIZ_PUBLIC_KEY"]
APP_ID     = os.environ["APP_ID"]

def validar_jwt(auth_header: str) -> dict:
    if not auth_header or not auth_header.startswith("Bearer "):
        raise ValueError("Header de autenticação ausente ou inválido")

    token = auth_header[7:]

    payload = jwt.decode(
        token,
        PUBLIC_KEY,
        algorithms=["RS256"],
    )

    if payload.get("app_id") != APP_ID:
        raise ValueError("Token não pertence a este extensor")

    return payload`}
            </CodeBlock>

            <WarnBox title="Token de curta duração">
              <p>O JWT expira em <strong>2 minutos</strong> após emissão. Não faça cache do token — cada requisição traz um novo.</p>
            </WarnBox>
          </DocSection>

          {/* ── Conectado ── */}
          <DocSection id="conectado">
            <H2>Extensor Conectado — endpoint de gadget</H2>
            <P>
              Para extensores do tipo <Code>conectado</Code>, o VisionBiz fará requisições HTTP ao endpoint
              configurado em cada slot. Seu servidor recebe o JWT no header e retorna um JSON
              com os dados a exibir no widget.
            </P>

            <H3>Requisição enviada pelo VisionBiz</H3>
            <CodeBlock lang="http">{`GET https://api.meusite.com.br/gadget/dashboard
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
Content-Type: application/json`}
            </CodeBlock>

            <H3>Formato de resposta esperado</H3>
            <CodeBlock lang="json">{`{
  // Título principal do widget (obrigatório)
  "titulo": "Certificados monitorados",

  // Subtítulo / período de referência
  "subtitulo": "Atualizado há 2 min",

  // Valor de destaque (número, texto ou percentual)
  "valor": "14",
  "valor_label": "ativos",

  // Cor do indicador visual
  // "success" | "warning" | "danger" | "info" | "neutral"
  "cor": "warning",

  // Lista de itens exibidos no corpo do widget
  "items": [
    { "label": "Vence em menos de 30 dias", "valor": "3",  "cor": "warning" },
    { "label": "Vence em menos de 7 dias",  "valor": "1",  "cor": "danger"  },
    { "label": "Já vencidos",               "valor": "0",  "cor": "success" }
  ],

  // Botão de ação (opcional)
  "acao": {
    "label": "Gerenciar certificados",
    "url": "/portal/certificados"   // rota relativa no VisionBiz
  }
}`}
            </CodeBlock>

            <H3>Exemplo completo em Node.js / Express</H3>
            <CodeBlock lang="javascript">{`import express from 'express'
import { validarJWT } from './auth.js'

const app = express()

app.get('/gadget/dashboard', async (req, res) => {
  // 1. Validar o JWT
  let payload
  try {
    payload = validarJWT(req.headers.authorization)
  } catch {
    return res.status(401).json({ erro: 'Não autorizado' })
  }

  // 2. Usar o contexto do escritório para buscar os dados
  const { tenant_id } = payload
  const certs = await buscarCertificados(tenant_id)

  // 3. Retornar no formato padronizado
  res.json({
    titulo: 'Certificados monitorados',
    subtitulo: \`\${certs.total} no total\`,
    valor: String(certs.vencendoEm30Dias),
    valor_label: 'vencem em 30 dias',
    cor: certs.vencendoEm7Dias > 0 ? 'danger' : 'warning',
    items: [
      { label: 'Vencem em 30 dias', valor: String(certs.vencendoEm30Dias), cor: 'warning' },
      { label: 'Vencem em 7 dias',  valor: String(certs.vencendoEm7Dias),  cor: 'danger'  },
      { label: 'Já vencidos',       valor: String(certs.vencidos),         cor: 'neutral' },
    ],
    acao: { label: 'Ver todos', url: '/portal/certificados' },
  })
})

app.listen(3000)`}
            </CodeBlock>

            <InfoBox title="CORS obrigatório">
              <p>Seu endpoint deve aceitar requisições cross-origin vindas do domínio do VisionBiz.</p>
              <p>Adicione o header <Code>Access-Control-Allow-Origin: https://app.visionbiz.com.br</Code> nas respostas.</p>
            </InfoBox>
          </DocSection>

          {/* ── Embed ── */}
          <DocSection id="embed">
            <H2>Extensor Embed — iframe autenticado</H2>
            <P>
              Para extensores do tipo <Code>embed</Code>, o VisionBiz abre uma URL do seu sistema
              em um iframe seguro. O token JWT é injetado automaticamente na URL como parâmetro de query
              ou pode ser configurado como header para aplicações que usam postMessage.
            </P>

            <H3>URL com token injetado</H3>
            <P>
              No manifesto, configure a URL com o placeholder <Code>{'{token}'}</Code>.
              O VisionBiz substitui por um JWT assinado antes de carregar o iframe:
            </P>
            <CodeBlock lang="text">{`// URL configurada no manifesto:
https://app.certpro.com.br/widget?token={token}&escritorio={tenant_id}

// URL gerada pelo VisionBiz na hora de carregar o iframe:
https://app.certpro.com.br/widget?token=eyJhbGciOiJSUzI1NiJ9...&escritorio=esc_xyz789`}
            </CodeBlock>

            <H3>Recebendo o token no frontend</H3>
            <CodeBlock lang="javascript">{`// Na sua aplicação embed (frontend)
const params = new URLSearchParams(window.location.search)
const token  = params.get('token')

// Envie o token para o seu backend para validar e carregar os dados
const resp = await fetch('/api/validar-sessao', {
  headers: { Authorization: \`Bearer \${token}\` },
})
const { escritorio, usuario } = await resp.json()
// → renderize a interface personalizada para este usuário`}
            </CodeBlock>

            <H3>Comunicação com o VisionBiz via postMessage</H3>
            <P>
              Seu iframe pode enviar mensagens para o VisionBiz para navegar ou disparar ações:
            </P>
            <CodeBlock lang="javascript">{`// Dentro do iframe — redirecionar o VisionBiz para outra rota
window.parent.postMessage(
  { tipo: 'visionbiz:navegar', rota: '/escritorio/clientes' },
  'https://app.visionbiz.com.br'
)

// Exibir um toast de confirmação no VisionBiz
window.parent.postMessage(
  { tipo: 'visionbiz:toast', mensagem: 'Certificado emitido com sucesso!', variante: 'success' },
  'https://app.visionbiz.com.br'
)`}
            </CodeBlock>
          </DocSection>

          {/* ── Webhooks ── */}
          <DocSection id="webhooks">
            <H2>Webhooks</H2>
            <P>
              Quando o escritório instala o extensor com eventos assinados no manifesto,
              o VisionBiz enviará um POST para a URL de webhook cadastrada no painel de desenvolvedor
              sempre que aquele evento ocorrer naquele escritório.
            </P>

            <H3>Formato do payload</H3>
            <CodeBlock lang="json">{`{
  "id":           "evt_abc123",          // ID único do evento (use para idempotência)
  "evento":       "cobranca.paga",
  "timestamp":    "2024-01-15T10:30:00Z",
  "escritorio_id": "esc_xyz789",

  // Assinatura HMAC-SHA256 do corpo da requisição
  // Use para verificar autenticidade (veja abaixo)
  "assinatura":   "sha256=a1b2c3...",

  // Dados específicos do evento
  "dados": {
    "cobranca_id":  "cob_456",
    "cliente_id":   "cli_789",
    "valor":        149.90,
    "pago_em":      "2024-01-15T10:29:55Z",
    "metodo":       "pix"
  }
}`}
            </CodeBlock>

            <H3>Eventos disponíveis</H3>
            <div className="overflow-hidden rounded-xl border">
              <table className="w-full text-xs">
                <thead className="bg-muted/40 border-b">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Evento</th>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Quando é disparado</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {[
                    ['cliente.criado',    'Novo cliente cadastrado no escritório'],
                    ['documento.baixado', 'Documento baixado por colaborador ou cliente'],
                    ['cobranca.vencida',  'Cobrança passa da data de vencimento sem pagamento'],
                    ['cobranca.paga',     'Pagamento confirmado no sistema'],
                    ['contrato.criado',   'Novo contrato cadastrado para um cliente'],
                    ['app.instalado',     'Escritório instala este extensor'],
                    ['app.desinstalado',  'Escritório desinstala ou revoga este extensor'],
                  ].map(([ev, desc]) => (
                    <tr key={ev} className="hover:bg-muted/20">
                      <td className="px-4 py-2.5 font-mono text-primary">{ev}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <H3>Verificando a assinatura (Node.js)</H3>
            <CodeBlock lang="javascript">{`import { createHmac, timingSafeEqual } from 'crypto'

const WEBHOOK_SECRET = process.env.VISIONBIZ_WEBHOOK_SECRET

export function verificarAssinatura(body, assinaturaHeader) {
  const esperada = 'sha256=' + createHmac('sha256', WEBHOOK_SECRET)
    .update(body)
    .digest('hex')

  const recebida = Buffer.from(assinaturaHeader)
  const esperadaBuffer = Buffer.from(esperada)

  if (recebida.length !== esperadaBuffer.length) return false

  // timingSafeEqual previne ataques de temporização
  return timingSafeEqual(recebida, esperadaBuffer)
}

// Em um handler Express:
app.post('/webhooks/visionbiz', express.raw({ type: '*/*' }), (req, res) => {
  const valido = verificarAssinatura(req.body, req.headers['x-visionbiz-signature'])
  if (!valido) return res.status(403).send('Assinatura inválida')

  const evento = JSON.parse(req.body)
  // processar evento...

  res.status(200).send('ok')
})`}
            </CodeBlock>

            <WarnBox title="Idempotência obrigatória">
              <p>O VisionBiz pode reenviar eventos em caso de falha. Use o campo <Code>id</Code> para evitar processamento duplicado — armazene os IDs já processados e ignore reenvios.</p>
            </WarnBox>
          </DocSection>

          {/* ── Planos ── */}
          <DocSection id="planos">
            <H2>Planos e monetização</H2>
            <P>
              Os planos são cadastrados no painel admin e aparecem na página de vendas do extensor.
              O escritório escolhe um plano na hora de instalar. A cobrança é processada
              fora da plataforma VisionBiz — você recebe uma notificação via webhook <Code>app.instalado</Code>
              com o plano escolhido.
            </P>

            <div className="overflow-hidden rounded-xl border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Modelo</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Quando usar</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Valor na plataforma</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-xs">
                  {[
                    ['gratuito',  'Versão sem custo ou freemium de entrada',            'R$ 0'],
                    ['mensal',    'Assinatura recorrente — modelo mais comum',           'R$ fixo/mês'],
                    ['anual',     'Assinatura anual com desconto',                       'R$ fixo/ano'],
                    ['por_uso',   'Cobrado por volume (ex: por emissão de certificado)', 'Variável'],
                    ['por_lead',  'Cobrado por cliente atendido',                        'Variável'],
                  ].map(([t, desc, val]) => (
                    <tr key={t} className="hover:bg-muted/20">
                      <td className="px-4 py-2.5 font-mono text-primary">{t}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{desc}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{val}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <H3>Payload de app.instalado com plano</H3>
            <CodeBlock lang="json">{`{
  "evento": "app.instalado",
  "escritorio_id": "esc_xyz789",
  "dados": {
    "installation_id": "inst_123",
    "plano_id":        "pro",
    "plano_nome":      "Pro",
    "tipo_cobranca":   "mensal",
    "valor":           49.00,
    "escopos_aprovados": ["clientes:read", "documentos:write", "tarefas:write"]
  }
}`}
            </CodeBlock>
          </DocSection>

          {/* ── Publicação ── */}
          <DocSection id="publicacao">
            <H2>Como publicar um extensor</H2>

            <ol className="space-y-5">
              {[
                {
                  n: '1',
                  title: 'Crie o extensor no painel admin',
                  desc: 'Acesse Admin → Extensores → Novo extensor. Preencha as abas Geral, Página de vendas, Técnico e Planos.',
                },
                {
                  n: '2',
                  title: 'Configure seu ambiente',
                  desc: 'Implante seu endpoint (conectado) ou aplicação (embed) em um servidor com HTTPS. Configure CORS e garanta alta disponibilidade — o VisionBiz acessa o endpoint a cada intervalo configurado.',
                },
                {
                  n: '3',
                  title: 'Teste com um escritório piloto',
                  desc: 'Antes de publicar, mude o status para "Em revisão" e instale o extensor em um escritório de teste. Valide o JWT, o retorno do gadget e os webhooks.',
                },
                {
                  n: '4',
                  title: 'Envie para revisão',
                  desc: 'Altere o status para "Em revisão" no painel admin. A equipe VisionBiz verificará o manifesto, testará o endpoint e validará a página de vendas.',
                },
                {
                  n: '5',
                  title: 'Aprovação e publicação',
                  desc: 'Após aprovação, o status é alterado para "Publicado" e o extensor aparece imediatamente na loja para todos os escritórios.',
                },
                {
                  n: '6',
                  title: 'Monitore e itere',
                  desc: 'Acompanhe a taxa de instalação no painel admin. Para atualizar o manifesto (novos escopos ou slots), crie uma nova versão — escritórios instalados receberão uma notificação para aceitar as novas permissões.',
                },
              ].map(({ n, title, desc }) => (
                <li key={n} className="flex gap-4">
                  <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    {n}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="rounded-xl border bg-gradient-to-br from-primary/8 to-primary/3 p-6 text-center space-y-3 mt-6">
              <p className="font-bold text-lg">Pronto para publicar?</p>
              <p className="text-sm text-muted-foreground">Crie ou acesse seu extensor no painel admin para começar.</p>
              <div className="flex justify-center gap-3">
                <Button asChild>
                  <Link to="/admin/catalogo/novo">Criar extensor</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/admin/catalogo">Ver catálogo</Link>
                </Button>
              </div>
            </div>
          </DocSection>

        </main>
      </div>

      {/* Footer */}
      <footer className="border-t mt-10 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
              <Store className="w-3 h-3 text-primary" />
            </div>
            <span>VisionBiz · Documentação para desenvolvedores</span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <Link to="/loja" className="hover:text-foreground">Loja</Link>
            <Link to="/admin/catalogo" className="hover:text-foreground">Admin</Link>
            <a href="mailto:dev@visionbiz.com.br" className="hover:text-foreground">dev@visionbiz.com.br</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
