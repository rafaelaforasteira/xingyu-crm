# Auditoria — Resumo do Lead Context

Base: `feature/beta-lead-context-header-cleanup` (`1fa9932`).

## Componente

`apps/web/src/components/crm/conversation/lead-context-panel.tsx` — `ContextBody` → `CollapsibleSection title="Resumo"`.

## Origens atuais

| Elemento | Fonte |
|----------|--------|
| Nome | `contactName(context.contact)` |
| Ver contato | `Link` → `/contacts/${contactId}` |
| Telefone/email | `contact.email ?? contact.phone ?? contact.whatsapp` (raw; email tem prioridade indevida) |
| “Lead WhatsApp” / “Quente” | `context.tags` como badges |
| Responsável | `context.owner.name` |
| Canal (seção própria) | `context.channel` + `ConversationChannelBadge` |
| Etapa (seção Negociação) | `context.stage?.name` |

## Dados já no context

`ConversationContext` já inclui: `channel`, `stage`, `owner`, `currentDeal`, `contact.phone`/`whatsapp`, `tags`.

Sem N+1 novo.

## Estratégia

1. Remover “Ver contato” do Resumo.
2. Telefone abaixo do nome via formatter display (`phone` → `whatsapp` fallback).
3. Substituir tags no Resumo por ChannelBadge + stage badge.
4. Tags permanecem no banco; só saem do Resumo.
5. Sync de etapa via cache já invalidado por `useMoveDealStage` em `conversations.context`.
6. Sem múltiplos telefones / merge / migration.
