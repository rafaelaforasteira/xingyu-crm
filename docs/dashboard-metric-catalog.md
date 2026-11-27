# Catálogo de métricas do Dashboard

## Metas históricas

| Métrica               | Fórmula do realizado                                    | Unidade  | Estado |
| --------------------- | ------------------------------------------------------- | -------- | ------ |
| Goal revenue          | soma de `Order.finalValue` confirmado no período/escopo | currency | READY  |
| Goal orders           | contagem de pedidos confirmados no período/escopo       | count    | READY  |
| Goal new customers    | contatos distintos com primeira compra válida           | count    | READY  |
| Goal repeat customers | contatos distintos com ordinal maior que 1              | count    | READY  |

Progresso = actual / target. Remaining não fica negativo; excedente é separado. A curva esperada distribui linearmente o target e não é forecast.

| Métrica                         | Área                | Tipo     | Fórmula e fonte                                | Timestamp           | ACL                  | Cobertura                | Disponibilidade   |
| ------------------------------- | ------------------- | -------- | ---------------------------------------------- | ------------------- | -------------------- | ------------------------ | ----------------- |
| Valor em aberto                 | Overview/Commercial | SNAPSHOT | SUM Deal.value onde status OPEN                | atual               | Deal/Pipeline        | completa atual           | READY             |
| Valor ganho                     | Overview/Commercial | PERIOD   | SUM Order.finalValue confirmado                | orderedAt           | owner/pipeline       | histórica do Order       | READY             |
| Leads abertos                   | Overview            | SNAPSHOT | COUNT Deal OPEN                                | atual               | Deal/Pipeline        | completa atual           | READY             |
| Pedidos                         | Overview/Commercial | PERIOD   | COUNT Order confirmado                         | orderedAt           | owner/pipeline       | histórica do Order       | READY             |
| Conversão comercial             | Commercial          | PERIOD   | WON / (WON + LOST)                             | Deal.closedAt       | Deal/Pipeline        | quando closedAt existe   | READY             |
| Funil atual                     | Commercial          | SNAPSHOT | COUNT/SUM Deal OPEN por stage.position         | atual               | Deal/Pipeline        | completa atual           | READY             |
| Conversão entre etapas          | Commercial          | PERIOD   | entradas/saídas no histórico                   | movedAt             | Deal/Pipeline        | desde stage history      | TRACKING_FROM_NOW |
| Pós-venda                       | Commercial          | PERIOD   | pedido ligado a jornada pós-venda              | evento              | Deal/Pipeline        | eventos futuros          | TRACKING_FROM_NOW |
| Conversas iniciadas             | Attendance          | PERIOD   | COUNT Conversation com mensagem no intervalo   | createdAt/sentAt    | Conversation/Channel | histórico de mensagens   | READY             |
| Primeira/média/mediana resposta | Attendance          | PERIOD   | duração INBOUND→próximo OUTBOUND               | Message.sentAt      | Conversation/Channel | histórico de mensagens   | READY             |
| Aguardando resposta             | Overview/Attendance | SNAPSHOT | última mensagem INBOUND em conversa OPEN       | Message.sentAt      | Conversation/Channel | completa atual           | READY             |
| Abordagem equipe/cliente        | Attendance          | PERIOD   | direção da primeira mensagem observada         | Message.sentAt      | Conversation/Channel | histórico disponível     | READY             |
| Conversão de abordagem          | Attendance          | PERIOD   | abordagem com Deal/Order posterior             | eventos             | Conversation/Channel | futura                   | TRACKING_FROM_NOW |
| Ranking de receita              | Team                | PERIOD   | SUM Deal WON por owner atual                   | closedAt            | role/team/owner      | sem snapshot de vendedor | TRACKING_FROM_NOW |
| Ranking de conversão            | Team                | PERIOD   | WON/(WON+LOST) por owner atual                 | closedAt            | role/team/owner      | sem snapshot de vendedor | TRACKING_FROM_NOW |
| Clientes novos                  | Customers           | PERIOD   | Order isFirstPurchase ou ordinal 1             | orderedAt           | owner/pipeline       | snapshot do Order        | READY             |
| Clientes recorrentes            | Customers           | PERIOD   | isFirstPurchase false ou ordinal >1            | orderedAt           | owner/pipeline       | snapshot do Order        | READY             |
| Tags por receita                | Customers           | PERIOD   | receita dos pedidos por tags atuais do contato | orderedAt           | owner/pipeline       | tags atuais              | READY             |
| Leads/pedidos/receita por canal | Channels            | PERIOD   | Contact.source e Order.channel snapshots       | createdAt/orderedAt | Channel/role         | snapshots existentes     | READY             |
| First touch                     | Channels            | PERIOD   | attribution inicial persistida                 | evento              | Channel/role         | futura                   | TRACKING_FROM_NOW |
| SLA do provider                 | Channels            | PERIOD   | webhooks de entrega/provider                   | provider event      | Channel              | sem provider             | BLOCKED_PROVIDER  |

Snapshots não recebem delta sem histórico de snapshot. Quando o período anterior é zero, a UI não apresenta infinito.
