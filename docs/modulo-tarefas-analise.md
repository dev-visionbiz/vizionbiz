# Módulo Unificado de Tarefas — Análise e Proposta

> Gerado em 30/09/2026 · Investigação somente-leitura do código existente

---

## 1. Resumo Executivo

O VisionBiz possui hoje três módulos separados: **Tarefas** (fila de execução unificada), **Demandas** (processos avulsos com etapas) e **Obrigações** (obrigações fiscais recorrentes). A página Tarefas (`src/pages/escritorio/Tarefas/TarefasPage.tsx`) já unifica a *execução* de ambos os tipos em uma `TarefaUnificada` — o trabalho de execução está maduro e não deve ser degradado.

O que a unificação proposta adiciona é um novo vocabulário de **Ocorrência** (caso/processo por cliente, substitui o conceito de tarefa-pai) e **Rotina** (regra de recorrência, substitui Obrigação) com **Fluxo** como template. A nova estrutura é: Rotina gera Ocorrências, Fluxo é o template, Ocorrência agrupa Tarefas, Tarefa é o item executável com checklist e histórico.

Nenhuma lógica de execução (checklist com timer, histórico de eventos, impedimentos, painel de equipe, urgência calculada) precisa ser reescrita — ela já existe e funciona. A migração é principalmente de **modelo de dados** e **navegação**.

---

## 2. Estado Atual

### A.1 — Módulo Tarefas

#### Rotas e arquivos
- **Rota:** `/escritorio/tarefas` (`src/router/index.tsx`, linhas 72-73)
- **Guard:** `<EscritorioRoute modulo="tarefas">`
- **Página:** `src/pages/escritorio/Tarefas/TarefasPage.tsx` (1.272 linhas)
- **Componentes shared:** `src/components/shared/ChecklistProgresso.tsx`, `src/components/shared/HistoricoPanel.tsx`
- **Componente de detalhe (Obrigações):** `src/pages/escritorio/Obrigacoes/TarefaObrigacaoDetalheConteudo.tsx` (573 linhas)

#### Entidades consumidas
| Entidade | Tipo | Storage key |
|---|---|---|
| `TarefaObrigacao` | Tarefa de obrigação (por etapa + competência + cliente) | `vb_tarefas_obrigacao` |
| `EtapaDemandaEspecifica` | Etapa de demanda específica | `vb_etapas_demanda_especifica` |
| `HistoricoTarefa` | Auditoria de eventos | `vb_historico_tarefa` |

#### Interface unificada (TarefasPage.tsx, linhas 38-62)
```ts
interface TarefaUnificada {
  id, tipo: 'obrigacao' | 'demanda', clienteNome, clienteId,
  titulo, subtitulo, dataPrevista, dataConclusao?, status,
  responsavelId, responsavelNome, urgencia,
  descricao?, observacoes?,
  impedimentoDescricao?, impedimentoResponsavel?, impedimentoResponsavelNome?, impedimentoData?,
  tarefaObrigacaoId?, etapaDemandaId?, demandaId?,
  checklistProgresso?, etapaChecklist?
}
```

#### Hooks usados
- `useTarefasObrigacao.ts`: `useTarefasTenant`, `useTarefasCompetencia`, `useTarefasEtapa`, `useUpdateTarefa`, `useUpdateTarefasLote`, `useUpdateChecklistTarefaObrigacao`, `useConcluirTarefas`
- `useDemandas.ts`: `useTodasEtapasDemanda`, `useDemandas`, `useUpdateEtapaDemanda`, `useConcluirEtapaDemanda`, `useUpdateChecklistEtapaDemanda`
- `useHistoricoTarefa.ts`: `useHistoricoTarefa`, `useRegistrarHistoricoTarefa`

#### Status possíveis (`src/domain/types.ts`, linha 472)
`'pendente' | 'em_andamento' | 'concluida' | 'atrasada' | 'nao_se_aplica' | 'impedido'`

Auto-derivação: `pendente` → `atrasada` se `data_prevista < hoje` e sem `data_conclusao` (hook queryFn, `useTarefasObrigacao.ts` linhas 6-12 e `useDemandas.ts` — função `derivarStatusEtapa`).

---

### A.2 — Módulo Demandas

#### Rotas e arquivos
- **Rota:** `/escritorio/demandas` (`src/router/index.tsx`, linhas 76-78)
- **Guard:** `<EscritorioRoute modulo="demandas">`
- **Arquivos:**
  - `src/pages/escritorio/Demandas/DemandasPage.tsx` (525 linhas) — container com 2 abas
  - `src/pages/escritorio/Demandas/DemandaDetalheDialog.tsx` (1.250 linhas) — 2 painéis responsivos
  - `src/pages/escritorio/Demandas/TemplateDetalheDialog.tsx` (550 linhas) — gestão de templates
  - `src/pages/escritorio/Demandas/NovaDemandaDialog.tsx` (494 linhas) — wizard 2 passos

