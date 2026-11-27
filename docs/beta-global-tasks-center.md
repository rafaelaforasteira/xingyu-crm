# Central Global de Tarefas

## Objetivo e referências

`/tasks` volta a ser a agenda operacional do CRM: o lugar para identificar rapidamente tarefas atrasadas, de hoje, futuras, sem data e concluídas. A implementação atual foi construída sobre o domínio vigente e usou os commits históricos `37ffd259190e5ed7b3c340ffa1417dd88b44b42b` e `466662e10d4c220a4928a86fb960b2fe137654b0` apenas como auditoria conceitual. Nenhum código antigo foi restaurado por checkout ou revert.

## Navegação e superfícies compartilhadas

“Tarefas” é item principal independente, logo após o módulo expansível “Pipelines”. A sidebar fixa, o scroll interno, a numeração dos pipelines, “Todos os leads” e o rodapé de usuário permanecem inalterados.

A Central Global, Lead Context, Deal Workspace, sino do Kanban e Note → Task continuam operando sobre a mesma entidade `Task`, os mesmos endpoints e a mesma cache `tasks`. O `CreateTaskDialog` e o `TaskStatusButton` foram exportados da implementação consolidada do Lead Context e reutilizados; o popover permanece ancorado em cada círculo com `side="bottom"`, `align="start"` e offset 6.

## Escopos e ACL

- **Minhas tarefas:** `assigneeId` do usuário atual; é a visão padrão.
- **Equipe:** membros ativos de `User.teamId`, disponível para ADMIN e MANAGER com equipe.
- **Todas:** todas as tarefas autorizadas. ADMIN possui bypass; os demais veem tarefas atribuídas a si ou vinculadas a negócio próprio.
- Tarefas ligadas a pipeline/deal também passam pela união de Pipeline Access. Tarefas avulsas nunca atravessam a organização e, para não administradores, exigem atribuição ao próprio usuário.
- Leituras e mutações diretas repetem a autorização no backend.

## Status e prazo

`TaskStatusDefinition` é a única source of truth. Status são ordenados por `position`; arquivados não aparecem como opção, embora tarefas antigas continuem legíveis. Finalização é determinada por `category === DONE`, com fallback somente para registros legados sem definição.

As visões Abertas/Concluídas são semânticas, não novos status. Os buckets usam o dia local do servidor/API:

- atrasadas: não final e `dueAt` anterior ao início do dia;
- hoje: não final dentro do dia atual;
- próximas: não final a partir do próximo dia;
- sem data: não final com `dueAt = null`;
- concluídas: status final, ordenadas por `completedAt` e `updatedAt` decrescentes.

As abertas usam prazo crescente com nulos por último e criação decrescente como desempate. A apresentação agrupa os resultados da página em Atrasadas, Hoje, Próximas e Sem data.

## Busca, filtros e paginação

Busca server-side por título com debounce de 250 ms. O estado compartilhável na URL inclui `scope`, `state`, `due`, `status`, `pipeline`, `stage`, `assignee`, `priority`, `q` e `page`. Etapas dependem do pipeline selecionado; pipelines vêm da navegação já filtrada por ACL. A API pagina em 50 itens e realiza um único `findMany` com includes selecionados para assignee, contato, negócio, pipeline, etapa e definição de status, além do `count`; não há N+1.

## Criação, edição e sincronização

“Nova tarefa” abre o mesmo formulário usado no Lead Context. Na Central ele cria tarefa avulsa, atribuída por padrão ao usuário atual; tarefas vinculadas continuam sendo criadas pelas superfícies do Lead/Deal e aparecem imediatamente na Central. A troca de status usa atualização otimista com rollback e invalida Tasks, Pipelines/Kanban e Conversations/Lead Context. Completar, reabrir, reagendar e trocar responsável continuam nos endpoints existentes e preservam os eventos de Activity/History já implementados.

## Interface, responsividade e estados

Cada linha mostra título, código/link do Lead quando existente, contato, pipeline, etapa, responsável e prazo. Tarefas avulsas são identificadas explicitamente. A tela possui skeleton, erro, estados vazios por escopo, paginação por teclado, labels acessíveis, truncamento de textos longos e layout adaptável de 1024 a 1920 px. O sino do Kanban não foi reimplementado: continua derivado do agregado atual de tarefas abertas, preservando precedência atrasada > hoje > futura > nenhuma e estado sem sino quando a contagem é zero.

## Limitações

- A criação global nesta etapa é deliberadamente avulsa; associação a Lead/Deal permanece nas superfícies contextuais para preservar eligibility e links consistentes.
- O timezone segue o ambiente da API; uma futura configuração por organização poderá substituir esse comportamento.
- A visualização principal é lista operacional. O board histórico por status não foi mantido como segunda visualização para evitar duplicação e excesso de escopo.
- O E2E específico foi impedido no setup de autenticação por um servidor Next reutilizado com cache `.next` inconsistente (`Cannot find module './2821.js'`), antes de executar os cenários de Tasks. Testes unitários, typecheck, lint e build limpo permanecem verdes.
- Nenhuma migration, CSS global, Tailwind, fonte ou integração externa foi alterada.
