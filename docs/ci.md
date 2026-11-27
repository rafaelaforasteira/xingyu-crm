# CI

## `ci.yml`

Dispara em push/PR para `develop`/`main`.

Passos: install (pnpm 9.15.4, Node 20, cache pnpm) → Prisma generate → migrate deploy → seed → lint → typecheck → test → API coverage → load target guards → build.

Postgres 16 como service. Secrets de teste, nunca de produção.

## `performance.yml`

`workflow_dispatch` apenas. Não dispara load pesado em PR. Valida o helper que bloqueia alvos de produção.

## Quality gates

Merge deve falhar se lint, typecheck, unit tests ou build falharem.

E2E Playwright **não** roda neste CI (precisa web+API longos e é parcialmente flaky). Rodar localmente: `pnpm test:e2e -- --workers=1`.
