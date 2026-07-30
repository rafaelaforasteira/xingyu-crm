# Architecture

## Overview

Xingyu CRM is a pnpm + Turborepo monorepo with a NestJS REST API and a Next.js App Router frontend, backed by PostgreSQL (Prisma).

## Runtime topology

- `apps/web` — UI, TanStack Query, design tokens, CRM modules
- `apps/api` — modular NestJS services, Swagger at `/docs`
- `packages/database` — Prisma schema, migrations, seed, optional embedded Postgres
- `packages/ui` — shared presentational primitives
- `packages/validation` — Zod schemas and domain helpers (e.g. repurchase score)
- `packages/types` — shared DTO/types
- `packages/config` — constants (demo user, order statuses)

## Cross-cutting rules

- No login in v1; demo user `demo-admin` (Raffaela) injected via `X-Demo-User-Id`
- Soft deletes via `deletedAt`
- Monetary values as `Decimal`
- UTC in DB; display in `America/Sao_Paulo`
- External channels behind adapter interfaces with mock implementations

## Deal ↔ Conversation

A deal may reference a primary `conversationId`. Opening a Kanban card loads DealWorkspace with the Conversation tab first. Sending a message persists `Message`, updates `Conversation.lastMessageAt`, deal last interaction, and timeline `Activity` rows.
