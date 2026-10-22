# PRD: Roadmap de Pendências — Ecossistema de Conexões VisionBiz

**Versão:** 1.0 | **Data:** 2026-10-18 | **Status:** Aprovado para execução

---

## Contexto

O sistema de Conexões (apps/extensões) da VisionBiz tem o contrato técnico definido (Fase 0) e toda a camada de UI/front-end construída. As pendências se concentram em quatro blocos:

1. **Fase 1:** migração do backend de localStorage para Supabase com RLS real
2. **Fase 2:** automação do app piloto Certificado Digital (alertas, renovação, cobrança)
3. **Fase 3:** monetização real (assinaturas, Asaas, ledger, comissões)
4. **Fase 4:** Portal do Desenvolvedor e renderizadores de gadget externos

Cada fase é pré-requisito da seguinte. A Fase 4, por ser independente de fluxo financeiro, pode avançar em paralelo com as Fases 2 e 3 após a Fase 1 estar estável.

---

## Fase 1 — Backend Supabase + RLS

### Objetivo
Substituir o localStorage por Supabase, garantindo isolamento real entre tenants (RLS), persistência e fundação para webhooks e automações das fases seguintes.

### Tabelas a criar (migração do modelo de dados do PRD original)

```sql
-- Apps e versões
apps (id, slug, nome, tipo, owner_id, status, icone, descricao, descricao_longa,
      categoria, desenvolvedor, site_desenvolvedor, avaliacao, instalacoes_count,
      destaque, banner_url, screenshots, video_url, recursos, tags, criado_em)

app_versions (id, app_id, versao, manifesto_json, publicado_em)   -- imutável

app_plans (id, app_id, nome, tipo_cobranca, valor, periodicidade)

-- Instalações e permissões
app_installations (id, app_id, app_version_id, escritorio_id, cliente_id,
                   instalado_por, status, instalado_em, revogado_em)

app_grants (id, installation_id, escopo, concedido_em, revogado_em)

app_visibility (id, escritorio_id, app_id, visivel, destaque)

-- Monetização (estrutura; fluxo real na Fase 3)
subscriptions (id, installation_id, plan_id, escritorio_id, app_id,
               status, inicio, fim, criado_em)

commission_rules (id, app_id, escritorio_id, tipo, valor)

ledger (id, tipo, subscription_id, escritorio_id, app_id,
        valor, referencia, criado_em)   -- apenas INSERT, nunca UPDATE/DELETE

-- Eventos e webhooks (estrutura; envio real na Fase 2/3)
app_events (id, tipo, escritorio_id, cliente_id, payload, criado_em)
webhook_deliveries (id, installation_id, evento_id, status,
                    tentativas, proximo_retry, ultimo_erro, criado_em)
```

### Políticas RLS obrigatórias

| Tabela | Regra |
|---|---|
| `app_installations` | escritório lê/escreve só suas próprias; cliente lê só as suas |
| `app_grants` | leitura via installation → escritorio_id do tenant |
| `app_visibility` | escritório lê/escreve só as suas |
| `subscriptions` | escritório lê/escreve só as suas |
| `ledger` | escritório lê só as suas; sem UPDATE/DELETE para ninguém |
| `app_events` | escritório lê só os seus |
| `apps` / `app_versions` | leitura pública para publicados; escrita só por owner ou visionbiz_admin |

### Implementações a criar/substituir

| Arquivo atual (localStorage) | Substituir por |
|---|---|
| `src/data/repositories/localStorage/AppRepository.ts` | `src/data/repositories/supabase/AppRepository.ts` |
| `src/data/repositories/localStorage/AppVersionRepository.ts` | Supabase |
| `src/data/repositories/localStorage/AppInstallationRepository.ts` | Supabase |
| `src/data/repositories/localStorage/AppGrantRepository.ts` | Supabase |
| `src/data/repositories/localStorage/AppVisibilityRepository.ts` | Supabase |
| `src/data/repositories/localStorage/AppPlanRepository.ts` | Supabase |

