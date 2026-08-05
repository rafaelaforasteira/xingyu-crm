# Core operation workspace (Kanban + Conversas)

## Propósito

A rota `/operacao` é a tela principal do modo operacional simplificado do Xingyu CRM.

Fluxo diário:

1. Login
2. Abrir **Operação**
3. Alternar entre **Pipeline** (Kanban) e **Conversas**
4. Responder leads na mesma tela
5. Mover etapas
6. (ADMIN) adicionar colunas ao pipeline

A integração real com WhatsApp Cloud API **não** faz parte desta rodada. Mídias do composer são CRM-only.

## Visualizações

Controle segmentado no cabeçalho: `[ Pipeline ] [ Conversas ]` (`PipelineViewSwitcher`).

| View | URL |
|------|-----|
| Kanban (padrão) | `/operacao?pipeline=<id>&view=kanban` |
| Conversas | `/operacao?pipeline=<id>&view=conversations` |

- `view` ausente ou inválido → Kanban
- `deal=<dealId>` só no Kanban (painel lateral)
- `conversation=<conversationId>` só em Conversas
- Ao alternar: troca `deal` ↔ `conversation` quando houver vínculo; nunca ambos ativos
- Busca `q` e filtros compatíveis são preservados

## Busca única

Um único campo no cabeçalho da Operação.

- Pipeline: contato, negócio, telefone, prévia
- Conversas: repassado como `externalSearch` para `ConversationList` (sem segunda busca)

## Filtros

**Pipeline:** Todos · Não lidos · Aguardando · Sem conversa

**Conversas:** Todas · Não lidas · Aguardando resposta

Se entrar em Conversas com `filter=no-conversation`, a URL é normalizada para `all`.

## Conversas (escopo pipeline)

Lista via `ConversationList` com `scope={{ type: "pipeline", pipelineId }}`.

Desktop: lista 320–380px + conversa à direita (sem painel de contexto do lead).
Tablet/mobile: lista primeiro; conversa fullscreen com “Voltar às conversas”.

Reutiliza `ConversationThread`, `ConversationComposer`, `MessageBubble`, `DealConversationPanel`.

## Composer

- `resize: none` (sem alça nativa)
- Altura inicial ~44px, máxima ~130px, scroll interno depois
- Linha: Emoji · Anexo · Texto · Áudio · Enviar (`items-end`, botões 40px)
- Hint centralizado abaixo do textarea

## Coluna (ADMIN)

Botão **Adicionar coluna** só em `view=kanban` e `user.role === "ADMIN"`.

Modal compacto → `POST /pipelines/:id/stages` (protegido com `@Roles(ADMIN)`).

Nova etapa no final; board e seletores atualizados via React Query.

## Cache

- Envio: prévia/unread/awaiting no card (`patchBoardDealByConversation`) e listas
- Leitura: zera unread no card e na lista
- Move etapa: board + listas
- Nova coluna: board / stages / detail

## Modo `NEXT_PUBLIC_CORE_OPERATION_MODE`

Quando `true`: menu Operação + Configurações; home `/operacao`.
Quando `false`: menu completo; home `/dashboard`.
Rotas antigas continuam acessíveis por URL.

## Limitações / próxima etapa

- Sem WhatsApp Cloud API, webhook Meta, WebSocket/SSE
- Sem exclusão de coluna na Operação
- Próxima etapa futura: Cloud API
