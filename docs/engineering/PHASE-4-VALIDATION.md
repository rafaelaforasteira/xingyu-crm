# Fase 4 — validação dos agentes no BRAINX

Data: 2026-11-04. Branch `codex/brainx-quality-security`; base desta auditoria `8c372f9`.
Alvo confirmado pelo usuário: **Tracking → Visão Geral, `/tracking/vendas`**. `/dashboard` é “Dados” na navegação e foi usado somente para comparação.

Resultado: os papéis especializados produziram um diagnóstico coordenado de uma área real do código, buscas locais e plano técnico. Skills/perfis foram reconhecidos pelo Codex e o Playwright MCP respondeu com navegador isolado. **A interface real não foi validada visualmente.** Não houve redesenho, alteração de aplicação, regras de negócio, dependências, workflows, dados reais ou permissões. Sem push, merge ou deploy.

## 1. Escopo, método e critérios de aceite

Foram lidos AGENTS.md, todos os sete documentos anteriores de `docs/engineering`, arquitetura e UI guidelines. As decisões da fase 3 foram preservadas. Pastas preexistentes `artifacts/layout-fix/` e `artifacts/tracking-recovery/` não foram alteradas nem usadas como prova visual atual.

Problema: comprovar contribuição útil dos agentes, além de presença dos arquivos instalados, sem implementar as melhorias propostas. Escopo: análise de produto/fluxo, auditoria estática de UI, testes direcionados existentes, disponibilidade MCP, revisão de scanners/workflows e triagem de dependências. Aceite: achados rastreáveis, distinção entre execução e inferência, plano incremental com testes e limitações explícitas. Fora do escopo: integração real de analytics, novos serviços, migrações, redesign e publicação.

Fluxo aplicado: BMAD identifica problema/contratos → Apple e UI UX auditam apresentação/interação → Superpowers estrutura testes e implementação futura → Security Guardian revisa dependências/harness/CI → Codex consolida este documento. As contribuições usaram o mesmo alvo e foram reconciliadas, sem planos concorrentes.

## 2. BMAD — diagnóstico de produto e arquitetura

O papel analista BMAD e os critérios do kernel `bmad-spec` foram aplicados à implementação. Os resolvers de configuração/customização foram executados; configuração efetiva BRAINX/Portuguese e overrides de equipe carregados. Este documento é o artefato solicitado: **não se alega execução completa do workflow bmad-spec**, que exigiria SPEC e memlog próprios.

### Porquê

Permitir entender vendas, receita líquida, compradores, ticket, origem e recompra para orientar prioridades comerciais. A apresentação precisa tornar inequívocos fonte, período, recorte e disponibilidade, sem mudar os cálculos.

### Capacidades e sucesso esperado

- Reconhecer fonte e recorte: saber se os dados são demonstrativos e quais filtros geraram os indicadores exibidos.
- Explorar filtros: editar rascunho sem alterar KPIs antes de “Aplicar”; impedir intervalo inválido.
- Compreender indicadores: acessar explicações e valores equivalentes dos gráficos por ponteiro/teclado/leitor de tela.
- Atualizar com confiança: feedback, deduplicação, manutenção dos últimos dados válidos e indicação clara quando a atualização falha.
- Usar em diferentes larguras: preservar informação e foco em 375/768/1440 px, HD com sidebar e zoom. Esses critérios ainda exigem homologação visual autorizada.

### Restrições e não escopo

Preservar Next/React, Nest e Prisma; identidade real BRAINX, tipos e semântica de zero/indisponível; as 84 combinações de filtros e invariantes financeiras existentes. Não conectar Shopify ou outra fonte, trocar adapter, criar ações de negócio, alterar atribuição/receita ou usar dados reais nesta fase.

### Fluxo confirmado no código

`app/(app)/tracking/vendas/page.tsx` → `SalesTrackingPage` → filtros aplicados em estado React → TanStack Query `['tracking','sales',appliedFilters]` → `getSalesTrackingData` → resolução de datas → dataset sintético → `analyzeTrackingOverview` → `SalesTrackingData` → resumo executivo, fluxo financeiro, timeline/composição, origem, mix, recompra e insights.

