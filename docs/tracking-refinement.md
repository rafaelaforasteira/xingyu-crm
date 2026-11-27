# Refinamento da Visão Geral de Tracking

## Escopo e auditoria

Rodada de refinamento visual e UX da rota `/tracking/vendas`, em `feature/beta-orders-operation-center`. A auditoria confirmou alterações locais anteriores; elas foram preservadas. Nenhuma troca de branch, reset, commit ou push foi executada.

A página continua usando TanStack Query → `getSalesTrackingData` → dataset demonstrativo normalizado → agregações existentes. Os cálculos, filtros, contratos e conceitos de recuperação não foram alterados nesta rodada.

Referências: componentes de dashboard, `PageHeader`, `Button`, `Card`, tokens de `globals.css`, calendários/filtros existentes e os gráficos Recharts. A instalação atual não inclui Motion; usamos requestAnimationFrame, CSS e Recharts, sem adicionar dependências.

## Arquivos desta rodada

Em `apps/web/src/components/crm/tracking/`:

- `sales-tracking-page.tsx`: refresh, retenção do último resultado válido, contexto de animação e retirada da tabela.
- `tracking-motion.tsx` **novo**: `TrackingMotion`, `AnimatedMetric`, `AnimatedProgress` e `useTrackingMotion`.
- `tracking-refresh.ts` **novo**: controle exclusivo de atualização.
- `tracking-refresh.test.ts` **novo**: falhas, concorrência, dataset alterado/inalterado e filtros preservados.
- `sales-overview.tsx`: animação das métricas/gráficos, superfície neutra e tipografia responsiva.
- `financial-funnel.tsx` e `financial-funnel.module.css`: hierarquia, taxas integradas, remoção da caixa de recuperação e animações.
- `channel-origin-section.tsx`: composição segmentada, ranking compacto e nova cobertura.
- `sales-tracking-visuals.tsx`: contadores, barras, conversão compacta e diferenciação dos perfis de LTV.
- `tracking-help.tsx`: reaproveitamento do tooltip para segmentos e conteúdo detalhado.
- `tracking-overview.module.css`: entrada coordenada, refresh, progresso, interações e reduced motion.

Também: `apps/web/e2e/tracking-overview.spec.ts` e este relatório.

## Componentes reutilizados

`SalesTrackingFilters`, `TrackingPeriodSelector`, calendário, `PageHeader`, `Button`, `Card`, `Skeleton`, `EmptyState`, `ConceptHelp`, `ChartTooltip`, `SalesTrend`, formatadores e gráficos Recharts. `TrackedCustomersTable` permanece disponível para uso futuro, mas não é renderizado nesta página.

## Refresh

Botão circular de 36px imediatamente antes do filtro, ícone Lucide `RefreshCw`, tooltip “Atualizar dados” e nome acessível “Atualizar dados da análise”.

A ação executa `query.refetch`, preservando a chave com os filtros aplicados. Há proteção contra clique duplo e bloqueio enquanto a consulta dos filtros está em andamento. O ícone gira em ciclos de 800ms; uma apresentação mínima de 450ms torna o estado perceptível mesmo com o mock imediato.

Os dados anteriores permanecem visíveis com opacidade de 70%. Sucesso usa o toast “Dados atualizados”; falha usa “Não foi possível atualizar os dados.” e preserva o último dataset válido. Não há reload ou alteração programática de scroll. Consultas de filtros distintos continuam isoladas pelo cache do TanStack Query.

## Movimento e performance

- Entrada das seções: fade com deslocamento de 7px, duração de 280ms, sequência até aproximadamente 740ms; gráficos entram suavemente junto ao bloco principal.
- Contadores principais: até 800ms; secundários entre 500–650ms; alterações de valor interpolam do valor exibido para o novo em até 420ms.
- Valores inalterados permanecem estáveis, com breve transição de opacidade; curvas, donut, funil e barras reapresentam os dados.
- Funil: etapas com intervalo de 90ms, perdas menores e conclusão em verde.
- Curvas/donut/barras: recursos nativos de animação Recharts, sem redesenhar a composição aprovada.
- Progresso e canais: preenchimento entre 450–550ms, sem bloqueio de interação.
- As atualizações por frame ficam dentro de cada `AnimatedMetric`; não renderizam a página inteira. Apenas elementos gráficos específicos reiniciam a animação, sem remontar a página ou limpar os filtros.

