# Tracking > Visão Geral — relatório de implementação

## Resultado

A entrada de navegação passou de **Vendas** para **Visão Geral**, mantendo o título **Inteligência de Vendas** e a URL **/tracking/vendas**. A página usa uma única análise de pedidos históricos para reconciliar números, gráficos, filtros e tabela.

## Auditoria realizada antes das alterações

- Branch encontrada e mantida: `feature/beta-orders-operation-center`.
- `git status --short` e `git branch --show-current` executados antes das edições.
- Já havia alterações em pipelines, atendimento, financeiro, dashboard, navegação, tipos, API e schema. Foram preservadas.
- Nenhum checkout, reset, commit ou push.
- Rota real: `apps/web/src/app/(app)/tracking/vendas/page.tsx`.
- Feature localizada por busca textual em `apps/web/src/components/crm/tracking/`.
- Hook de dados: TanStack Query em `SalesTrackingPage`, com filtros aplicados na chave e preservação do resultado anterior durante atualização.
- Serviço anterior: `sales-tracking-service.ts` multiplicava totais por fatores aproximados; gráficos secundários e resumo permaneciam globais.
- Mocks anteriores: `sales-tracking-mock.ts` e `sales-overview-mock.ts`, com agregados sem histórico reconciliável e comparações artificiais.
- Erros conceituais identificados: cliente novo equiparado a primeira compra; tabela incompatível com o recorte; ausência de atribuição; histórico sem corte temporal.
- Referências examinadas: dashboard-header, kpi-card, revenue-and-channels, commercial-funnel, dashboard-filters, dashboard-page, globals.css, tailwind.config.ts, nav.ts e package.json.
- Stack efetiva: React, Next.js, TypeScript, Tailwind, Lucide, Recharts, date-fns, TanStack Query; Popover e DateRangeCalendar próprios. Motion, Radix e react-day-picker não constam nas dependências diretas desta versão.
- Cores semânticas obtidas dos tokens existentes: primary, warning, destructive, success, muted e card. Nenhuma biblioteca instalada.

## Estrutura final da página

1. Header, contexto Tracking / Visão Geral e botão circular de filtros.
2. Fluxo financeiro e inteligência da venda.
3. Evolução das vendas e composição da receita líquida.
4. De onde vêm as vendas? Ranking horizontal e cobertura de atribuição.
5. Novos clientes × base existente e distribuição por número da compra.
6. Tempo até a recompra: média, mediana, primeira → segunda, faixas e coorte elegível.
7. LTV por perfil e reativação.
8. Clientes do período: busca, ordenação, paginação e vínculo com perfil do CRM quando existente.

A arquitetura futura Receita / Canais / Clientes / Atribuição está documentada nesta divisão de responsabilidades. Não foram criadas páginas vazias ou links para destinos inexistentes.

## Navegação e compatibilidade

Somente os dois rótulos de Tracking em `nav.ts` foram alterados nesta tarefa. As demais alterações locais desse arquivo foram mantidas. A rota antiga continua sendo a rota oficial temporária: **/tracking/vendas**. Não é necessário redirecionamento, não há mudança de comportamento de links salvos, nem alteração da sidebar inteira.

## Remoções

- Evolução da relação com o cliente: repetia a distribuição por compra.
- Saúde da base: misturava aquisição, comportamento e estado atual.
- LTV “Todos”: duplicava a média geral do topo.
- LTV duplicado dentro de reativação.
- Gerador de comparações e redistribuição artificial de agregados em `sales-overview-mock.ts`.
- Números de exemplo sem lastro nos pedidos selecionados.

## Novos elementos e componentes reutilizados

Reutilizados: PageHeader, Button, Card/CardContent/CardHeader/CardTitle, Badge, Input, Select/Label, Avatar, PaginationBar, EmptyState, Skeleton, Popover, DateRangeCalendar, useReducedMotion, formatação monetária/data do CRM, SalesTrend, FinancialFunnel e componentes Recharts.