#### Entidades
| Entidade | Campos relevantes | Storage key |
|---|---|---|
| `DemandaTemplate` | id, tenant_id, nome, descricao, instrucoes, categoria, prazo_dias_padrao, valor_sugerido, ativo | `vb_demanda_templates` |
| `EtapaDemandaTemplate` | id, template_id, ordem, nome, descricao, prazo_relativo_dias, responsavel_padrao, checklist[] | `vb_etapas_demanda_template` |
| `DemandaEspecifica` | id, tenant_id, cliente_id, template_id?, titulo, descricao, categoria, valor?, data_solicitacao, data_prevista, data_conclusao?, status, responsavel_id, criado_por, criado_em, **invoice_id?** | `vb_demandas_especificas` |
| `EtapaDemandaEspecifica` | id, tenant_id, demanda_id, ordem, nome, descricao?, data_prevista, data_conclusao?, status, responsavel_id?, observacoes?, impedimento_*, checklist_progresso? | `vb_etapas_demanda_especifica` |

#### Ciclo de vida de uma Demanda
1. **Nasce:** via `NovaDemandaDialog` (wizard escolhe template → preenche detalhes) ou "em branco"
2. **Status:** `'pendente' | 'em_andamento' | 'concluida' | 'cancelada'`
3. **Transições:** manual (usuário altera status em `DemandaDetalheDialog`) + auto (quando todas etapas concluídas, `useConcluirEtapaDemanda` marca demanda como concluída — `useDemandas.ts`, linha 137)
4. **Encerra:** botão "Cancelar" ou quando todas etapas concluídas
5. **Integração financeira:** campo `invoice_id` e botão "Gerar Fatura Avulsa" se `valor > 0` e sem invoice

#### Diferenças de status: Demanda vs Etapa
- `DemandaEspecifica.status` usa `DemandaStatus` (`pendente | em_andamento | concluida | cancelada`)
- `EtapaDemandaEspecifica.status` usa `TarefaStatus` (inclui `atrasada | nao_se_aplica | impedido`)

---

### A.3 — Módulo Obrigações

#### Rotas e arquivos
- **Rota:** `/escritorio/obrigacoes` (`src/router/index.tsx`, linhas 68-70)
- **Guard:** `<EscritorioRoute modulo="obrigacoes">`
- **Arquivos (8 componentes):**
  - `src/pages/escritorio/Obrigacoes/ObrigacoesPage.tsx` — container com 6 abas
  - `src/pages/escritorio/Obrigacoes/CadastroObrigacoes.tsx` (22 KB) — CRUD obrigações e etapas
  - `src/pages/escritorio/Obrigacoes/PainelConsulta.tsx` (48 KB) — lista mestre com filtros e bulk
  - `src/pages/escritorio/Obrigacoes/PainelEtapa.tsx` (22 KB) — workflow por etapa com seletores cascata
  - `src/pages/escritorio/Obrigacoes/PainelObrigacao.tsx` (11 KB) — visão geral de progresso
  - `src/pages/escritorio/Obrigacoes/VinculoClienteObrigacao.tsx` (24 KB) — vincular clientes
  - `src/pages/escritorio/Obrigacoes/GeracaoCompetencia.tsx` (8 KB) — gerar competências e tarefas
  - `src/pages/escritorio/Obrigacoes/TarefaObrigacaoDetalheConteudo.tsx` (573 linhas) — editor de tarefa

#### Hierarquia de dados (cadeia de geração)
```
Obrigacao (template + regra recorrência)
  └── EtapaObrigacao[] (etapas do template)
  └── ClienteObrigacao[] (vínculos cliente-obrigação)
  └── Competencia[] (períodos gerados: periodo='YYYY-MM', data_vencimento)
        └── TarefaObrigacao[] (geradas: clienteIds × etapas, leaf-level)
```

#### Entidades
| Entidade | Campos relevantes | Storage key |
|---|---|---|
| `Obrigacao` | id, nome, periodicidade, regra_vencimento (JSON), regime?, ativo | `vb_obrigacoes` |
| `EtapaObrigacao` | id, obrigacao_id, ordem, nome, descricao?, prazo_relativo_dias, responsavel_padrao?, checklist? | `vb_etapas_obrigacao` |
| `ClienteObrigacao` | id, cliente_id, obrigacao_id, ativo, data_inicio?, data_fim? | `vb_cliente_obrigacao` |
| `Competencia` | id, obrigacao_id, periodo (YYYY-MM), data_vencimento, status (aberta\|encerrada) | `vb_competencias` |
| `TarefaObrigacao` | id, cliente_id, competencia_id, etapa_id, data_prevista, data_conclusao?, status, responsavel?, observacoes?, impedimento_*, checklist_progresso? | `vb_tarefas_obrigacao` |

#### Utilitários de domínio
- `src/domain/obrigacoes/calcularVencimento.ts` — dada regra JSON + periodo YYYY-MM → retorna YYYY-MM-DD
- `src/domain/obrigacoes/gerarTarefas.ts` — produto cartesiano `clienteIds × etapas` → array de `TarefaObrigacao` com `data_prevista = vencimento + etapa.prazo_relativo_dias`

#### Regras de geração de tarefas (sem duplicatas)
`useGerarCompetencia` (`src/data/hooks/useCompetencias.ts`, linha 93) verifica antes de criar: combinação `competencia_id + cliente_id + etapa_id` já existente é ignorada (idempotente).

---

### B — Comparação entre os três módulos

#### B.1 Matriz de comparação

