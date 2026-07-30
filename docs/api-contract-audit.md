# API ↔ Frontend Contract Audit

**Branch:** `feature/crm-v1-complete`  
**Scope:** Read-only audit of Xingyu CRM Nest API responses vs `apps/web` types and UI usage.  
**Global validation:** `apps/api/src/main.ts` uses `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })` — unknown body keys return **400**.

---

## Executive summary (highest severity)

| Severity | Issue | Where |
|----------|--------|--------|
| Critical | Contact create/update sends `name`; API requires `firstName` | `contact-form-dialog.tsx` → `CreateContactDto` |
| Critical | Company create sends `name`/`document`/`industry`; API requires `legalName`/`cnpj`/`segment` | `companies-page.tsx` → `CreateCompanyDto` |
| Critical | Contact/company list UI expects `.name`; API returns `firstName`/`lastName` / `legalName`/`tradeName` | contacts/companies pages |
| Critical | Tags on contacts are `ContactTag[]` (`{ contactId, tagId, tag }`), UI treats as `Tag[]` | contacts list |
| High | Deal detail / list do not map `unreadMessages`→`unreadCount`, flatten tags, or add contact/company `name` (board does) | `deals.service.ts` vs board mapper |
| High | Messages filtered by `createdAt`; API primary timestamp is `sentAt`; paginated messages envelope | inbox + `normalizeMessages` |
| High | Dashboard metrics/charts field names diverge entirely from `DashboardMetrics` / `DashboardCharts` | `dashboard.service.ts` vs `dashboard-page.tsx` |
| High | Repurchase returns won deals, not `RepurchaseLead` shape | `repurchase.service.ts` vs `lifecycle-pages.tsx` |
| High | Settings overview shape + missing `PATCH /settings` | `settings.service.ts` vs `settings-pages.tsx` |
| High | Missing nested routes FE calls: `/contacts/:id/{activities,deals,orders,tasks}`, `/companies/:id/contacts`, `/deals/:id/{activities,files}`, `/orders/:id/timeline` | controllers vs `api.ts` |
| Medium | Task status `DONE` (FE) vs `COMPLETED` (Prisma/API) | `tasks-page.tsx` |
| Medium | Reactivation DTO advertises `existingOpenDeal` / `latestConversation` / `workflow`; list mapper omits them; controller methods `createOpportunity`/`createAction` not implemented on service | reactivation module |
| Medium | Stage sort tolerates `order` vs `position`; API only has `position` | mostly OK via fallback |

---

## Shared conventions

### Pagination

- **API:** `{ data: T[], meta: { total, page, pageSize, totalPages } }` via `apps/api/src/common/types/paginated-response.ts`.
- **FE:** `PaginatedResponse<T>` in `apps/web/src/lib/types.ts`.
- Some FE clients unwrap arrays (`pipelinesApi.list`, `settingsApi.teams/users/tags`, `conversationsApi.messages`); others assume paginated only.

### Dates / Decimals

- Prisma `DateTime` → JSON ISO strings (Nest default).
- Prisma `Decimal` → often serialized as **string** unless mapper uses `Number(...)`.
- Board/kanban mappers convert `deal.value` with `Number(deal.value)`; list/detail deals often do **not**.

### Optional relations

- Nested `contact` / `company` / `owner` / `assignee` may be `null` or partial selects without display `name`.
- Accessing `entity.name` without a mapper causes blank UI or runtime errors when relation is null.

---

## 1. Contacts

### 1.1 Actual API response shape

**Sources:** `apps/api/src/contacts/contacts.service.ts`, `dto/contact.dto.ts`, Prisma `Contact`.

**List (`GET /contacts`):** paginated Contact rows with:

```
include: {
  company: true,                    // full Company (legalName, tradeName, cnpj, ...)
  owner: { id, name },
  tags: { include: { tag: true } }  // ContactTag junction, NOT Tag[]
}
```

