# PRD: Loja de Apps e Extensões da VizionBiz (Fase 0: Contrato de Integração)

Status: rascunho v0.1 | Data: 2026-10-16
Destino sugerido no repositório: `docs/prd/app-store.md`

---

## 1. Contexto

A VizionBiz conecta escritórios contábeis aos seus clientes (DriveHub, financeiro, Tarefas, cadastro de clientes, constituição de empresas). A plataforma já tem a base necessária para que outros aplicativos se conectem a ela.

Inspiração: o modelo do Google Chrome, em que o usuário instala extensões (do Google e de terceiros) a partir de uma loja (Chrome Web Store). Na VizionBiz:

- o **escritório** disponibiliza apps aos seus clientes e pode receber comissão quando o app é pago;
- o **cliente** entra na loja e instala;
- cada app é uma **extensão da plataforma** e usa a base (clientes, contratos, financeiro, documentos) como referência;
- a plataforma, em sentido inverso, **recebe componentes** dos apps em pontos de extensão definidos.

Exemplos de apps: certificado digital (armazenar, controlar vencimento, adquirir novo), OnDesc (descontos em energia elétrica), NetNotas (emissor de notas), e outros que virão.

## 2. Problema e oportunidade

- Hoje cada serviço complementar (certificado, energia, notas) é integrado de forma pontual, sem padrão. Cada novo serviço exige desenvolvimento sob medida.
- O escritório não tem um canal único para oferecer e cobrar esses serviços dos seus clientes, nem para ganhar comissão de forma rastreável.
- Não há um contrato técnico que permita a terceiros construir apps sobre a base.

## 3. Objetivos

1. Definir o **contrato de integração** (manifesto, escopos, eventos, pontos de extensão) que todo app deve cumprir.
2. Permitir **instalação por escritório e por cliente**, com consentimento explícito de permissões.
3. Oferecer uma **loja (vitrine)** com curadoria do escritório.
4. Preparar **cobrança e comissão** configuráveis e auditáveis.
5. Entregar o **primeiro app (Certificado Digital)** de ponta a ponta como prova do modelo.
6. Garantir **isolamento entre tenants** e conformidade com a LGPD.

## 4. Não objetivos (por ora)

- Abrir a loja a desenvolvedores terceiros (Fase 4).
- Marketplace público fora da base de escritórios.
- Reescrever módulos existentes (DriveHub, financeiro, Tarefas): eles apenas passam a expor pontos de extensão.
- Decidir de forma definitiva titularidade do cliente final, modelo de comissão e papel na LGPD (ver seção 12: o sistema deve ser configurável).

## 5. Atores

| Ator | Papel |
|---|---|
| VizionBiz | Dona da plataforma e da loja; define o contrato, cobra e repassa |
| Escritório | Distribuidor: escolhe apps da vitrine, define visibilidade, recebe comissão |
| Cliente final | Instala o app, aceita permissões, paga |
| Parceiro/Desenvolvedor | Dono do app (inicialmente a própria VizionBiz e empresas do grupo; terceiros depois) |

## 6. Conceitos

- **App:** unidade instalável com manifesto, versões, planos e pontos de extensão.
- **Manifesto:** declaração do app (nome, escopos pedidos, eventos que assina, slots que preenche, planos de preço).
- **Instalação:** vínculo de um app a um escritório e/ou a um cliente, com escopos concedidos.
- **Escopo:** permissão granular de leitura/escrita sobre um recurso da base (ex.: `clientes:read`).
- **Slot:** ponto de extensão da UI onde o app pode renderizar um componente.
- **Evento:** fato ocorrido na plataforma, entregue ao app por webhook ou barramento.
- **Tipos de app:**
  - **Embarcado:** roda dentro da plataforma (iframe/microfrontend), na mesma sessão.
  - **Conectado:** sistema externo que usa API e OAuth.

## 7. Requisitos funcionais

### 7.1 Registro e manifesto
- RF-01: cadastrar app com manifesto versionado (JSON validado por schema).
- RF-02: cada versão do manifesto é imutável após publicada; mudanças de escopo exigem nova versão e novo consentimento.
- RF-03: status do app: rascunho, em revisão, publicado, suspenso.

### 7.2 Loja e instalação
- RF-04: catálogo de apps com busca, categorias, descrição, planos e permissões pedidas.
- RF-05: o escritório define quais apps aparecem para seus clientes (vitrine própria) e pode ocultar ou destacar.
- RF-06: o cliente instala o app vendo, em linguagem clara, os escopos solicitados; sem aceite não há instalação.
- RF-07: desinstalar revoga imediatamente os escopos e tokens do app.
- RF-08: instalação em dois níveis: (a) escritório habilita o app; (b) cliente instala (ou o escritório instala em nome do cliente, com registro).

