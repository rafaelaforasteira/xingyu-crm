# Fase 6 — validação visual e qualidade

Data: 2026-11-04, America/Sao_Paulo. Branch `codex/brainx-quality-security`, commit avaliado **a1710a0**.

**Estado: verificações técnicas e auditoria estática executadas; inspeção visual da aplicação pendente.** Não há screenshot atual, sessão autenticada, console/rede da página ou teste responsivo observado nesta fase. O roteiro abaixo prepara a coleta, mas não a substitui.

## Escopo e diagnóstico técnico

Foram lidos integralmente AGENTS.md, EXECUTION.md, relatórios das fases 3/4/5 e UI guidelines, além da arquitetura/perfis aplicáveis. O estado histórico da fase 1 não foi confundido com as correções posteriores documentadas em EXECUTION.

Mini-brief BMAD: avaliar o resultado da fase 5 sem mudar negócio; distinguir evidência de código/testes, cálculo estático e observação de navegador. Capacidades: identificar regressões, inventariar riscos atuais e produzir plano de correção/coleta. Não escopo: redesign, integrações reais, alterações comerciais, banco, migrações, publicação ou troca de ferramentas. Aceite: comandos/resultados reais, limites explícitos e roteiro reproduzível com evidências rastreáveis.

O fluxo atual permanece: `/tracking/vendas` → SalesTrackingPage → filtros aplicados → TanStack Query → loadTrackingView → adapter existente/dataset sintético → analytics → DTO original + snapshot local de filtros → metadados e visualizações. Sem persistência ou efeitos externos nessa consulta. A fonte continua **mock**, sinalizada por “Dados demonstrativos”; não foi homologada uma integração de vendas reais.

Nesta fase somente este relatório foi adicionado. Nenhum código, teste, manifest, lockfile, workflow, perfil de agente ou regra de negócio foi alterado. Nenhuma ferramenta foi reinstalada. Sem push, merge ou deploy.

## 1. Ambiente e ferramentas

- Branch correta; início sem alterações rastreadas. Permaneciam apenas `artifacts/layout-fix/` e `artifacts/tracking-recovery/`, preservados e não adicionados ao commit.
- Ferramentas confirmadas: Codex CLI **0.147.0**, Node **24.14.1**, pnpm **9.15.4**, uv **0.13.7**, Python existente do runtime Codex. Monorepo pnpm/Turbo, Next **15.5.28**, Nest 10 e Prisma **6.19.3** preservados.
- Skills existentes: BMAD **6.12.4**, Superpowers **5.1.3**, Apple Web Design **0.1.0**, UI UX Pro Max **2.15.0**; não houve nova instalação. Foram lidas/aplicadas as instruções locais, não apenas seus nomes.
- Scripts revisados: lint/typecheck são tarefas tsc; build executa compilação dos pacotes, Prisma generate, Nest e Next; test:web usa Vitest; test:api usa Jest; test:e2e depende de aplicação/auth. Scripts `dev:local`, setup/seed/migrate/reset existem, mas **não foram usados** para iniciar ou modificar o ambiente habitual.
- MCP `brainx_playwright`, `@playwright/mcp@0.0.84`, registrado/habilitado em `.codex/config.toml`; Chromium existente, contexto isolado/headless, service workers bloqueados e ferramentas restritas. Configuração global/MCPs anteriores preservados. A configuração atual não foi relaxada.
- Consulta somente de metadados de listeners não retornou serviço nas portas locais 3000, 3107, 3333 e 3347. Isso não comprova inexistência de qualquer ambiente ou autoriza acessar outras portas.

Logs desta fase: `C:/Users/Windows/Desktop/xingyu-crm/.temp/phase6/`, ignorados pelo Git. Não publicar indiscriminadamente logs, sessões ou imagens sem revisar privacidade.

## 2. Estado real do navegador e evidências

A revisão automática anterior rejeitou a inicialização Next em `127.0.0.1:3107` com **“blocked by policy”**, sem motivo adicional registrado. Esse comando não foi repetido. Não houve mudança de porta, servidor, túnel, hospedagem, sandbox ou perfil para contornar a restrição.

