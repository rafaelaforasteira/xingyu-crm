# Auditoria da Central de Inteligência

## Histórico e estado atual

O commit visual `29703c4aeabfd46bdafc31b7180734eb0b50a979` foi estudado. Foram preservados conceitualmente a hierarquia limpa, cards financeiros alinhados, identidade roxa discreta, filtros compactos e drilldowns. Foram descartados o escopo textual redundante, heurísticas por nome de etapa como verdade analítica, cálculos client-side e restauração cega de componentes antigos.

A rota `/dashboard`, o AppShell, Recharts, componentes de Card/Tabs/Select/Skeleton/EmptyState e o `DashboardService` já existiam. A sidebar atual era fixa, com Pipelines e Tarefas, mas sem Dashboard.

## Fontes auditadas

- `Deal`: `status`, `value`, `closedAt`, `enteredStageAt`, owner/team/pipeline, stage history e motivo de perda.
- `Order`/`Payment`: `orderedAt`, `finalValue`, status, `paidAt`, `isFirstPurchase`, `purchaseOrdinal` e snapshots de canal/attribution.
- `Conversation`/`Message`: canal, assignee, status, unread, direction e `sentAt`; suporta episódios reais de resposta.
- `Task`: status dinâmico, categoria final, assignee, prazo e `completedAt`.
- `Contact`: primeira compra, contagem de pedidos, total comprado, source e tags.
- `Activity`: ledger de mudanças e eventos; não contém snapshot histórico completo do responsável na venda.
- `Channel`: ownership `ORGANIZATION`, `PIPELINE` e `PERSONAL`.
- `Pipeline Access`, Deal Ownership, User/Team e Organization timezone/currency foram reutilizados.

## Lacunas encontradas

- O backend anterior aceitava filtros de owner/team/pipeline sem validar escalada por usuário.
- Ranking por responsável usa owner atual do Deal; não há snapshot confiável do vendedor no fechamento.
- Conversão entre etapas possui histórico apenas a partir da cobertura efetiva de `DealStageHistory`.
- First-touch e conversão de abordagem não têm cobertura histórica completa.
- Eventos do provedor WhatsApp, entrega e campanhas continuam bloqueados pelo provider.

Nenhuma migration foi necessária: os modelos e índices essenciais já existem.
