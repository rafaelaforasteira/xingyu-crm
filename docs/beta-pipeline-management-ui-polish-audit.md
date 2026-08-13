# Auditoria — Pipeline Management UI Polish

| AÇÃO | UI ATUAL | API ATUAL | BACKEND | STATUS | AÇÃO NECESSÁRIA |
|---|---|---|---|---|---|
| Abrir | Link e card | `GET /pipelines/:id/board` | ACL de leitura | Parcial | Padronizar `/pipelines/:id?view=kanban` e tornar card acessível |
| Editar | Form único | `PATCH /pipelines/:id` | Update transacional | Parcial | Identidade visual, limite 140 e defaults elegíveis |
| Configurar | Apontava para Etapas | `GET/PUT /pipelines/access` | Central ACL existente | Incorreto | Direcionar para `/pipelines/access?pipelineId=:id` |
| Etapas | Link existente | CRUD `/pipelines/:id/stages` | Protegido por ADMIN | Pronto | Preservar |
| Canais | Link existente | CRUD `/pipelines/:id/channels` | Serviço existente | Pronto | Preservar |
| Duplicar | Mutação direta | `POST /pipelines/:id/duplicate` | Copia pipeline e etapas | Parcial | Confirmação e mensagem explícita sobre dados comerciais |
| Favoritar | PATCH com Heart | `PATCH /pipelines/:id` | Boolean `favorite` | Parcial | Star, atualização otimista e rollback |
| Arquivar | Mutação direta | `POST /pipelines/:id/archive` | Soft archive | Parcial | Confirmação e sincronização das consultas |
| Excluir | Confirmação genérica | `DELETE /pipelines/:id` | Bloqueia default e pipeline com deals | Parcial | Bloqueio explicativo e confirmação nominal para vazio |

## Constatações de segurança

- A duplicação existente não copia deals, contatos, conversas, mensagens, tarefas, pedidos ou históricos. Somente identidade, defaults e etapas são recriados; favorito e padrão não são copiados e o acesso nasce no modo organizacional padrão.
- O delete é soft-delete da estrutura e o backend rejeita pipelines padrão ou com negócios ativos. Não há cascade de dados comerciais.
- Archive preserva a estrutura e seus dados dependentes.
- A leitura continua protegida pela matriz de Pipeline Access. As mutações administrativas de pipeline foram alinhadas ao RBAC `ADMIN`.
- Nenhuma migration é necessária: `description`, `color`, `icon` e `favorite` já existem no schema.
