# Auditoria — interações do card Kanban

| Item                    | Implementação atual                      | Arquivo                       | Source of truth              | Ação                                              |
| ----------------------- | ---------------------------------------- | ----------------------------- | ---------------------------- | ------------------------------------------------- |
| Lead Code               | `formatLeadCode(deal.leadSequence)`      | `kanban-board.tsx`            | `Deal.leadSequence`          | Reutilizado                                       |
| Contact/telefone        | Contact do DTO + formatter compartilhado | `kanban-board.tsx`            | Contact do Deal              | Hierarquia polida                                 |
| Valor                   | `Deal.value`                             | `kanban-board.tsx`            | Deal                         | Mantido em primary                                |
| Última interação        | `lastMessageAt`                          | `pipelines.service.ts`        | Message real                 | Inalterado                                        |
| Tags/overflow           | Channel + tags, limite dois              | `kanban-card-utils.ts`        | Conversation, Contact e Deal | Chips compactados                                 |
| Responsável             | `Deal.owner`                             | `kanban-board.tsx`            | Deal                         | Virou controle                                    |
| Mutation de responsável | `dealsApi.update({ ownerId })`           | `deals.service.ts`            | Deal service                 | Reutilizada; valida organização e grava histórico |
| Membros                 | `settingsApi.users`                      | `api.ts`                      | `/settings/users`            | Uma query compartilhada por board                 |
| Bell/task summary       | `taskSummary` agregado                   | `pipelines.service.ts`        | Tasks abertas do Deal        | Sempre visível e clicável                         |
| Visão de tarefas        | `LeadTasks`                              | `conversation/lead-tasks.tsx` | `/tasks?dealId=`             | Reutilizada em Dialog                             |
| Prioridade              | `Deal.priority`                          | schema/DTO existentes         | Deal                         | Virou controle com update existente               |
| DnD                     | dnd-kit `useSortable`                    | `kanban-board.tsx`            | Deal/stage                   | Preservado com bloqueio de propagação             |
| Query keys/cache        | board, deal, history e conversations     | `query-keys.ts`               | React Query                  | Optimistic update + invalidação focada            |

O enum persistido é `LOW`, `MEDIUM`, `HIGH`, `URGENT` e não possui `NONE`; portanto nenhuma migration foi criada. Priority sem valor legado continua visualmente neutra, mas o menu oferece apenas valores persistíveis.