Novos:
- **ChannelOriginSection**: ranking de canais e cobertura.
- **ConceptHelp**: tooltip acessível a hover, foco, toque e Escape. Foi necessário porque o Popover existente tem backdrop, incompatível com tooltip por hover; a solução permanece local a Tracking.
- **ChartTooltip**: apresentação consistente de detalhes dos gráficos.
- **tracking-analytics**: análise única de pedidos normalizados.
- **tracking-analytics-types**: contrato normalizado, atribuição hierárquica e coortes.
- **tracking-dates**: normalização de intervalos e granularidade.
- **tracking-dictionary**: definições e taxonomia centralizadas.
- **tracking-format**: fachada dos formatadores do CRM com proteção a valores indisponíveis.
- **tracking-overview.module.css**: entrada discreta de seções, barras e foco.

## Fórmulas

Valores financeiros são acumulados em centavos inteiros; a conversão para reais ocorre na saída.

- **Vendas líquidas** = bruto − cancelamentos − reembolsos conhecidos até a data final.
- **Após cancelamentos** = bruto − cancelamentos.
- **Após reembolsos** = após cancelamentos − reembolsos.
- **Taxa intermediária 1** = após cancelamentos / bruto × 100.
- **Taxa intermediária 2** = após reembolsos / após cancelamentos × 100.
- **Taxa de realização** = líquido / bruto × 100.
- **Ticket médio** = líquido / pedidos pagos válidos.
- **Receita de recompra** = soma do líquido dos pedidos de posição histórica > 1.
- **Participação da recompra** = receita de recompra / líquido × 100.
- **Cobertura de atribuição** = receita identificada / receita líquida total × 100.
- **Taxa de reativação** = clientes reativados / clientes elegíveis × 100, com ambos definidos na mesma janela.
- **Taxa de recuperação** mantém o contrato já existente: recuperado / valor recuperável informado. Esse denominador deve ser normalizado pela futura API; não é utilizado para adicionar receita.
- Divisões por zero e métricas sem população elegível retornam `null` e aparecem como **—**.

Comparação: período imediatamente anterior com a mesma quantidade de dias inclusivos. Métricas anteriores são calculadas sobre o mesmo histórico, com os mesmos filtros e seu próprio corte temporal. Nenhuma tendência é multiplicador fixo.

## Regras de negócio e decisões metodológicas

### Pedido válido e corte temporal

O adaptador demonstrativo trabalha com vendas finalizadas. Um pedido válido está pago e tem saldo líquido positivo na data final. Cancelamento integral ou reembolso integral remove a compra da sequência válida desse snapshot. Reembolso parcial reduz o líquido sem remover a compra.

Datas são datas comerciais normalizadas, no formato YYYY-MM-DD. A futura normalização deve converter timestamps para o fuso comercial antes de entregar este contrato.

Pedidos pendentes com saldo positivo não são silenciosamente considerados receita: a camada rejeita esse estado, que requer uma política futura específica para contas a receber. Cancelamentos e reembolsos não podem superar o bruto nem se sobrepor. Valores financeiros impossíveis são rejeitados.

Esta visão usa o **recorte da venda/pedido**, com ajustes conhecidos até o término. Uma visão por data do evento de reembolso pertence à futura Tracking > Receita.

Pedidos inválidos não incrementam o número da compra. Para segmentar suas perdas financeiras pelo número de compra, o mock usa a posição que a tentativa teria após as compras válidas anteriores. Essa convenção está explícita e deve ser confirmada pela futura normalização de produção.

### Novo e base existente

Novo: primeira compra válida histórica dentro da janela. Base: primeira compra anterior ao início. O cadastro do contato não determina aquisição.

Um novo cliente pode comprar duas vezes na mesma janela. Toda sua receita entra em “Novos clientes”; somente seu primeiro pedido entra em “Primeira compra”. Os demais entram em recompra.

### LTV as-of

Soma do líquido histórico até a data final dos compradores selecionados. Pedidos e ajustes posteriores não entram. Pedidos totais, última compra, recência e intervalo médio da tabela usam o mesmo corte. A data inicial seleciona a população; não apaga seu histórico anterior.