**Não há persistência, chamada Nest ou efeito externo nesse fluxo atual de leitura.** `sales-tracking-service.ts:11` sempre chama `createTrackingDataset(today)` e retorna análise com `source: 'mock'`. A interface mostra “Dados demonstrativos” em `sales-tracking-page.tsx:55`. Logo, o aviso existe, mas esta tela ainda não comprova analytics real, inclusive porque o adapter não depende de NODE_ENV/DEMO_MODE. Conectar a fonte real é decisão separada de produto/arquitetura; não remover o aviso nem substituir a implementação automaticamente.

## 3. Apple Design + UI UX Pro Max — diagnóstico da interface

Veredito Apple: **Refine**. A sequência números → explicação/fluxo → origem → clientes/recompra → sinais fornece uma base coerente. Conteúdo, controles e fundo foram avaliados separadamente. Não há evidência para redesenhar a tela.

A identidade real do módulo Tracking é neutra/verde, com tokens em `apps/web/src/app/globals.css:690` e variantes escuras. A fonte é Plus Jakarta Sans via next/font em `app/layout.tsx:2`. A paleta lilás nas guidelines é descrita como provisória; não deve sobrepor o tema implementado. Não adotar fontes Apple, Liquid Glass ou outro design system por padrão.

### Achados priorizados

**UX-01 — alto: traçado informativo com contraste estático baixo.** `sales-overview.tsx:145` usa `--series-net`; `tracking-overview.module.css:170` associa o traçado a `--tracking-accent`, `#5dd62c`, sobre superfície branca. O cálculo sRGB dos tokens resulta em **1,888:1**. Para traçado essencial à compreensão, a referência de contraste não textual é 3:1. Usar variante strong/ink existente para o traçado, preservando verde de marca/preenchimentos. As séries já têm nomes/legenda e larguras diferentes, mas ambas são contínuas. Confirmar cores adjacentes efetivas, estados e exceções no navegador antes de concluir conformidade global. [W3C: contraste não textual](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html).

**UX-02 — alto: ajuda fecha antes que o ponteiro alcance o texto.** `tracking-help.tsx:14` define camada `pointer-events-none`; o gatilho fecha imediatamente em `onMouseLeave` e o portal usa a mesma camada. Isso impede manter a explicação aberta ao mover o ponteiro para ela, comportamento relevante para leitura com ampliação. Escape e `aria-describedby` já existem e devem permanecer. Manter aberta na união gatilho+tooltip e fechar por Escape/saída de ambos, com comportamento touch definido. Achado de código, sem teste browser aprovado. [W3C: conteúdo em hover/foco](https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html).

**UX-03 — médio: texto de variação negativa com contraste estático insuficiente.** `tracking-overview.module.css:312` define chip de 10 px; a variante negativa usa `--tracking-data-red` (`#e63e46`) sobre mistura sRGB 12% vermelho + superfície branca. Resultado calculado: **3,469:1**, abaixo de 4,5:1 para texto normal. Reutilizar `--tracking-data-red-ink` após verificar light/dark; não trocar a paleta. [W3C: contraste textual](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).

**UX-04 — médio: recorte aplicado fica pouco explícito.** `sales-tracking-filters.tsx:31` conta filtros; o nome acessível fixo do botão não inclui essa contagem, apesar do badge filho. Tipo de cliente/número da compra ficam ocultos ao fechar o painel; os metadados mostram datas/fonte, não o recorte completo. Incluir contagem no nome acessível e resumo textual dos filtros efetivamente associados aos dados exibidos.

**UX-05 — médio: contexto durante atualização/falha merece reforço.** `sales-tracking-page.tsx:38` usa placeholderData e `:41` mantém lastValid. Isso preserva dados corretamente, com mensagem de atualização/falha e datas anteriores. Porém, após pedir recorte B e falhar, os controles já representam B enquanto os dados ainda são A; falta identificar o recorte completo de A. Preservar o fallback, associando dados e contexto de origem numa mesma visão local. Não mudar o DTO público ou os cálculos sem necessidade.