**Core Contact fields (no `name`):** `id`, `firstName`, `lastName`, `email`, `phone`, `whatsapp`, `instagram`, `companyId`, `ownerId`, `teamId`, `type`, `status`, `source`, `observations`, purchase aggregates (`totalPurchased`, `averageTicket`, `orderCount`, …), timestamps. **No** `lastInteractionAt` on Contact model.

**Detail (`GET /contacts/:id`):** same + `deals`, `notes` (Note entities with `content`, not a string field named `notes`).

**Create/Update DTO whitelist:** `firstName` (required on create), `lastName`, `email`, `phone`, `whatsapp`, `companyId`, `ownerId`, `teamId`, `source`, `status`, `type`, `tagIds`, `notes` (mapped → `observations`). **`name` is not allowed.**

### 1.2 Frontend expected type / usage

- `Contact` in `types.ts`: **`name: string`**, optional `notes?: string`, `tags?: Tag[]`, `company?: Company` (with `name`), `lastInteractionAt`.
- `contactsApi` in `api.ts`: `Partial<Contact>` for create/update; nested `activities`/`deals`/`orders`/`tasks` helpers.
- UI: `contacts-page.tsx` uses `contact.name`, `contact.company?.name`, `contact.tags?.map(t => t.name)`, `contact.lastInteractionAt`.
- `contact-form-dialog.tsx` submits `{ name, email, phone, whatsapp, source }`.
- `contact-detail-page.tsx` uses `c.name`, `c.company?.name`, and nested APIs.

### 1.3 Incompatible fields

| API | Frontend | Notes |
|-----|----------|-------|
| `firstName` + `lastName` | `name` | Display + form |
| `observations` | `notes` (string on Contact) | Detail also returns `notes: Note[]` relation — type clash |
| `tags: ContactTag[]` (`{ tag: Tag }`) | `tags: Tag[]` | Flattening missing |
| (absent) `lastInteractionAt` | `lastInteractionAt` | Always undefined |
| `company.legalName` / `tradeName` | `company.name` | Nested company |
| Create body `name` | — | **400 forbidNonWhitelisted** |
| Nested routes under `/contacts/:id/*` | `contactsApi.activities/deals/orders/tasks` | **404** — controller has no such routes |

### 1.4 Optional relations risks

- `company` / `owner` null → `"—"` OK in list; Avatar/title with empty `name` breaks UX.
- Detail embeds raw deals/notes without FE-shaped fields.

### 1.5 Date / Decimal issues

- `totalPurchased` / `averageTicket` may be Decimal strings if ever shown from raw contact.
- `createdAt`/`updatedAt` OK as ISO strings.

### 1.6 Error risks

- **400** on create/update with `name`.
- Hydration: blank names / tag `.name` on junction objects (`undefined`).
- Contact detail nested fetches fail (404).

### 1.7 Fix strategy (mapper fields)

```ts
// response mapper
name: [c.firstName, c.lastName].filter(Boolean).join(" ")
notes: c.observations ?? null
tags: (c.tags ?? []).map((ct) => ct.tag).filter(Boolean)
company: c.company ? { ...c.company, name: c.company.tradeName ?? c.company.legalName, document: c.company.cnpj } : null
lastInteractionAt: null // or derive from Activity/Conversation

// request mapper (contact-form-dialog)
{ firstName: split(name)[0], lastName: split(name).slice(1).join(" ") || undefined, email, phone, whatsapp, source }
```

Prefer API response DTOs for list/detail; keep Prisma shape internal.

---

## 2. Companies

### 2.1 Actual API response shape

**Sources:** `apps/api/src/companies/companies.service.ts`, `dto/company.dto.ts`, Prisma `Company`.

**List:** Company + `owner: { id, name }` + `_count.contacts` (not `contactsCount`).

**Fields:** `legalName`, `tradeName`, `cnpj`, `email`, `phone`, `website`, `segment`, `city`, `state`, `country`, `observations`, purchase aggregates — **no** `name`, `document`, `industry`, `contactsCount`, `dealsCount`.

**Create DTO:** `legalName` (required), `tradeName`, `cnpj`, `email`, `phone`, `website`, `segment`, `city`, `state`, `country`, `ownerId`, `notes` → `observations`.

