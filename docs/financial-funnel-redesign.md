# Redesign exclusivo do Funil Financeiro

## Escopo

Alterado somente o funil de Tracking > VisÃƒÂ£o Geral. A integraÃƒÂ§ÃƒÂ£o em `sales-overview.tsx` remove apenas o tÃƒÂ­tulo e a moldura do funil, ajustando seu alinhamento. Nenhuma alteraÃƒÂ§ÃƒÂ£o nos demais componentes, filtros, mocks, serviÃƒÂ§os ou fÃƒÂ³rmulas financeiras. Branch mantida; sem commit ou push.

## Arquivos

Em `apps/web/src/components/crm/tracking/`:

- `financial-funnel.tsx`: desenho, etapas, tooltips e indicadores laterais.
- `financial-funnel.module.css`: geometria, cores, conectores, responsividade e animaÃƒÂ§ÃƒÂµes.
- `financial-funnel-format.ts` (novo): moeda compacta e comparaÃƒÂ§ÃƒÂ£o da realizaÃƒÂ§ÃƒÂ£o em pontos percentuais.
- `financial-funnel-format.test.ts` (novo): precisÃƒÂ£o da moeda, comparaÃƒÂ§ÃƒÂ£o entre taxas e ausÃƒÂªncia de denominador.
- `sales-overview.tsx`: somente a moldura, o tÃƒÂ­tulo e o alinhamento do funil.

## Desenho e componentes

`FinancialFunnel` organiza quatro trapÃƒÂ©zios SVG com cantos suavizados e afunilamento progressivo. Os componentes locais `FunnelStage`, `FunnelTransitionRate` e `RateDetail` separam etapa, indicador e detalhe. Reutiliza `ConceptHelp`, `AnimatedMetric`, os tokens do tema e a revisÃƒÂ£o de dados da pÃƒÂ¡gina.

O funil ocupa aproximadamente 66% da largura. Os callouts ocupam a trilha lateral a partir de 74%, com conectores finos roxos saindo dos intervalos entre etapas. O terceiro indicador fica alinhado ÃƒÂ  etapa lÃƒÂ­quida. A barra inferior e o rodapÃƒÂ© de comparaÃƒÂ§ÃƒÂ£o foram removidos.

## Valores e interaÃƒÂ§ÃƒÂ£o

Os valores visÃƒÂ­veis usam `Intl.NumberFormat("pt-BR")`, moeda BRL e notaÃƒÂ§ÃƒÂ£o compacta: duas casas para milhÃƒÂµes e uma para milhares. Exemplos: R$ 1,09 mi; -R$ 44,4 mil; -R$ 18,8 mil; R$ 1,02 mi. O formatter ÃƒÂ© exclusivo do funil, preservando a apresentaÃƒÂ§ÃƒÂ£o dos demais grÃƒÂ¡ficos.

Toda a etapa abre tooltip por hover, foco ou toque. O tooltip mostra valor exato, participaÃƒÂ§ÃƒÂ£o no bruto e, nas perdas, o saldo mantido. Escape fecha o detalhe. Os ÃƒÂ­cones de informaÃƒÂ§ÃƒÂ£o internos foram retirados. Hover realÃƒÂ§a saturaÃƒÂ§ÃƒÂ£o e sombra sem deslocar a etapa; cursor neutro.

## Cores e contraste

- Brutas: `warning`, com texto `warning-foreground` escuro, contraste 8,24:1. Branco nÃƒÂ£o atingiria contraste suficiente neste ÃƒÂ¢mbar.
- Cancelamentos: `destructive` e texto branco, 4,80:1.
- Reembolsos: mistura de 92% `destructive` com `warning`, texto branco, 4,58:1.
- LÃƒÂ­quidas: mistura de 88% `success` com `foreground`, texto branco, 4,65:1.
- Taxas: `primary`/`accent-foreground`, com valor branco e descriÃƒÂ§ÃƒÂ£o em `muted-foreground`.

Contrastes calculados sobre as cores efetivamente renderizadas pelo navegador.

## Taxa de realizaÃƒÂ§ÃƒÂ£o e comparaÃƒÂ§ÃƒÂ£o

Os cÃƒÂ¡lculos de valores, saldos e taxas existentes foram preservados. O problema estava na apresentaÃƒÂ§ÃƒÂ£o: o antigo rodapÃƒÂ© usava `flow.trends.netSales`, isto ÃƒÂ©, crescimento da receita lÃƒÂ­quida, junto ÃƒÂ  taxa de realizaÃƒÂ§ÃƒÂ£o.

O novo tooltip usa:

`(lÃƒÂ­quido atual / bruto atual Ãƒâ€” 100) Ã¢Ë†â€™ (lÃƒÂ­quido anterior / bruto anterior Ãƒâ€” 100)`