Seguir o padrão já existente em `src/lib/storage/` (módulo único, interface comum).

### Critério de aceite — Fase 1

- [ ] App instalado pelo escritório persiste após refresh e logout
- [ ] Cliente conecta um app; instalação aparece com `cliente_id` no banco
- [ ] Desconectar revoga grants no banco (não apenas no estado local)
- [ ] Tenant A não consegue ler instalações do tenant B (teste de RLS)
- [ ] Slot `escritorio.dashboard.widget` do Certificado Digital renderiza dados do Supabase

---

## Fase 2 — Certificado Digital: Automação Completa

### Objetivo
Fechar o ciclo do app piloto: vencimento detectado → Ocorrência criada → cliente notificado → renovação solicitada → cobrança gerada → ledger atualizado.

### Fluxo completo

```
Certificado com validade ≤ 90 dias
  └─► Job diário detecta (Supabase Edge Function ou cron)
        ├─► Cria Ocorrência no módulo de Tarefas (escopo tarefas:write)
        ├─► Envia notificação ao cliente (escopo notificacoes:send)
        │     └─► Canal: WhatsApp (via integração existente) ou e-mail
        └─► Atualiza status do certificado: 'vencendo'

Cliente abre notificação → portal → "Solicitar Renovação"
  └─► Cria solicitação de serviço vinculada ao certificado
        └─► Escritório recebe alerta → aprova → gera cobrança (Financeiro)
              └─► Pagamento confirmado → lança no ledger (Fase 3)
```

### Requisitos funcionais

- **RF-C01:** Job diário (ou trigger no Supabase) varre `certificados_digitais` buscando `validade ≤ hoje + 90 dias` e `status != 'vencido'`.
- **RF-C02:** Para cada certificado encontrado, verifica se já existe Ocorrência aberta para aquele certificado naquele ciclo (evitar duplicata).
- **RF-C03:** Cria Ocorrência com: título "Certificado vencendo — {titular}", prazo = data de vencimento, vinculada ao cliente.
- **RF-C04:** Envia notificação ao cliente via canal configurado no escritório (WhatsApp/e-mail). Texto parametrizável.
- **RF-C05:** Atualiza `status` do certificado para `'vencendo'` (se ainda não estava).
- **RF-C06:** Portal do cliente mostra botão "Solicitar Renovação" em certificados com status `vencendo` ou `vencido`.
- **RF-C07:** "Solicitar Renovação" cria `SolicitacaoServico` com tipo "renovacao_certificado" e referência ao certificado.
- **RF-C08:** Escritório vê a solicitação em Tarefas/Ocorrências e pode aprovar, gerando uma cobrança no Financeiro.

### Arquivos a criar/modificar

| Arquivo | O que fazer |
|---|---|
| `supabase/functions/cert-alerts/index.ts` | Edge Function: job de alertas diário |
| `src/apps/certificado-digital/CertificadosPortalCard.tsx` | Card na home do cliente com status e botão "Solicitar Renovação" |
| `src/pages/cliente/PortalCertificados.tsx` | Adicionar botão "Solicitar Renovação" por certificado |
| `src/data/repositories/supabase/CertificadoDigitalRepository.ts` | Busca certificados vencendo |
| Slot `portal.inicio.servico` | Registrar `CertificadosPortalCard` no registry do portal |

### Critério de aceite — Fase 2

- [ ] Certificado com vencimento em 30 dias aparece como "Vencendo" no dashboard do escritório
- [ ] Job cria Ocorrência no módulo de Tarefas para o cliente correspondente
- [ ] Cliente recebe notificação (WhatsApp ou e-mail) com os dados do certificado
- [ ] Botão "Solicitar Renovação" aparece no portal do cliente
- [ ] Solicitação de renovação aparece na lista de Tarefas/Ocorrências do escritório

---

## Fase 3 — Monetização: Assinaturas, Ledger e Comissões