Foi perguntado se havia uma instância de teste existente, autorizada e com dados fictícios. O usuário orientou “siga”, sem fornecer URL ou confirmar uma instância específica. Prosseguiu-se com as atividades independentes; isso não foi interpretado como autorização para escolher um CRM desconhecido ou usar dados reais.

`codex mcp get brainx_playwright --json` retornou exit 0: o registro está habilitado (`mcp-registration.json`). O primeiro smoke stdio expirou em **initialize**, exit 1, sem checks concluídos (`mcp-smoke.json/log`). Não houve mensagem de rejeição de segurança nesse smoke: timeout de protocolo e bloqueio anterior do Next são fatos distintos. A causa do timeout não foi comprovada.

Uma segunda checagem isolada foi feita após os checks pesados, com a mesma configuração e alvo `about:blank`, preservando a primeira falha (`mcp-retry.json/log`). **Exit 0:** initialize, tools/list (25 ferramentas), browser_tabs, browser_navigate e browser_snapshot passaram; browser_close foi chamado no encerramento. O servidor informa internamente Playwright 1.65.0-alpha-2026-10-30, distinto do pacote MCP 0.0.84. Ela não acessa a aplicação nem produz evidência visual de BRAINX. O sucesso posterior não comprova a causa do primeiro timeout.

Não se executou o Playwright E2E habitual: `apps/web/playwright.config.ts` carrega credenciais de arquivos env, usa storageState anterior e pode iniciar/reutilizar servidor. Foram inspecionadas essas instruções no código, sem ler os valores dos arquivos sensíveis. Não foi criada uma configuração alternativa para contornar o bloqueio.

### Screenshots disponíveis

- **Capturas atuais desta fase: zero.** Diretório preparado: `C:/Users/Windows/Desktop/xingyu-crm/.temp/phase6/screenshots/`, inicialmente vazio.
- Inventário de metadados encontrou **37 imagens anteriores** nos dois diretórios de artefatos preexistentes. Algumas têm LastWriteTime em outubro de 2026; timestamp de arquivo não comprova data de captura ou commit. Inventário em `prior-image-inventory.json`.
- Não foram abertas ou reutilizadas como aprovação do visual atual. Não há vínculo demonstrado dessas imagens com a1710a0, viewport, sessão fictícia e estado observado.
- Console, requisições, fontes carregadas, árvore acessível, pixels computados e interações da página **não foram observados**. Ausência de log de erro não significa console/rede sem erros.

## 3. Auditoria Apple Design e UI UX Pro Max

Veredito: **Refine**. Hierarquia, tokens, tipografia e densidade existentes fornecem base para refinamento localizado, sem justificativa para redesign. A identidade Tracking é verde/neutra com Plus Jakarta Sans; a paleta lilás provisória da guideline não substitui o tema real.

### Comprovado no código, sem equivaler a homologação visual

- UX-01/03: traçado usa accent-strong e texto negativo red-ink; gradiente mantém accent original (`tracking-overview.module.css:170`, `:334`, `sales-overview.tsx:91`). Os testes calculam contraste normal light/dark a partir dos tokens.
- UX-02: ConceptHelp aceita ponteiro no texto; foco/hover e ponte de 150 ms estão ligados ao controlador. Escape, outra ajuda, scroll/resize e clique externo continuam fechando. Clique no próprio texto não é externo. Isso remove o fechamento imediato anterior; não comprova travessia lenta/com lupa/touch em navegador.
- UX-04/05: o envelope de apresentação mantém dados+snapshot juntos, a chave de cache distingue view, o resumo usa filtros do dataset exibido e o nome acessível informa a contagem. Testes cobrem QueryObserver e SSR; não representam observação de DOM/estado real A→B.
- Feedback: skeleton, vazio, erro/retry, live region, aria-busy, preservação dos últimos dados e reduced motion existem. Controles e selects mantêm os mecanismos de teclado no código.
- Responsividade: container queries de KPIs, mobileSheet, safe-area, metadados flex-wrap/min-width e gutters HD/largo existem. Regras CSS não demonstram ausência de corte/overflow, ordem de foco correta ou leitura em zoom.

### Achado adicional — contraste durante atualização