Exemplo validado: 5.000 em 2025 + 2.000 em janeiro + 4.000 em março resulta em LTV 7.000 na análise encerrada em janeiro.

### Reativação

Limiar centralizado em `REACTIVATION_DAYS = 180`. Reativado é um cliente da base com retorno após um intervalo de pelo menos esse tamanho, não uma terceira categoria de aquisição.

Elegíveis são clientes da base cujos intervalos atingem o limiar antes ou dentro da janela e ainda abrangem algum momento da janela. Incluem clientes sem retorno. O filtro “Reativados” não remove os não convertidos do denominador.

Sob filtro específico de número da compra, quantidade, receita e inatividade continuam calculadas sobre os compradores selecionados; **taxa e elegibilidade ficam indisponíveis**, com motivo na interface. Evita condicionar o denominador a uma compra que necessariamente aconteceu.

Se houver mais de um evento no período, o cliente é contado uma vez; a inatividade usa seu primeiro evento no período. A receita de reativados é a receita selecionada desses compradores.

### Retenção

Média e mediana: intervalos históricos entre compras válidas dos compradores selecionados, até a data final. Clientes com uma compra não entram.

Tempo primeira → segunda: apenas compradores selecionados que já possuem segunda compra válida até a data final.

Faixas: cada comprador com recompra no recorte aparece uma vez, conforme seu último intervalo de recompra selecionado. A receita da faixa soma todas as recompras selecionadas desses compradores. Isso evita contar uma pessoa em várias faixas, sem perder receita.

Conversão primeira → segunda: hipótese demonstrativa explícita de `FIRST_TO_SECOND_WINDOW_DAYS = 60`. Coorte adquirida no período, com 60 dias completos até o término; convertidos são os que chegaram à segunda compra em até 60 dias. Sem coorte madura, aparece **—**. Com filtros de perfil/número fica indisponível, sem substituir por “quem comprou duas vezes / compradores do mês”.

`repeatCustomerRate` permanece `null`, reservado para uma definição específica por coorte. Não é confundido com participação da receita.

### Canais e cobertura

Hierarquia de entrada: canal → plataforma → placement → campanha → conjunto → criativo, com campos opcionais de landing page, lead e conversa. Modelo atual: origem registrada por pedido; não promete first/last/multi-touch.

Meta Ads = PAID_SOCIAL + META; Google Ads = PAID_SEARCH + GOOGLE. Instagram é placement ou contexto orgânico, não categoria concorrente de Meta Ads.

Não identificado participa do total e da cobertura. Quando 100% está sem origem, a UI apresenta a lacuna sem tratá-la como erro financeiro. Compradores podem aparecer em mais de um canal; suas contagens não são aditivas entre canais. Receitas e pedidos são aditivos.

### Recuperação

Pendente e recuperado são campos separados. A recuperação pendente nunca entra no líquido. O líquido normalizado é a referência; valores recuperados não são somados novamente. O mock informa perdas pendentes e recuperado zero, sem inventar recuperação concluída.

## Mocks e futura API / Shopify

- Mock: `sales-tracking-mock.ts → createTrackingDataset(today)`.
- 360 identidades demonstrativas, pedidos históricos determinísticos, perdas e origens; o mesmo conjunto é usado para todos os filtros.
- Datas relativas ao dia atual mantêm presets úteis. Um intervalo personalizado realmente filtra datas; não escolhe o agregado “mais próximo”.
- Service boundary: `sales-tracking-service.ts → getSalesTrackingData / getTrackingOverview`.
- Fluxo futuro: Shopify → backend FAROL → normalização → analytics → SalesTrackingData → frontend.
- A futura implementação substitui o adaptador no serviço e devolve o mesmo DTO. O frontend não precisa conhecer objetos Shopify.
- Nenhuma integração ou backend novo foi construído.

### Vínculo com o CRM

