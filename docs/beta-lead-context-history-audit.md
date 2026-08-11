# Auditoria — Histórico do contexto do lead

| Conceito | Existe? | Modelo/serviço | Decisão |
| --- | --- | --- | --- |
| Evento append-only | Sim | `Activity` | Reutilizado como timeline do deal |
| Lifecycle especializado | Sim | `LifecycleAction` | Mantido para reativação/recompra |
| Migration lifecycle | Sim | `20260730170000_add_lifecycle_actions` | Auditada e preservada |
| Organização/deal/actor/data | Sim | `Activity` | Reutilizados |
| Metadata | Sim | `Activity.metadata` | Snapshots mínimos de before/after |
| Stage | Parcial | `DealsService` | Nomes snapshot adicionados |
| Responsável | Ausente | `DealsService.update` | Evento incluído |
| Nota | Ausente | `NotesService.create` | Evento sem conteúdo |
| Tarefa | Parcial | `TasksService` | Create/complete normalizados; reopen incluído |
| Arquivo | Ausente | `LeadFilesService` | Save/remove incluídos |

`Activity` já possui relações com Deal, User, Task, Order e Conversation. Foi adicionado o índice `(organizationId, dealId, createdAt DESC)`. `LifecycleAction` não foi reutilizado porque seus enums e invariantes são exclusivos das filas de reativação e recompra.