**Q-01, prioridade P1 de apresentação / severidade média, risco estático condicionado:** `sales-tracking-page.tsx:147` aplica `opacity-70` à seção inteira enquanto fetching, inclusive texto informativo. O estado normal testado na fase 5 não cobre essa composição.

Modelo sRGB executado com os tokens reais (`design-opacity.cjs/json`, exit 0): compõe **texto e fundo do grupo** com alpha 0,7 sobre tracking-bg, considerando superfície branca/page #f8f8f8 no claro e superfície #171717/page #0f0f0f no escuro. Resultados:

- Chip negativo claro: normal **5,242:1**, atualização **3,238:1**.
- Chip negativo escuro: normal **6,742:1**, atualização **3,958:1**.
- Traçado claro: normal **5,750:1**, atualização **3,152:1**.
- Traçado escuro: normal **11,627:1**, atualização **6,177:1**.

O modelo indica texto pequeno abaixo de 4,5:1 durante fetch. Overrides, transição, cores efetivas e contexto ainda exigem observação; **não é medição browser nem declaração formal de violação global**. aria-busy não torna todo texto informativo um controle inativo dispensado de legibilidade. Proposta: reproduzir fetch lento em fixture autorizada e evitar atenuar o texto, usando o feedback de atualização já existente. Nenhuma correção de runtime foi aplicada nesta auditoria. [W3C: contraste textual](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).

### Pendências anteriores preservadas

- **Q-02 / P1 de validação:** verificar ajuda por ponteiro lento, foco, Escape, toque e leitura ampliada. A ponte de 150 ms não prova sozinha um caminho utilizável. [W3C: hover/foco](https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html).
- **Q-03 / P2:** investigar equivalente acessível da timeline. Há accessibilityLayer, tooltip e legenda, mas não foi localizado equivalente textual completo aos pontos temporais; inspecionar árvore/leitor antes de decidir tabela/disclosure. O donut já tem lista textual, sem necessidade de duplicação automática.
- **Q-04 / P2:** eixos/chips de 10 px e metadados de 11 px exigem zoom/reflow real. Ajuda KPI de 22×22 px na densidade compacta exige avaliar espaçamento/exceções; tamanho isolado não comprova falha. Não existe mínimo universal WCAG de fonte 16 px; alvos AA usam 24 CSS px com exceções. [W3C: alvos de ponteiro](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).
- **Q-05 / P2 de produto:** título “O que fazer agora” versus “Disponível em breve”; são artigos informativos, não botões quebrados. Definir promessa editorial ou ações antes de implementar destinos.
- **Q-06 / P2 de produto:** filtros continuam em estado React e não persistem em URL/reload. KPIs article sem navegação divergem da guideline geral de métricas clicáveis. Decidir contratos/destinos de cada módulo antes de copiar o comportamento da tela Dados.
- **Q-07 / fronteira de produto:** Visão Geral ainda usa mock com badge, inclusive sem gate NODE_ENV no adapter. Não é analytics real homologado nem prova de falha de autorização; integração real permanece escopo separado.

Não há evidência atual para afirmar que fonte não carregou, grid quebrou, houve overflow, foco ficou encoberto ou console/rede da página falharam. Essas hipóteses precisam das capturas e interações abaixo.

## 4. Roteiro manual exato — depende de ambiente autorizado

**Pré-condição:** operador disponibiliza uma URL aprovada, com dados fictícios e conta de teste isolada, e confirma que corresponde ao commit a1710a0 ou registra outro commit. Sem essa URL, parar a etapa visual e manter pendente. Este roteiro não manda executar o comando Next bloqueado, `pnpm dev:local` contra ambiente habitual, seed ou migração como alternativa.

### Abrir e registrar o contexto

