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

### Autenticação local

Copie as variáveis de autenticação de `.env.example` para o `.env`:

- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` (valores distintos)
- `ADMIN_EMAIL` / `ADMIN_INITIAL_PASSWORD` (usados pelo seed)
- `COOKIE_SECURE=false` em HTTP local
- `CORS_ORIGIN=http://localhost:3000` (nunca `*` com credentials)
- `NEXT_PUBLIC_API_URL=http://localhost:3000/api` (proxy same-origin do Next → Nest, para cookies HttpOnly)
- `DEMO_MODE=true` apenas em development/test

Depois rode `pnpm db:seed` para criar/atualizar a Administradora Xingyu.
Acesse `http://localhost:3000/login`.

Detalhes: [homologation-auth.md](./homologation-auth.md).

### Como os testes autenticam

- **API unit/integration:** login real via cookies ou override do `AuthGuard` com
  usuário de teste explícito. Não desabilite a segurança global.
- **E2E Playwright:** o projeto `setup` faz login em `/login` e grava
  `e2e/.auth/user.json` (`storageState`). Os demais specs reutilizam a sessão.
- O header `X-Demo-User-Id` **não** autentica rotas protegidas.

Comandos úteis: `pnpm db:start`, `pnpm db:stop`, `pnpm db:status`,
`pnpm db:doctor`, `pnpm db:generate`, `pnpm db:migrate`, `pnpm db:seed` e
`pnpm db:studio`.

Para E2E:

```powershell
pnpm --filter @xingyu/web exec playwright install chromium
pnpm test:e2e -- --workers=1
```
