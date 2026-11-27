# Contrato de dados externos — Shopify

## Limite desta feature

Esta feature não implementa OAuth, webhooks ou sincronização Shopify. O objetivo é estabilizar o contrato que uma futura ingestão deverá cumprir. Nenhum dado é sintetizado.

## Identidade e idempotência

- Toda entidade externa deve carregar `organizationId`, `provider=SHOPIFY`, `externalId`, `sourceUpdatedAt`, `ingestedAt` e `schemaVersion`.
- A chave idempotente é `(organizationId, provider, externalId)`.
- Reprocessamento atualiza fatos mutáveis do comércio, mas nunca reescreve snapshots históricos de atribuição capturados no pedido.
- Exclusões externas viram tombstones/estado arquivado; não apagam fatos usados em analytics.

## Customer

Desejado: ID Shopify, e-mail/telefone normalizados, consentimentos, datas de criação/atualização, número de pedidos, total gasto e endereços. O vínculo com `Contact` deve ser determinístico e auditável, sem mesclar identidades ambíguas.

Disponibilidade atual: `Contact` contém identidade e agregados comerciais (`firstPurchaseAt`, `lastPurchaseAt`, `orderCount`, `totalPurchased`), mas não preserva o ID nativo Shopify nem histórico completo de consentimento. Classificação: `TRACKING_FROM_NOW`.

## Order e financeiro

O modelo atual suporta `externalId`, nome/URL externos, moeda, status financeiro, gateway, snapshots de cliente/endereço, primeira compra/ordinal, valores bruto/desconto/frete/impostos/final, cupom, data e vínculos com Contact/Deal/responsável.

- Receita confirmada usa `Order.finalValue` somente nos estados confirmados do catálogo.
- Reembolso, cancelamento parcial, chargeback, transações e moeda de apresentação exigem fatos adicionais antes de `READY`.
- Dinheiro permanece `Decimal`; nunca `Float`.

## Line item e descontos

`OrderItem` já contém produto/variante externos, SKU, coleção, quantidade, preço unitário, desconto e total. Produtos não são Deals. O CRM possui cupom e desconto no pedido/item; alocações e descontos automáticos permanecem `BLOCKED_PROVIDER`.

## Attribution no pedido

Snapshots atuais: source, medium, campaign, content, term, landing page e referrer. Eles são evidência observada no fechamento, não first touch automático. Ingestão pode preencher vazios, mas não substituir snapshots persistidos sem correção auditada.

## Índices futuros

Ao implementar ingestão, revisar `(organizationId, externalId)`, `orderedAt`, status financeiro, contact e datas do provedor. Não adicionar colunas antes de payload real e teste de volume.
