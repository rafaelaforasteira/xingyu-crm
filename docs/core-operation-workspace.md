# Core operation workspace (Kanban + conversa)

## Propósito

A rota `/operacao` é a tela principal do modo operacional simplificado do Xingyu CRM.

Fluxo diário:

1. Login
2. Abrir **Operação**
3. Ver o Kanban do pipeline padrão
4. Clicar em um card
5. Responder na conversa na mesma tela
6. Mover o lead entre etapas
7. Continuar no Kanban

A integração real com WhatsApp Cloud API **não** faz parte desta rodada.

## Rota

- `/operacao`
- Query opcional: `?pipeline=<pipelineId>&deal=<dealId>`
- Filtros: `?q=...&filter=unread|awaiting|no-conversation`

## Escolha do pipeline

1. Se `pipeline` vier na URL e estiver ativo, usa esse.
2. Senão, usa o pipeline ativo com `isDefault=true`.
3. Senão, usa o primeiro pipeline ativo (posição / nome).
4. Se não houver pipeline ativo, mostra estado vazio com link para `/settings/pipelines`.

## Painel de conversa

- Desktop (≥1280px): Kanban + painel à direita (560–680px).
- Notebook/tablet: drawer lateral sobre o Kanban.
- Mobile: conversa em tela cheia; voltar restaura o Kanban.

Ao abrir um card:

- a URL recebe `deal=<id>`;
- o Kanban permanece montado;
- reutiliza `ConversationThread` + `ConversationComposer` (inbox);
- não abre Inbox nem o `DealWorkspaceDrawer`.

Negócio sem conversa: estado vazio, sem envio e sem conversa falsa.

## URL e reload

- Abrir card → adiciona `deal`.
- Fechar painel → remove `deal`, mantém `pipeline` e filtros.
- Reload com `deal` válido → reabre o painel.
- `deal` inválido → remove o parâmetro e mostra toast.

## Etapas

- Drag and drop do Kanban e seletor do painel usam `dealsApi.move` (PATCH `/deals/:id`).
- Atualização otimista do cache do board; rollback em falha.

## Cache

- Envio de mensagem atualiza `lastMessagePreview`, `lastMessageAt`, `unreadCount=0`, `awaitingReply=false` no card via `patchBoardDealByConversation`.
- Marcar como lida zera `unreadCount` no card.
- Filtro “Não lidos” mantém o card aberto mesmo após zerar não lidas.

## Modo `NEXT_PUBLIC_CORE_OPERATION_MODE`

Quando `true` (padrão do produto nesta rodada):

- menu: **Operação** + **Configurações**;
- `/`, login e usuários autenticados em `/login` redirecionam para `/operacao`.

Quando `false`:

- menu completo em `FULL_NAV_GROUPS` é reativado;
- home volta para `/dashboard`.

Rotas antigas (Dashboard, Inbox, Pipelines, Tarefas, etc.) **continuam acessíveis** por URL.

## Limitações atuais

- Sem WebSocket / SSE / polling agressivo.
- WhatsApp ainda em modo demo / CRM-only (mídia e mensagens locais).
- Sem permissões finas multi-usuário nesta tela.
- Sem painéis laterais de pedidos/notas/arquivos na operação (permanecem nas fichas completas).

## Próxima etapa

Integração real com WhatsApp Cloud API (webhook Meta, envio real, atualização em tempo real).
