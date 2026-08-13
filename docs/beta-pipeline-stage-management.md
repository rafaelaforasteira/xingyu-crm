# Gerenciamento de etapas do pipeline

O fluxo [Criar lead](./beta-create-lead-flow.md) consome dinamicamente estas etapas e respeita `isInitial`.

## Objetivo

A tela de Operação permite que administradores configurem as etapas do pipeline atualmente selecionado. O recurso é genérico: recebe o `pipelineId` real e consulta suas etapas, sem depender do nome do pipeline, de uma quantidade fixa de colunas ou de nomes predefinidos.

## Experiência e permissões

O botão compacto de engrenagem fica ao lado de **Novo lead** no header compartilhado entre Kanban e Conversas. Ele possui tooltip e nome acessível “Configurar esteira” e só é renderizado para `ADMIN`. Todos os endpoints de criação, edição, reordenação e exclusão também exigem `ADMIN`; ocultar o botão não é a barreira de segurança.

O diálogo lista nome, cor, indicação de etapa inicial e quantidade de negócios. Ações são persistidas individualmente:

- criação valida nome, evita duplicidade case-insensitive no pipeline, utiliza uma paleta controlada e adiciona a etapa ao final;
- edição altera nome e cor mantendo o mesmo `PipelineStage.id`;
- reordenação usa dnd-kit, incluindo sensor de teclado, atualização otimista, operação batch transacional e rollback visual em erro;
- exclusão vazia exige confirmação;
- exclusão populada exige uma etapa de destino e move todos os negócios no backend, sem requests por negócio.

## Invariantes e histórico

Não é permitido remover a última etapa ativa. A etapa destino precisa pertencer à mesma organização e ao mesmo pipeline e não pode ser a própria origem. O service preserva a existência de outra etapa `OPEN`; ao excluir a etapa inicial, promove a primeira etapa aberta remanescente. Etapas `WON` e `LOST` mantêm a semântica final já existente e não podem ser iniciais.

Movimento, atualização de status/fechamento dos Deals, `DealStageHistory`, eventos `STAGE_CHANGED`, soft delete e compactação das posições acontecem na mesma transação. Cada negócio movido registra ator, IDs e snapshots dos nomes de origem e destino, de modo que renomear ou excluir uma etapa depois não apaga o significado histórico.

## Sincronização e desempenho

Após cada mutation são invalidados os caches de etapas, board, detalhe/lista de pipelines e conversas. O refresh da Operação mantém Kanban, Conversas, filtros, seletores, resumo e negociação alinhados à mesma entidade persistida. Abrir o diálogo faz uma única consulta de etapas com `_count.deals`; excluir uma etapa com muitos negócios faz uma única chamada HTTP e processamento em lote no backend.

## Persistência e compatibilidade

Foram reutilizados `PipelineStage.position`, `color`, `type`, `isInitial`, `archived` e `deletedAt`, além dos endpoints existentes. Nenhuma migration foi necessária. Pipelines futuros recebem o mesmo comportamento automaticamente.

## Limitações

Esta versão gerencia somente etapas. Nome/descrição do pipeline, canais, automações, SLA, permissões por etapa e um workflow builder permanecem fora do escopo. Conflitos simultâneos de nome são validados pelo service, sem constraint nova no banco, para evitar uma migration potencialmente incompatível com dados legados.
