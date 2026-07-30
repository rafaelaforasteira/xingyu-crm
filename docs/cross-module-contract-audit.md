# Cross-module contract audit

Date: 2026-07-30  
Branch: `feature/crm-v1-complete`

## Corrected in this cycle

| Module | Issue | Fix |
|--------|-------|-----|
| Contacts | API returned Prisma shape (`firstName` only, junction tags); form sent `name` | Response mapper + form `firstName`/`lastName` |
| Companies | Form sent `name`/`document`/`industry` | Form sends `legalName`/`cnpj`/`segment`; mapper adds `name`/`document`/`industry` aliases |
| Deals / Kanban | `unreadMessages`, nested tags, Decimal | `toDealResponse` → `unreadCount`, flat tags, numeric value |
| Pipeline stages | FE preferred `order` | Official field `position`; FE sorts by `position` first |
| Reactivation | Contract already rebuilt earlier; missing convert action | DTO + `POST .../opportunity` + LifecycleAction |
| Repurchase | Returned raw WON deals | Scored opportunity DTO + create opportunity |
| Relative dates | `formatRelative` during render | `ClientRelativeTime` across CRM surfaces |

## Remaining risks (non-blocking)

| Area | Risk | Notes |
|------|------|-------|
| Automations | Still sorts nodes by `order` | Internal automation graph field, not PipelineStage |
| Nested contact endpoints | `/contacts/:id/activities` may 404 if unimplemented | Soft dependency from detail tabs |
| Decimal JSON | Some endpoints may still serialize Decimal as string if mapper skipped | Prefer shared mappers on every write path |
| Marketing/Reports | Lightweight demo payloads | Not CRM core contract surfaces |

## Unsafe patterns scanned

- `as any` / `as never` — not introduced as contract fixes
- Direct `formatRelative(` in CRM pages — removed (definition remains in utils for Inbox compatibility)
- `stage.order` as primary sort — demoted behind `position`
