# Auditoria — filtros de conversas (beta)

## Arquivos

- `conversation-list.tsx` / `conversation-filters.tsx` / `conversation-workspace.tsx`
- `beta-conversations-view.tsx`
- `apps/api/src/conversations/conversations.service.ts` + `dto/conversation.dto.ts`
- `packages/database/prisma/schema.prisma` (`Conversation`, `Message`, `Channel`, `Tag`)

## Filtros já existentes

UI: busca, `channelId` (select), `unreadOnly`, `awaitingReply` (checkbox “Aguardando resposta”).

API `GET /conversations`: `search`, `channelId`, `pipelineId`, `stageId`, `tagId`, `status`, `unreadOnly`, `awaitingReply`, paginação.

Header `q` sincronizado com a busca interna no beta.

## Modelo

- Canal: `Channel` por organização; conversas via `channelId`. Sem vínculo user↔canal; escopo por org + pipeline.
- Etapa: via `Deal.stageId` / `pipelineId` (1:1 deal↔conversation).
- Tags: `ContactTag` / `DealTag` (não há tag na conversa). API `tagId` faz OR entre contato e deal.
- Status: `OPEN | PENDING | RESOLVED | ARCHIVED`.
- `awaitingReply`: última mensagem não-interna `INBOUND` + status `OPEN` (independente de unread).
- Ordenação atual: `lastMessageAt desc`, `unreadCount desc`, `updatedAt desc`.

## Fontes escolhidas

| Grupo | Fonte |
|-------|--------|
| Canais | `pipelineChannelsApi.list(BETA_PIPELINE_ID)` |
| Etapas | `pipelinesApi.get` / stages do pipeline beta |
| Tags | `settingsApi.tags()` |
| Unread / reply / período / estado | API estendida |

## Ordenação alvo

1. Abertas + aguardando minha resposta + não lidas  
2. Abertas + aguardando minha resposta + lidas  
3. Abertas + aguardando cliente  
4. Outras abertas  
5. Encerradas (`RESOLVED`/`ARCHIVED`)  

Dentro do grupo: `lastMessageAt` desc.

## Decisões

- Popover custom (Portal) — não há Radix Popover no projeto; sem nova dependência.
- Draft vs applied; URL só no Aplicar.
- Arrays via CSV na query (`channels`, `stages`, `tags`).
- `reply=mine|customer`; `conversationState=open|closed`; `period=today|7d|30d|older30`.
- Sem filtro de responsável.
- Canais org-scoped (sem membership por usuária no schema).