**Controller:** no `GET /companies/:id/contacts` (contacts are embedded on detail `contacts: Contact[]`).

### 2.2 Frontend expected / usage

- `Company`: `name`, `document`, `industry`, `contactsCount`, `dealsCount`.
- `companies-page.tsx` create: `{ name, document, email, phone, industry }`.
- List/detail: `c.name`, `c.document`, `c.industry`, `c.contactsCount`; detail calls `companiesApi.contacts(id)`.

### 2.3 Incompatible fields

| API | Frontend |
|-----|----------|
| `legalName` / `tradeName` | `name` |
| `cnpj` | `document` |
| `segment` | `industry` |
| `_count.contacts` | `contactsCount` |
| (absent) | `dealsCount` |
| Create `name`/`document`/`industry` | **400** |
| `GET /companies/:id/contacts` | **404** |

### 2.4 Optional relations / errors

- Nested contacts on detail lack `name` → `contact.name` blank in company detail tab.
- Create always 400 with current form payload.

### 2.5 Date / Decimal

- `totalPurchased` / `averageTicket` Decimal strings if exposed raw.

### 2.6 Fix strategy

```ts
name: company.tradeName ?? company.legalName
document: company.cnpj
industry: company.segment
contactsCount: company._count?.contacts ?? company.contacts?.length
// request
{ legalName: values.name, cnpj: values.document, segment: values.industry, email, phone }
```

Use detail `contacts` from `GET /companies/:id` or add dedicated route; map contact names.

---

## 3. Pipelines (list / detail / board)

### 3.1 Actual API response shape

**Sources:** `apps/api/src/pipelines/pipelines.service.ts`.

**List/detail:** Pipeline + `defaultTeam`, `defaultOwner`, `stages` (ordered by **`position`**), computed `stagesCount`, `dealsCount`, `openValue` (number), `channels: { id, name, type, enabled }[]`. Stages use Prisma fields: `position`, `type`, `isInitial`, `isWon`, `isLost`, `maxDaysInStage`, etc. **No `order` field.**

**Board (`GET /pipelines/:id/board`):** stages with open deals; **per-deal mapper applies:**

- `value: Number(deal.value)`
- `unreadCount: deal.unreadMessages` (also leaves `unreadMessages` on object)
- `contact.name` from first/last
- `company.name` from trade/legal
- `tags` flattened from `DealTag[]` → `Tag[]`

List/detail stages do **not** attach deals (except board).

### 3.2 Frontend expected / usage

- `Pipeline` / `PipelineStage` in `types.ts`: stage has required **`order: number`** and optional `position`.
- `sortPipelineStages` in `deal-board-dialogs.tsx`: `(position ?? order ?? 0)` — works if `position` present.
- `pipelines-page.tsx`, `kanban-board.tsx`: board via `pipelinesApi.board`.
- Stage settings pages also use `position ?? order`.

### 3.3 Incompatible fields

| API | Frontend | Severity |
|-----|----------|----------|
| `position` only | `order` required in type | Low at runtime (fallback); TypeScript lie |
| Board deals mapped | List/detail deals unmapped if ever used | Medium |
| — | — | Pipeline list/detail mostly aligned |

### 3.4 Optional relations

- `defaultOwner` / `defaultTeam` null OK.
- Stages without `deals` on non-board endpoints → empty columns if wrong endpoint used.

### 3.5 Date / Decimal

- `openValue` already `Number` on list/detail.
- Board deal `value` numeric; raw Prisma path elsewhere may stringify.

### 3.6 Error risks

- Low for board sorting due to `position` fallback.
- Creating stages with FE sending `order` instead of `position` → **400** if forbidden (check stage DTOs — they use `position`).

### 3.7 Fix strategy

```ts
// stage mapper
order: stage.position
position: stage.position
```

Align `PipelineStage.order` as alias in API DTO or make FE `order` optional.

---

## 4. Deals

### 4.1 Actual API response shape

**Sources:** `apps/api/src/deals/deals.service.ts`, `dto/deal.dto.ts`, Prisma `Deal`.

