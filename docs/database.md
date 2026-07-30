# Database

## Stack

PostgreSQL 16 + Prisma ORM (`packages/database`).

## Local options

1. **Docker Compose** — `docker compose up -d`
2. **Embedded Postgres** — `pnpm db:start` (no Docker required)

## Commands

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm db:reset
pnpm db:studio
```

## Conventions

- Soft delete: `deletedAt`
- Money: `Decimal(14,2)` / `Decimal(12,2)`
- Indexes on phone, email, CNPJ, CPF, Instagram, status, owner/team/pipeline/stage/contact/order timestamps
- Demo organization id: `org-xingyu`
- Demo admin user id: `demo-admin`

## Core entities

Organization, User, Team, Role, Contact, Company, Pipeline, PipelineStage, Deal, DealStageHistory, Task, Activity, Note, Tag, Conversation, Message, Order, OrderItem, Product, ProductCollection, Payment, Shipment, ShipmentEvent, Occurrence, Campaign, Attribution, Automation (+ nodes/edges/executions), Notification, SavedView, AuditLog, CustomFieldDefinition/Value, Channel, MessageAttachment.
