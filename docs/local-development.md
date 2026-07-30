# Desenvolvimento local

O `.env` da raiz é a única fonte local de configuração. Ele não é versionado;
`pnpm setup:local` o cria a partir de `.env.example` somente quando estiver
ausente. Não crie cópias em `apps/api`, `apps/web` ou `packages/database`.

```powershell
pnpm install
pnpm setup:local
pnpm dev:local
```

O setup gera o Prisma Client, aplica migrações pendentes com `migrate deploy` e
executa a seed idempotente. `dev:local` aguarda PostgreSQL, API e web nessa
ordem. Portas padrão: PostgreSQL 5432, API 3333 e web 3000.

Comandos úteis: `pnpm db:start`, `pnpm db:stop`, `pnpm db:status`,
`pnpm db:doctor`, `pnpm db:generate`, `pnpm db:migrate`, `pnpm db:seed` e
`pnpm db:studio`.

Para E2E:

```powershell
pnpm --filter @xingyu/web exec playwright install chromium
pnpm test:e2e
```