**List:** deal + `contact: { id, firstName, lastName }`, `company: { id, legalName, tradeName }`, `stage`, `owner: { id, name }` — **no** name flattening, **no** tag include, **no** `unreadCount` alias, `value` may be Decimal.

**Detail (`findOne`):** full `contact`, `company`, `stage`, `pipeline.stages`, `owner`, `activities` — still **no** FE display aliases; **no** `tags`, **no** `nextTask`, **no** `unreadCount`.

**Board/kanban:** mapped (see Pipelines).

**Create/Update DTO:** `name`, `value`, `pipelineId`, `stageId`, relation ids, `status`, `priority`, `source`, `campaign`. No `currency`, no `tags` array, no `unreadCount`.

**Controller:** no `GET /deals/:id/activities` or `/files`. Move is `POST /deals/:id/move` while FE `dealsApi.move` uses `PATCH /deals/:id` with `{ stageId }` (works via update, but different path).

### 4.2 Frontend expected / usage

- `Deal`: `value?: number`, `currency?`, `contact?: Contact` (with `name`), `company?: Company` (with `name`), `tags?: Tag[]`, `unreadCount?`, `nextTask?`.
- `kanban-board.tsx`: `deal.contact?.name`, `unreadCount`, `tags[].name`, `nextTask?.title`, `formatCurrency(deal.value)`.
- `deal-workspace.tsx`: same + `dealsApi.activities` / `files`, `conversationsApi.byDeal`, notes, orders by `dealId`.

### 4.3 Incompatible fields

| API | Frontend |
|-----|----------|
| `unreadMessages` | `unreadCount` (only aliased on board) |
| `tags: DealTag[]` | `tags: Tag[]` (only on board) |
| contact without `name` | `contact.name` |
| company without `name` | `company.name` |
| (absent) `nextTask` | `nextTask` |
| (absent) `currency` | `currency` |
| Decimal `value` | `number` |
| Missing `/deals/:id/activities`, `/files` | FE calls → **404** |
| Activities on detail as nested `activities` | FE expects separate Activity list endpoint |

### 4.4 Optional relations

- Detail contact/company null → blank labels.
- Tags undefined → empty chips OK; junction without flatten → crash if iterating `.name` on junction.

### 4.5 Date / Decimal

- `value` Decimal string breaks `formatCurrency` / kanban sum if unmapped (`"100" +` coercion vs NaN risks).
- `lastInteractionAt` ISO OK when present.

### 4.6 Error risks

- Workspace activities/files 404.
- `conversationsApi.byDeal` passes `dealId` query; `QueryConversationsDto` has **no** `dealId` → stripped by whitelist → returns unrelated page of conversations / wrong thread.

### 4.7 Fix strategy

Reuse board mapper for all deal responses:

```ts
value: Number(deal.value)
unreadCount: deal.unreadMessages
contact: mapContactName(deal.contact)
company: mapCompanyName(deal.company)
tags: (deal.tags ?? []).map((t) => t.tag)
nextTask: /* optional include latest open Task */
```

Add `dealId` to conversations query DTO or resolve via `deal.conversationId`. Implement or redirect activities/files endpoints.

---

## 5. Reactivation

### 5.1 Actual API response shape

**Sources:** `apps/api/src/reactivation/reactivation.service.ts` (`list` only), `dto/reactivation.dto.ts`, controller.

**List item (what service actually returns):**

```
{
  id, contact: { id, name, firstName, lastName, email, phone, whatsapp, instagram,
                 totalPurchased: number, averageTicket: number, orderCount },
  score, reason, status, classification, daysInactive,
  lastInteractionAt, lastPurchaseAt,  // ISO or null
  owner: { id, name } | null,
  team: { id, name } | null,
  existingOpenDealId
}
```

**DTO / Swagger also documents but list does not populate:** `existingOpenDeal`, `latestConversation`, `workflow`.

**Controller** exposes `POST :contactId/opportunity` and `POST :contactId/actions` calling `service.createOpportunity` / `createAction` — **these methods are not implemented** on `ReactivationService` (only `list` exists) → runtime failure if called.