### Objetivo
Fazer cada centavo de uma transação de app aparecer no ledger de forma auditável, com split automático via Asaas para escritório e plataforma.

### Fluxo de pagamento

```
Cliente/Escritório escolhe plano → AssinarPlanoDialog → cria Subscription
  └─► Gera cobrança no Asaas (API) → retorna link de pagamento
        └─► Webhook Asaas: payment.confirmed
              └─► Edge Function verifica assinatura HMAC
                    └─► INSERT no ledger:
                          - tipo: 'receita' (valor bruto)
                          - tipo: 'comissao_escritorio' (conforme CommissionRule)
                          - tipo: 'comissao_plataforma' (saldo)
                    └─► Atualiza Subscription.status = 'ativa'
                    └─► Emite evento app: 'cobranca.paga'
```

### Requisitos funcionais

- **RF-M01:** `AssinarPlanoDialog` chama API real do Asaas e retorna link de pagamento (não apenas cria registro local).
- **RF-M02:** Webhook `/api/asaas/webhook` recebe confirmação de pagamento, valida HMAC, executa split.
- **RF-M03:** `CommissionRule` do app é lida no momento do split; se não houver regra específica do escritório, usa a regra padrão do app.
- **RF-M04:** Cada lançamento no ledger tem: `valor` (sempre positivo), `tipo` (define se é crédito ou débito), `referencia` (ID da cobrança Asaas), `criado_em`. Sem UPDATE ou DELETE — estornos são novos registros.
- **RF-M05:** Tela de comissões no painel VisionBiz Admin (`/admin/comissoes`): filtro por período, por app, por escritório; total por linha e consolidado.
- **RF-M06:** Escritório vê seus ganhos de comissão em `/escritorio/configuracoes/financeiro-apps` (novo).
- **RF-M07:** Cancelamento de assinatura emite evento `app.desinstalado` e revoga grants.

### Arquivos a criar/modificar

| Arquivo | O que fazer |
|---|---|
| `supabase/functions/asaas-webhook/index.ts` | Recebe webhook, valida, grava ledger, emite evento |
| `src/pages/escritorio/AppStore/AssinarPlanoDialog.tsx` | Integrar chamada real ao Asaas |
| `src/pages/admin/Comissoes/ComissoesPage.tsx` | Já existe esqueleto; completar com dados reais |
| `src/data/repositories/supabase/LedgerRepository.ts` | Apenas INSERT, leitura por escritório/app/período |
| `src/data/repositories/supabase/SubscriptionRepository.ts` | CRUD de assinaturas |

### Critério de aceite — Fase 3

- [ ] Assinar um plano gera cobrança real no Asaas
- [ ] Pagamento confirmado aparece no ledger com 3 linhas (receita + comissão_escritorio + comissão_plataforma)
- [ ] Soma das 3 linhas = valor bruto da assinatura
- [ ] Relatório de comissões do admin bate com o ledger
- [ ] Cancelamento revoga grants imediatamente

---

## Fase 4 — Portal do Desenvolvedor

### Objetivo
Permitir que um parceiro externo publique um app no ecossistema VisionBiz sem precisar de acesso ao repositório ou intervenção do time técnico da VisionBiz.

---

### Etapa 4.1 — Cadastro do Parceiro

**Rota:** `/developers` (pública)

**Formulário:**
- Razão social, CNPJ, site, e-mail técnico
- Nome do responsável técnico
- Aceite do Contrato de Parceria (versão versionada, armazenada com timestamp)

**Resultado:**
- Conta de desenvolvedor criada (papel `parceiro` no sistema de auth)
- API key de sandbox gerada automaticamente
- E-mail de boas-vindas com link para o dashboard

**Modelo de dados:**
```sql
parceiros (id, razao_social, cnpj, site, email_tecnico,
           responsavel, status, contrato_versao, aceito_em, criado_em)

parceiro_api_keys (id, parceiro_id, key_hash, ambiente [sandbox|producao],
                   criado_em, revogado_em)
```