| Característica | Tarefas | Demandas | Obrigações |
|---|---|---|---|
| **Propósito** | Fila de execução | Processos avulsos | Obrigações recorrentes |
| **Entidade pai** | — (view agregada) | DemandaEspecifica | (Competência + Cliente) |
| **Entidade leaf** | TarefaUnificada | EtapaDemandaEspecifica | TarefaObrigacao |
| **Template** | Usa os dos outros | DemandaTemplate | Obrigacao + EtapaObrigacao |
| **Recorrência** | Não | Não | Sim (periodicidade + regra) |
| **Vínculo cliente** | Via tarefa | 1 cliente por demanda | ClienteObrigacao (N:N) |
| **Geração automática** | Não | Não | Sim (GeracaoCompetencia) |
| **Competência/ciclo** | Não | Não | Sim (Competencia) |
| **Status da tarefa** | TarefaStatus (6 valores) | TarefaStatus (6 valores) | TarefaStatus (6 valores) |
| **Status do pai** | — | DemandaStatus (4 valores) | CompetenciaStatus (2 valores) |
| **Checklist** | Sim (do template) | Sim (do template) | Sim (do template) |
| **Checklist com timer** | Sim | Sim | Sim |
| **Histórico de eventos** | Sim | Sim (tipo='demanda') | Sim (tipo='obrigacao') |
| **Impedimento** | Sim | Sim | Sim |
| **Valor financeiro** | Não | Sim (valor + invoice_id) | Não |
| **Criação em lote** | Não | Não | Sim (gerarTarefas) |
| **Visão kanban/calendário** | Não (só lista) | Não (só lista) | Não (só lista/painel) |
| **Filtros avançados** | Abas (Meu Dia/Equipe/Atrasadas) | 4 filtros (cliente/status/cat/resp) | 8 filtros + seletores cascata |
| **Bulk actions** | Não | Não | Sim (concluir, atribuir, obs) |
| **Integração financeira** | Não | Sim (invoice_id) | Não |
| **Log de atividade** | Não diretamente | Não | Sim (useLogAtividadeCliente) |

#### B.2 Duplicações que a unificação eliminaria

1. **TarefaStatus** — já compartilhado; a unificação mantém um único enum
2. **ChecklistItemProgresso + ChecklistItemTemplate** — já compartilhados
3. **ChecklistProgresso.tsx** — componente já compartilhado
4. **HistoricoPanel.tsx** — componente já compartilhado
5. **`TarefaObrigacaoDetalheConteudo.tsx`** vs. **`EtapaDetalheConteudo` em `DemandaDetalheDialog.tsx`** — dois painéis de detalhe de tarefa com lógica quase idêntica (~600 linhas cada), ambos cheios de checklist + histórico + impedimento
6. **Derivação de status atrasada** — `derivarStatus()` em `useTarefasObrigacao.ts` e `derivarStatusEtapa()` em `useDemandas.ts` — código duplicado
7. **`handleSalvarDialog`** — lógica de salvar tarefa e registrar histórico duplicada em `TarefasPage.tsx` e em `DemandaDetalheDialog.tsx`

#### B.3 Funcionalidades exclusivas a preservar

**Só em Demandas:**
- Integração financeira (`valor`, `invoice_id`, botão "Gerar Fatura Avulsa")
- `data_solicitacao` (quando o cliente pediu o serviço)
- `criado_por` (rastreabilidade)
- `instrucoes` no template (tutorial para o colaborador)

**Só em Obrigações:**
- Regra de vencimento (`regra_vencimento` JSON com `calcularVencimento`)
- Periodicidade (mensal/trimestral/anual)
- Vínculo N:N clientes ↔ rotina (`ClienteObrigacao`) com `data_inicio`/`data_fim`
- Geração automática por período (idempotente: `competencia_id + cliente_id + etapa_id`)
- `Competencia` como ciclo (period + data_vencimento + status aberta/encerrada)
- `regime` (ex.: "Simples Nacional")
- Bulk actions no painel de etapa (concluir/atribuir/obs em lote)
- Log de atividade por cliente (`useLogAtividadeCliente`)
- Filtros avançados com seletores cascata (obrigação → competência → etapa)
- Visão geral de progresso por etapa (`PainelObrigacao.tsx`)

**Só em Tarefas:**
- Abas "Meu Dia" / "Equipe" / "Atrasadas" / "Concluídas"
- Cálculo de urgência em tempo real (Crítico/Alta/Média/Normal)
- Painel de detalhe lado-a-lado no desktop
- Ação "Iniciar" direta no card (transition pendente → em_andamento)

#### B.4 Confirmação das hipóteses

**Demandas se comporta como "rotina"?** — **Parcialmente verdadeiro, mas com ressalva.**
- `DemandaTemplate` é análogo à parte de "template" de uma Rotina, mas **não tem recorrência** (sem periodicidade, sem regra_vencimento). É um template de processo avulso, não automático.
- Conclusão: `DemandaTemplate` → `Fluxo` (template de processo, sem recorrência). `Rotina` = Fluxo + recorrência automática.

**Obrigações se comporta como "ocorrência"?** — **Não exatamente.**
- `TarefaObrigacao` é o item leaf (equivalente a `EtapaDemandaEspecifica`)
- O conjunto de TarefaObrigacao para `(competencia_id + cliente_id)` **forma implicitamente uma ocorrência**, mas não existe como entidade explícita hoje
- O que seria a `Ocorrencia` está fragmentado: `Competencia` + `ClienteObrigacao` juntos identificam o "processo PGDAS-D de setembro para o cliente X", mas não há uma entidade pai que agrupe as TarefaObrigacao por cliente
- Conclusão: a unificação requer criar a entidade `Ocorrência` como parent explícita

---

