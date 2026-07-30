# Pull Request — Xingyu CRM v1

## Objetivo

Entregar a primeira versão completa e navegável do Xingyu CRM: monorepo com API NestJS, frontend Next.js, PostgreSQL/Prisma, seed realista e módulos operacionais conectados de ponta a ponta.

## Arquitetura

- Monorepo pnpm + Turborepo
- `apps/web` (Next.js App Router)
- `apps/api` (NestJS REST + Swagger)
- `packages/database` (Prisma + seed)
- Pacotes compartilhados: `ui`, `types`, `validation`, `config`

## Módulos

Dashboard, Inbox, Contatos, Empresas, Funis/Kanban, DealWorkspace (conversa no card), Tarefas, Pedidos/Pagamentos/Logística, Recompra, Reativação, Pós-venda, Automações, Marketing, Relatórios, Configurações, busca global e notificações.

## Modelo de dados

Ver `docs/database.md`. Organização demonstrativa `org-xingyu`, usuário atual `demo-admin` (Raffaela).

## Integrações simuladas

Shopify, WhatsApp, Instagram, Meta Ads, GA e Webhooks em modo mock (`docs/integrations.md`).

## Testes

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

## Como executar

```bash
pnpm install
cp .env.example .env
docker compose up -d   # ou pnpm db:start
pnpm db:generate && pnpm db:migrate && pnpm db:seed
pnpm dev
```

- Web: http://localhost:3000
- API: http://localhost:3333/docs

## Limitações

- Sem autenticação
- Integrações externas mockadas
- Redis opcional
- Permissões ainda não enforced na UI

## Próximos passos

Login/RBAC, canais reais, sync Shopify, filas Redis, endurecimento de automations e e2e ampliado.

## Checklist

- [ ] Deal card abre DealWorkspace na aba Conversa
- [ ] Envio de mensagem persiste e atualiza timeline
- [ ] Drag do Kanban persiste etapa
- [ ] CRUD contatos/tarefas/pedidos
- [ ] Seed carrega volumes mínimos
- [ ] CI verde
