# Histórico de pedidos no contexto do lead

## Conceito

`Contact` representa a identidade consolidada atual. `Order` representa um fato comercial permanente. Uma nova compra cria outro pedido e nunca atualiza os snapshots de compras anteriores.

Cada pedido pode preservar nome, e-mail, telefone e endereço estruturado usados na compra; itens e variantes externas; valores, moeda, cupom e pagamento; classificação de primeira compra/recompra; ordinal; IDs e links externos; tracking, UTMs, landing page e referrer. Dados ausentes permanecem explicitamente ausentes — a UI não substitui snapshots pelo contato atual.

`OrderEvent` registra a linha do tempo imutável do pedido. A integração Shopify atual continua mock. OAuth, webhooks, matching por telefone, merge de contatos e deduplicação não fazem parte desta entrega. A modelagem não depende do número da conversa e permite que pedidos futuros usem números diferentes do contato consolidado.

## Experiência

O Contexto do Lead mostra os três pedidos mais recentes do contato. “Ver histórico de pedidos” abre todos os resultados carregados dentro da conversa e permite drill-down no mesmo diálogo. O detalhe inclui cliente, endereço, itens, valores, pagamento, descontos, tracking, links e eventos.

O contador representa todos os pedidos vinculados ao contato, independentemente de pagamento. Zero pedidos exibe estado vazio. O KPI “Tempo médio entre compras” só existe com duas ou mais compras elegíveis.

## Tempo médio entre compras

Para cada compra válida, usa-se `Payment.paidAt` aprovado quando disponível. Como fallback, usa-se `orderedAt` apenas para status que comprovam avanço após pagamento. Pedidos cancelados, reembolsados ou sem evidência de compra válida são excluídos.

As datas são ordenadas, calculam-se os intervalos consecutivos e aplica-se a média aritmética. O resultado é arredondado para dias; intervalos menores que um dia aparecem como `< 1 dia`. A animação de entrada dura 220 ms, não repete e é removida por `prefers-reduced-motion`.

## Performance e limitações

A lista, o histórico e o KPI compartilham uma query React Query com relações carregadas em lote, evitando N+1. A consulta atual carrega no máximo 100 pedidos; clientes acima desse volume exigirão paginação do diálogo e um endpoint agregado de KPI. Registros legados não recebem snapshots inventados e podem exibir “não registrado”.

O Histórico geral do lead apresenta eventos de pedido apenas quando uma mutation real registrar `ORDER_CREATED`; não sintetiza compras retroativamente.