## 3. Fluxo de Execução Atual a ser Preservado

### Fluxo de execução de uma tarefa — passo a passo (`TarefasPage.tsx`)

Este fluxo está 100% em `src/pages/escritorio/Tarefas/TarefasPage.tsx` e **NÃO pode ser degradado**.

#### Passo 1 — Acesso e filtragem
1. Usuário abre `/escritorio/tarefas`
2. Página carrega dados: `useTarefasTenant` (obrigações) + `useTodasEtapasDemanda` (demandas) + metadados
3. As duas fontes são mescladas em `todasTarefas` (array de `TarefaUnificada`)
4. Usuário escolhe aba:
   - **Meu Dia:** tarefas atribuídas ao usuário atual (ou sem responsável se for admin)
   - **Equipe** (admin): todas as tarefas abertas da equipe
   - **Atrasadas:** status='atrasada' ou urgencia='critico'
   - **Concluídas:** status='concluida' ou 'nao_se_aplica'

#### Passo 2 — Visualização do card
Cada card exibe (linhas 680-789):
- Badge de tipo (Obrigação / Demanda)
- Título, cliente, subtítulo (nome da obrigação ou da demanda-pai)
- Responsável (ou quem deve resolver o impedimento, se impedido)
- Descrição do impedimento (se houver)
- Data prevista + badge de urgência (Crítico/Alta/Média)
- Badge de status
- Indicador de progresso do checklist (X/Y)
- Indicador de itens ativos ("N em execução")
- Botões de ação rápida: **Iniciar** / **Concluir** (desktop)

#### Passo 3 — Ação rápida no card
- **Iniciar** (`handleIniciar`, linha 939): status → `em_andamento`; se etapa tem checklist template, inicializa `checklist_progresso` a partir do template
- **Concluir** (`handleConcluir`, linha 992): chama mutação correspondente (`concluirTarefaObs` ou `concluirEtapaDemanda`), status → `concluida`, `data_conclusao = hoje`

#### Passo 4 — Abertura do painel de detalhe
Clique no card → seleciona tarefa → painel lateral (desktop) ou modal (mobile)

#### Passo 5 — Edição no painel de detalhe
O painel (linhas 104-637) permite:
1. **Alterar status** — dropdown com 5 opções (sem 'atrasada'; ela é auto-derivada); se selecionar 'impedido', abre campos obrigatórios
2. **Alterar responsável** — select dos usuários do escritório
3. **Editar observações** — textarea livre
4. **Se impedido:**
   - Preencher `impedimento_descricao` (obrigatório)
   - Selecionar `impedimento_responsavel` (quem deve resolver, obrigatório)
5. **Gerenciar checklist** (componente `ChecklistProgresso`):
   - Marcar/desmarcar itens
   - Adicionar itens customizados
   - Remover itens
   - **Iniciar item:** abre dialog para tempo estimado + uso de cronômetro
   - **Pausar/Retomar item:** acumula `tempo_pausado_acumulado_ms`
   - **Parar item:** cancela execução, limpa campos de timing
6. **Visualizar histórico** (componente `HistoricoPanel`):
   - Timeline de eventos com ícones coloridos por tipo
   - Adicionar comentário livre (Ctrl+Enter para enviar)

#### Passo 6 — Salvamento
Botão no footer com label contextual:
- "Marcar como concluída" — se mudando para status=concluida
- "Reabrir tarefa" — se voltando de concluida para aberta
- "Salvar" — demais alterações

`handleSalvarDialog` (linha 1006):
- Chama `updateTarefaObs` ou `updateEtapaDemanda` com os campos alterados
- Registra eventos de histórico para cada mudança detectada:
  - `status_alterado` se status mudou
  - `responsavel_alterado` se responsável mudou
  - `impedimento_registrado` se status novo é 'impedido'
  - `impedimento_resolvido` se status anterior era 'impedido'
- Fecha o painel/modal

#### Passo 7 — Registros no histórico de checklist
Cada ação de checklist dispara `useRegistrarHistoricoTarefa` com tipos:
- `inicio_item_checklist`, `conclusao_item_checklist`, `pausa_item_checklist`, `retomada_item_checklist`, `cancelamento_item_checklist`, `checklist_completo`

---

## 4. Modelo Unificado Proposto

### C.1 Modelo de dados

#### Entidades novas/renomeadas

