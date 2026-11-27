# Auditoria do seletor de status das tarefas

## Componentes e dados

- A linha da tarefa, o círculo e o seletor ficam em `lead-tasks.tsx`, respectivamente em `TaskRow` e `StatusButton`.
- O seletor reutiliza `components/ui/popover.tsx`, implementação React própria com `createPortal`, coordenadas `fixed` e `getBoundingClientRect` do trigger.
- Os status vêm de `tasksApi.statuses()` (`TaskStatusDefinition`) na query `queryKeys.tasks.statuses`; ordem, nome, categoria e cor são os retornados pela API.
- A alteração usa `tasksApi.update`, atualização otimista de `queryKeys.tasks.list(queryParams)`, rollback no erro e invalidações de tasks, notes, conversations, pipelines e histórico do deal.

## Causa raiz

O trigger já era local a cada `StatusButton` e o Portal já era ancorado por sua própria ref. O erro estava no algoritmo compartilhado: para decidir o flip, ele simulava conteúdo com 420 px de altura, embora o menu de três status tivesse cerca de 108 px. Assim, tarefas na metade inferior do painel eram deslocadas para `rect.top - 420`, parecendo ancoradas em Rastreamento. O mesmo componente também forçava largura mínima de 280 px, anulando a classe compacta do menu.

O ancestral rolável é `data-testid="lead-context-scroll"`, com `overflow-y-auto`. O Portal em `document.body`, `position: fixed` e `z-index: 70` evita clipping. O listener de `scroll` em capture já acompanha esse ancestral e reposiciona o menu.
