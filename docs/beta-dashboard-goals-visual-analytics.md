# Dashboard Goals & Visual Analytics

O Dashboard passa a ter sete áreas, com Metas entre Equipe e Clientes. URLs antigas continuam válidas e `?tab=goals` ativa a área. Filtros globais permanecem na URL.

## Domínio

`Goal` preserva organização, métrica, escopo, equipe/pessoa, pipeline opcional, `Decimal(14,2)`, período semiaberto, criador, timestamps e arquivamento. A migration `20260813160000_add_historical_goals` inclui checks de alvo, período e valor. Metas equivalentes não podem se sobrepor.

Métricas MVP: receita, pedidos, clientes novos e recorrentes. O campo legado `User.monthlyGoal` permanece para compatibilidade, mas não representa o novo histórico.

## Segurança

- Admin gerencia todos os escopos.
- Manager gerencia própria equipe e integrantes.
- Consultant lê organização, própria equipe e própria meta.
- Toda leitura/escrita usa `organizationId`; pipeline passa pelo Pipeline Access.
- Criação, edição e arquivamento geram AuditLog.

## Analytics

Actual usa Order confirmado, `finalValue` e `isFirstPurchase/purchaseOrdinal`. A resposta contém target, actual, percentual, remaining, exceeded, dias, necessário/dia, esperado, ritmo e curva cumulativa. A curva esperada não é forecast.

## Visualização

Recharts 2.15 já existia e foi reutilizado, sem dependência nova. Linhas/barras/donuts usam cerca de 650 ms; progresso, 700 ms. `prefers-reduced-motion` desliga o movimento. Cada tab monta apenas os gráficos necessários e valores ausentes continuam `—`.