```
Fluxo (era DemandaTemplate)
  id, tenant_id, nome, descricao, instrucoes,
  categoria, prazo_dias_padrao, valor_sugerido, ativo

FluxoTarefa (era EtapaDemandaTemplate / EtapaObrigacao)
  id, tenant_id, fluxo_id,
  ordem, nome, descricao?,
  prazo_relativo_dias,        ← já existe em ambos
  responsavel_padrao?,        ← já existe em ambos
  checklist?: ChecklistItemTemplate[]  ← já existe em ambos

Rotina (era Obrigacao + referência a Fluxo)
  id, tenant_id, nome,
  fluxo_id?,                  ← novo: vínculo com Fluxo (opcional)
  periodicidade,              ← de Obrigacao
  regra_vencimento,           ← de Obrigacao (JSON)
  regime?, ativo,
  criado_em

RotinaCliente (era ClienteObrigacao)
  id, tenant_id, rotina_id, cliente_id,
  ativo, data_inicio?, data_fim?

Ciclo (era Competencia)
  id, tenant_id, rotina_id,   ← era obrigacao_id
  periodo,                    ← 'YYYY-MM'
  data_vencimento,
  status                      ← 'aberta' | 'encerrada'

Ocorrencia (NOVA — não existia como entidade explícita)
  id, tenant_id,
  titulo,
  cliente_id?,                ← null para tarefas internas (ponto em aberto)
  origem: 'manual' | 'fluxo' | 'rotina',
  fluxo_id?,                  ← se gerada de Fluxo
  rotina_id?,                 ← se gerada de Rotina
  ciclo_id?,                  ← era competencia_id (se gerada por Rotina)
  lote_id?,                   ← UUID compartilhado ao criar vários clientes de uma vez
  categoria?, valor?,
  data_solicitacao?,          ← de DemandaEspecifica
  data_prevista,
  data_conclusao?,
  status: OcorrenciaStatus    ← 'pendente' | 'em_andamento' | 'concluida' | 'cancelada'
  responsavel_id?,
  criado_por, criado_em,
  invoice_id?                 ← de DemandaEspecifica

Tarefa (era EtapaDemandaEspecifica / TarefaObrigacao — item leaf)
  id, tenant_id,
  ocorrencia_id,              ← NOVO campo de agrupamento
  fluxo_tarefa_id?,           ← era etapa_id / EtapaDemandaTemplate.id
  ordem,
  nome,
  descricao?,
  data_prevista,
  data_conclusao?,
  status: TarefaStatus,       ← mantém os 6 valores atuais
  responsavel_id?,
  observacoes?,
  impedimento_descricao?,
  impedimento_responsavel?,
  impedimento_data?,
  checklist_progresso?: ChecklistItemProgresso[]

HistoricoTarefa (ajuste mínimo de tipo)
  tarefa_tipo: 'tarefa'       ← era 'obrigacao' | 'demanda'
  (demais campos inalterados)
```

#### Mapeamento campo a campo

| Campo atual | Entidade atual | Campo novo | Entidade nova |
|---|---|---|---|
| `obrigacao_id` | TarefaObrigacao | `rotina_id` | Ocorrencia |
| `competencia_id` | TarefaObrigacao | `ciclo_id` | Ocorrencia |
| `etapa_id` | TarefaObrigacao | `fluxo_tarefa_id` | Tarefa |
| `template_id` | DemandaEspecifica | `fluxo_id` | Ocorrencia |
| `demanda_id` | EtapaDemandaEspecifica | `ocorrencia_id` | Tarefa |
| `obrigacao_id` | Competencia | `rotina_id` | Ciclo |
| `obrigacao_id` | ClienteObrigacao | `rotina_id` | RotinaCliente |
| `obrigacao_id` | EtapaObrigacao | `fluxo_id` | FluxoTarefa |
| `tarefa_tipo: 'obrigacao'` | HistoricoTarefa | `tarefa_tipo: 'tarefa'` | HistoricoTarefa |
| `tarefa_tipo: 'demanda'` | HistoricoTarefa | `tarefa_tipo: 'tarefa'` | HistoricoTarefa |

#### Chaves localStorage novas (sugeridas)
```
vb_fluxos               (era vb_demanda_templates)
vb_fluxo_tarefas        (era vb_etapas_demanda_template + vb_etapas_obrigacao)
vb_rotinas              (era vb_obrigacoes)
vb_rotina_clientes      (era vb_cliente_obrigacao)
vb_ciclos               (era vb_competencias)
vb_ocorrencias          (novo — agrupa o que estava fragmentado)
vb_tarefas              (era vb_tarefas_obrigacao + vb_etapas_demanda_especifica)
vb_historico_tarefa     (mantém)
```

---

### C.2 Fluxo de execução — antes e depois

#### Antes (atual)
1. Tarefa nasce via:
   - `GeracaoCompetencia` → cria `TarefaObrigacao[]` (uma por cliente × etapa)
   - `NovaDemandaDialog` → cria `DemandaEspecifica` + `EtapaDemandaEspecifica[]`
2. Usuário abre `/escritorio/tarefas`
3. `TarefasPage` lê `TarefaObrigacao[]` + `EtapaDemandaEspecifica[]` → monta `TarefaUnificada[]`
4. Edição via painel → `updateTarefaObs` ou `updateEtapaDemanda`

#### Depois (novo)
1. Tarefa nasce via:
   - Rotina gerada → cria `Ocorrencia[]` (uma por cliente) cada com `Tarefa[]` (uma por FluxoTarefa)
   - "Nova Ocorrência → Em branco" → cria `Ocorrencia` + uma `Tarefa` manual
   - "Nova Ocorrência → A partir de um Fluxo" → cria `Ocorrencia` + `Tarefa[]` do Fluxo
2. Usuário abre `/escritorio/tarefas/ocorrencias`
3. `TarefasPage` lê `Tarefa[]` (única fonte) → monta fila de execução
4. Edição via painel → `updateTarefa` (fonte única)

**O fluxo de execução interno (passos 3-7 da seção 3) permanece 100% idêntico.** Só muda o repositório de onde as tarefas vêm — de dois para um.

---

### C.3 Ocorrência simples vs complexa — uma experiência, duas complexidades

**Ocorrência simples (1 tarefa, ex.: "Recalcular guia DAS"):**
- A tela de detalhe mostra diretamente os campos da única tarefa (sem lista de tarefas acima)
- Experiência idêntica ao detalhe atual de uma `TarefaObrigacao`

