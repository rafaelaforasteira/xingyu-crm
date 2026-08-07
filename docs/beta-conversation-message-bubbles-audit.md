# Auditoria — balões de mensagem

Base: `feature/beta-conversation-composer-polish` (`dc6d465`).  
Branch: `feature/beta-conversation-message-bubbles`.

## Estrutura atual

```
ConversationThread
  ├─ Carregar mensagens anteriores (cursor)
  ├─ buildMessageTimeline → day | message
  │    └─ MessageBubble
  │         ├─ formatMessageMetaLine (Recebido de / Enviado por · HH:mm · data)
  │         ├─ body
  │         ├─ attachments (image/video/audio/file)
  │         └─ translateMessageStatus (Enviado / Entregue / Lido)
  └─ ConversationComposer
```

Fonte: `apps/web/src/components/crm/conversation/message-bubble.tsx`.

## Modelo Message

Prisma (`schema.prisma`):

- `direction`: INBOUND | OUTBOUND | INTERNAL
- `status`: PENDING | SENT | DELIVERED | READ | FAILED (default SENT)
- `body`, `sentAt`, `createdAt`, `senderId` → User
- `attachments`: fileName, mimeType, fileSize, url, kind
- **Sem** caption, deliveredAt, readAt, messageType

Frontend (`types.ts`): `author` (alias de sender), `status?`, `attachments?`, `createdAt` (de sentAt/createdAt).

## Status existentes

API/DB: PENDING, SENT, DELIVERED, READ, FAILED.  
UI otimista: SENDING.  
Fixtures demo (seed history MVP) cobrem READ/DELIVERED/FAILED/SENT.

## Campos temporais

- `sentAt` / `createdAt` no registro
- Sem `deliveredAt` / `readAt` — tooltip de status usa só o enum + horário da mensagem
- Separadores: `America/Sao_Paulo` (hardcoded HISTORY_TIME_ZONE)
- Meta do balão atual: `formatDate` local do navegador (inconsistente)

## Direção / autor

- Inbound: “Recebido de: {contato}” em toda mensagem (problema)
- Outbound: “Enviado por: {author.name || Equipe Xingyu}”
- Autor histórico via `sender`/`author` no include da API (não o owner atual do lead)

## Anexos / legenda

- `kind`: image | video | audio | document/file
- Body e anexos são irmãos; body pode aparecer **antes** da imagem
- Sem campo `caption` — regra de compatibilidade: se há mídia + body, body vira legenda no mapper

## Separadores / paginação

- Preservar `message-day-separator`, Hoje/Ontem/dd/MM/yyyy
- Preservar `load-older-messages` + cursor `before`

## Limitações

1. Meta pesada no topo; status textual no rodapé (inclusive inbound)
2. Sem ticks compactos
3. Ordem imagem/legenda incorreta quando ambos existem
4. Sem arquitetura tipada de conteúdo
5. Timezone do horário do balão ≠ separadores
6. Sem migration necessária nesta rodada (reusar campos existentes)

## Estratégia

1. Mapper `normalizeMessageContent` + `normalizeDeliveryStatus`
2. MessageBubble: sender (outbound) → content renderer → metadata (hora + ticks)
3. Renderers: TEXT, IMAGE, VIDEO, AUDIO/VOICE, DOCUMENT, STICKER, UNSUPPORTED
4. Inbound individual: sem “Recebido de”, sem checks
5. Outbound: “Enviado por {nome}”, ticks conforme status real da fixture/API
6. Horário pt-BR em America/Sao_Paulo + tooltip com data completa
7. Sem migration; caption derivada no mapper
8. Não tocar composer, lista, filtros, header, painel