### 7.3 Permissões (escopos)
- RF-09: toda chamada de app à API passa por verificação de escopo concedido.
- RF-10: escopos iniciais sugeridos: `clientes:read`, `clientes:write`, `contratos:read`, `financeiro:read`, `financeiro:write`, `documentos:read`, `documentos:write`, `tarefas:write`, `notificacoes:send`.
- RF-11: o app só enxerga dados do cliente (ou escritório) que o instalou.

### 7.4 Pontos de extensão (slots)
- RF-12: slots iniciais: `dashboard.card`, `cliente.aba`, `driveHub.acao`, `financeiro.acao`, `tarefas.gerador` (app cria Ocorrências/Tarefas), `menu.item`.
- RF-13: cada slot define contrato de dados de entrada (contexto: escritório, cliente, usuário) e limites de tamanho/estilo.
- RF-14: app que falha ou demora a responder não pode quebrar a tela da plataforma (isolamento e timeout).

### 7.5 Eventos e webhooks
- RF-15: eventos iniciais: `cliente.criado`, `documento.baixado`, `cobranca.vencida`, `cobranca.paga`, `contrato.criado`, `app.instalado`, `app.desinstalado`.
- RF-16: entrega com assinatura (HMAC), reentrega com backoff e registro de tentativas.

### 7.6 Cobrança e comissão
- RF-17: cada app define um ou mais planos (gratuito, mensal, anual, por uso, por lead).
- RF-18: regra de comissão configurável por app e por escritório (percentual, valor fixo, ou nenhuma).
- RF-19: todo valor gerado vira lançamento em um **ledger imutável** (apenas inserção; estornos são novos lançamentos).
- RF-20: divisão (split) via Asaas, quando houver pagamento processado pela plataforma.
- RF-21: relatório de comissões por escritório, por app e por período.

### 7.7 Auditoria
- RF-22: log de instalações, concessão e revogação de escopo, chamadas de API por app e eventos entregues.

## 8. Requisitos não funcionais

- **Isolamento de tenants:** RLS no Supabase por escritório; app nunca recebe dados de outro tenant.
- **Segurança:** tokens de app com escopo e expiração; segredos de webhook por instalação; sem acesso direto ao banco por apps.
- **LGPD:** base legal e finalidade registradas por escopo; consentimento versionado; direito de revogação; minimização (o app recebe só o necessário).
- **Desempenho:** slots não bloqueiam o carregamento da página; timeout padrão de 3 s.
- **Observabilidade:** erros por app visíveis ao escritório e à VizionBiz.
- **Compatibilidade:** não alterar fluxos existentes; os módulos atuais apenas passam a emitir eventos e expor slots.

## 9. Modelo de dados (rascunho)

```
apps(id, slug, nome, tipo[embarcado|conectado], owner_parceiro_id, status, criado_em)
app_versions(id, app_id, versao, manifesto_json, publicado_em)           -- imutável
app_plans(id, app_id, nome, tipo_cobranca, valor, periodicidade)
app_installations(id, app_id, app_version_id, escritorio_id, cliente_id NULL,
                  instalado_por, status, instalado_em, revogado_em)
app_grants(id, installation_id, escopo, concedido_em, revogado_em)
app_visibility(id, escritorio_id, app_id, visivel, destaque)
subscriptions(id, installation_id, plan_id, status, inicio, fim)
commission_rules(id, app_id, escritorio_id NULL, tipo, valor)            -- NULL = regra padrão
ledger(id, tipo, subscription_id, escritorio_id, app_id, valor, referencia, criado_em)  -- só INSERT
app_events(id, tipo, escritorio_id, cliente_id, payload, criado_em)
webhook_deliveries(id, installation_id, evento_id, status, tentativas, ultimo_erro)
```

`cliente_id NULL` em `app_installations` significa instalação no nível do escritório.

## 10. Exemplo de manifesto: app Certificado Digital

