# Dimensões analíticas do Dashboard

O endpoint `/dashboard/explore` usa whitelist tipada; não aceita coluna ou SQL fornecido pelo cliente.

| Dimensão        | Fonte                                  | ACL                                      | Estado                        |
| --------------- | -------------------------------------- | ---------------------------------------- | ----------------------------- |
| seller          | Deal/Order owner                       | organização, equipe ou próprio usuário   | READY, sem snapshot histórico |
| channel         | Order.channel, Contact.source, Channel | ownership ORGANIZATION/PIPELINE/PERSONAL | READY conservador             |
| pipeline        | Deal.pipelineId/estágio                | Pipeline Access                          | READY                         |
| tag             | ContactTag de compradores              | escopo dos pedidos                       | READY                         |
| customer_type   | isFirstPurchase/purchaseOrdinal        | escopo dos pedidos                       | READY                         |
| source/campaign | snapshots de aquisição                 | organização/escopo comercial             | TRACKING_FROM_NOW             |

| Métrica    | seller | channel | pipeline | tag | customer_type |
| ---------- | ------ | ------- | -------- | --- | ------------- |
| revenue    | sim    | sim     | sim      | sim | sim           |
| orders     | futuro | sim     | futuro   | sim | sim           |
| leads      | futuro | sim     | sim      | não | não           |
| conversion | sim    | sim     | não      | não | não           |

Combinações não listadas são rejeitadas. Tooltips recebem apenas linhas já autorizadas. Canal não é source; Campaign não é Conversation Channel; Order não é Deal; cliente novo é primeira compra válida.
