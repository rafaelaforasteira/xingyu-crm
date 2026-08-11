# Auditoria — tarefas no contexto do lead

## Modelo e contratos reutilizados

- `Task` já possui título (200 caracteres), descrição, status legado, `statusDefinitionId`, responsável, `dueAt`, contato, deal, pipeline e etapa.
- `TaskStatusDefinition` foi criada pela migration `20260730210000_task_status_definitions` e oferece status ativos ordenados nas categorias `OPEN`, `IN_PROGRESS` e `DONE`.
- Foram reutilizados `GET /tasks`, `GET /tasks/statuses`, `POST /tasks` e `PATCH /tasks/:id` pelo cliente e cache React Query existentes. Nenhuma migration foi criada.
- Quando existe deal atual, consultas e criações usam exclusivamente `dealId`; `contactId` é fallback apenas para conversas sem deal.

## Resultado

O painel exibe até três tarefas abertas, ordenadas por vencimento com tarefas sem data no fim. Cada linha contém status, título truncado, avatar/iniciais e vencimento (`Hoje`, `Amanhã`, data ou `Sem data`). Concluídas saem da lista principal e do contador, mas permanecem no diálogo “Ver todas as tarefas”.

“Nova tarefa” abre um diálogo vinculado ao lead com título obrigatório, descrição, status configurado, responsável (pré-selecionado do lead), data e horário opcional. A troca de status é otimista, persiste via API e faz rollback em erro.

## Segurança e escopo

O serviço valida organização para deal, responsável e tarefa antes de mutações. A listagem compacta e o diálogo completo compartilham a mesma query filtrada pelo lead, evitando N+1 e navegação para a área geral. Resumo, Negociação, Rastreamento, Pedidos, Notas, Arquivos, Histórico e Outras negociações não foram redesenhados.

## Reutilização por notas

O diálogo de criação foi exportado como componente compartilhado e passou a aceitar descrição inicial e `sourceNoteId` opcionais. A seção Notas usa esse mesmo fluxo, mantendo título vazio e todos os padrões de status, responsável e vencimento. Tarefas comuns continuam sem nota de origem e preservam o comportamento anterior.
