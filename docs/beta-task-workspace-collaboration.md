# Central operacional de tarefas

## Experiência

`/tasks` organiza a página atual por `TaskStatusDefinition.position`. O filtro `state` decide se entram categorias abertas ou `DONE`; `due` permanece filtro e os demais parâmetros antigos continuam na URL. Os grupos são recolhíveis apenas no cliente. Cada linha distingue explicitamente tarefa sem card, abre o workspace pelo corpo e mantém status, responsável e prazo como controles independentes.

A navegação global começa por Dashboard, Tarefas e então Pipelines, inclusive no menu móvel compartilhado.

## Workspace e colaboração

O workspace usa a entidade `Task` existente. `dealId` continua opcional. Descrição, status, responsável e prazo usam a mutation protegida já existente. Comentários são persistidos em `TaskComment`; menções referenciam `User.id`, criam `Notification` do tipo `TASK_MENTION` e abrem `/tasks?task=<id>`. Arquivos e gravações de áudio usam a validação, limites e storage locais já utilizados pelo composer de conversas.

`Activity` permanece o histórico canônico da tarefa. Um comentário gera atividade estrutural sem copiar anexos. O endpoint de workspace carrega comentários, autores, menções, anexos e atividade com includes definidos, sem consultas por item.

## Segurança e migration

Todas as rotas de detalhe e comentário executam `assertTaskAccess`; usuários mencionados precisam estar ativos e pertencer à mesma organização. O endpoint de board também aplica escopo do usuário, além do acesso a pipeline.

A migration `20260813190000_add_task_collaboration` é aditiva: cria três tabelas, índices e FKs e acrescenta `TASK_MENTION` ao enum. Aplicação: `pnpm db:migrate:deploy`. Não requer reset.