```json
{
  "slug": "certificado-digital",
  "nome": "Certificado Digital",
  "tipo": "embarcado",
  "versao": "1.0.0",
  "descricao": "Armazene seus certificados, acompanhe vencimentos e renove com antecedência.",
  "escopos": [
    "clientes:read",
    "documentos:read",
    "documentos:write",
    "financeiro:write",
    "tarefas:write",
    "notificacoes:send"
  ],
  "slots": ["cliente.aba", "dashboard.card", "tarefas.gerador"],
  "eventos_assinados": ["cliente.criado", "cobranca.paga"],
  "planos": [
    { "id": "gratuito", "nome": "Controle de vencimentos", "valor": 0 },
    { "id": "renovacao", "nome": "Emissão/renovação", "valor": "por_emissao" }
  ],
  "comissao_padrao_sugerida": { "tipo": "percentual", "valor": "a definir" }
}
```

## 11. Fluxos principais

**Instalação:** cliente abre a loja → escolhe o app → vê escopos e plano → aceita → plataforma cria instalação e grants → emite evento `app.instalado` → slots do app passam a aparecer.

**Certificado Digital (app piloto):**
1. App guarda os dados do certificado (tipo, titular, validade) vinculados ao cliente.
2. Slot `cliente.aba` mostra os certificados e o status.
3. Slot `dashboard.card` lista vencimentos dos próximos 30/60/90 dias para o escritório.
4. Quando faltam N dias, o app cria Ocorrência em Tarefas (`tarefas.gerador`) e envia notificação ao cliente.
5. Cliente solicita renovação → cobrança gerada no financeiro → pagamento gera lançamento no ledger (com comissão ao escritório, conforme regra).

**Comissão:** pagamento confirmado → ledger registra valor bruto, parte do parceiro, parte do escritório e parte da plataforma → split via Asaas → relatório.

## 12. Decisões em aberto (o sistema deve suportar as opções)

| Decisão | Como preparar |
|---|---|
| Titularidade do cliente final (escritório ou VizionBiz) | Campo de origem/titular na instalação; relatórios não dependem da resposta |
| Modelo de comissão | `commission_rules` flexível por app e por escritório |
| Papel na LGPD (controlador/operador) | Texto de consentimento parametrizável e versionado por escopo |
| Loja pública ou por convite do escritório | `app_visibility` por escritório, com padrão configurável |

## 13. Fases e critérios de aceite

**Fase 0: Contrato (este PRD).** Entregáveis: schema do manifesto, lista de escopos, lista de slots, lista de eventos, modelo de dados validado. Aceite: documento revisado e aprovado.

**Fase 1: Módulos instaláveis (apps próprios).** Registro de apps, instalação por escritório/cliente, grants, vitrine do escritório, slots básicos. Pré-requisito: backend real no Supabase (o MVP em localStorage não sustenta instalação e permissão reais). Aceite: um app de teste é instalado, aparece no slot e é revogado sem deixar acesso.

**Fase 2: Certificado Digital.** Fluxo completo da seção 11. Aceite: vencimento gera Ocorrência em Tarefas e notificação; renovação gera cobrança.

**Fase 3: Dinheiro.** Planos, assinaturas, ledger, split Asaas, relatório de comissões. Aceite: cada centavo de um pagamento aparece no ledger e bate com o split.

**Fase 4: Terceiros.** SDK, portal do desenvolvedor, revisão de apps, política de segurança e termos. Aceite: um parceiro externo publica um app sem intervenção de código da VizionBiz.

Apps seguintes: OnDesc (indicação de leads com comissão), NetNotas (emissor de notas).

## 14. Riscos

| Risco | Mitigação |
|---|---|
| Vazamento entre tenants | RLS desde a Fase 1; testes automatizados de isolamento |
| App lento ou com falha derruba a tela | Isolamento por iframe/timeout; falha mostra estado vazio |
| Comissão sem trilha clara | Ledger imutável desde o início |
| Excesso de permissões pedidas | Escopos granulares; revisão de manifesto; consentimento claro |
| Escopo grande demais | Fases curtas; Fase 2 prova o modelo antes da Fase 3 |
| Decisões jurídicas pendentes | Configurabilidade (seção 12) e revisão jurídica antes da Fase 3 |

## 15. Instruções para execução via Claude Code

1. Antes de implementar, **analisar o repositório** e reportar: o que já existe de autenticação, tenants, RLS, DriveHub, financeiro e Tarefas que possa ser reaproveitado.
2. **Preservar os fluxos atuais**; módulos existentes só ganham emissão de eventos e slots.
3. Propor a migração das tabelas da seção 9 em arquivo separado, para revisão antes de aplicar.
4. Implementar por fase, com critérios de aceite da seção 13 como checklist.
5. Registrar qualquer divergência entre este PRD e o código existente antes de decidir.