**Query DTO:** rich filters (`scoreMin/Max`, `inactiveDaysMin/Max`, `segment`, `sortBy`, dates, etc.) — aligned with FE `ReactivationListQuery`.

### 5.2 Frontend expected / usage

- `ReactivationLead` + nested types in `types.ts`; `normalizeReactivationResponse` in `reactivation-utils.ts`.
- Normalizer accepts missing `existingOpenDeal` / `latestConversation` / `workflow` as null (OK).
- `lifecycle-pages.tsx` uses `row.contact.name`, `orderCount`, `totalPurchased`, `existingOpenDealId` — **assumes `contact` non-null** after normalize (normalize can set `contact: null` if invalid).

### 5.3 Incompatible fields

| Documented / FE | Actual list payload |
|-----------------|---------------------|
| `existingOpenDeal` object | only `existingOpenDealId` |
| `latestConversation` | absent → always null after normalize |
| `workflow` | absent → always null |
| Opportunity/action APIs | not implemented on service |

List core fields are **mostly aligned** with FE after normalizer (including `contact.name`).

### 5.4 Optional relations

- `contact` null after strict normalize → UI crash on `row.contact.name`.
- `owner`/`team` null handled.

### 5.5 Date / Decimal

- Service coerces Decimals via `numericValue` and dates via `isoDate` — **good**.
- FE normalizer re-parses dates to ISO — OK.

### 5.6 Error risks

- Calling opportunity/action endpoints → server error.
- Null contact dereference in lifecycle table.

### 5.7 Fix strategy

```ts
// enrich list mapper
existingOpenDeal: await loadOpenDeal(existingOpenDealId) // { id, pipelineId, stageId, conversationId, name?, createdAt }
latestConversation: await loadLatestConversation(contactId)
workflow: await loadLatestLifecycleAction(contactId) // from LifecycleAction model if present
```

Implement controller service methods or remove routes until ready. Guard UI: `row.contact?.name`.

---

## 6. Repurchase

### 6.1 Actual API response shape

**Source:** `apps/api/src/repurchase/repurchase.service.ts`.

Returns **paginated won Deals** closed before cutoff:

```
{ ...deal, opportunityType: "REPURCHASE", daysSinceClose,
  contact: { id, firstName, lastName, email, phone, whatsapp },
  company: { id, legalName },
  owner: { id, name } }
```

No `score`, `reason`, `daysSinceOrder`, `predictedValue`, nested `contact.name`.

### 6.2 Frontend expected / usage

- `RepurchaseLead`: `{ id, contact: Contact, score, lastOrderAt?, daysSinceOrder?, predictedValue?, reason?, status? }`.
- `RepurchasePage` maps `r.contact.name`, `r.score`, `r.reason`, `r.daysSinceOrder`, `r.predictedValue`.

### 6.3 Incompatible fields

| API | Frontend |
|-----|----------|
| Deal record | `RepurchaseLead` |
| (absent) `score` | required for badge |
| (absent) `reason` | fallback meta |
| `daysSinceClose` | `daysSinceOrder` |
| (absent) `predictedValue` | optional currency |
| `contact` without `name` | `contact.name` |
| `closedAt` | `lastOrderAt` |
| href uses `r.contact.id` | crashes if contact null |

### 6.4–6.6 Risks

- Blank names, `score` undefined, NaN currency.
- Decimal `value` on deal if shown.

### 6.7 Fix strategy

```ts
{
  id: deal.id,
  contact: mapContact(deal.contact), // with name
  score: computeRepurchaseScore(deal),
  daysSinceOrder: deal.daysSinceClose,
  lastOrderAt: deal.closedAt,
  predictedValue: Number(deal.value),
  reason: "Recompra pós-fechamento",
  status: deal.status,
}
```

---

## 7. Occurrences (after-sales)

### 7.1 Actual API response shape

**Source:** `apps/api/src/occurrences/occurrences.service.ts`, Prisma `Occurrence`.