**Critério de aceite:**
- [ ] Formulário valida CNPJ
- [ ] API key de sandbox é exibida uma vez (não recuperável depois)
- [ ] Parceiro consegue fazer login no dashboard com as credenciais criadas

---

### Etapa 4.2 — Criação do App (Self-Service)

**Rota:** `/developers/dashboard` e `/developers/apps/novo`

**Campos do formulário:**
- Nome, descrição curta, descrição longa
- Ícone (upload), banner (upload), screenshots (até 5)
- URL de vídeo de demonstração (YouTube)
- Categoria, tags
- Tipo: `embarcado` | `conectado` | `embed`
- Escopos solicitados (checkboxes com explicação em linguagem clara)
- Eventos que quer receber (checkboxes)
- Planos e preços (formulário dinâmico: nome, tipo de cobrança, valor)

**Fluxo de status:**
```
rascunho → em_revisao → publicado
                      → suspenso (por violação)
```

**Critério de aceite:**
- [ ] Parceiro cria um app em `rascunho` e pode editá-lo
- [ ] Submeter para revisão muda status para `em_revisao` e notifica o time VisionBiz
- [ ] Parceiro vê histórico de versões do manifesto

---

### Etapa 4.3 — Configuração dos Gadgets

**Rota:** `/developers/apps/:id/gadgets`

Para cada gadget, o parceiro configura via formulário:

**Campo obrigatório:** Slot (select com lista de `AppSlotSlug` disponíveis)
**Campo obrigatório:** Scope (`escritorio` | `portal` | `ambos`)
**Campo obrigatório:** Tamanho (`pequeno` | `medio` | `grande`)

**Conforme o tipo do app:**

| Tipo | Campos adicionais |
|---|---|
| `embarcado` | Nome do componente React (registrado via SDK CLI) |
| `conectado` | URL do endpoint, método (GET/POST), header de autenticação, intervalo de refresh (segundos), mapeamento de campos (JSON editor) |
| `embed` | URL base do iframe, lista de parâmetros do JWT que o iframe receberá |

**Renderizadores a construir (front-end):**

**`src/components/shared/slots/ConnectedGadget.tsx`**
- Recebe `GadgetSpec` com `dataEndpoint`
- Faz fetch para o endpoint do parceiro (proxy via Edge Function para evitar CORS e expor credenciais)
- Renderiza os dados em card com esqueleto padrão VisionBiz
- Exibe estado de carregamento, erro, e vazio de forma consistente
- Timeout de 5s; falha exibe card com mensagem "Serviço temporariamente indisponível"

**`src/components/shared/slots/EmbedGadget.tsx`**
- Recebe `GadgetSpec` com `embedUrl`
- Gera JWT assinado com escopos concedidos + `tenant_id`, `cliente_id`, `user_id`
- Renderiza `<iframe src="{embedUrl}?token={jwt}" sandbox="allow-scripts allow-same-origin" />`
- Comunicação bidirecional via `postMessage` com schema definido:
  ```typescript
  // Mensagens que VisionBiz aceita do iframe
  type EmbedMessageIn =
    | { type: 'resize'; height: number }
    | { type: 'navigate'; path: string }   // navega dentro do portal
    | { type: 'toast'; message: string; variant?: 'default' | 'destructive' }

  // Mensagens que VisionBiz envia ao iframe
  type EmbedMessageOut =
    | { type: 'context'; tenant: object; user: object; cliente?: object }
    | { type: 'theme'; mode: 'light' | 'dark'; primaryColor: string }
  ```

**Proxy Edge Function:**
```
supabase/functions/gadget-proxy/index.ts
  └─► Recebe: { installation_id, endpoint_url, method, body? }
  └─► Verifica: installation ativa + escopo concedido
  └─► Chama endpoint do parceiro com authHeader da GadgetSpec
  └─► Retorna resposta ao front-end
  └─► Log: tentativa, status, latência
```