**Ocorrência complexa (N tarefas, ex.: "PGDAS-D Set/2026 — Padaria São Bento"):**
- A tela de detalhe mostra cabeçalho da ocorrência + lista de tarefas com timeline
- Clicar em uma tarefa abre o editor da tarefa (igual ao painel atual de etapa de demanda)
- A experiência é idêntica ao `DemandaDetalheDialog` atual

**Regra de exibição:**
```
if (ocorrencia.tarefas.length === 1) → renderizar TarefaDetalhe diretamente
else                                 → renderizar OcorrenciaDetalhe com lista de tarefas
```

---

### C.4 Motor de geração das Rotinas

Preserva toda a lógica atual de `src/domain/obrigacoes/` com os seguintes ajustes:

| Comportamento | Implementação atual | Implementação nova |
|---|---|---|
| Idempotência | `competencia_id + cliente_id + etapa_id` já existe → ignora | `ciclo_id + cliente_id + fluxo_tarefa_id` já existe → ignora |
| Cálculo de vencimento | `calcularVencimento(regra, periodo)` em `src/domain/obrigacoes/calcularVencimento.ts` | Mesmo utilitário, mover para `src/domain/tarefas/calcularVencimento.ts` |
| Data prevista da tarefa | `vencimento + etapa.prazo_relativo_dias` em `gerarTarefas.ts` | Mesmo cálculo |
| Alteração de rotina futura | Não implementado (editar etapas afeta geração futura) | FluxoTarefa editada → só afeta ciclos não iniciados |
| Exceção por cliente | Não implementado | Ponto em aberto (v2?) |
| Dia útil | Não implementado | Ponto em aberto (v2?) |
| Antecedência | `prazo_relativo_dias` negativo | Mantém |

### C.5 Criação em lote (vários clientes)

```
"Nova Ocorrência → A partir de um Fluxo" → seleciona N clientes
→ gera lote_id = uuid()
→ para cada clienteId: cria Ocorrencia { lote_id, fluxo_id, cliente_id, ... } + Tarefa[]
→ UI: prévia com "Serão criadas X ocorrências para Y clientes"
→ Retorna lista de ocorrências criadas com link para cada uma
```

### C.6 Desacoplamento para venda separada

```ts
// EscritorioRoute já suporta: modulo="tarefas"
// Sidebar já filtra por módulo

// Mudança necessária: um único módulo no lugar de três
modulo: 'tarefas'   // substitui 'tarefas' | 'demandas' | 'obrigacoes'

// Permissões internas do módulo (sub-recursos):
submodulos?: ('ocorrencias' | 'rotinas' | 'fluxos')[]
```

Vínculo com outros módulos via referência genérica:
```ts
// Na Ocorrencia, campos opcionais para vínculo externo
ref_tipo?: string   // ex.: 'contrato' | 'cliente'
ref_id?: string     // UUID do recurso externo
```

---

## 5. Plano de Migração em Fases

### Fase 0 — Preparação (1-2 dias, sem quebra de interface)
**Objetivo:** Preparar a infra sem remover nenhuma tela existente.
1. Adicionar `OcorrenciaRepository`, `TarefaRepository` (novas chaves localStorage)
2. Adicionar entidades `Ocorrencia` + `Tarefa` em `src/domain/types.ts`
3. Manter todas as entidades antigas (zero remoção)

**Critério de aceite:** `npm run build` sem erros; nenhuma tela existente alterada.

---

### Fase 1 — Demandas → Ocorrências (3-5 dias)
**Objetivo:** Substituir Demandas pelo conceito de Ocorrência.
1. Criar tela `/escritorio/tarefas/ocorrencias` (nova rota)
2. Portar `DemandaDetalheDialog` → `OcorrenciaDetalheDialog` usando `Tarefa[]` em vez de `EtapaDemandaEspecifica[]`
3. Portar `NovaDemandaDialog` → `NovaOcorrenciaDialog` com seleção de Fluxo ou Em Branco
4. Renomear `DemandaTemplate` → `Fluxo` na camada de dados (nova chave localStorage + seed)
5. Migrar `DemandaEspecifica` existente → `Ocorrencia` (script de migração localStorage)
6. Migrar `EtapaDemandaEspecifica` existente → `Tarefa` (com `ocorrencia_id`)
7. Manter rota `/escritorio/demandas` com redirect para nova rota

**Critério de aceite:** criar, listar, editar, concluir e cancelar ocorrências; histórico preservado; `TarefasPage` lê de `Tarefa[]` em vez de `EtapaDemandaEspecifica[]`; rota antiga redireciona.

---

### Fase 2 — Obrigações → Rotinas + Ocorrências (4-6 dias)
**Objetivo:** Substituir Obrigações pelo conceito de Rotina.
1. Criar tela `/escritorio/tarefas/rotinas` (refactor de `CadastroObrigacoes`)
2. Renomear `Obrigacao` → `Rotina`, `ClienteObrigacao` → `RotinaCliente`, `Competencia` → `Ciclo`
3. Criar `GeradorCiclo` (refactor de `GeracaoCompetencia`): gera `Ocorrencia[]` + `Tarefa[]`
4. Portar `PainelEtapa`, `PainelConsulta`, `PainelObrigacao` para novas entidades
5. Portar `VinculoClienteObrigacao` → `VinculoRotinaCliente`
6. Migrar dados existentes (`Obrigacao` → `Rotina`, `TarefaObrigacao` → agrupamento em `Ocorrencia` + `Tarefa`)
7. Alterar `TarefasPage` para usar apenas `Tarefa[]` (remover leitura de `TarefaObrigacao`)
8. Manter rota `/escritorio/obrigacoes` com redirect