**UX-06 — médio: investigar equivalente textual da timeline.** `sales-overview.tsx:85` habilita accessibilityLayer; há tooltip e legenda, mas não tabela/resumo com os valores temporais no SalesHero. Verificar árvore acessível e leitor de tela; se insuficiente, oferecer resumo/tabela expansível com data, brutas, líquidas e pedidos. O donut já possui lista textual com valores/percentuais; não duplicá-la sem necessidade. A ausência de tabela, sozinha, não comprova violação formal. [W3C: gráficos complexos](https://www.w3.org/WAI/tutorials/images/complex/).

**UX-07 — médio: promessa de ação sem ação disponível.** `tracking-action-insights-panel.tsx:25` apresenta “O que fazer agora”, mas o conteúdo indica “Disponível em breve”. São artigos informativos, não botões quebrados. Ajustar expectativa editorial/hierarquia em tarefa de apresentação; destinos acionáveis dependem de requisito de negócio separado.

**UX-08 — baixo: recorte não persiste em reload/compartilhamento.** `sales-tracking-page.tsx:33` mantém filtros somente em useState. A tela Dados usa URL para outro contrato (`dashboard/dashboard-page.tsx:529`). Avaliar persistência sanitizada como requisito futuro; não copiar parâmetros ou permissões entre módulos automaticamente.

**UX-09 — pendência de legibilidade e alvos.** Eixos/captions usam 10 px e metadados 11 px; ajudas de KPI usam 22×22 px na densidade compacta e 24×24 em desktop largo (`tracking-executive.module.css:255` e `:442`). Validar zoom 200/400%, espaçamento, reflow, leitura HD e toque. Não existe mínimo WCAG universal de 16 px para fonte. O critério AA de alvos de ponteiro é 24 CSS px, com exceções de espaçamento; 22 px isoladamente não comprova falha e 44 px é objetivo de conforto, não mínimo universal AA. [W3C: tamanho de alvo](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

### Cobertura das nove dimensões e aspectos preservados

- **Hierarquia:** ordem analítica coerente; h1 sr-only, breadcrumb e resumo executivo. Rever expectativa dos insights e visibilidade de contexto, sem reorganizar toda a página.
- **Tipografia:** fonte atual preservada, formatação pt-BR e números tabulares. Risco de texto auxiliar pequeno exige navegador/zoom.
- **Espaçamentos:** gutters compactos HD e mais amplos em container largo; usar escala existente. Sem evidência para recomendar aumento genérico de todos os espaços.
- **Cores:** tokens light/dark e variantes ink existem; corrigir usos pontuais após medir, sem uniformizar Tracking com outros módulos.
- **Componentes:** filtros com rascunho/aplicação, controles nomeados e ajuda contextual. Corrigir comportamento do tooltip e contexto dos filtros.
- **Responsividade:** KPIs têm container queries 5/3/2/1 colunas (`tracking-executive.module.css:458`); popover usa mobileSheet e safe-area. CSS responsivo existe, mas overflow, toque e foco reais seguem não validados.
- **Usabilidade:** refresh bloqueado durante fetch, deduplicação e feedback; skeleton, vazio, erro com retry e últimos dados válidos. Melhorar compreensão do recorte e promessa dos insights.
- **Acessibilidade:** aria-busy, live region, combobox com setas/Enter/Escape/Home/End, retorno de foco e reduced motion em CSS/Recharts. Presença desses mecanismos não certifica a tela; faltam navegação e leitura reais.
- **Consistência entre telas:** primitivas e família tipográfica compartilhadas; variantes de tema são intencionais no código. `ExecutiveKpi` é article sem link (`tracking-executive-summary.tsx:151`), enquanto a guideline geral pede métricas clicáveis e Dados usa links. Registrar essa divergência para decisão de produto antes de transformar KPI em navegação.

## 4. Ferramentas realmente utilizadas e evidências

- **BMAD 6.12.4:** leitura/aplicação do analista e kernel spec, resolvers `resolve_customization.py` e `resolve_config.py`, exit 0. Logs `bmad-analyst.json`, `bmad-config.json`, `planner-bmad-workflow.json`, `planner-bmad-config.json` em `.temp/phase4`.
- **Apple Web Design 0.1.0:** modo audit; SKILL, audit-playbook e web-adaptation aplicados ao código. É orientação comunitária, não scanner nem certificação Apple.
- **UI UX Pro Max 2.15.0:** duas buscas locais executadas com o Python existente: `tooltip hover keyboard focus persistent dismissible` e `dashboard chart data table accessibility small text`, domínio ux, três resultados cada, exit 0. Logs `ux-tooltip-search.log` e `ux-chart-search.log`. As buscas forneceram critérios; não medem a página.
- **Superpowers 5.1.3:** writing-plans aplicado à decomposição abaixo, com teste antes de mudança, arquivos, comandos, aceite e reversão. Nenhuma tarefa do plano de implementação foi executada. Não foi iniciado fluxo automático de conclusão/publicação.
- **Codex 0.147.0:** três subtarefas com escopo explícito (UX, planejamento/engenharia e Security Guardian) aplicaram os perfis de equipe e retornaram contribuições conciliadas. Não é prova de uma pipeline autônoma ou de execução de todos os sete perfis nativos.
- **Reconhecimento repetido:** app-server skills/list com reload, exit 0, 31 skills solicitadas reconhecidas (29 BMAD + Apple + UI UX), errors vazio; plugin/read, exit 0, Superpowers instalado/habilitado e 14 skills. config/read confirmou sete papéis, MCP e UV. Evidências `skills-recognition.json`, `superpowers-recognition.json`, `codex-config-recognition.json`. Não confundir catálogo de plugin com lista de skills locais.
- **Contraste:** cálculo de luminância relativa sRGB a partir dos tokens CSS, incluindo composição do fundo do chip; `ux-static-contrast.json`. Não é computed style, screenshot, axe ou leitura de tela.
- **Security Guardian:** inspeção de código/configuração, pnpm audit, Trivy, Gitleaks e comparação de advisories oficiais, detalhados abaixo. Não realizou exploração ou chamadas a fornecedores.

### Playwright MCP e limite visual

`codex mcp get brainx_playwright --json`: exit 0, registrado/habilitado. Smoke stdio com `@playwright/mcp@0.0.84`, Chromium existente e contexto isolado: initialize, tools/list (25 ferramentas), browser_tabs, browser_navigate em `about:blank` e browser_snapshot passaram; browser_close executado no encerramento. Servidor informa internamente Playwright `1.65.0-alpha-2026-10-30`, distinto da versão do pacote MCP. Logs `mcp-registration.json`, `mcp-smoke.json`, `mcp-smoke.log`.

**Isso comprova conexão/navegador, não a interface BRAINX.** A revisão automática anterior rejeitou `Next start` em `127.0.0.1:3107` com “blocked by policy”, sem motivo adicional. Nesta fase não se repetiu a inicialização nem se trocou porta/servidor/hospedagem para contornar o bloqueio. Não houve screenshot atual da Visão Geral ou teste autenticado.

Há uma segunda restrição de segurança para o próximo ensaio: `apps/web/playwright.config.ts:7` carrega ADMIN_EMAIL/ADMIN_INITIAL_PASSWORD de `.env`; a configuração usa storageState anterior e webServer `pnpm dev` com reuseExistingServer. Foi lido somente o código da configuração, **não** `.env` ou cookies. Não executar essa configuração habitual para este exercício isolado. Um harness dedicado deve excluir tais fallbacks e usar apenas ambiente/dados explicitamente autorizados; isso não autoriza contornar a política de inicialização.

### Verificações do projeto nesta fase

- `pnpm lint`: exit 0, 10 tarefas em cache, `lint.log`. Os scripts lint atuais são tsc, não uma auditoria completa de estilo/segurança.
- `pnpm typecheck`: exit 0, 10 tarefas em cache, `typecheck.log`.
- `pnpm --filter @xingyu/web exec vitest run src/components/crm/tracking/sales-tracking.test.ts src/components/crm/tracking/tracking-refresh.test.ts src/components/crm/tracking/financial-flow.test.ts src/components/crm/tracking/tracking-action-insights.test.ts`: exit 0, **107 testes/4 arquivos**, 24,41 s, `planner-tests.log`. Analytics, invariantes e helpers de refresh/TanStack Query; não testes DOM/E2E.
- Build, suíte completa, cobertura API e integrações PostgreSQL **não repetidos**: esta fase altera somente este relatório, não runtime. A fase 3 registra build e suíte completa aprovados, como evidência histórica, não execução desta fase. Nenhum banco foi iniciado ou migrado nesta auditoria.
- Revisão da entrega: Prettier check deste Markdown passou; `git diff --cached --check` passou; Gitleaks stdin apenas deste relatório passou sem findings, separado do alerta histórico descrito abaixo. Logs `report-format.log` e `gitleaks-report.log`.

## 5. Scanners e workflows

Verificados `.github/workflows/ci.yml`, `security.yml`, `performance.yml` e `.github/dependabot.yml`. Parse sintático com js-yaml existente: exit 0 nos quatro arquivos, `workflow-yaml-validation.log`. Primeira tentativa com biblioteca yaml ausente falhou; repetição usou biblioteca já instalada, sem reinstalação. Parse não substitui actionlint ou GitHub Actions.

Pontos corretamente configurados: CI/security cobrem PR de qualquer branch e workflow_dispatch; contents:read, concorrência e timeouts; CI usa Postgres efêmero `_test`, seed sintético com senha gerada/mascarada, frozen-lockfile, Prisma/migração/seed e checks. Security mantém artefatos por sete dias e upload always. Semgrep CE 1.183.0 está fixado por digest, strict/métricas off; erros de execução/parser falham, findings são consultivos. Trivy inclui dev e vulnerabilidades sem patch.

Pendências demonstráveis:

1. **Node 20 no CI/performance está EOL desde 2026-04-30**, conforme calendário oficial. Planejar versão LTS suportada e compatibilidade; local Node 24 aprovado não comprova CI Linux atualizado. [Node Release schedule](https://raw.githubusercontent.com/nodejs/Release/main/schedule.json).
2. Gitleaks (`security.yml:27`) e Trivy (`:73`) usam continue-on-error também para erro de infraestrutura. Isso condiz com baseline consultiva, mas não forma gate efetivo. Separar falha técnica de finding, como Semgrep, antes de tornar checks obrigatórios.
3. Trivy (`security.yml:81`) reporta só CRITICAL,HIGH. Não há pnpm audit no CI: moderadas/baixas não ficam cobertas nesse relatório. Propor relatório amplo separado, sem confundir política de gate alto com inventário completo.
4. `SECURITY.md` ainda descreve falhas dos três scanners como consultivas; Semgrep já falha por erro técnico. Registrar a divergência e atualizar a política em tarefa própria, sem mudar regra silenciosamente. Severidade de regra Semgrep ERROR não equivale a severidade CVE; WARNING/INFO não são examinados nesse comando.
5. Actions/imagens em geral usam tags; só Semgrep tem digest fixado. Ruleset p/default é remoto e mutável. Avaliar SHAs/digests e regras revisadas para reprodutibilidade, sem alegar comprometimento.
6. Performance tem opção baseline, mas implementa smoke de guards; não comprova carga/performance. Faltam permissions/timeouts explícitos nesse workflow.
7. Branch protection, CI Linux, execução remota e SAST real permanecem não verificados. `docker version` falhou por named pipe dockerDesktopLinuxEngine ausente; Semgrep/actionlint não encontrados. Não houve instalação alternativa ou execução remota para contornar limites. A alternativa CI existente ainda requer execução autorizada e revisão de artefatos.

Gitleaks 8.30.1 no histórico: **exit 1**, 129 commits, um alerta generic-api-key em `_bmad/_config/files-manifest.csv:48`, commit da fase 3. Foi confirmado como SHA-256 público de `bmad-ux/assets/key-screens.md`, não credencial. Nenhuma supressão adicionada. O scanner não está “verde”; o CI consultivo continuará registrando esse alerta conhecido.

## 6. Dependências moderadas e baixas — triagem atual

`pnpm audit --json`: **exit 1**, 0 críticas, 0 altas, **29 moderadas/5 baixas**, 1.224 dependências na metadata. São 27 entradas de advisory (22 moderadas/5 baixas), em 15 nomes de pacote; não 34 pacotes distintos ou 34 explorações comprovadas. `pnpm-audit.json` contém caminhos completos; `audit-summary.json` resume IDs, URLs, patches e caminhos.

Trivy 0.76.1, snapshot somente de manifests/lock/workspace, `fs --skip-db-update --timeout 3m --scanners vuln --include-dev-deps --severity MEDIUM,LOW --exit-code 1 --format json`: **exit 1**, 30 MEDIUM/4 LOW ocorrências, 24 IDs distintos. Banco do scanner datado 2026-11-04. Esse comando não examinou HIGH/CRITICAL, código ou produção. Evidências `trivy-medium-low.json`, `trivy-summary.json` e log.

**Divergência relevante:** Trivy encontrou Lodash que pnpm não reportou. Não escolher apenas o scanner favorável. Os totais/IDs não são equivalentes entre bases de advisories.

### Prioridade runtime e parsers

- **qs 6.14.2**, transitivo de Nest platform-express → Express 4.22.1 e testes superagent: quatro advisories moderados. Patch conjunto indicado **6.16.1**. Condições incluem parsing/stringify comma e objetos hostis; não foi localizado uso próprio de qs.stringify/comma:true, mas isso não exclui consumidores transitivos. Priorizar patch compatível e regressões URLencoded/query/erros. [Advisory de parsing](https://github.com/advisories/GHSA-x5fp-wj9c-mxmx), [stringify](https://github.com/advisories/GHSA-6pq8-jhm2-2vcw).
- **Lodash 4.18.0**, runtime via Nest config/Swagger e ferramentas: Trivy CVE-2026-2950/GHSA-f23m-r3pf-42rh; fonte oficial indica patch **4.18.1**. Problema em caminhos-array de unset/omit pode remover propriedades de protótipo. Nenhum uso desses métodos foi localizado no source próprio; consumidores transitivos ainda precisam revisão. [Advisory oficial Lodash](https://github.com/lodash/lodash/security/advisories/GHSA-f23m-r3pf-42rh).
- **file-type 20.4.1**, via @nestjs/common: loop ASF e descompressão ZIP, patch conjunto **21.3.2**. Não foi encontrado uso de FileTypeValidator/ParseFilePipe/import file-type na API; upload atual usa util própria de bytes/MIME/extensão/tamanho sem descomprimir ZIP. Preservar proteções. A mudança major/ESM/engines exige validação, não override cego. [ASF](https://github.com/advisories/GHSA-5v7r-6r5c-r473), [ZIP](https://github.com/advisories/GHSA-j47w-4g3g-c36v).
- **@nestjs/core 10.4.22**: injeção SSE por type/id com CR/LF, patch publicado **11.1.18**. Não encontrados @Sse/SseStream/EventSource no código examinado. Não misturar core 11 com Nest 10 por override isolado; avaliar migração coordenada em tarefa separada. [Advisory Nest](https://github.com/advisories/GHSA-36xv-jgw5-4q75).

### Desenvolvimento, compilação e transitivas

- **Vitest/mocker 4.1.0**: patch conjunto **4.1.12**; **Vite 6.4.4 → 6.4.5** indicado. Riscos dependem de devserver/mocker WebSocket alcançável; configuração examinada usa vitest run, sem endpoint de mocker/API/browser exposto. Manter devservers privados e validar patches em grupo.
- **PostCSS 8.5.18 → 8.5.23**, **postcss-selector-parser 6.1.4 → 6.1.5**: build CSS via Next/Tailwind/Vite. Não encontrado processamento de CSS de cliente em endpoint; builds de entradas não confiáveis continuam limite relevante. Revalidar CSS/maps e build.
- **AJV 8.12.0 → 8.18.0**, via Angular-devkit/Nest CLI: ReDoS condicionado a $data. Outra cópia 8.20.0 já existe; corrigir ramo afetado, não presumir pacote inteiro resolvido.
- **fast-uri 3.1.7 → 3.1.9**, cinco advisories (três moderados/dois baixos) via CLI/webpack/schema-utils/AJV. Não localizado uso próprio para autorização por URI. Patch dirigido e testes de consumidores.
- **brace-expansion**: patches por linha **1.1.21 / 2.1.7 / 5.0.12**; manter majors compatíveis com os consumidores.
- **glob 10.5.0/13.0.6** e **minimatch 3.1.5/9.0.9/10.2.6**: scanner aponta **14.0.2 / 11.0.1**, respectivamente. Exigem análise de engines/API e consumidores Nest CLI/rimraf/ESLint; não forçar major global.
- **webpack 5.97.1 → 5.104.1**, dois baixos de SSRF em buildHttp/HttpUriPlugin. Recursos não encontrados no source/config próprios; revisão de build continua necessária.
- **deepmerge 4.3.1**, baixo via fork-ts-checker-webpack-plugin: sem patch publicado; `<0.0.0` no scanner representa ausência de versão corrigida. Não substituir automaticamente por deepmerge-ts, pacote/API distintos. Acompanhar upstream, limitar entrada de objetos/configuração e registrar dono/prazo se houver aceitação formal. [Advisory deepmerge](https://github.com/advisories/GHSA-gcqx-w48m-w2h4).

As versões são indicações dos advisories consultados nesta data, não alterações aplicadas nem garantia de compatibilidade. Ausência de chamada no source próprio reduz evidência de alcance direto, mas não prova inexplotabilidade. IDs, títulos, URLs e caminhos das 27 entradas permanecem no resumo local; revisar novamente antes de qualquer patch. Nenhuma vulnerabilidade foi marcada corrigida nesta fase.

## 7. Plano de implementação — estrutura Superpowers

**Goal:** tornar recorte e informação compreensíveis e acessíveis, preservando cálculos e identidade.
**Architecture:** manter SalesTrackingPage como orquestrador, componentes/tema atuais e adapter intacto. Separar melhorias de apresentação, harness e dependências em alterações revisáveis. Nenhuma biblioteca nova por padrão.
**Tech Stack:** Next/React/TanStack Query/Tailwind/Recharts; Vitest e Playwright existentes.

Este plano descreve trabalho futuro. Os checkboxes não são resultados executados. Para execução futura usar a disciplina Superpowers executing-plans ou subagent-driven-development dentro da autorização correspondente; isso não autoriza publicação.

### Tarefa 1 — harness seguro e ambiente permitido

Arquivos propostos: novo `apps/web/playwright.validation.config.ts` e especificações isoladas em `apps/web/e2e-validation/`. Não importar playwright.config.ts habitual nem carregar .env/storageState anterior.

- [ ] Exigir alvo explícito de staging autorizado e dados fictícios; validar allowlist/protocolo/porta sem fallback para o CRM habitual. Configuração sem webServer: não iniciar nem reutilizar serviço automaticamente.
- [ ] Testar rejeição de alvo ausente/não aprovado e impedir import da configuração habitual. Fazer inspeção da configuração antes de `pnpm --filter @xingyu/web exec playwright test --config playwright.validation.config.ts --list`.
- [ ] Só executar navegador real quando o ambiente permitir. A configuração isolada não remove o bloqueio Next nem permite mudar servidor para contorná-lo.

Aceite: nenhum acesso a credenciais/cookies reais ou início automático de aplicação; testes bloqueados permanecem pendentes.

### Tarefa 2 — ajuda hoverable, sem mudança visual

Arquivo: `tracking-help.tsx`; teste proposto `apps/web/e2e-validation/tracking-help.spec.ts`.

- [ ] Primeiro teste negativo: focar/hover um botão “Informações sobre …”, obter role tooltip, mover ponteiro ao centro do tooltip e exigir que permaneça visível. No código atual fecha ao sair do botão. Testar Escape, saída de ambas as áreas e foco restaurado/preservado.
- [ ] Implementar mínimo: permitir pointer-events no conteúdo do ConceptHelp, considerar gatilho+tooltip como área de permanência e uma ponte temporizada cancelável para atravessar o gap. Manter fechamento ao abrir outra ajuda, scroll/resize e Escape. Não mudar indiscriminadamente a camada de todos os tooltips Recharts.
- [ ] Repetir o teste, teclado e touch, incluindo abertura de ajuda concorrente e desmontagem sem timer residual.

Aceite: explicação hoverable/dismissible/persistente enquanto pertinente, mesmo layout/tokens, sem trap de foco. Comando futuro: `pnpm --filter @xingyu/web exec playwright test --config playwright.validation.config.ts tracking-help.spec.ts`, somente no ambiente permitido.

### Tarefa 3 — contexto do dataset e nome do filtro

Arquivos: `sales-tracking-page.tsx`, `sales-tracking-filters.tsx`; helper proposto `tracking-filter-summary.ts` e teste; ampliar `tracking-refresh.test.ts`.

- [ ] Criar casos table-driven de resumo para ALL/NEW/EXISTING/REACTIVATED, ALL/1…6+ e preset/custom. Exemplo de aceite: NEW + 2 deve produzir “Novos · 2ª compra”; ALL não deve aparecer como filtro ativo.
- [ ] Testar A→B com QueryObserver: B falha, A e seu contexto continuam juntos; retry B bem-sucedido troca ambos. O DTO atual não contém os filtros: capturar snapshot local dos filtros junto ao resultado da consulta, sem presumir campo inexistente em SalesTrackingData ou mudar contrato público.
- [ ] Incluir contagem no aria-label do gatilho e resumo de dados exibidos no mesmo padrão tipográfico atual. Não anunciar sucesso de B enquanto A estiver em tela. Rascunho continua separado de filtros aplicados.
- [ ] Rodar `pnpm --filter @xingyu/web exec vitest run src/components/crm/tracking/tracking-filter-summary.test.ts src/components/crm/tracking/tracking-refresh.test.ts`; depois os 107 testes direcionados novamente.

Aceite: recorte inequívoco inclusive após falha, sem perder dados válidos, mudar receita ou remover badge demonstrativo.

### Tarefa 4 — contraste e informação equivalente

Arquivos: `tracking-overview.module.css`, `sales-overview.tsx`; testes visuais/acessíveis no harness isolado.

- [ ] Medir primeiro cores computadas e contextos light/dark do traçado e chip, registrando falha atual sem generalizar à tela inteira.
- [ ] Trocar somente a cor semântica do traçado net por variante strong/ink legível e texto negativo por red-ink; preservar preenchimentos/identidade. Recalcular composições e confirmar mínimo aplicável em ambos os temas.
- [ ] Inspecionar árvore acessível e interação Recharts. Se os valores temporais não forem equivalentes, adicionar disclosure com resumo e tabela data/brutas/líquidas/pedidos, derivada do mesmo array timeline; não reimplementar cálculo ou duplicar lista do donut.
- [ ] Verificar teclado, leitura, nomes, reduced motion, zoom 200/400%, 375/768/1440 px e HD com sidebar. Não atualizar snapshots para aceitar regressão sem revisão.

Aceite: contraste aplicável demonstrado e valores equivalentes acessíveis, preservando cálculos/tema; nenhuma conclusão WCAG global só com teste automatizado.

### Tarefa 5 — decisões de produto separadas

- [ ] Decidir se KPIs Tracking devem navegar, e quais destinos/filtros são autorizados, resolvendo a divergência da guideline antes de implementar links.
- [ ] Decidir nomenclatura de insights informativos versus ações futuras, sem criar rotas ou automações especulativas.
- [ ] Registrar separadamente necessidade de URL persistente e integração real. Não misturar essas mudanças com correções de tooltip/contraste.

### Tarefa 6 — dependências e CI em alterações independentes

- [ ] Primeiro patches compatíveis dirigidos: qs/Lodash; depois Vitest+mocker/Vite; PostCSS/parser; AJV/fast-uri/brace-expansion; webpack. Em cada grupo: confirmar caminhos, changelog, licença e engines, registrar teste/regressão pertinente, revisar lockdiff e repetir audit/Trivy. Não usar audit --fix geral.
- [ ] Planejar separadamente Nest major, file-type major e glob/minimatch majors; deepmerge exige acompanhamento/mitigação explícita enquanto não houver patch.
- [ ] Planejar Node LTS suportado nos workflows e cobertura MEDIUM/LOW em relatório, separando falha técnica de finding. Reconciliar SECURITY.md antes de mudar gate. Só verificar Actions remoto após autorização de publicação/execução, sem push nesta fase.

### Fechamento e reversão futura

- [ ] Para mudanças de runtime futuras executar lint/typecheck, testes relevantes e build; banco somente local `_test` explicitamente descartável quando necessário. Nenhum teste de negócio deve ser removido ou timeout ampliado para esconder falha.
- [ ] Revisar evidências Apple/UI UX, contratos BMAD e risco Security Guardian no mesmo diff. Aceite final depende de validação visual autorizada, não do smoke em página vazia.
- [ ] Rollback por revert apenas dos commits de apresentação/configuração afetados, sem reset/clean, mantendo adapter/cálculos/proteções de segurança. Nenhuma migração é necessária para as melhorias de apresentação propostas.

## 8. Riscos e pendências finais

Prioridades imediatas para próxima fase autorizada: tooltip/contraste/contexto do recorte; patches runtime compatíveis; Node suportado e observabilidade dos scanners. Integrações reais, migrações major e decisões de navegação ficam separadas.

Continuam pendentes: visual autenticado, screenshots atuais, foco/leitor de tela/reflow/dark reais, SAST Semgrep, CI Linux, gates/branch protection e triagem formal de riscos sem patch. O adapter da Visão Geral continua demonstrativo e os insights continuam informativos. Não foram declarados corrigidos.

A colaboração foi comprovada como análise assistida do código: identificou o alvo correto, o adapter mock, problemas concretos de interação/contraste/contexto e lacunas de scanners. Não se declara sistema autônomo validado ponta a ponta. O único arquivo de entrega desta fase é este relatório; logs locais ficam em `.temp/phase4` para revisão, sem dados reais.