**Critério de aceite:**
- [ ] Parceiro configura um gadget `conectado` com um endpoint mock e ele renderiza no dashboard do escritório
- [ ] Parceiro configura um gadget `embed` e o iframe abre com o token JWT correto
- [ ] Iframe consegue enviar mensagem `toast` e aparece no VisionBiz
- [ ] Proxy recusa chamada se installation não estiver ativa

---

### Etapa 4.4 — Revisão e Publicação

**Rota (admin):** `/admin/apps` — fila de revisão

**Checklist de revisão (gerado automaticamente, revisado manualmente):**
- [ ] Manifesto válido (JSON schema)
- [ ] Escopos solicitados justificados na descrição
- [ ] Endpoint de gadget `conectado` responde (teste automatizado)
- [ ] Iframe de gadget `embed` carrega sem erro de CSP
- [ ] Descrição não contém promessas enganosas
- [ ] Contrato do parceiro assinado e vigente

**Ações do revisor VisionBiz:**
- `Aprovar` → status `publicado`, app aparece no catálogo
- `Solicitar ajuste` → parceiro recebe comentário com o que falta (sem voltar para rascunho)
- `Suspender` → remove do catálogo imediatamente, mantém histórico

**Notificações automáticas:**
- Parceiro recebe e-mail quando o status muda
- Time VisionBiz recebe alerta quando novo app entra em `em_revisao`

**Critério de aceite — Fase 4 completa:**
- [ ] Parceiro externo passa pelas 4 etapas sem intervenção de código no repositório VisionBiz
- [ ] App publicado aparece no catálogo `/loja`
- [ ] Gadget `conectado` exibe dados reais do endpoint do parceiro no dashboard do escritório
- [ ] Gadget `embed` abre o front-end do parceiro dentro do portal com JWT válido
- [ ] Revogação do app remove gadgets de todas as telas imediatamente

---

## Dependências e ordem de execução

```
Fase 1 (Supabase)
  └─► Fase 2 (Automação Cert. Digital)
  └─► Fase 3 (Monetização)          ← pode iniciar em paralelo com Fase 2
  └─► Fase 4 (Portal Dev)
        ├─► Etapa 4.1 e 4.2         ← independentes, podem iniciar após Fase 1
        ├─► Etapa 4.3 (gadgets)     ← depende de Fase 1 + tipos já definidos ✅
        └─► Etapa 4.4 (revisão)     ← depende de 4.1 + 4.2
```

## Estimativa de complexidade

| Fase / Etapa | Complexidade | Dependência crítica |
|---|---|---|
| Fase 1 — Supabase + RLS | Alta | Supabase projeto configurado |
| Fase 2 — Automação Cert. | Média | Fase 1 + WhatsApp/e-mail funcionando |
| Fase 3 — Monetização | Alta | Fase 1 + conta Asaas |
| Etapa 4.1 — Cadastro parceiro | Baixa | Fase 1 |
| Etapa 4.2 — Criação de app | Média | Etapa 4.1 |
| Etapa 4.3 — Gadgets + renderizadores | Alta | Fase 1 + tipos ✅ já definidos |
| Etapa 4.4 — Revisão/publicação | Baixa | Etapas 4.1 + 4.2 |

## O que já está pronto (não precisa ser feito)

- Contrato técnico: tipos `GadgetSpec`, `GadgetContext`, `AppTipo: 'embed'`, slots expandidos
- UI front-end completa: vitrine, landing page, AppStorePage, PortalApps com catálogo + "Meus Serviços"
- Fluxo de contratação direta pelo cliente (Model B)
- Hooks: `useInstalarApp`, `useConectarAppCliente`, `useDesconectarAppCliente`, `useAppInstallationsByCliente`
- App piloto Certificado Digital: telas, tipos, seed, dashboard card, aba no portal
- Estrutura de dados de monetização: tipos `Subscription`, `LedgerEntry`, `CommissionRule`
- Renaming "Loja" → "Conexões" em toda a UI
