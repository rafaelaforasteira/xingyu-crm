# Beta single-pipeline — source map

Visual authority: commit `e3dad237777a571cd17aedc8c00595317f1ed96f`  
(`feat: improve inbox conversation experience`)

Functional base: `origin/develop` (+ history/pagination from `3ad0658`, navigation patterns from `799ae018`, WhatsApp thread styling from `3763e976`).

| Área visual | Commit fonte | Arquivo fonte | Arquivo atual | Estratégia |
|-------------|--------------|---------------|---------------|------------|
| App shell (sidebar + header + main padding) | e3dad237 | `components/layout/app-shell.tsx` | `components/layout/app-shell.tsx` | Adaptar — sempre mostrar Header no beta; main com padding clássico |
| Header superior | e3dad237 | `components/layout/header.tsx` | `components/layout/header.tsx` | Adaptar — elementos Hoje/Novo/busca com toast “próximas etapas” no beta |
| Sidebar | e3dad237 | `components/layout/sidebar.tsx` | `components/layout/sidebar.tsx` + `lib/nav.ts` | Adaptar — somente Operação via `BETA_SINGLE_PIPELINE_NAV_GROUPS` |
| Pipeline board PageHeader + Kanban | e3dad237 | `components/crm/pipelines-page.tsx` (`PipelineBoardPage`) | `components/crm/beta/beta-kanban-view.tsx` | Criar wrapper — composição visual igual, URLs `/operacao` |
| View switcher | e3dad237 | `components/crm/pipeline-view-switcher.tsx` | `pipeline-view-switcher.tsx` | Reutilizar com `kanbanHref` / `conversationsHref` |
| Criar card + KanbanBoard | e3dad237 | `pipelines-page.tsx` + `kanban-board.tsx` | mesmos + beta-kanban | Reutilizar padrão (sem `variant="operation"`) |
| Deal drawer | e3dad237 | `components/crm/deal-workspace.tsx` | `deal-workspace.tsx` | Reutilizar `DealWorkspaceDrawer` + sync `deal=` na URL |
| Conversas PageHeader | e3dad237 | `pipeline-conversations-page.tsx` | `components/crm/beta/beta-conversations-view.tsx` | Criar wrapper |
| Conversation workspace 3 colunas | e3dad237 | `conversation/conversation-workspace.tsx` | mesmo arquivo | Adaptar — hrefs query-string para `/operacao` |
| Lista + filtros internos | e3dad237 | `conversation-list.tsx` / filters | mesmos | Reutilizar (busca interna, canal, não lidas, aguardando) |
| Thread + composer | e3dad237 / 3ad0658 | `conversation-thread.tsx` / composer | mesmos | Reutilizar (composer ligado no beta) |
| Contexto do lead | e3dad237 | `lead-context-panel.tsx` | mesmo | Reutilizar terceira coluna |
| Message bubbles | 3763e976 | `message-bubble.tsx` / globals | atuais | Preservar |
| OperationPage atual | develop | `operation/operation-page.tsx` | permanece | Não usar como shell visual do beta |
| OperationConversationsView | develop | `operation-conversations-view.tsx` | permanece | Não usar no beta |
| DealConversationPanel | develop | `deal-conversation-panel.tsx` | permanece | Não substituir o drawer no beta |
| Guard de rotas | — | — | `middleware.ts` + `lib/beta-config.ts` | Criar — redirecionar módulos ocultos → `/operacao` |
| Config pipeline único | — | — | `lib/beta-config.ts` | Criar |

## Decisões explícitas

- **REUTILIZAR**: `KanbanBoard` (default), `DealWorkspaceDrawer`, `ConversationWorkspace`, `ConversationList`, `ConversationThread`, `ConversationComposer`, `LeadContextPanel`, `PipelineViewSwitcher`, `CreateDealDialog`, `PageHeader`.
- **ADAPTAR**: AppShell (não esconder Header), Sidebar/nav, Header (ações beta), ConversationWorkspace (navegação por query).
- **CRIAR WRAPPER**: `BetaOperationPage`, `BetaKanbanView`, `BetaConversationsView`.
- **NÃO restaurar**: rotas públicas `/pipelines/:id`, seletor de pipelines, “Todos os pipelines”, header interno `operation-header`.