1. No navegador do usuário, usar um perfil de teste separado. Pressionar Ctrl+L e abrir a **origem aprovada acrescida de `/tracking/vendas`**. Não escolher localhost/porta por tentativa. Se pedir login, o próprio usuário usa a conta fictícia autorizada, sem compartilhar senha/token/cookies.
2. Conferir “Tracking / Visão Geral”, “Dados demonstrativos” e “Recorte exibido”. Se a URL levar à tela Dados, a rota está errada: `/dashboard` não é o alvo principal.
3. Registrar em `screenshots/contexto.md`: data/hora com fuso, commit, URL sem segredos/query sensível, navegador/versão, viewport CSS, DPR, zoom, tema, sidebar, filtros, fonte mock/api e se o estado foi realmente observado. Não salvar credenciais ou storageState.
4. No Chrome, abrir DevTools e ativar Device Toolbar com Ctrl+Shift+M; selecionar Responsive e digitar largura/altura CSS. Usar DPR 1 para comparação controlada e zoom da página 100% no ensaio base. Emulação não substitui teste em dispositivo físico. [Device Mode](https://developer.chrome.com/docs/devtools/device-mode).
5. Usar o mecanismo legítimo de aparência disponibilizado pelo ambiente de teste para alternar tema. Não foi localizado um alternador global Tracking na revisão de código; se esse mecanismo não existir, registrar tema escuro como dependente de fixture/configuração autorizada. Não editar o DOM para apresentar uma captura como comportamento do produto. Para localizar as imagens depois, abrir o Explorer e colar o diretório abaixo na barra de endereço.

### Capturas obrigatórias e nomes

Salvar PNGs em `C:/Users/Windows/Desktop/xingyu-crm/.temp/phase6/screenshots/`. Não substituir imagens antigas. Usar screenshot da viewport para overlays/foco; full-page para visão completa. Os nomes abaixo são **planejados, não arquivos já produzidos**:

- `01-desktop-1440x900-light-base.png` e `02-desktop-1440x900-dark-base.png`: página inteira e topo, filtros padrão.
- `03-hd-1366x768-sidebar-open.png` e `04-hd-1366x768-sidebar-closed.png`: densidade e largura de conteúdo.
- `05-tablet-768x1024-light.png` e `06-tablet-768x1024-dark.png`: filtros/metadados e rolagem da página.
- `07-mobile-375x812-light.png`, `08-mobile-375x812-dark.png` e `09-mobile-812x375-landscape.png`: quebra, calendário/sheet e áreas de toque.
- `10-filters-open-draft.png`: rascunho alterado, antes de aplicar; `11-filters-applied-new-second.png`: Novos + 2ª compra, resumo/dados correspondentes.
- `12-invalid-dates.png`: intervalo inválido e botão de aplicar impedido, se o calendário permitir construir esse estado. Se o controle já o prevenir, registrar a prevenção observada.
- `13-help-pointer-on-content.png` e `14-help-keyboard-focus.png`: tooltip legível, ponteiro no texto e foco visível no gatilho; registrar separadamente Escape/saída.
- `15-fetching-light.png` e `16-fetching-dark.png`: seção durante atualização, incluindo chip negativo, mensagem e botão desabilitado.
- `17-empty.png`, `18-initial-error.png`, `19-stale-data-error.png` e `20-retry-success.png`: somente quando o estado for produzido por uma fixture de teste autorizada e identificada.
- `21-zoom200.png`, `22-zoom400-reflow.png` e `23-reduced-motion.png`: registrar viewport/zoom e comportamento observado; screenshot isolada não demonstra ausência de animação.

Com DevTools focado, Ctrl+Shift+P → digitar `screenshot` → escolher **Capture screenshot** (viewport), **Capture full size screenshot** ou captura de área conforme objetivo. Se o arquivo baixar automaticamente, mover apenas esse PNG novo para o diretório acima e renomear conforme o caso. Registrar o método; uma captura full-page não substitui a viewport do popover. [Command Menu](https://developer.chrome.com/docs/devtools/command-menu).

### Estados que não podem ser fabricados por captura

O adapter atual gera dados localmente; colocar Network em Offline/Slow não força atraso/erro dessa consulta. Não apresentar erro de rede de outro endpoint como erro dos analytics. Para loading prolongado, erro inicial, A→B falha e retry, o operador precisa de **fixture local/staging autorizada**, que adie/rejeite a chamada local sem tocar em dados reais, identificada no contexto. Essa fixture não foi criada ou executada nesta fase. Sem ela, registrar estado não capturado e usar os testes unitários apenas como evidência técnica separada.

Para vazio, escolher um recorte sintético sem vendas, se disponível, e registrar exatamente qual; não apagar vendas. Não falsificar erro/skeleton com edição visual do DOM ou imagens compostas. Capturar o que aconteceu, não o resultado esperado.

### Checklist visual e funcional — ainda não assinalado

- [ ] Desktop/tablet/mobile: sem corte de valor, recorte, datas, filtros ou ações; sem scroll horizontal inesperado; sidebar não comprime texto além do aceitável.
- [ ] Tipografia carregada e hierarquia legível; contraste efetivo medido em repouso e atualização, claro/escuro; não depender só da cor para significado.
- [ ] Rascunho não altera KPIs antes de aplicar; aplicar/limpar/reabrir mantém semântica correta; datas inválidas impedem aplicação.
- [ ] Nome acessível anuncia nenhum/um/vários filtros ativos; Tab/setas/Enter/Escape funcionam, foco visível e não encoberto.
- [ ] Ponteiro consegue ir do gatilho à ajuda; ajuda permanece enquanto hover/foco pertinente; Escape, clique externo, scroll/resize e outra ajuda fecham sem tooltip fantasma ou trap.
- [ ] Recorte A permanece identificado como A enquanto B carrega/falha; retry troca dados/contexto juntos; badge demonstrativo e datas continuam corretos.
- [ ] Refresh repetido não duplica operação; feedback não bloqueia leitura; loading/empty/error/retry correspondem ao estado real da fixture.
- [ ] Zoom 200/400%, landscape e reduced motion não escondem informação/foco; conferir também uma ajuda compartilhada em outra tela Tracking.
- [ ] Leitor de tela permite compreender timeline/valores e não anuncia elementos decorativos ou badge duplicado.
- [ ] Console e Network revisados no navegador real: registrar erro, URL sanitizada, status, recurso e reprodução, sem cookies/Authorization/corpos pessoais. Não exportar HAR bruto de sessão real. Não concluir “sem erros” sem observação.

Depois da coleta, conferir nomes/contagem, anexar capturas e contexto à revisão. Aprovação depende de análise das imagens **e** dos passos interativos, não apenas de existência de PNGs.

## 5. Testes técnicos desta execução

Nenhum teste foi alterado, desativado ou teve timeout aumentado para passar. Nenhum banco foi iniciado, migrado ou semeado. Scripts existentes de build/check carregam env automaticamente e geram Prisma Client; valores sensíveis não foram lidos diretamente ou impressos pelo agente, e geração de cliente não implica conexão/migração.

- `node node_modules/turbo/bin/turbo run lint --force -- --incremental false`: **exit 0, 10 tarefas, zero cache**, `lint.log`.
- `node node_modules/turbo/bin/turbo run typecheck --force -- --incremental false`: **exit 0, 10 tarefas, zero cache**, `typecheck.log`.
- `pnpm --filter @xingyu/web exec vitest run`: **exit 0, 484 testes/67 arquivos**, `web-tests.log`. Inclui analytics, invariantes, refresh, helpers de tooltip, contexto e cálculo de contraste. Não é E2E/DOM/inspeção visual.
- `pnpm --filter @xingyu/api exec jest --runInBand --runTestsByPath src/auth/auth.service.spec.ts src/security/rbac.spec.ts src/common/upload/upload.util.spec.ts`: **exit 0, 31 testes/3 suítes**, `api-security-tests.log`. Mocks/guards e arquivos temporários sintéticos; não prova integração PostgreSQL ou cobertura completa de endpoints.
- `pnpm test:load:helpers`: **exit 0, sete testes**, `load-guards.log`. Valida guards de alvo, não é teste de carga contra aplicação.
- `pnpm build --force`: **exit 0, sete tarefas, zero cache**, 38 páginas geradas, `build.log`. Permanecem warnings ESLint, depreciação package.json#prisma e output vazio de packages/ui; não foram suprimidos.

Lint atual usa tsc; sucesso dele não significa ausência de warnings ESLint ou problemas de segurança. Suíte API completa, testes PostgreSQL de concorrência, cobertura global, performance real e E2E não foram executados nesta fase. Os resultados históricos das fases anteriores não foram apresentados como execução atual.

## 6. Scanners e CI — resultados reais

**pnpm audit atual:** exit 1; **0 críticas, 0 altas, 29 moderadas e cinco baixas**, 1.224 dependências. São as mesmas **27 entradas advisory em 15 nomes de pacote** da fase 4: 22 entradas moderadas/cinco baixas; metadata agrega caminhos/ocorrências. Não são 34 pacotes ou explorações comprovadas. `audit-summary.json` registra cada ID, URL, faixa/patch e caminho; `pnpm-audit.json` contém os caminhos completos. Nenhuma atualização aplicada.

**Trivy 0.76.1:** `fs --skip-db-update --timeout 3m --scanners vuln --include-dev-deps --severity CRITICAL,HIGH,MEDIUM,LOW --exit-code 1 --format json`, snapshot somente manifests/lock/workspace: **exit 1 por findings**, **0 críticas/altas, 30 MEDIUM/4 LOW**, 24 IDs distintos (`trivy.json`, `trivy-summary.json`, `trivy.log`). Cache de DB existente, sem atualização forçada. Não é varredura de código, configuração completa ou produção.

O Trivy demorou para começar a emitir logs, mas concluiu; nenhuma interrupção ocorreu. Uma leitura prematura do JSON de audit falhou enquanto ele gravava; só o arquivo final parseado após término foi usado. Essas ocorrências não foram convertidas em scanner aprovado nem apagadas do relato.

**Gitleaks 8.30.1:** histórico, redigido, **exit 1**, 131 commits, um alerta generic-api-key no hash público de `_bmad/_config/files-manifest.csv:48`. SHA-256 confirmado no asset público, não credencial. Sem supressão; histórico não está “verde” (`gitleaks-history.json/log`).

**Semgrep:** configuração revisada, execução real **não ocorreu**. Docker probe exit 1, named pipe dockerDesktopLinuxEngine ausente; Semgrep/actionlint não encontrados. Nenhum daemon, WSL ou instalação substituta foi usado. CI remoto/Actions e branch protection não foram executados/verificados nesta auditoria.

### Catálogo de risco e ação

P1/P2/P3 abaixo são prioridades de trabalho, não substituem a severidade do advisory ou uma aceitação formal. Ausência de uso direto encontrado no source não exclui consumidores transitivos; não houve teste de exploração.

- **P1 — qs 6.14.2**, quatro moderados: GHSA-q8mj-m7cp-5q26, GHSA-x5fp-wj9c-mxmx, GHSA-4mjr-xmp4-gh2g, GHSA-6pq8-jhm2-2vcw. Runtime Express/Nest e Superagent de testes; condições comma/objetos hostis. Patch conjunto indicado **6.16.1**; regressões query/URLencoded/stringify/erros antes de atualizar.
- **P1 adicional — Lodash 4.18.0**, CVE-2026-2950/GHSA-f23m-r3pf-42rh: Trivy detecta e pnpm omite. Runtime via Nest config/Swagger e CLI; unset/omit com caminhos-array. Patch oficial **4.18.1**, reavaliar consumidores mesmo sem chamadas próprias localizadas. Não escolher só o scanner favorável. [Advisory oficial Lodash](https://github.com/lodash/lodash/security/advisories/GHSA-f23m-r3pf-42rh).
- **P2 — @nestjs/core 10.4.22**, um moderado, GHSA-36xv-jgw5-4q75: injeção em type/id SSE, sem uso SSE localizado. Patch **11.1.18** requer migração coordenada, não override isolado core11/Nest10. [Advisory](https://github.com/advisories/GHSA-36xv-jgw5-4q75).
- **P2 — file-type 20.4.1**, dois moderados, GHSA-5v7r-6r5c-r473 e GHSA-j47w-4g3g-c36v: ASF loop/ZIP inflate, transitivo Nest common. Não localizado uso de FileTypeValidator/ParseFilePipe; util atual valida bytes/tipo/tamanho sem descomprimir ZIP. Patch conjunto **21.3.2**, revisar major/ESM/engines sem enfraquecer upload.
- **P2 — PostCSS 8.5.18**, um moderado, GHSA-fxqj-rqcc-2cmp → **8.5.23**; **postcss-selector-parser 6.1.4**, um moderado, GHSA-rj75-hqrm-r3gf → **6.1.5**. Build CSS/Next/Tailwind; considerar entradas não confiáveis de PR e testar CSS/maps.
- **P2 — Vitest 4.1.0**, um moderado, GHSA-82fw-gwwq-j7x9; **mocker 4.1.0**, dois moderados, mesmo GHSA e GHSA-qxg6-89mg-rqv8. Patch conjunto **4.1.12**, sem expor devserver/mocker WS; configuração examinada usa run.
- **P2 — Vite 6.4.4**, um moderado, GHSA-8g5g-mxqh-grgj → **6.4.5**, ferramenta de teste; não substituir Next.
- **P2 — AJV 8.12.0**, um moderado, GHSA-2g4f-4pwh-qvx6 → **8.18.0**, ramo CLI Angular-devkit/Nest com precondição $data. Outra versão corrigida já convive no lock; tratar caminho afetado.
- **P2 — fast-uri 3.1.7**, três moderados (GHSA-hrr3-gc8f-f4qj, GHSA-w74x-v6f9-j3xg, GHSA-wjr9-j795-jxcr) e dois baixos (GHSA-xhq7-xmqj-769h, GHSA-333x-w4r6-6crp). CLI/webpack/schema-utils/AJV; patch conjunto **3.1.9**, testar parsing/consumidores.
- **P2 — brace-expansion**, três entradas moderadas do GHSA-q2hr-2g5m-vwhr: linhas 1.1.20/2.1.6/5.0.11 → **1.1.21/2.1.7/5.0.12**, mantendo cada major.
- **P2 — minimatch**, um moderado, GHSA-g3hv-75wg-m249, linhas 3.1.5/9.0.9/10.2.6, scanner indica **11.0.1**; **glob**, um moderado, GHSA-3g3m-2fjr-6pw4, 10.5.0/13.0.6, indica **14.0.2**. Avaliar consumidores/engines e majors, sem override global cego.
- **P2 — webpack 5.97.1**, dois baixos, GHSA-8fgc-7cc6-rx7x e GHSA-38r7-794h-5758: SSRF de buildHttp/HttpUriPlugin, recursos não localizados no próprio source/config. Patch conjunto **5.104.1**, testar build.
- **P3 — deepmerge 4.3.1**, um baixo, GHSA-gcqx-w48m-w2h4, via fork-ts-checker-webpack-plugin: **sem patch publicado**; `<0.0.0` no scanner não é versão para instalar. Acompanhar upstream com dono/prazo, limitar entradas e não substituir por deepmerge-ts automaticamente. [Advisory](https://github.com/advisories/GHSA-gcqx-w48m-w2h4).

Esse catálogo cobre as 27 entradas dos 15 pacotes de pnpm; Lodash é a divergência adicional do Trivy. Patches são indicações dos advisories atuais, não garantia de compatibilidade. Nenhuma vulnerabilidade foi marcada resolvida nesta fase.

### Workflows confirmados e lacunas

Parse YAML via js-yaml 4.3.2 existente passou para ci.yml, security.yml, performance.yml e dependabot.yml. Não equivale a actionlint nem execução GitHub. CI/security têm PR para qualquer branch, dispatch, permissões contents:read, concorrência/timeouts, banco CI efêmero `_test`, seed sintético mascarado, frozen-lockfile e checks. Relatórios de segurança retidos sete dias.

1. **P1 infraestrutura:** CI/performance ainda usam Node 20, EOL **2026-04-30**. Planejar LTS suportada e validar Linux; Node 24 local não aprova CI 20. [Calendário oficial Node](https://raw.githubusercontent.com/nodejs/Release/main/schedule.json).
2. Gitleaks e Trivy usam continue-on-error, inclusive erro técnico. Baseline consultiva não é gate; separar falha de scanner de finding e revisar antes de tornar obrigatório.
3. Trivy do CI inclui dev/sem patch, mas só CRITICAL,HIGH; moderadas/baixas não entram no relatório e não há pnpm audit no workflow. Manter inventário amplo junto do gate alto.
4. Semgrep CE 1.183.0 oficial fixado por digest, métricas off/strict, ERROR e erros JSON checados. Falha técnica bloqueia, findings consultivos. p/default é remoto/mutável; WARNING/INFO não são cobertos nesse comando. SECURITY.md ainda descreve todas as falhas como consultivas, divergindo do Semgrep atual.
5. Actions/Gitleaks/Postgres usam tags; considerar SHA/digest revisados. Não há evidência de comprometimento.
6. Performance aceita baseline, mas job só executa smoke; não comprova carga baseline. Faltam permissions/timeouts explícitos nesse workflow. Os sete guards aprovados não são ensaio de performance.

## 7. Agentes utilizados e plano priorizado

- **BMAD:** mini-brief e priorização deste relatório; resolvers config/customização executados, exit 0 (`bmad-config.json`, `bmad-workflow.json`). Sem workflow SPEC/memlog completo nem plano duplicado.
- **Superpowers:** verification-before-completion e revisão/diagnóstico orientados por evidência; testes atuais separados de histórico, timeout MCP preservado. Não foram alterados testes para aprovação artificial.
- **Apple Design / UI UX Pro Max:** revisão somente leitura por agente especializado, playbooks e duas buscas locais (três resultados cada, exit 0), `design-review.md`, `design-tooltip-search.log`, `design-reflow-search.log`. Modelo de opacidade executado; nenhum redesenho.
- **Security Guardian:** revisão independente de código/config, audit, Trivy, Gitleaks e fontes oficiais atuais; `security-review.md`, JSONs/logs. Não é certificação ou DAST.
- **Playwright:** registro e ensaio de conexão separados de UI; nenhuma aplicação autenticada inspecionada. Não se declara sistema autônomo validado ponta a ponta.

Plano de correção/coleta, sem implementação nesta fase:

1. **P1 evidência:** obter URL permitida/fixture sintética, coletar matriz manual e analisar imagens/interações. Aceite: commit/contexto rastreável, console/rede observados, checks realmente executados assinalados.
2. **P1 apresentação:** reproduzir Q-01 em fetch lento e testar composição antes de correção mínima; evitar opacidade em texto informativo, preservar tema/cálculos. Homologar também ponte do tooltip. Não alterar só o limiar do teste.
3. **P1 segurança/infra:** patches compatíveis qs/Lodash em mudanças isoladas com regressão/audit/Trivy, e Node suportado com CI Linux autorizado. Não fazer upgrades cegos.
4. **P2:** equivalência acessível da timeline e legibilidade/reflow; depois ferramentas/build e migrações major coordenadas. Tornar scanners gates efetivos após triagem e reconciliar documentação.
5. **P2 produto/P3 acompanhamento:** decidir insights/links/URL persistente e integração real separadamente; acompanhar deepmerge sem patch com responsável/prazo, sem allowlist global.

## 8. Limitações, conclusão e reversão

Comprovados: branch/escopo preservados, correções da fase 5 presentes, testes/checks/build atuais, catálogo de dependências e configuração de workflows. Não comprovados: inspeção visual atual, screenshots, foco/touch/leitor/contraste computado, console/rede da página, API/DB completos, performance real, Semgrep ou CI remoto.

Revisão da entrega: **passaram** Prettier do relatório, diff/whitespace e varredura de segredos apenas do novo relatório, separados do Gitleaks histórico; logs em `report-format.log`, `report-gitleaks.json/log`. O alerta histórico do manifesto não deve ser ocultado por um scan limpo só da documentação.

Reversão desta fase: reverter somente o commit documental ou remover o relatório novo após preservar sua evidência, sem reset/clean e sem tocar nos artefatos anteriores. Logs/capturas locais são independentes; arquivar evidências antes de qualquer limpeza verificada. Não há runtime, migração, dado real ou integração a reverter. Para desfazer a fase 5 seria outra decisão e seu conjunto coerente deve ser revisado conforme o relatório específico.

A inspeção visual permanece aberta até receber e revisar evidências reais. Nenhuma etapa bloqueada foi assinalada como aprovada. Sem push, merge, deploy ou alteração de dados reais.