**Critério de aceite:** rotinas recorrentes gerando ocorrências; idempotência verificada; `TarefasPage` usa fonte única; filtros avançados e bulk actions funcionando.

---

### Fase 3 — Limpeza e menu unificado (1-2 dias)
**Objetivo:** Menu limpo, sem rotas legadas.
1. Consolidar menu: **Tarefas** → Ocorrências | Rotinas | Fluxos (em `src/components/shared/Sidebar.tsx` e `BottomNav.tsx`)
2. Remover rotas `/escritorio/demandas` e `/escritorio/obrigacoes` de `src/router/index.tsx`
3. Limpar tipos legados de `src/domain/types.ts`
4. Consolidar `tarefa_tipo: 'obrigacao' | 'demanda'` → `'tarefa'` no `HistoricoTarefa`

**Critério de aceite:** nenhuma referência a `DemandaEspecifica` ou `TarefaObrigacao` fora de arquivos de migração; build limpo.

---

### Fase 4 — Funcionalidades novas (backlog)
- Criação em lote com prévia e `lote_id`
- Feature flag por tenant para venda separada do módulo
- Dependência entre tarefas (P2)
- Dia útil no cálculo de prazo
- Notificações/SLA (P5)

---

## 6. Impacto

| Área | O que muda |
|---|---|
| **Menu / Sidebar** | `src/components/shared/Sidebar.tsx` — remover itens Demandas e Obrigações, adicionar sub-itens de Tarefas |
| **BottomNav** | `src/components/shared/BottomNav.tsx` — mesmo ajuste |
| **Header** | `src/components/shared/Header.tsx` — breadcrumbs das novas rotas |
| **Rotas** | `src/router/index.tsx` — novas sub-rotas, redirects das antigas, remoção futura |
| **Domain types** | `src/domain/types.ts` — adicionar 6 novas interfaces, manter antigas na Fase 0-2, remover na Fase 3 |
| **Hooks** | `src/data/hooks/` — novos hooks para `Ocorrencia`, `Tarefa`, `Rotina`, `Ciclo`; antigos deprecados e removidos na Fase 3 |
| **Repositories** | `src/data/repositories/interfaces.ts` — novas interfaces; `src/data/repositories/localStorage/index.ts` — novos singletons |
| **Seed** | `src/data/seed/index.ts` — migrar dados seed para novas entidades |
| **TarefasPage** | `src/pages/escritorio/Tarefas/TarefasPage.tsx` — alterar fonte de dados de `TarefaObrigacao[]` + `EtapaDemandaEspecifica[]` para `Tarefa[]` apenas |
| **HistoricoTarefa** | `tarefa_tipo` precisa aceitar 'tarefa' (manter backward compat durante migração) |
| **Permissões** | `EscritorioRoute` e `podeAcessarModulo` — consolidar módulo, criar sub-recursos opcionais |
| **Relatórios/Dashboards** | Qualquer tela que consulte `vb_tarefas_obrigacao` ou `vb_etapas_demanda_especifica` precisa ser atualizada |
| **Log de atividade** | `useLogAtividadeCliente` continua funcionando; apenas o campo de descrição muda |
| **Domínio obrigações** | `src/domain/obrigacoes/` → mover para `src/domain/tarefas/` |
| **Grupos** | `src/pages/escritorio/Grupos/` — não diretamente afetados, verificar referências a `demanda_id` |

---

## 7. Riscos e Pontos em Aberto

### Riscos técnicos

**R1 — Migração de dados localStorage sem perda**
`TarefaObrigacao` tem `competencia_id + etapa_id` mas não tem `ocorrencia_id`. Na migração, é preciso criar uma `Ocorrencia` por `(competencia_id + cliente_id)` e vincular as `TarefaObrigacao` correspondentes. Se o script de migração falhar, dados históricos podem perder o agrupamento correto.
*Mitigação:* script reversível que escreve nas chaves novas sem apagar as antigas; só limpa antigas após validação.

**R2 — HistoricoTarefa com `tarefa_tipo` legado**
Eventos históricos existentes têm `tarefa_tipo: 'obrigacao'` ou `'demanda'`. Se o `HistoricoPanel` passa a esperar `'tarefa'`, eventos antigos ficam sem ícone ou label.
*Mitigação:* tratar os três valores no `HistoricoPanel` até Fase 3; na Fase 3, migrar registros antigos.

**R3 — TarefasPage com duas fontes até a Fase 2**
Durante as fases 1 e 2, `TarefasPage` precisará ler de `Tarefa[]` (novas) E `TarefaObrigacao[]` (legadas). Isso complica temporariamente a página mais importante do sistema.
*Mitigação:* na Fase 1, `TarefasPage` migra apenas para Tarefas de Demandas; `TarefaObrigacao` permanece separada até Fase 2.

### Pontos em aberto — perguntas para decidir antes de implementar

**P1 — Ocorrência sem cliente (tarefa interna)?**
Uma tarefa como "Atualizar certificado digital do escritório" não tem cliente. O campo `cliente_id` deve ser nullable? Isso impacta filtros e a tela de listagem.

