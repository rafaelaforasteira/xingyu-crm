# Auditoria do card do Kanban

| Dado             | Fonte atual          | Campo real                           | Endpoint/DTO         | Alteração                                     |
| ---------------- | -------------------- | ------------------------------------ | -------------------- | --------------------------------------------- |
| Lead Code        | Deal                 | `leadSequence`                       | board                | formatar com helper existente                 |
| Contact          | Contact              | `firstName`, `lastName`              | board                | manter display mapeado                        |
| Telefone         | Contact              | `phone`, `whatsapp`                  | board                | formatter existente                           |
| Valor            | Deal                 | `value`                              | board                | omitir zero/ausente                           |
| Responsável      | User                 | `owner`                              | board                | Avatar existente                              |
| Não lidas        | Conversation         | `unreadCount`                        | board                | corrigir fonte anterior `Deal.unreadMessages` |
| Tarefas          | Task                 | `statusDefinition.category`, `dueAt` | `taskSummary`        | agregar em lote                               |
| Prioridade       | Deal                 | `priority`                           | board                | Flag; zero migration                          |
| Temperatura      | tags/legado visual   | não é prioridade                     | card                 | remover visualmente                           |
| Última interação | Message              | `sentAt`                             | `lastMessageAt`      | somente mensagem real                         |
| Canal            | Channel              | `displayName`, `name`                | conversation summary | primeiro chip                                 |
| Tags             | DealTag e ContactTag | `tag`                                | board                | deduplicar e limitar                          |
| Setas antigas    | `DealCard`           | `onMove` → `MoveDealDialog`          | UI                   | remover do card; API preservada               |

O board adiciona uma única consulta agregada de tarefas para todos os Deal IDs. Não há N+1 nem novos requests HTTP.
