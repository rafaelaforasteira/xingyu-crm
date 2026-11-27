# Testes — Xingyu CRM

## Comandos

```powershell
pnpm test                 # unit + integration (turbo: api Jest, web Vitest)
pnpm test:api
pnpm test:web
pnpm test:coverage        # cobertura Jest da API
pnpm test:e2e             # Playwright (web em :3000, API em :3333)
pnpm quality              # lint + typecheck + test + load helpers
pnpm quality:full         # quality + build (sem E2E/load pesado)
```

## Banco local

```powershell
pnpm db:status
pnpm db:start             # Embedded Postgres local — NÃO usar db:reset nesta missão
pnpm db:generate
pnpm --filter @xingyu/database exec prisma validate
pnpm --filter @xingyu/database exec prisma migrate status
```

API: `http://localhost:3333` (`/api/health`)  
Web: `http://localhost:3000` (home autenticada atual: `/pipelines`; `/operacao` redireciona)  
Swagger: `http://localhost:3333/docs` (quando `SWAGGER_ENABLED=true`)

## Classificação

| Tipo | Onde |
|------|------|
| Unit | `apps/api/src/**/*.spec.ts`, `apps/web/src/**/*.test.ts` |
| Integration / API HTTP | `auth.integration.spec.ts`, Reactivation, pipeline channel lock |
| E2E | `apps/web/e2e/*.spec.ts` (Playwright) |
| Load | `tests/load` + `pnpm test:load:smoke` |
| Security | `apps/api/src/security`, AuthGuard, IDOR, RBAC |

## Auth de teste

Login real: `POST /api/auth/login` com `ADMIN_EMAIL` / `ADMIN_INITIAL_PASSWORD`.  
Cookies HttpOnly: `xingyu_access_token`, `xingyu_refresh_token`.  
Não usar `X-Demo-User-Id` como bypass fora de `DEMO_MODE` de desenvolvimento.

## Como adicionar um teste

1. Comportamento observável, não spy de implementação.
2. Isolar dados; não depender da ordem da suíte.
3. Datas em timezone `America/Sao_Paulo` ou ISO explícito.
4. Nunca apontar load tests para produção.
