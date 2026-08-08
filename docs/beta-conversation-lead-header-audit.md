# Auditoria — header da conversa + fluxo de etapa (lead)

Base: workspace `xingyu-crm` (beta Operação `/operacao?view=conversations`).
Objetivo: mapear o estado atual para redesenho do header (lead code, etapa, responsável) sem implementar.

---

## 1. ConversationThread header

**Arquivo:** `apps/web/src/components/crm/conversation/conversation-thread.tsx`

| Elemento | Linhas | Comportamento |
|----------|--------|---------------|
| Container do header | 121–181 | `border-b`, ocultável via `hideHeader` |
| `ArrowLeft` (voltar) | 4, 124–133 | Só se `onBack` for passado; `aria-label="Voltar para conversas"` |
| Nome do contato | 69, 142–147 | `contactName(detail?.contact)` via `@/lib/inbox-utils`; `data-testid="conversation-header"` |
| Channel badge | 149–153 | `ConversationChannelBadge` se `detail.channel`; senão texto `channelName(...)` |
| Status (ex.: `OPEN`) | 154 | Raw enum: `· {detail.status}` — **não traduzido**, não é badge |
| Botão contexto (Info) | 158–168 | `lg:hidden`; abre painel/drawer |

**Nome:** `contactName` em `apps/web/src/lib/inbox-utils.ts` L251–257 — fallback `"Conversa"`.

**Badge de canal:** `apps/web/src/components/crm/conversation/conversation-channel-badge.tsx` L15–37.

**Lacunas vs lista CRM:** header **não** mostra `leadSequence` / Lead #, etapa, nem sigla do responsável. Esses dados existem na lista (`conversation-list-item`) e no context panel.

**Header paralelo (Operação deal-centric):** `apps/web/src/components/crm/operation/deal-conversation-panel.tsx` L78–154 — ArrowLeft, avatar, nome, telefone, canal, `conversationStatus`, **select de etapa** (`deal-stage-select`), link para ficha. Thread usa `hideHeader` nesse fluxo.

---

## 2. Auto-seleção da primeira conversa

**Arquivo:** `apps/web/src/components/crm/conversation/conversation-workspace.tsx`

| Passo | Linhas | Detalhe |
|-------|--------|---------|
| Bootstrap query | 76–84 | Key `[...queryKeys.conversations.lists, "bootstrap", listParams]`; `conversationsApi.list`; `pageSize: 30`; opcional `pipelineId` |
| First item | 96–107 | `const first = bootstrapListQuery.data?.[0]` |
| `router.replace` | 105 | `router.replace(resolveHref(first.id))` se **não** há `conversationId` |
| Skip mobile | 99–104 | Não auto-seleciona se `max-width: 767px` |

**Href resolution (L86–91):** `getConversationHref(id)` ou `${basePath}/${id}`.

**Beta URL wiring:** `apps/web/src/components/crm/beta/beta-conversations-view.tsx`

- L21: `conversationId = searchParams.get("conversation") ?? undefined`
- L36–37 / L43–52: `buildBetaConversationsHref` → `/operacao?view=conversations&conversation=…`
- L62–65: `onSelectConversation` → `router.replace(...)`

**Href builder:** `apps/web/src/lib/beta-config.ts` L43–52 (`buildBetaConversationsHref`).

Não há símbolo `firstConversation` / `selectedConversation` no código; o padrão é `conversationId` (prop/URL) + `bootstrapListQuery.data?.[0]`.

---

## 3. Lead code / seller initials (lista)

### Utils — `apps/web/src/components/crm/conversation/conversation-list-utils.ts`

