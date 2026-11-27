# Auditoria — equipes e acessos de pipelines

## Arquitetura

`PipelineAccessService` é a única autoridade. `ORGANIZATION` preserva o acesso da organização; `RESTRICTED` calcula a união de grant direto e grant da equipe atual. `ADMIN` possui bypass. Não há deny nem níveis paralelos.

A migration aditiva `20260812180000_add_pipeline_team_access` cria enum, coluna com default, tabelas de grants, constraints e índices. Foi aplicada localmente sem reset, reseed ou alteração dos dados de negócio.

Listagens resolvem os IDs acessíveis uma vez e filtram na query. Recursos por ID resolvem sua relação real e delegam ao mesmo serviço. Recursos legitimamente sem Pipeline permanecem organization-scoped.

## Matriz de segurança

| Resource | List | Get by ID | Create | Update | Delete/action | Pipeline ACL | Test |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Pipeline | PROTECTED | PROTECTED | RBAC | RBAC | RBAC | IDs efetivos | service/regressão |
| Stage | via Pipeline | via Pipeline | RBAC | RBAC | RBAC | parent Pipeline | regressão |
| Channel | PROTECTED | N/A | PROTECTED | PROTECTED | PROTECTED | parent Pipeline + RBAC existente | regressão |
| Deal | PROTECTED | PROTECTED | PROTECTED | PROTECTED | PROTECTED | `Deal.pipelineId` | IDOR/service |
| Conversation | PROTECTED | PROTECTED | org-scoped quando nova | PROTECTED | PROTECTED | `Conversation.deal.pipelineId` | IDOR/service |
| Message | via Conversation | via Conversation | PROTECTED | read protegido | N/A | parent Conversation | Conversation IDOR |
| Task | PROTECTED | PROTECTED | PROTECTED quando ligada | PROTECTED | PROTECTED | Deal/Pipeline; sem vínculo = org | IDOR/query |
| Note | PROTECTED | PROTECTED | PROTECTED quando ligada | PROTECTED | PROTECTED | Deal; sem Deal = org | IDOR/service |
| File | via Deal | via Deal | PROTECTED | N/A | PROTECTED | parent Deal | files/helper |
| Activity/History | PROTECTED | interno protegido | pelas ações pais | N/A | N/A | Deal/Task/Order/Conversation | IDOR/query |
| Order | PROTECTED | PROTECTED | PROTECTED quando ligada | PROTECTED | PROTECTED | Deal; sem Deal = org | IDOR/query |
| Search | PROTECTED | N/A | N/A | N/A | N/A | Deals/Tasks/Orders filtrados | query/typecheck |
| Todos os Leads | PROTECTED | via Deal | via Deal | via Deal | via Deal | reutiliza `GET /deals` | Deal list |

## Relações e comportamento

- Conversation → Pipeline: relação inversa por `Deal.conversationId @unique`; `Conversation.deal` pode ser nulo.
- Task → Pipeline: `Task.dealId` prevalece e `Task.pipelineId` cobre vínculo direto. Sem ambos, não se inventa ACL.
- File → Pipeline: `LeadFile.dealId` é obrigatório. Ao salvar de Message, attachment, Message, Conversation e Deal precisam corresponder.
- Activity → Pipeline: resolve Deal direto, Task, Order ligado a Deal ou Conversation ligada a Deal; eventos livres continuam organizacionais.
- Order → Pipeline: `Order.dealId` é opcional. Vinculadas são protegidas; sem Deal permanecem organization-scoped.
- Search: Contacts e Companies continuam organization-scoped e não carregam Deals; Deals, Tasks e Orders vinculados são filtrados na query.
- Todos os Leads: usa a listagem de Deals com `pipelineId IN (ids acessíveis)`.
- Responsible: `GET /pipelines/access/:pipelineId/eligible-users` calcula usuários efetivos. Seletores compartilham cache por Pipeline; responsável legado não é removido e novas atribuições são validadas na API.

Não há autorização por item em listagens. Revogações valem na chamada/refetch seguinte. O frontend não é fonte de verdade.