```
protocol, type, status, priority, description, orderId, contactId, ownerId,
contact: { id, firstName, lastName },
order: { id, number },
owner: { id, name }
```

**No** `title`, **no** `assignee`, **no** `openedAt`/`resolvedAt` (uses `createdAt`/`updatedAt`). Create maps `dto.title` → `description`.

### 7.2 Frontend expected / usage

- `Occurrence`: `title`, `openedAt`, `assignee?`, `contact?` with `name`, `order?`.
- `lifecycle-pages.tsx`: `o.title`, `o.contact?.name`, detail `data.assignee?.name`.

### 7.3 Incompatible fields

| API | Frontend |
|-----|----------|
| `protocol` / `description` | `title` |
| `owner` | `assignee` |
| `createdAt` | `openedAt` |
| (absent) `resolvedAt` | optional |
| contact without `name` | `contact.name` |

### 7.4–6 Fix strategy

```ts
title: occurrence.description ?? occurrence.protocol
assignee: occurrence.owner
openedAt: occurrence.createdAt
contact: mapContactName(occurrence.contact)
```

---

## 8. Conversations / Inbox / Messages

### 8.1 Actual API response shape

**Source:** `apps/api/src/conversations/conversations.service.ts`.

**List:** Conversation + `contact: { id, firstName, lastName, whatsapp }`, `assignee: { id, name }`, `channel` (object), `lastMessagePreview` (derived), `unreadCount` (Prisma field — **aligned**).

**Detail:** full contact + messages (`sentAt`, `body`, `direction`, `senderId`, …).

**Messages list:** **paginated** `{ data, meta }`; message has `sentAt`, optional `body`, `senderId` (not `author` / `createdAt` as primary).

**Query DTO:** `contactId`, `channel`, `status`, `assigneeId` — **no `dealId`**.

**SendMessageDto:** `body`, optional `direction` (`inbound`/`outbound` lowercase mapping).

### 8.2 Frontend expected / usage

- `Conversation`: `unreadCount`, `lastMessagePreview`, `contact` with `name`, `channel` string|object, `dealId`.
- `Message`: `body`, `createdAt`, `author?`, direction enums.
- `inbox-utils.contactName` already falls back to first/last — **good**.
- `normalizeMessages` requires `typeof createdAt === "string"` — **drops messages that only have `sentAt`**.
- Paginated messages: `normalizeMessages` reads `.data` — OK; but each item still fails `createdAt` guard.

### 8.3 Incompatible fields

| API | Frontend |
|-----|----------|
| contact without `name` | mitigated by `contactName()` in inbox |
| Message `sentAt` | `createdAt` |
| `senderId` | `author` / `authorId` |
| `body` nullable | `body: string` required in guard |
| no `dealId` on Conversation model query | FE `byDeal(dealId)` |
| List not filtered by deal | wrong conversation in deal workspace |

### 8.4 Optional relations

- `channel` object OK via `channelName()`.
- Empty message list if all filtered out by `createdAt` check → blank thread / hydration mismatch feel.

### 8.5 Date issues

- Sort/display use `createdAt`; API sorts by `sentAt`.

### 8.6 Error risks

- Silent empty inbox thread after send (new message may lack FE-shaped `createdAt` until remapped).
- `dealId` query ignored (whitelist strip) → wrong or first conversation.

### 8.7 Fix strategy

```ts
// message mapper
createdAt: message.sentAt
authorId: message.senderId
body: message.body ?? ""
// conversation list contact
contact: { ...c, name: fullName(c) }
// QueryConversationsDto add dealId OR resolve Deal.conversationId
```

---

## 9. Orders

### 9.1 Actual API response shape

**Source:** `apps/api/src/orders/orders.service.ts`, Prisma `Order` / `OrderItem`.

Order: `number`, `status`, **`finalValue` / `grossValue`**, `orderedAt`, `observations`, items with **`totalPrice`**, `unitPrice` (Decimal), `productName`, contact/company without display `name`.

**No** `total`, **no** `placedAt`, **no** `itemsCount`, **no** `timeline` on order. **No** `GET /orders/:id/timeline` on controller.

