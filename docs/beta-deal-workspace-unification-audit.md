# Auditoria de unificação do Deal Workspace

## Superfícies encontradas

O drawer do Kanban é `DealWorkspaceDrawer`, em `deal-workspace.tsx`, aberto por `beta-kanban-view.tsx` e controlado por `selectedDealId`, `dealDrawerOpen` e pelo parâmetro `deal` da URL. O modo Conversas usa `ConversationWorkspace`, `ConversationThread`, `ConversationLeadHeader` e `LeadContextPanel`.

Antes desta alteração, `deal-workspace.tsx` continha implementações paralelas de bubble, thread, composer, notas, tarefas, pedidos, arquivos e atividades. Essas versões usavam combinações próprias de `conversationsApi`, `notesApi`, `tasksApi`, `ordersApi` e `dealsApi`, incluindo notas renderizadas dentro da conversa.

| Feature | Modo Conversas | Drawer anterior | Compartilhado agora |
| --- | --- | --- | --- |
| Identidade, Lead #, telefone | helpers de conversation list e phone | `deal.name`/campos diretos | mesmos helpers |
| Canal e etapa | `ConversationChannelBadge`, `PipelineStageSelector` | badges estáticos | sim |
| Thread, bubbles, mídia e composer | `ConversationThread` | implementação local | sim |
| Visão geral e tracking/tags | `LeadContextPanel` | resumo parcial | sim |
| Tarefas | `LeadTasks` | `DealTasksPanel` | sim |
| Pedidos | `LeadOrders` | links simples | sim |
| Notas | `LeadNotes` | notas misturadas ao thread | sim |
| Arquivos | `LeadFiles` | links simples | sim |
| Histórico | `LeadHistory` | activities simples | sim |

## Sources of truth

- Deal: `queryKeys.deals.detail(dealId)` / `dealsApi.get`.
- Conversa: ID do Deal, com fallback `conversationsApi.byDeal`; detalhe e mensagens usam as mesmas keys do modo Conversas.
- Contexto: `queryKeys.conversations.context(conversationId)` dentro de `LeadContextPanel`.
- Tasks, orders, notes, files e history: componentes compartilhados e suas query keys existentes.
- Stage: `useMoveDealStage`, que atualiza detail/context/board e preserva o drawer aberto.

As abas são montadas sob demanda. Assim, uma seção inativa não cria uma segunda árvore de queries. Não foi criado endpoint, model, migration ou cópia dos componentes de negócio.
