# Auditoria — lista de conversas como cards de CRM

Base: `feature/beta-conversation-filters-popover` (`a2cb18d`).
Branch de trabalho: `feature/beta-conversation-list-crm-cards`.

## Estrutura atual

- Lista: `apps/web/src/components/crm/conversation/conversation-list.tsx`
- Item: `ConversationListItemRow` em `conversation-list-item.tsx`
- Variante `operation` usada em `/operacao` (beta + operação)
- API: `ConversationsService.findAll` → `toConversationListItem`
- Include atual: contact (nome/tags), assignee, channel, deal (stage/tags)

## Entidades relacionadas

| Entidade | Papel na lista |
|----------|----------------|
| Conversation | Item da lista; unreadCount, lastMessageAt, status, assignee |
| Contact | Nome principal; 1:N deals |
| Deal | Oportunidade/lead comercial; stage, owner, conversationId único |
| PipelineStage | Nome da etapa (Kanban) |
| Channel | Canal/inbox (name + displayName) |
| User | Responsável (owner do deal / assignee da conversa) |
| Organization | timezone; futuro contador de sequência |

## Campos disponíveis hoje

- Nome do contato, preview, unreadCount, lastMessageAt
- Canal (name; displayName mapeado mas pouco usado no UI)
- stageName via currentDeal
- assignee (id, name, avatarUrl)
- Aguardando resposta: só via mapa do board (`awaitingByConversationId`), não no DTO da lista

## Campos ausentes

- Código sequencial permanente do lead
- Avatar/foto do contato (Contact sem campo de foto)
- Sigla explícita do responsável (derivar do nome)
- Timestamp estilo WhatsApp (hoje usa `formatDistance` / “há X”)
- lastMessageDirection / awaitingReply no item da lista
- owner do deal no include da lista
- Telefone no summary do contato para fallback de nome

## Estratégia — código do lead

- **Entidade dona:** `Deal` (Kanban/drawer são deal-centric; contato pode ter vários deals)
- Campo: `Deal.leadSequence Int` + unique `(organizationId, leadSequence)`
- Contador: `Organization.nextLeadSequence Int @default(1)`
- Geração: `UPDATE … RETURNING` atômico na mesma transaction do create
- Frontend só formata `Lead #` + `padStart(4, "0")`
- Backfill: `ROW_NUMBER()` por org (`createdAt`, `id`)
- Não reutilizar após exclusão; não recalcular no seed se já existir

## Estratégia — responsável

- Preferir `deal.owner`; fallback `conversation.assignee`
- Sigla derivada do nome (sem campo novo): 1ª letra 1º nome + 1ª do último; um nome → 2 letras; ausente → “Sem resp.”
- Tooltip / aria-label com nome completo

## Estratégia — avatar

- Sem `Contact.avatarUrl` hoje → **não criar upload nesta tarefa**
- Avatar com `src` preparado; fallback iniciais (fundo roxo claro existente)
- Foto real só quando campo existir no futuro

## Estratégia — data

- Utilitário `formatConversationTimestamp(date, timeZone, now?)`
- Timezone: org quando disponível; default `America/Sao_Paulo`
- Hoje → `HH:mm`; ontem → `Ontem`; 2–6 dias → weekday; ≥7 → `dd/MM/yyyy`
- Fonte: `lastMessageAt`

## Estratégia — etapa

- `currentDeal.stageId` + `stageName` (mesma fonte do Kanban/filtros)
- Sem deal/etapa → tag “Sem etapa”
- Sem temperatura na lista

## Riscos

- Seed idempotente não deve renumerar leads existentes
- Creates fora de `DealsService` (canais, reativação) precisam alocar sequência
- Cursor pagination da lista não recalcula awaiting; offset path já carrega directions — incluir awaiting no DTO
- N+1: incluir owner/leadSequence no LIST_INCLUDE; directions em batch (já existe)

## Migrations

- **Necessária:** `add_lead_sequence` (Organization.nextLeadSequence + Deal.leadSequence + backfill + unique)
- Contato avatar: **dispensada** nesta tarefa