### 9.2 Frontend expected / usage

- `Order`: `total: number`, `placedAt`, `itemsCount`, `items[].total`, contact/company with `name`.
- `orders-page.tsx`: `o.total`, `o.placedAt`, `o.contact?.name`.
- `ordersApi.timeline` → missing route.
- Deal workspace lists orders via `ordersApi.list({ dealId })`, but `QueryOrdersDto` has **no `dealId`** (only `status`/`contactId`/`companyId`/`ownerId`) → whitelist strips `dealId` → unfiltered order list.

### 9.3 Incompatible fields

| API | Frontend |
|-----|----------|
| `finalValue` | `total` |
| `orderedAt` | `placedAt` |
| `totalPrice` | `item.total` |
| Decimal money fields | `number` |
| contact/company names | missing |
| `/orders/:id/timeline` | **404** |
| Query without `dealId` | `ordersApi.list({ dealId })` ignored |

### 9.4 Fix strategy

```ts
total: Number(order.finalValue)
placedAt: order.orderedAt
itemsCount: order.items?.length
items: order.items.map(i => ({ ...i, unitPrice: Number(i.unitPrice), total: Number(i.totalPrice) }))
contact/company: map names
```

Wire timeline to `GET /activities/timeline?orderId=` or add order sub-route.

---

## 10. Tasks

### 10.1 Actual API response shape

**Source:** `apps/api/src/tasks/tasks.service.ts`, Prisma `TaskStatus`: `PENDING | IN_PROGRESS | COMPLETED | CANCELLED`.

List includes assignee, contact `{ id, firstName, lastName }`, deal `{ id, name }`. Overdue filter uses `status: { not: "COMPLETED" }`.

### 10.2 Frontend expected / usage

- `Task.status` allows `"DONE"`; `tasks-page.tsx` creates/filters/`update(..., { status: "DONE" })`.
- Displays `task.contact?.name`.

### 10.3 Incompatible fields

| API | Frontend |
|-----|----------|
| `COMPLETED` | `DONE` |
| contact without `name` | `contact.name` |
| Enum reject on invalid status | **400** on mark done |

### 10.4 Fix strategy

Map FE `DONE` ↔ API `COMPLETED` in client or accept both in API. Map contact names on task responses.

---

## 11. Dashboard

### 11.1 Actual API response shape

**Source:** `apps/api/src/dashboard/dashboard.service.ts`.

**Metrics:** `newLeads`, `unansweredLeads`, `openDeals`, `pipelineValue`, `pendingPayments`, `salesCount`, `revenue`, `averageTicket`, `conversionRate`, `avgFirstResponseMinutes`, `tasksToday`, `overdueTasks`, `repurchaseReady`, `atRiskCustomers`, `ordersInProgress`.

**Charts:** `revenueByPeriod`, `leadsBySource`, `dealsByStage`, `performanceByOwner`, `salesByChannel`.

**Lists:** `tasksToday`, `unread`, `recentDeals`, `afterSales`, `overdueTasks`, `pendingPayments` — raw Prisma entities (contacts without `name`, occurrences without `title`, deals Decimal `value`, conversations without `lastMessagePreview`).

### 11.2 Frontend expected / usage

**Metrics (`DashboardMetrics`):** `openDeals`, `pipelineValue`, `tasksToday`, **`unreadConversations`**, **`ordersInTransit`**, `repurchaseReady`, **`afterSalesOpen`**, `conversionRate`, …

**Charts (`DashboardCharts`):** `pipelineByStage`, `revenueTrend`, `channelMix`.

**Lists typing in `api.ts`:** subset without overdue/payments.

### 11.3 Incompatible fields

| API | Frontend |
|-----|----------|
| `unansweredLeads` | `unreadConversations` |
| `ordersInProgress` | `ordersInTransit` |
| (absent) | `afterSalesOpen` |
| `dealsByStage` | `pipelineByStage` |
| `revenueByPeriod` | `revenueTrend` |
| `salesByChannel` | `channelMix` |
| list entity shapes | FE display fields (`title`, `name`, …) |