A tabela reaproveita **/clients/[profileId]** quando a normalização fornece `crmProfileId`. Mocks sintéticos não são associados a cadastros reais, nem recebem links quebrados. A interface identifica essa limitação. Para navegar às pessoas reais com suas vendas reais, a futura fonte deve entregar identidades e pedidos vinculados ao CRM.

## Interação, estados e responsividade

- Filtros permitidos: período, perfil e número da compra.
- Draft separado de aplicado; limpar altera o draft até “Aplicar filtros”.
- Presets: 30 dias, 90 dias, 12 meses, personalizado.
- Calendário próprio, sem input nativo de data; validação de datas futuras e intervalo.
- Botão circular com contador de filtros; sheet no celular.
- Granularidade centralizada: até 31 dias diária; até 180 semanal; acima disso mensal.
- Loading com skeleton, atualização com conteúdo preservado, vazio global e erro com retry.
- Seções sem amostra apresentam ausência de dados ou **—**, sem NaN/Infinity.
- Tabela com 15 linhas por página, busca por nome/telefone/e-mail e ordenação nas cinco métricas.
- Paginação local atrás do contrato; o transporte futuro pode mover busca/sort/page para a API.
- Animações CSS/Recharts curtas e respeito a reduced-motion.
- Desktop 1600 e 1280, tablet 768, mobile 390 verificados sem overflow da página; tabela tem scroll próprio.

## Arquivos modificados nesta tarefa

Em `apps/web/src/components/crm/tracking/`:

- financial-flow.ts
- financial-funnel.module.css
- financial-funnel.tsx
- sales-overview-format.tsx
- sales-overview.tsx
- sales-tracking-filters.tsx
- sales-tracking-mock.ts
- sales-tracking-page.tsx
- sales-tracking-rules.ts
- sales-tracking-service.ts
- sales-tracking-types.ts
- sales-tracking-visuals.tsx
- sales-tracking.test.ts
- tracked-customers-table.tsx

Fora dessa pasta:

- apps/web/src/lib/nav.ts — somente dois rótulos nesta tarefa; alterações preexistentes preservadas.

## Arquivos criados

- apps/web/src/components/crm/tracking/channel-origin-section.tsx
- apps/web/src/components/crm/tracking/tracking-analytics-types.ts
- apps/web/src/components/crm/tracking/tracking-analytics.ts
- apps/web/src/components/crm/tracking/tracking-dates.ts
- apps/web/src/components/crm/tracking/tracking-dictionary.ts
- apps/web/src/components/crm/tracking/tracking-format.ts
- apps/web/src/components/crm/tracking/tracking-help.tsx
- apps/web/src/components/crm/tracking/tracking-overview.module.css
- apps/web/e2e/tracking-overview.spec.ts
- docs/tracking-overview.md — este relatório.
- artifacts/tracking-overview-wide.png
- artifacts/tracking-overview-desktop.png
- artifacts/tracking-overview-tablet.png
- artifacts/tracking-overview-mobile.png
- artifacts/tracking-overview-mobile-filters.png
- artifacts/tracking-overview-calendar.png

Arquivos gerados e ignorados pelo projeto, como .next, dist, caches e resultados temporários dos testes, não são alterações de código.

## Arquivo removido

- apps/web/src/components/crm/tracking/sales-overview-mock.ts

## Validação

- Lint geral: aprovado, 9 tarefas.
- Typecheck geral: aprovado, 9 tarefas.
- Testes analíticos: 15 aprovados, incluindo 84 combinações de filtros e invariantes.
- Playwright: aprovado, cobrindo quatro resoluções, filtros, draft, busca, ordenação, paginação, tooltip por teclado, calendário e reduced-motion.
- Build geral: aprovado, 7 tarefas, com avisos preexistentes fora de Tracking. Um ajuste posterior preserva o foco dos cabeçalhos durante a ordenação da tabela; validado separadamente por typecheck.

Na primeira execução geral, o Windows bloqueou a substituição da DLL do Prisma enquanto a API estava ativa. Os servidores foram pausados e o lint passou. Isso não exigiu mudança de dependências ou do schema.