| Função | Linhas | Nota |
|--------|--------|------|
| `formatLeadCode` | 5–10 | `Lead #` + `padStart(4,"0")`; `null` se &lt; 1 / inválido |
| `assigneeShortCode` | 52–71 | **Não existe `sellerInitials`** — este é o helper de sigla do vendedor/responsável |
| `contactInitials` | 24–47 | Avatar do contato (não telefone / Lead #) |
| `conversationContactDisplayName` | 104–133 | Hierarquia de nome |

### Uso na lista — `conversation-list-item.tsx`

| Campo | Linhas |
|-------|--------|
| `leadCode = formatLeadCode(conversation.currentDeal?.leadSequence)` | 76 |
| Responsável: `currentDeal?.owner ?? conversation.assignee` | 77–78 |
| `shortCode = assigneeShortCode(responsible?.name)` | 79 |
| UI Lead # | 154–157 (`data-testid="conversation-lead-code"`) |
| UI sigla | 159–175 (`data-testid="conversation-assignee-code"`) |
| UI etapa | 75, 211–220 (`stageName` / “Sem etapa”) |

### API / shared

- Backend mirror: `apps/api/src/common/lead-sequence.ts` L32–37 (`formatLeadCode`)
- Alocação: `allocateLeadSequence` L12–29
- Mapper lista: `apps/api/src/common/mappers/conversation.mapper.ts` L85–105 (`toCurrentDealSummary` → `leadSequence`, `stageName`, `owner`)

---

## 4. Detail / context API — campos deal, stage, lead, assignee, channel

### GET `/conversations/:id` (detail)

- Controller: rotas em `conversations.controller.ts` (detail via service `findOne` / get)
- Client: `conversationsApi.get` → `apps/web/src/lib/api.ts` L432
- Query key: `queryKeys.conversations.detail(id)` — `query-keys.ts` L41
- Service map: `conversations.service.ts` L530–553

**Payload `deal` (detail):** `id`, `name`, `pipelineId`, `stageId`, `priority`, `leadSequence`, `pipeline`, `stage`, `owner`, `tags`.

**Top-level:** `contact`, `assignee`, `channel`, `status`, previews, waiting metrics.

### GET `/conversations/:id/context`

- Controller: L42–49 (`getContext`)
- Service: L556–718
- Client: `conversationsApi.context` — `api.ts` L440–441
- Query key: `queryKeys.conversations.context(id)` — L42

**Campos relevantes no response:**

| Campo | Origem (service) |
|-------|------------------|
| `conversation` (+ `assignee`) | L685–693 |
| `currentDeal` (+ `owner`, `team`, via `toCurrentDealSummary`) | L696–702 |
| `pipeline` | L703 |
| `stage` | L704 |
| `owner` | deal.owner ?? contact.owner (L705) |
| `channel` | L707 |
| `tags`, `counts`, `nextTask`, `lastOrder` | L708–717 |

`leadSequence` chega em `currentDeal.leadSequence` (mapper L95).

---

## 5. Kanban — mover deal entre etapas

### Frontend (drag)

**Arquivo:** `apps/web/src/components/crm/kanban-board.tsx`

| Peça | Linhas |
|------|--------|
| Mutation | 441–467 — `useMutation` → `dealsApi.move(dealId, stageId)` |
| Optimistic UI | 501–518 — `setStages(...)` local (remove do from / append no to) |
| Mutate call | 520 |
| Success invalidate | 450–453 — `queryKeys.pipelines.board(pipeline.id)` |
| Error rollback | 456–465 — restaura `previousStages` |

### Frontend (Operação / select de etapa)

**Arquivo:** `apps/web/src/components/crm/operation/operation-page.tsx` L316–337

1. Optimistic: `moveBoardDeal(queryClient, pipelineId, dealId, stageId)` (`board-cache.ts` L54–66)
2. API: `dealsApi.move(deal.id, stageId)`
3. Invalidate: `pipelines.board` + `conversations.lists`
4. Rollback: `moveBoardDeal(..., previousStageId)`

### Helpers

- `moveDealInStages` — `apps/web/src/lib/operation-utils.ts` L215–238
- `moveBoardDeal` — `apps/web/src/lib/board-cache.ts` L54–66
- Board query: `queryKeys.pipelines.board(id)` — `query-keys.ts` L25
- Beta board fetch: `beta-kanban-view.tsx` L61–64

### API

| Peça | Local |
|------|-------|
| Client wrapper | `dealsApi.move` → `PATCH /deals/:id` body `{ stageId }` — `api.ts` L417–418 |
| Controller PATCH | `deals.controller.ts` L59–67 → `dealsService.update` |
| Alt. endpoint | `POST /deals/:id/move` L76–84 → `moveStage` (**frontend beta/kanban não usa este**) |
| Update + stage change | `deals.service.ts` L201–225 (`stageChanged` → `stageTransitionData`) |

---

## 6. LeadContextPanel — display de etapa

**Arquivo:** `apps/web/src/components/crm/conversation/lead-context-panel.tsx`

| Item | Linhas |
|------|--------|
| Fetch context | 491–496 |
| Header “Contexto do lead” + ArrowLeft mobile | 507–521 |
| Lead # (padStart inline, **não** usa `formatLeadCode`) | 362–369 |
| **Etapa (read-only):** `Etapa: {context.stage.name}` | 371–373 |
| Pipeline name | 374–376 |
| Canal section | 389–395 |
| `stageId` passado a LazyTasks | 410 |

**Sem controle de mover etapa** no painel. Move de etapa na UI de conversa existe em `DealConversationPanel` (select), não no `LeadContextPanel`.

---

## 7. ConversationWorkspace — `conversationId` da URL

**Arquivo:** `apps/web/src/components/crm/conversation/conversation-workspace.tsx`

| Concern | Linhas |
|---------|--------|
| Prop `conversationId?: string` | 23, 35 |
| Mobile view sync | 56–63 |
| Detail query gated by id | 109–114 |
| Pass-through → Thread / List / Panel | 140, 155, 185, 205 |
| Back clears via `clearHref` / `listBaseHref` | 94, 163–169 |

**Beta parent:** `beta-conversations-view.tsx` L17–66 lê `?conversation=` e injeta na workspace.

**Inbox path-style (legado):** `apps/web/src/components/crm/inbox-page.tsx` — `params.conversationId`.

---

## 8. Types — Conversation, Deal, ConversationContext

**Arquivo:** `apps/web/src/lib/types.ts`

| Type | Linhas | Campos-chave para o redesign |
|------|--------|------------------------------|
| `Deal` | 338–366 | `stageId`, `leadSequence`, `owner`, `conversationId`, `channel`, … |
| `ConversationDealSummary` | 388–399 | `stageId`, `stageName`, `leadSequence`, `owner` |
| `ConversationListItem` | 401–414 | `status`, `assignee`, `channel`, `currentDeal` |
| `Conversation` (detail) | 435–465 | nested `deal` com `leadSequence`, `stage`, `pipeline`, `owner`; top-level `assignee`, `channel`, `status` |
| `ConversationContext` | 492–525 | `conversation`, `currentDeal`, `pipeline`, `stage`, `owner`, `channel`, `counts`, … |

---

## Mapa rápido de arquivos

```
apps/web/src/components/crm/conversation/
  conversation-thread.tsx          # header thread (nome + canal + OPEN)
  conversation-workspace.tsx       # bootstrap auto-select + wiring
  conversation-list-item.tsx       # Lead # + sigla + etapa na lista
  conversation-list-utils.ts       # formatLeadCode, assigneeShortCode
  lead-context-panel.tsx           # etapa read-only + Lead #
  conversation-channel-badge.tsx
apps/web/src/components/crm/beta/
  beta-conversations-view.tsx      # ?conversation= → workspace
  beta-kanban-view.tsx             # board query
apps/web/src/components/crm/
  kanban-board.tsx                 # DnD move + optimistic local
  operation/operation-page.tsx     # changeStage + moveBoardDeal
  operation/deal-conversation-panel.tsx  # header + stage select
apps/web/src/lib/
  types.ts, api.ts, query-keys.ts, board-cache.ts, beta-config.ts, operation-utils.ts
apps/api/src/
  conversations/conversations.service.ts   # detail + getContext
  conversations/conversations.controller.ts
  common/mappers/conversation.mapper.ts
  common/lead-sequence.ts
  deals/deals.controller.ts / deals.service.ts
```

---

## Estratégia de redesign (recomendada)

### Problema

O header do thread (`ConversationThread`) ainda é “inbox-like” (nome + canal + `OPEN`), enquanto a lista e o context panel já são CRM-like (Lead #, etapa, responsável). O usuário vê identidade incompleta no centro da tela.

### Direção

Tratar o header da conversa como **barra de identidade do lead**, alinhada à lista:

1. **Primário:** nome do contato (manter `contactName` / mesma hierarquia da lista se possível).
2. **Secundário:** `formatLeadCode(deal.leadSequence)` · `assigneeShortCode(owner ?? assignee)` · etapa (`stageName` ou `context.stage.name`).
3. **Canal:** manter badge; **status OPEN** — traduzir (`Aberto`) ou promover a badge; evitar enum cru.
4. **Etapa interativa (opcional fase 2):** select como em `DealConversationPanel`, reusando `dealsApi.move` + invalidate `pipelines.board` + `conversations.lists` + `conversations.context` / `detail`.

### Fonte de dados

| Opção | Prós | Contras |
|-------|------|---------|
| **A. Enriquecer detail** (`GET /conversations/:id`) | Um fetch já feito pelo workspace | Payload detail cresce |
| **B. Reusar context** (`GET …/context`) já prefetchado na lista | Já tem stage + leadSequence + owner | Segundo fetch / race |
| **C. Hidratar do list item** ativo | Instantâneo no click | Incomplete se deep-link / bootstrap |

**Recomendação:** A + C — mostrar imediatamente do list cache quando disponível; confirmar/atualizar com detail (garantir `leadSequence` + `stage.name` no include detail — hoje detail já mapeia `leadSequence` e `stage`).

### Utilitários

- Reutilizar `formatLeadCode` e `assigneeShortCode` (não inventar `sellerInitials`).
- Unificar Lead # do context panel (L362–369) com `formatLeadCode` (hoje duplica `padStart` inline).

### Auto-select

**Remover** o `router.replace` de bootstrap em desktop. Ausência de `conversation=` é estado válido (empty state). Deep-link com `conversation=` continua funcionando. Não alinhar bootstrap ao filtro — simplesmente não auto-selecionar.

### Move de etapa a partir do header

- Preferir o caminho Operação: `moveBoardDeal` + `dealsApi.move` + invalidate board/lists/context.
- Kanban DnD continua com optimistic local + invalidate board.
- Após move, atualizar `stageName` no header e no list item (invalidate `conversations.lists` + patch context cache se necessário).

### Fora de escopo imediato

- Não implementar upload de avatar.
- Não criar endpoint novo se detail/context já cobrem.
- Não confundir `POST /deals/:id/move` com o client atual (`PATCH`).

### Riscos

- Status `OPEN`/`RESOLVED`/`ARCHIVED` vs stage name — labels distintos; não misturar.
- Mobile: header compacto; ArrowLeft permanece; etapa pode ir para menu/select.
- Race bootstrap vs filtro: URL pode apontar conversa fora do filtro atual.

### Checklist de implementação (futuro)

- [ ] Extrair subcomponente `ConversationLeadHeader`
- [ ] Lead # + sigla + etapa no header
- [ ] i18n/label de `status`
- [ ] Unificar `formatLeadCode` no LeadContextPanel
- [ ] (Opcional) stage select + invalidate queries
- [ ] E2E: header mostra Lead # e etapa; move atualiza ambos
- [ ] Revisar bootstrap vs filtros da lista
