# Navigation performance v2

Date: 2026-07-30  
Branch: `feature/crm-v1-complete`

## Environments

| Env | How | Notes |
|-----|-----|-------|
| Dev | `pnpm --filter @xingyu/web dev` + API `:3333` | Includes Next on-demand compile |
| Prod local | `pnpm --filter @xingyu/web build && start` | Preferred for UX targets |

## Causes identified (before)

1. **Cold route compile in `next dev`** — multi-second first hit per route segment.
2. **Single shared `(app)/loading.tsx` only** — coarse full-main skeleton; no per-area loading.
3. **No pending nav state** — sidebar waited for pathname commit before looking active.
4. **No route prefetch on hover** — Link default prefetch only for static routes in viewport.
5. **QueryClient `staleTime: 30s`** — ok but lists lacked `placeholderData` consistency.
6. **Duplicate message payloads** — `GET /conversations/:id` returned up to 200 messages while FE also called `/messages`.
7. **Heavy kanban/charts eagerly imported** on related pages.
8. **Inbox was a monolithic client page** without shared workspace / light list contract.

## Baseline (before this cycle)

From `docs/navigation-performance.md` (2026-07-30, manual Chrome timings, warm SPA unless noted):

| Transition | Dev cold (approx) | Dev warm (approx) |
|------------|-------------------|-------------------|
| dashboard → pipelines | 1.8–3.5s | 400–900ms |
| pipelines → contacts | — | 500–1200ms |
| contacts → reactivation | — | 600–1400ms |
| reactivation → repurchase | — | 400–900ms |

API issue (instrumented this cycle):

| Call | Before | After |
|------|--------|-------|
| `GET /conversations/:id` | Included `messages` (up to 200) | **No `messages` property**; preview only |
| Message history | Detail + `/messages` = double fetch | **Only** `/messages` |
| Live check (conv-04) | — | `detailHasMessagesProp=false`; send updates preview via list/detail fields |

## Changes implemented

### AppShell / Providers
- `staleTime: 60_000`, `gcTime: 5 * 60_000`, `refetchOnWindowFocus: false`
- Sidebar + Header remain in `(app)/layout` → AppShell (no remount on route change)

### Prefetch / pending
- `router.prefetch` on nav hover/focus
- `pendingHref` paints active state immediately on click

### Segmented loading
- `inbox`, `contacts`, `pipelines`, `reactivation`, `repurchase`, `after-sales` loading.tsx

### Dynamic imports
- Dashboard charts via `next/dynamic`
- KanbanBoard via `next/dynamic` (kanban route only)

### Conversations
- Light list + filters (`pipelineId`, channel, unread, …)
- Cursor messages endpoint
- `/context` for LeadContextPanel
- `/read` mark-as-read
- Composite indexes migration `20260730190000_conversation_list_indexes`

### Pipelines UX
- `GET /pipelines/navigation` submenu
- View switcher Kanban | Conversas
- Shared `ConversationWorkspace` for Inbox + pipeline conversations

## After measurements (dev, this cycle)

Instrument: `apps/web/e2e/navigation-perf.spec.ts` (serial, warm server on `:3000`).  
Raw JSON: `docs/_nav-perf-dev-after.json` (measuredAt in file).

> **Note (later):** the main sidebar was simplified. Contatos / Empresas / Pedidos / Recompra / Reativação / Pós-venda left the primary nav. Current `navigation-perf.spec.ts` measures Dashboard → Inbox → Tarefas → Pipelines → Automação → Marketing → Relatórios → Configurações. Historical rows below reflect the **legacy** menu path.

| Transition | Active (ms) | URL (ms) | Main (ms) | Settled (ms) | Full reload |
|------------|-------------|----------|-----------|--------------|-------------|
| dashboard→inbox | 718 | 668 | 764 | 1572 | no |
| inbox→contacts | 1373 | 1321 | 1412 | 2219 | no |
| contacts→pipelines | 863 | 809 | 908 | 1737 | no |
| pipelines→reactivation | 795 | 756 | 893 | 1694 | no |
| reactivation→repurchase | 829 | 787 | 837 | 1648 | no |
| repurchase→after-sales | 11297 | 11226 | 11338 | 12153 | no |
| after-sales→orders | 18023 | 17835 | 18048 | 18856 | no |
| pipelines→board | — | 1874 | — | 1874 | no |

Interpretation:
- Early transitions show SPA navigation without full reload; active state tracks URL closely.
- `after-sales` / `orders` spikes match **cold Next.js route compilation** in `dev` (not production).
- API message duplication removed (validated separately against `:3333`).

API validations via PowerShell against `:3333` (2026-07-30):

| Check | Result |
|-------|--------|
| `GET /pipelines/navigation` | 12 items; sample unreadCount present |
| Conversation list light shape | keys without `messages` |
| Detail without history | `detailHasMessagesProp=False` |
| Messages endpoint after send | count increases; detail still no messages array |
| Context endpoint | contact + pipeline + counts |
| Filter `pipelineId=pipe-novos` | `total=5` |

## Hotfix (2026-07-30 evening)

Additional root causes that kept Inbox empty in Playwright despite a healthy API:

1. **Stale Next.js `.next` cache** — `main-app.js` / `app-pages-internals.js` returned **404**, so the document never hydrated (`hasReactFiber: false`). SSR skeletons stayed forever; React Query never ran. Fix: delete `apps/web/.next` and restart `next dev`.
2. **Unstable conversation list query keys** — inline `scope={{ type: "global" }}` plus `undefined` fields in `listParams` caused key churn / cache collisions between bootstrap `useQuery` and list queries. Fix: stable scope constants, params without `undefined` keys, bootstrap under a distinct query key, paginated `useQuery` with `placeholderData`.

Validation after fix:

| Check | Result |
|-------|--------|
| `e2e/inbox-omnichannel.spec.ts` | pass (`--workers=1`) |
| `e2e/pipelines-navigation.spec.ts` | pass (SPA nav entry count unchanged) |
| Web unit tests | 30/30 |
| Web typecheck | pass |