No mock atual: **94,2% vs. 97,6%, diferenÃƒÂ§a de Ã¢Ë†â€™3,4 p.p.** O antigo +476,4% nÃƒÂ£o era a variaÃƒÂ§ÃƒÂ£o da taxa. Sem denominador vÃƒÂ¡lido, a comparaÃƒÂ§ÃƒÂ£o fica indisponÃƒÂ­vel. Os dados anteriores jÃƒÂ¡ estavam disponÃƒÂ­veis; nenhuma alteraÃƒÂ§ÃƒÂ£o em mock, serviÃƒÂ§o ou contrato foi necessÃƒÂ¡ria.

## Movimento e responsividade

- Etapas entram com fade e deslocamento de 4px, stagger de 80ms.
- Valores e taxas contam em atÃƒÂ© 650ms.
- Conectores crescem da esquerda para a direita; callouts aparecem em sequÃƒÂªncia curta.
- Refresh reapresenta formas e conectores em 180ms, mantendo a interpolaÃƒÂ§ÃƒÂ£o existente dos nÃƒÂºmeros.
- Hover nÃƒÂ£o reinicia a animaÃƒÂ§ÃƒÂ£o.
- `prefers-reduced-motion` desativa animaÃƒÂ§ÃƒÂµes; os valores finais continuam acessÃƒÂ­veis.
- Em componentes abaixo de 340px, as descriÃƒÂ§ÃƒÂµes laterais ficam compactas, com explicaÃƒÂ§ÃƒÂ£o completa no tooltip. As trÃƒÂªs taxas continuam visÃƒÂ­veis.

## ValidaÃƒÂ§ÃƒÂ£o

- Lint web: aprovado (`tsc --noEmit`, conforme script do projeto).
- Typecheck web: aprovado.
- Vitest: 8 testes aprovados (6 financeiros existentes + 2 de apresentaÃƒÂ§ÃƒÂ£o/comparaÃƒÂ§ÃƒÂ£o).
- Navegador: desktop, 768px, 390px e 320px; ausÃƒÂªncia de overflow horizontal; valores centralizados; tooltip de cancelamento com valor exato; tooltip da realizaÃƒÂ§ÃƒÂ£o com comparaÃƒÂ§ÃƒÂ£o correta; movimento reduzido com zero elementos animados e valores finais ÃƒÂ­ntegros.
- Build: primeira execuÃƒÂ§ÃƒÂ£o aprovada; execuÃƒÂ§ÃƒÂ£o final apÃƒÂ³s ajuste de centralizaÃƒÂ§ÃƒÂ£o em andamento.

O build usa cÃƒÂ³pia temporÃƒÂ¡ria com as mesmas dependÃƒÂªncias para manter o CRM disponÃƒÂ­vel. Os avisos de lint preexistentes em outras ÃƒÂ¡reas permanecem fora deste escopo.

## EvidÃƒÂªncias

- `artifacts/financial-funnel-desktop.png`
- `artifacts/financial-funnel-mobile.png`


## Refinamento especÃ­fico dos indicadores

AlteraÃ§Ã£o funcional restrita a `financial-funnel.tsx` e `financial-funnel.module.css`. Componente das taxas: `FunnelTransitionRate`; componente explicativo: `RateDetail`, dentro de `ConceptHelp` existente. Formas, cores, valores, cÃ¡lculos e demais Ã¡reas preservados nesta rodada.

Os trÃªs tooltips incluem nome da taxa, percentual e valores exatos antes/depois. A retenÃ§Ã£o apÃ³s reembolso usa o saldo apÃ³s cancelamentos como denominador; realizaÃ§Ã£o usa bruto e lÃ­quido e mantÃ©m a comparaÃ§Ã£o em pontos percentuais. O nome acessÃ­vel inclui percentual e significado. BotÃµes informativos tÃªm cursor neutro, foco visÃ­vel, abertura por hover/foco/clique e fechamento por Escape. O tooltip existente usa portal, acima das etapas e dos badges.

Checagens desta rodada: sobreposiÃ§Ã£o medida em 8 px nas trÃªs etapas, alinhamento vertical no inÃ­cio da etapa, desktop/tablet 768 px/mobile 320 e 390 px, ausÃªncia de overflow horizontal, teclado atÃ© realizaÃ§Ã£o e Escape, tooltips de valores exatos, movimento reduzido sem elementos animados. Textos 9,8%, 95,9% e 100,0% medidos com a fonte efetiva: largura automÃ¡tica acomoda os trÃªs casos. Zoom de 125% nÃ£o pÃ´de ser confirmado no navegador integrado; escala padrÃ£o verificada.

Teste móvel por clique aprovado. Simulação de toque nativo indisponível no navegador integrado; não validada em aparelho físico. Sem commit ou push.
