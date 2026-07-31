# Navigation performance v3

Date: 2026-07-30  
Branch: `feature/crm-v1-complete`

## Problem

Route transitions still felt slow after v2, and the main menu was overloaded with secondary modules (Pedidos, Recompra, Reativação, Pós-venda, Contatos, Empresas).

## Root causes found

1. **Main nav too large** — more items = more cognitive delay and more prefetch work on hover.
2. **Cold Next compile in `next dev`** — still the dominant spike for first visit to a segment.
3. **Stale `.next` chunk 404s** (from v2) — can freeze hydration; documented again as operational risk.
4. **Missing segmented `loading.tsx`** for tasks/automations — blank main while JS loads.
5. **Heavy pages still mounted eagerly** when not needed (kanban/charts already dynamic; kept).

## Fixes in this round

- Reordered and slimmed `NAV_ITEMS` to: Dashboard → Inbox → Tarefas → Pipelines → Automação → Marketing → Relatórios → Configurações.
- Kept lifecycle/orders routes accessible via command palette / direct URL.
- Added `loading.tsx` for `/tasks` and `/automations`.
- Pipeline submenu uses light `/pipelines/navigation` (icon + index + color) without boards/deals.
- QueryClient defaults unchanged (`staleTime` 60s, `gcTime` 5m, no focus refetch).
- Pending nav + prefetch retained from v2.

## Metrics

Instrument: `apps/web/e2e/navigation-perf.spec.ts` (serial).  
Path follows the **simplified main sidebar**:

Dashboard → Inbox → Tarefas → Pipelines → Automação → Marketing → Relatórios → Configurações  
(+ optional `pipelines→board` via central list)

Secondary modules (Contatos, Empresas, Pedidos, Recompra, Reativação, Pós-venda) remain routable but are **not** measured via sidebar clicks.

### Before (v2 doc, warm SPA, `next dev` — legacy menu path)

| Transition | Active (ms) | Notes |
|------------|-------------|-------|
| dashboard→inbox | ~718 | SPA |
| inbox→contacts | ~1373 | SPA (contacts no longer in main nav) |
| contacts→pipelines | ~863 | SPA |
| cold after-sales/orders | 11–18s | compile |

### After (this round)

| Check | Result |
|-------|--------|
| Sidebar item click paints pending immediately | yes (`pendingHref`) |
| Full document reload between CRM areas | no (SPA) |
| Main nav item count | 14 → **8** |
| Pipelines submenu payload | light navigation DTO only |
| Tasks / Automação first paint | segmented skeleton |
| Perf E2E path | aligned with simplified sidebar |

Re-measure with Playwright `navigation-perf` against production local (`pnpm build && pnpm start`) for absolute budgets when validating release. Raw JSON is written to `docs/_nav-perf-{mode}.json`.

## Operational note

If routes freeze on skeletons with zero API calls, clear `apps/web/.next` and restart `next dev` — usually a corrupted chunk manifest (404 on `main-app.js`).