## Mudanças visuais

**Funil:** superfície neutra; âmbar somente na etapa bruta; valor líquido com tamanho limitado pela largura; pills mais próximas, com indicação “mantido”; tooltips por etapa; barra de realização. A caixa “Recuperação das perdas · Simulação” foi removida. Os campos de recuperação continuam no modelo.

**Inteligência:** fundos mais sutis, valores com acentos mais presentes, tipografia ajustada à largura dos cards. Os indicadores de apoio mantêm altura compacta.

**Canais:** barra 100% proporcional à receita, paleta roxo/violeta/lilás, não identificado em cinza, tooltip com receita, participação, pedidos, compradores, novos clientes e ticket. Ranking decrescente em duas colunas quando cabe; uma no celular. Cores permanecem ligadas ao canal, mesmo quando a ordem muda.

**Cobertura:** percentual em destaque, subtítulo curto, progresso e dois grupos de receita/participação. Explicação sobre ROAS movida ao tooltip. Fica ao lado no desktop e abaixo em telas menores.

**Distribuição:** primeira compra roxa e recorrências na família verde. Estrutura e tooltip preservados.

**Recompra:** média, mediana, primeira→segunda e faixas permanecem. Conversão indisponível vira uma nota discreta com explicação; quando existe taxa, aparece como indicador compacto real.

**LTV:** barras verticais finas diferenciam novos, base e reativados; valores com cores correspondentes e contadores.

**Final:** a Visão Geral encerra em LTV e reativação, sem tabela ou link para rota inexistente.

## Acessibilidade

Os leitores de tela recebem o valor final estável; o texto que conta é ocultado da árvore acessível. Tooltips funcionam por foco, hover, toque e Escape. `prefers-reduced-motion` desliga contadores, stagger, preenchimentos e rotação; no celular os contadores e a entrada são mais curtos. A informação não depende das cores.

## Verificação

- `pnpm --filter @xingyu/web lint`: aprovado; neste projeto o script executa TypeScript sem emissão.
- `pnpm --filter @xingyu/web typecheck`: aprovado.
- Vitest: 15 testes analíticos/financeiros existentes aprovados; 3 testes novos de refresh aprovados.
- Playwright: autenticação + cenário completo aprovados. Cobertura de 1600, 1280, 768 e 390px; filtros; período personalizado; refresh repetido; retenção de filtros; scroll; tooltip por teclado; remoção da tabela/recuperação; reduced motion e correspondência dos valores finais acessíveis.
- Erro e respostas alteradas/inalteradas foram simulados nos testes do controlador com QueryObserver real; a navegação foi exercitada com o mock normal.
- Build de produção: aprovado (Next.js, saída 0), em cópia isolada com as mesmas fontes e dependências. Avisos preexistentes fora de Tracking permanecem.

O build foi preparado em uma cópia temporária da aplicação, com as mesmas dependências, para não sobrescrever o `.next` do CRM aberto nem interromper API/PostgreSQL.

## Evidências visuais

Em `artifacts/`: `tracking-overview-wide.png`, `tracking-overview-desktop.png`, `tracking-overview-tablet.png`, `tracking-overview-mobile.png`, `tracking-overview-calendar.png`, `tracking-overview-mobile-filters.png`, `tracking-refinement-funnel-mobile.png` e `tracking-refinement-metrics-mobile.png`.


Validação final em 16/09: CRM aberto e autenticado no navegador integrado, rota /tracking/vendas carregada e nenhum erro registrado no console desta abertura. Correção da referência inicial das animações validada por TypeScript e build completo.