**P2 — Dependência entre tarefas dentro de uma ocorrência na v1?**
Ex.: a Tarefa 3 só pode iniciar depois da Tarefa 2 ser concluída. Implementar na v1 ou bloquear para v2?

**P3 — Rotinas com fluxos de várias etapas: quem cria o Fluxo?**
Hoje a Obrigação tem suas etapas próprias (`EtapaObrigacao`). Na nova arquitetura, a Rotina PGDAS-D precisa de um Fluxo com 4 etapas. Esse Fluxo é criado implicitamente ao criar a Rotina, ou o usuário cria o Fluxo separadamente e depois vincula? A segunda opção é mais flexível (reutilização), mas adiciona um passo extra.

**P4 — Quem pode editar um Fluxo que tem Ocorrências em andamento?**
Se um Fluxo for editado (remover etapa, mudar prazo), isso afeta Ocorrências já abertas? Proposta: edições no Fluxo nunca afetam Ocorrências existentes (imutabilidade retroativa). Confirmar?

**P5 — Notificações e SLA: por tarefa ou por ocorrência?**
Um alerta de "prazo próximo" deve ser por Tarefa (cada etapa tem seu prazo) ou por Ocorrência (prazo final do processo)? Hoje o sistema só calcula urgência client-side por `data_prevista` da tarefa leaf. Como isso escalará quando houver notificações push/email?

**P6 — Nome final do módulo no menu e URL?**
- Opção A: **"Tarefas"** (menu) com sub-itens Ocorrências / Rotinas / Fluxos
- Opção B: **"Processos"** com sub-itens Ocorrências / Rotinas / Fluxos
- Isso afeta rotas, labels, permissões e documentação.

**P7 — Integração financeira na Ocorrência?**
Hoje só Demandas têm `valor` e `invoice_id`. Na nova estrutura, toda Ocorrência pode ter valor? Ou apenas Ocorrências de origem `'fluxo'`/`'manual'`? Rotinas raramente têm valor per-ocorrência (mas poderiam, ex.: honorário por guia).

**P8 — Log de atividade por cliente (`useLogAtividadeCliente`)?**
O `PainelEtapa.tsx` registra logs no cliente a cada ação bulk. Isso deve continuar após a unificação? Qual é o destino e consumidor desses logs?

---

## 8. Sugestão de Ordem de Execução

### Fase 0 — Infraestrutura (1-2 dias)
- Adicionar tipos `Ocorrencia`, `Tarefa`, `Fluxo`, `FluxoTarefa`, `Rotina`, `RotinaCliente`, `Ciclo` em `src/domain/types.ts`
- Criar repositórios localStorage para cada nova entidade
- **Critério de aceite:** `npm run build` sem erros; nenhuma tela alterada

### Fase 1 — Demandas → Ocorrências (3-5 dias)
- Criar `NovaOcorrenciaDialog` (refactor de `NovaDemandaDialog`)
- Criar `OcorrenciaDetalheDialog` (refactor de `DemandaDetalheDialog` usando `Tarefa[]`)
- Criar rota `/escritorio/tarefas/ocorrencias`
- Alterar `TarefasPage` para ler `Tarefa[]` de ocorrências (mantendo `TarefaObrigacao` em paralelo)
- Script de migração: `DemandaEspecifica[]` → `Ocorrencia[]` + `EtapaDemandaEspecifica[]` → `Tarefa[]`
- **Critério de aceite:** criar/editar/concluir demandas pela nova tela; `TarefasPage` mostra as novas Tarefas; histórico preservado; rota antiga redireciona

### Fase 2 — Obrigações → Rotinas (4-6 dias)
- Criar tela de Rotinas (refactor de `CadastroObrigacoes`)
- Criar `GeradorCiclo` (refactor de `GeracaoCompetencia`): gera `Ocorrencia[]` + `Tarefa[]`
- Portar `PainelEtapa`, `PainelConsulta`, `PainelObrigacao` para novas entidades
- Portar `VinculoClienteObrigacao` → `VinculoRotinaCliente`
- Script de migração: `Obrigacao` → `Rotina`, `TarefaObrigacao` → agrupamento em `Ocorrencia` + `Tarefa`
- Alterar `TarefasPage` para usar apenas `Tarefa[]` (remover leitura de `TarefaObrigacao`)
- **Critério de aceite:** rotinas recorrentes gerando ocorrências; idempotência verificada; `TarefasPage` usa fonte única; filtros e bulk actions funcionando

### Fase 3 — Limpeza e menu unificado (1-2 dias)
- Atualizar `Sidebar.tsx`, `BottomNav.tsx`, `Header.tsx`
- Adicionar rotas definitivas (`/escritorio/tarefas/rotinas`, `/escritorio/tarefas/fluxos`)
- Remover rotas legadas `/escritorio/demandas` e `/escritorio/obrigacoes`
- Remover entidades antigas de `types.ts`
- Migrar `tarefa_tipo: 'obrigacao'|'demanda'` → `'tarefa'` no `HistoricoTarefa`
- **Critério de aceite:** nenhuma referência ao vocabulário antigo no código; build limpo

### Fase 4 — Funcionalidades novas (backlog)
- Criação em lote com prévia e `lote_id`
- Feature flag por tenant para venda separada do módulo
- Dependência entre tarefas (P2)
- Dia útil no cálculo de prazo
- Notificações/SLA (P5)
