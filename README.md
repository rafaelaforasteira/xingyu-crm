# Xingyu CRM

CRM web completo para gestão comercial, atendimento, pedidos, recompra, automações e operação da Xingyu.

## Estado atual

Primeira versão funcional (v0.1) em monorepo: dashboard, inbox, contatos, empresas, funis/Kanban com DealWorkspace (conversa no card), tarefas, pedidos, pagamentos, logística, recompra, reativação, pós-venda, automações, marketing, relatórios, busca, notificações e configurações. Persistência real em PostgreSQL via Prisma. Integrações externas em modo demonstrativo (adapters mock).

## Tecnologias

- **Monorepo:** pnpm + Turborepo
- **Web:** Next.js (App Router), React, TypeScript, Tailwind CSS, TanStack Query, dnd-kit, Recharts
- **API:** NestJS, Swagger, class-validator
- **Banco:** PostgreSQL + Prisma
- **Cache/filas (prep.):** Redis (opcional; fallback em memória)
- **Testes:** Vitest + Playwright

## Arquitetura

```
apps/web      → Frontend Next.js
apps/api      → API NestJS REST
packages/database → Prisma schema, migrations, seed
packages/ui / types / validation / config
```

Documentação detalhada em [`docs/`](./docs/).

## Pré-requisitos

- Node.js 20+
- pnpm 9+
- PostgreSQL 16+ (Docker Compose recomendado) **ou** script de Postgres embutido
- (Opcional) Redis, Docker, Docker Compose, GitHub CLI

### Bloqueios conhecidos neste ambiente de desenvolvimento

Se Docker / `gh` / PostgreSQL de sistema não estiverem instalados:

1. Use `pnpm db:start` (embedded PostgreSQL) em um terminal
2. Publique no GitHub depois com `gh auth login` e `gh repo create`

## Instalação

```bash
git clone <repo-url> xingyu-crm
cd xingyu-crm
pnpm install
cp .env.example .env
```

## Variáveis de ambiente

Veja [`.env.example`](./.env.example). Nunca committe `.env` real.

## Docker

```bash
docker compose up -d
```

Sobe PostgreSQL (`5432`) e Redis (`6379`).

## Banco de dados (sem Docker)

```bash
pnpm db:start
# em outro terminal:
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

## Desenvolvimento

```bash
pnpm dev
```

- Web: http://localhost:3000
- API / Swagger: http://localhost:3333/docs

Usuário demonstrativo (sem login): **Raffaela** (`demo-admin`), equipe Gestão.

## Scripts

| Script | Descrição |
|--------|-----------|
| `pnpm dev` | API + Web |
| `pnpm build` | Build produção |
| `pnpm lint` | Lint |
| `pnpm typecheck` | TypeScript |
| `pnpm test` | Testes unitários/integração |
| `pnpm test:e2e` | Playwright |
| `pnpm db:generate` | Prisma Client |
| `pnpm db:migrate` | Migrações |
| `pnpm db:seed` | Seed |
| `pnpm db:reset` | Reset + seed |
| `pnpm db:start` | Postgres embutido |

## Principais módulos

Visão geral, Caixa de entrada, Contatos, Empresas, Funil comercial (Kanban + DealWorkspace), Tarefas, Pedidos, Recompra, Reativação, Pós-venda, Automações, Marketing, Relatórios, Configurações, busca global e notificações.

## Integrações

Shopify, WhatsApp, Instagram, Meta Ads, Google Analytics e Webhooks — interfaces + adapters mock. Ative com variáveis de ambiente quando houver credenciais.

## Modo demonstrativo

`DEMO_MODE=true` / `NEXT_PUBLIC_DEMO_MODE=true`. Mensagens e syncs externos são simulados e persistidos localmente.

## Limitações

- Sem autenticação/login nesta versão
- Integrações externas mockadas
- Redis opcional
- Permissões modeladas, ainda não enforced na UI

## Roadmap

Login e RBAC, WhatsApp/Instagram reais, Shopify sync, filas Redis, PWA/mobile, campos personalizados avançados no editor visual de automações.

## Licença

Privado — uso interno Xingyu.