### 11.4 Fix strategy

Either change API to emit FE contract or add `dashboardApi` client mapper:

```ts
unreadConversations: m.unansweredLeads
ordersInTransit: m.ordersInProgress
afterSalesOpen: /* count or lists.afterSales.length */
pipelineByStage: charts.dealsByStage
revenueTrend: charts.revenueByPeriod
channelMix: charts.salesByChannel
```

Map list row display fields.

---

## 12. Settings

### 12.1 Actual API response shape

**Overview (`GET /settings`):** `{ organization: Organization | null, counts: { users, teams, tags, pipelines } }` where Organization has `name`, `timezone`, `currency` (not `organizationName`).

**Teams/users/tags:** paginated. Integrations: `GET /settings/integrations` returns keyed mock status object, not `{ id, name, connected }[]`.

**No** `PATCH /settings` for org profile (FE `settingsApi.update` → **404**).

Custom fields: dedicated `GET /settings/custom-fields`, not embedded in overview.

### 12.2 Frontend expected / usage

- `SettingsOverview`: `organizationName`, `timezone`, `currency`, `teams`, `users`, `channels?`, `integrations?`.
- General settings form reads `data.organizationName` and patches same keys.
- Tags page sometimes derives tags from contacts overview hack; users/teams list endpoints partially handled by unwrap in `api.ts`.

### 12.3 Incompatible fields

| API | Frontend |
|-----|----------|
| `organization.name` | `organizationName` |
| `counts` only | embedded `teams`/`users` arrays |
| integrations status map | `integrations: { id, name, connected }[]` |
| no PATCH overview | `settingsApi.update` |
| custom fields separate | cast on overview `.customFields` |

### 12.4 Fix strategy

```ts
// overview mapper
{
  organizationName: org.name,
  timezone: org.timezone,
  currency: org.currency,
  teams: [...],
  users: [...],
  integrations: Object.entries(status).map(([id, v]) => ({ id, name: id, connected: v.configured })),
}
```

Add `PATCH /settings` accepting `{ organizationName, timezone, currency }` → Organization update.

---

## 13. Notes & Activities (cross-cutting for deal workspace)

| Topic | API | FE |
|-------|-----|-----|
| Note body field | `content` | `body` / `content` (UI uses `n.body ?? n.content`) |
| Notes list | paginated `{ data, meta }` | `api.get<Note[]>` — may break `.map` if not unwrapped |
| Create note | `content` | sends `content` — **aligned** |
| Activity | `metadata` | `meta` |
| Activity list | paginated | often expected as array |

**Fix:** unwrap notes like messages; alias `body: content`, `meta: metadata`.

---

## Priority fix order (recommended)

1. **Request mappers / forms:** contact `name`→`firstName`/`lastName`; company `name`→`legalName`, `document`→`cnpj`, `industry`→`segment` (stops 400s).
2. **Shared response mappers:** `mapContact`, `mapCompany`, `flattenTags`, `mapDealCard` (reuse board mapper everywhere).
3. **Messages:** `sentAt`→`createdAt`; ensure inbox normalizer accepts API shape.
4. **Dashboard + settings + repurchase + occurrence** field aliases.
5. **Missing routes:** implement or retarget FE (`activities`, `timeline`, `files`, `companies/:id/contacts`, conversations `dealId`).
6. **Reactivation enrichment + implement or stub opportunity/action services.**
7. **Task status** DONE↔COMPLETED.

---

## Module coverage checklist

| Module | Documented |
|--------|------------|
| Contacts | Yes |
| Companies | Yes |
| Pipelines (board) | Yes |
| Deals | Yes |
| Reactivation | Yes |
| Repurchase | Yes |
| Occurrences | Yes |
| Conversations / Inbox | Yes |
| Orders | Yes |
| Tasks | Yes |
| Dashboard | Yes |
| Settings | Yes |
| Notes / Activities (supporting) | Yes |

---

*Generated as a read-only audit. No application code was modified for this document.*
