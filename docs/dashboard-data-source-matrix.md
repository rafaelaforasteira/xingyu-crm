# Matriz de fontes do Dashboard

| Domínio                    | Campos confiáveis                                                         | Uso                         | Restrição                                    |
| -------------------------- | ------------------------------------------------------------------------- | --------------------------- | -------------------------------------------- |
| Organization               | timezone, currency                                                        | limites e formatação        | timezone aplicado pelo ambiente atual da API |
| Deal                       | status, value, closedAt, enteredStageAt, owner/team/pipeline              | snapshot, fechamento, funil | owner é atual, não snapshot histórico        |
| DealStageHistory           | fromStageId, stageId, movedAt                                             | entradas/saídas             | cobertura desde criação do ledger            |
| Order                      | orderedAt, finalValue, ownerId, channel, isFirstPurchase, purchaseOrdinal | receita, clientes, canais   | canal é snapshot textual                     |
| Payment                    | status, paidAt, amount                                                    | pagamento confirmado        | depende do conector alimentar Payment        |
| Conversation               | assignee, channel, status, unreadCount                                    | atendimento                 | aplica ownership de canal                    |
| Message                    | direction, sentAt, isInternal                                             | episódios e origem          | mensagens internas excluídas                 |
| Task/TaskStatusDefinition  | dueAt, completedAt, category                                              | atenção e produtividade     | finalização pela categoria                   |
| Contact                    | firstPurchaseAt, orderCount, source                                       | clientes e aquisição        | createdAt não define cliente novo            |
| ContactTag/Tag             | relação atual                                                             | segmentos                   | multi-tag contabiliza em cada tag            |
| User/Team                  | role, teamId, monthlyGoal                                                 | filtros, ranking, metas     | role/Team limitam análise                    |
| Channel/PipelineConnection | accessMode, ownerUserId, pipelineId                                       | opções e ACL                | PERSONAL nunca é exposto a terceiros         |
| Activity                   | type, actor, metadata, createdAt                                          | histórico futuro            | snapshot de vendedor ainda ausente           |

Não foram usados `updatedAt` como wonAt, paidAt, firstResponseAt ou entrada de etapa. Dados ausentes são retornados como indisponíveis, nunca como zero fabricado.
