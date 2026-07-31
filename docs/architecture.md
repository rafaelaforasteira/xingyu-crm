# Arquitetura

O Xingyu CRM é um monorepo pnpm/Turborepo. `apps/web` contém o Next.js e usa um
cliente HTTP centralizado com TanStack Query. `apps/api` contém o NestJS, prefixo
REST `/api`, Swagger e uma única instância global de `PrismaService`.
`packages/database` contém schema, migrações, seed e lifecycle do PostgreSQL
embutido.

Fluxo local:

1. `scripts/local.mjs` carrega e valida o `.env` da raiz.
2. O PostgreSQL é iniciado ou reutilizado e passa por readiness real.
3. A API conecta o Prisma durante o bootstrap; falha se o banco estiver fora.
4. O health executa `SELECT 1`.
5. A web inicia somente após health HTTP 200 com `database: up`.

`DEMO_MODE` simula apenas integrações externas e só é permitido em
`development`/`test`. Em `production`, `DEMO_MODE=true` impede o bootstrap.
A autenticação de homologação usa JWT de acesso + refresh opaco com cookies
HttpOnly; rotas são privadas por padrão (`AuthGuard` global + `@Public()`).
Detalhes em [homologation-auth.md](./homologation-auth.md).
