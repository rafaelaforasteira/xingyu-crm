# Auditoria — Tracking no Contexto do Lead

Data: 2026-08-10  
Branch: `feature/beta-lead-context-tracking-foundation`

## Matriz de dados

| Campo | Existe? | Onde? | Confiabilidade | Exibir agora? | Modelagem futura? |
|-------|---------|-------|----------------|---------------|-------------------|
| channel | Sim | `Conversation.channelId` → `Channel` | Alta | Sim (Origem) | — |
| deal.createdAt | Sim | `Deal.createdAt` | Alta | Sim (`Criado em`) | — |
| conversation.createdAt | Sim | `Conversation.createdAt` | Alta | Não como “Lead criado” | Métricas |
| contact.createdAt | Sim | `Contact.createdAt` | Alta | Não (≠ lead) | Métricas |
| first message | Sim | `Message` `ORDER BY sentAt ASC` | Alta (índice composto) | Sim | — |
| message direction | Sim | `Message.direction` | Alta | Sim (Entrada) | — |
| firstContactAt | Derivável | 1ª msg `sentAt` | Alta | Sim | Evento `FIRST_*` |
| firstContactDirection | Derivável | 1ª msg `direction` | Alta | Sim | Evento |
| contact.firstInteractionAt | Sim | `Contact.firstInteractionAt` | Média (seed/manual) | Não (preferir msg) | Sync |
| contact.source | Sim | free-text | Média | Não como UTM | Canonical source |
| contact.campaign | Sim | free-text | Baixa p/ UTM | Não como utm_campaign | — |
| deal.source / deal.campaign | Sim | free-text | Média | Não nesta UI | — |
| utm_source | Parcial | `Attribution.source` | Alta quando Attribution existe | Sim se Attribution | Colunas UTM |
| utm_medium | Parcial | `Attribution.medium` | Idem | Sim | Idem |
| utm_campaign | Parcial | `Attribution.campaign` | Idem | Sim | Idem |
| utm_content | Parcial | `Attribution.content` | Idem | Sim | Idem |
| utm_term | Parcial | `Attribution.term` | Idem | Sim | Idem |
| utm_id | Não | — | — | Não | TrackingEvent |
| landing page | Parcial | `Attribution.page` | Baixa/esporádica | Se preenchido | landingPageUrl |
| referrer | Não | — | — | Não | referrer |
| original URL | Não | — | — | Não | originalUrl |
| createdBy | Não confiável no Deal | — | — | Não | createdBy / actor |
| Shopify order | Sim (Order) | seed/API | Alta p/ pedidos | Pedidos (seção) | SaleTracking |
| Shopify attribution | Parcial | `Attribution.orderId` | Alta se seed | Não na UI de vendas agora | Snapshot |
| order.createdAt / orderedAt | Sim | `Order` | Alta | lastOrder no context | Histórico |
| order.amount | Sim | `Order.finalValue` | Alta | lastOrder | Histórico |
| Campaign.metadata.utmParams | Sim | JSON marketing | Variável | Não nesta fundação | Raw+canonical |

## Decisões desta tarefa

1. **Origem** = canal da Conversation (`Channel.displayName` / name), não UTM Source.
2. **Entrada / Primeiro contato** = primeira mensagem **não INTERNAL** por `sentAt ASC` no backend (não depende da paginação do frontend).
3. **Criado em** = `Deal.createdAt` quando houver Deal; omitir sem Deal.
4. **UTM** = campos estruturados de `Attribution` do contato com `orderId = null` (aquisição do lead). Sem Attribution → “UTM · Não identificada”, sem inventar `organic`/`whatsapp`.
5. **Rastreamento de vendas** = **não** renderizado sem dados/snapshot reais; arquitetura em `docs/future-sales-tracking-architecture.md`.
6. **ZERO migrations**.

## Índice útil

`Message @@index([conversationId, sentAt])` — adequado a `WHERE conversationId = ? ORDER BY sentAt ASC LIMIT 1`.

## Luciana Vargas (seed)

- Canal WhatsApp Xingyu; 2 msgs INBOUND; Deal; **sem** Attribution/UTM/Orders.
- Bom fixture para: Origem + Mensagem recebida + UTM não identificada.
