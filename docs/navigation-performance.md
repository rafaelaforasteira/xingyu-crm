# Navigation performance

Date: 2026-07-30  
Branch: `feature/crm-v1-complete`  
Environment: local Next.js dev (`apps/web`) + Nest API on `:3333`

## Routes measured (manual instrumentation)

| Transition | Before (approx.) | After (approx.) | Notes |
|------------|------------------|-----------------|-------|
| /dashboard → /pipelines | 1.8–3.5s cold / 400–900ms warm | Immediate skeleton via `(app)/loading.tsx`; warm content ~300–700ms | Cold compiles dominate first hit in `next dev` |
| /pipelines → /contacts | 500–1200ms | 300–800ms | Shared shell already mounted |
| /contacts → /reactivation | 600–1400ms | 350–900ms | Reactivation query uses `keepPreviousData` |
| /reactivation → /repurchase | 400–900ms | 300–700ms | Smaller payload after DTO rebuild |
| /repurchase → /after-sales | 400–1000ms | 300–800ms | |
| /after-sales → /orders | 400–1000ms | 300–800ms | |

Times are wall-clock click → meaningful content in Chrome on Windows; not Lighthouse CI.

## Findings

1. **Next.js first compilation** in `dev` is the largest delay (multi-second). Production `next start` does not show this.
2. Missing route-level `loading.tsx` meant blank paint until the client tree resolved — fixed with shared `(app)/loading.tsx`.
3. React Query already uses sensible keys; reactivation uses `placeholderData: keepPreviousData`.
4. Heavy chart modules on dashboard/reports remain candidates for dynamic import (follow-up).

## Implemented

- Shared App Router loading skeleton under `apps/web/src/app/(app)/loading.tsx`
- Contract payloads reduced for repurchase/reactivation (no raw Prisma dumps)
- Kanban board loads a single pipeline board endpoint (no client-side filter of all pipelines)

## Follow-up

- Per-segment `loading.tsx` for pipelines/contacts/inbox
- Prefetch on sidebar hover for top 4 routes
- Dynamic import for report/marketing charts
- Measure again under `pnpm --filter @xingyu/web start` after `build`
