# Central operacional de pedidos

## Domínio

`Order` permanece o fato comercial e não é transformado em Deal. A camada operacional usa `OrderStageDefinition`, isolada de `PipelineStage`, e campos aditivos no pedido para etapa, responsável, prioridade, prazo, pendência, fulfillment e localização. Financeiro (`financialStatus`), fulfillment externo e etapa operacional são estados independentes.

O workflow é configurável por organização, ordenado por `position`, com código estável, semântica `OPEN | IN_PROGRESS | DONE | ISSUE`, cor, etapa inicial/final, arquivo e traduções. Organizações sem configuração recebem defaults na primeira leitura; nomes não participam de regras de negócio.

## API, ACL e consistência

As listagens mantêm paginação e busca server-side por pedido, identidade do cliente, SKU e tracking. Pedidos vinculados continuam limitados pela ACL do pipeline; pedidos independentes permanecem válidos. Leituras e mutations por id executam `assertOrderAccess`. Apenas ADMIN gerencia etapas.

Mover um card atualiza `operationalStageId` e cria `OrderEvent` imutável. Kanban, lista e workspace compartilham os endpoints e caches de Orders.

## Experiência

`/orders?view=kanban|list` oferece Kanban com drag-and-drop, lista operacional e workspace com itens, logística, Shopify, Deal opcional e histórico. O idioma é local à Central de Pedidos (`pt-BR`, `en`, `zh-CN`, `zh-HK`) e não altera o restante do CRM.

A migration `20260813210000_add_orders_operation_center` é aditiva e deve ser aplicada com `pnpm db:migrate:deploy`; não requer reset.
