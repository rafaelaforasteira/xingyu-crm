# Auditoria — Dashboard Goals & Visual Analytics

- Base: `54eb0914cdc841b06094439b2b0a1976905f43af`.
- `User.monthlyGoal` era Decimal, sem histórico; não existia Goal.
- Recharts 2.15 já estava instalado; nenhuma dependência visual foi adicionada.
- `globals.css` já tinha reduced motion e não foi alterado.
- Shopify: Order/OrderItem têm snapshots, valores e IDs externos; OAuth/ingestão não pertencem à feature.
- Tracking: existem snapshots e Attribution, mas não visitor/session/event/first touch imutável.
- Atribuição histórica completa, provider SLA e campanhas completas não são retroativamente reconstruíveis.
- Nenhum dado Shopify, Tracking, atribuição, meta histórica ou forecast foi fabricado.
