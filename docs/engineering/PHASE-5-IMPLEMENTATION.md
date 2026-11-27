# Fase 5 — primeira implementação integrada

## Planejamento prévio — BMAD / Superpowers

Data: 2026-11-04. Branch `codex/brainx-quality-security`, base `1b580bd`. Alvo `/tracking/vendas`. Os artefatos locais preexistentes foram preservados. O planejamento abaixo foi registrado antes das alterações.

Problema: a Fase 4 identificou baixo contraste, ajudas que fecham ao mover o ponteiro e recorte pouco explícito. Regra preservada: a apresentação descreve o dataset efetivamente exibido, sem alterar filtros de analytics, receita, fonte mock ou contratos.

Selecionadas até três melhorias:

1. **Contraste do traçado e chip negativo (UX-01/03).** Alto benefício de leitura/acessibilidade; reutiliza tokens strong/ink e mantém cores de marca/preenchimento, geometria e tipografia. Poucas declarações locais, fácil manutenção e baixo risco de regressão de negócio.
2. **Permanência da ajuda entre gatilho e tooltip (UX-02).** Permite leitura ampliada sem perder explicação. Reutiliza ConceptHelp, mantém Escape/foco e coordenação existente; não modifica todos os portais de gráficos. Risco restrito à interação compartilhada, exigindo testes de timer/cancelamento e verificação manual posterior.
3. **Contexto dos dados e nome acessível do filtro (UX-04/05).** Expõe recorte exibido inclusive quando nova consulta falha; nome do botão inclui contagem. Reutiliza metadados/painel atuais, com snapshot local de dados+filtros, sem DTO novo de API. Reduz confusão sem alterar cálculos; testar sucesso/falha e dados anteriores.

Não escopo: layout novo, fontes/paleta globais, integrações, autenticação, banco, API, cálculos, links de negócio, dependências e ferramentas novas. Não executar migrações, push, merge ou deploy.

Fluxo: filtros rascunho → aplicação existente → consulta local existente → snapshot de apresentação → metadados/KPIs; tokens existentes → usos locais → gráfico/chip; eventos foco/ponteiro → permanência da ajuda → fechamento coordenado. Não há persistência ou efeito externo adicional.

Aceite: testes reproduzem falhas antes das correções; dados e contexto permanecem juntos em erro/atualização; timers cancelados em dismiss/unmount; contraste estático aplicável em light/dark; lint/typecheck sem cache, testes relevantes e build executados. Responsividade, contraste computado e interação real só podem ser aprovados se observados em ambiente autorizado.

Plano técnico: escrever e executar regressões; implementar mínimos em arquivos Tracking; revisar diff com papéis engenharia/design/segurança; executar verificações; registrar evidências e reversão. BMAD aplica critérios do kernel ao mini-brief proporcional; não se alega execução integral do workflow SPEC/memlog.

## Implementação e arquivos

- `apps/web/src/components/crm/tracking/tracking-overview.module.css`: somente dois usos de tokens alterados: traçado líquido usa accent-strong e texto negativo usa red-ink. As definições globais permanecem intactas.
- `sales-overview.tsx`, no mesmo diretório: três stops do gradiente continuam usando accent original; apenas traçado/legenda adotam strong. Valores, curvas, dimensões, animações e preenchimentos foram preservados.
- `tracking-help.tsx`: ConceptHelp permite ponteiro no próprio texto, considera hover/foco e mantém uma ponte de 150 ms entre gatilho e portal. Escape, clique externo, outra ajuda, scroll e resize continuam fechando imediatamente; clicar no texto não é clique externo. Posição/camada ficam centralizadas; os outros portais Recharts continuam sem interceptar ponteiro.
- `tracking-tooltip-presence.ts`: pequeno controlador testável para permanência/cancelamento, sem dependência DOM nova. Cancela timer ao reentrar, abrir, dispensar e desmontar; preserva foco sem movê-lo ou criar trap. O cleanup permite replay de effects do React.
- `sales-tracking-page.tsx`: consulta retorna envelope **local de apresentação** contendo o DTO original e snapshot dos filtros. Cache usa prefixo tracking/sales/view para não misturar o novo formato com a chave antiga. Placeholder e lastValid conservam dados e contexto juntos. Metadados mostram “Recorte exibido” com quebra de texto, mantendo datas do dataset, aviso demonstrativo e mensagens de atualização/erro.
- `sales-tracking-filters.tsx`: nome acessível do botão informa nenhum/um/vários filtros ativos; badge visual fica aria-hidden para não duplicar a informação. A contagem continua usando as mesmas regras. Rascunho/aplicação/validação existentes foram preservados.
- `tracking-view.ts`: envelope genérico local, contagem e resumo textual com os mesmos rótulos do painel. O adapter, o DTO público, os tipos comerciais e as funções de analytics não foram modificados.
- Novos testes no mesmo diretório: `tracking-contrast.test.ts`, `tracking-tooltip-presence.test.ts`, `tracking-view.test.tsx` e `tracking-view-page.test.tsx`.
- `docs/engineering/PHASE-5-IMPLEMENTATION.md`: este relatório.

São onze arquivos de código/testes e este relatório. Nenhum manifest, lockfile, workflow, API, schema, migração ou arquivo de autenticação foi modificado. Sem dependência ou ferramenta nova. A Visão Geral continua demonstrativa, com badge explícito; a fase não conecta fonte real.

## Agentes e skills efetivamente usados

- **BMAD / brainx-planner:** leitura dos achados e aplicação do mini-brief/kernel para escolher três grupos de mudanças. Resolvers de workflow/config executados com o uv/Python existentes; logs `bmad-workflow.json` e `bmad-config.json`. Stack, escopo e referências de equipe confirmados.
- **Apple Design:** modo implement, princípios de hierarquia, estabilidade dos controles e adaptação web; preservados Plus Jakarta Sans, densidade HD, cores Tracking e componentes existentes. Sem Liquid Glass ou fonte Apple automática.
- **UI UX Pro Max:** leitura de acessibilidade/interação e buscas locais sobre tooltip/foco e contraste, com três resultados cada e exit 0. `uiux-search.log` e `contrast-ux-search.log`. Não foi gerado design system paralelo.
- **Superpowers / brainx-engineering:** test-driven-development e verification-before-completion aplicados; testes antes da correção, diagnóstico de falhas e checks atuais. O plano já existente foi detalhado proporcionalmente, sem novo ciclo de aprovação ou fluxo automático de publicação.
- **Codex / implementação:** integração e revisão final no agente principal. O subagente de contraste entregou código e evidência red/green; o subagente de contexto produziu testes/código, depois foi interrompido por limite de uso, e o principal concluiu e verificou sua entrega. A tentativa de revisão independente também atingiu limite de uso e **não conta como revisão concluída**. A revisão técnica, de segurança e compatibilidade descrita abaixo foi feita pelo principal, aplicando os critérios dos perfis engineering/Security Guardian.
- **Playwright:** registro do MCP verificado, exit 0 (`mcp-registration.json`). Não houve inspeção da página, screenshot ou navegação autenticada nesta fase. Não se declara uma pipeline autônoma de todos os perfis.

## Testes e evidências red/green

Logs locais em `.temp/phase5`, ignorados pelo Git. Não contêm dados de clientes ou credenciais reais; os testes usam filtros/datasets sintéticos.

- Contraste: `contrast-red.log`, três falhas/um sucesso antes; `contrast-green-final.log`, quatro sucessos depois. Testes leem CSS/tokens reais com PostCSS já instalado, resolvem light/dark e compõem fundo sRGB. Não são screenshots ou computed styles.
- Tooltip: primeiro ensaio falhou na importação do helper ainda inexistente (`tooltip-contract-before.log`), sem executar casos. Depois, a extração mínima do comportamento anterior de fechamento imediato produziu **cinco falhas/um sucesso** (`tooltip-before.log`); o controlador corrigido passou seis casos (`tooltip-green.log`). Cobertura: ponte entre gatilho/texto, foco versus hover, blur, cancelamento de callback tardio, dispose/replay e abertura por clique. Não é teste DOM do ponteiro real.
- Nome acessível do filtro: **duas falhas de asserção no HTML SSR anterior** (`filter-before.log`); depois, testes de nome/contagem, resumo dos tipos/estágios, captura anterior ao await e transição QueryObserver A→B falha→retry passaram em `filter-after.log`. A tentativa inicial do helper ainda ausente ficou em `filter-helper-before.log`.
- SSR integrado da página: cache React Query real e orquestração da página renderizam o contexto do dataset, não os defaults dos controles, preservando badge demonstrativo. Gráficos são isolados nesse teste. O primeiro ensaio falhou por JSX clássico do Vitest sem React global para módulos com imports nomeados; o setup do teste fornece React e limpa o global depois. Nenhuma configuração/compilação de produção foi alterada. Falha em `new-tests.log`, repetição aprovada em `ssr-final.log`.
- Repetição final das quatro suítes novas: **26 testes passaram**, exit 0 (`new-tests-final.log`).
- Suíte web completa: `pnpm --filter @xingyu/web exec vitest run`, **484 testes/67 arquivos passaram**, exit 0 (`web-tests.log`). Inclui as combinações e invariantes financeiras anteriores; nenhum caso foi removido, desativado ou teve timeout ampliado. Ajustes posteriores de tipagem do teste e centralização da classe de posição foram cobertos pela repetição direcionada final.

Contraste calculado antes → depois (não validação visual): traçado claro 1,888 → **5,750**; traçado escuro 9,494 → **11,627**; chip negativo claro 3,469 → **5,242**; chip negativo escuro 3,939 → **6,742**. Limiares testados: 3:1 para o traçado sobre superfície e 4,5:1 para texto pequeno sobre fundo composto. Fontes: tokens existentes; `contrast-ratios.json`. Cores efetivas, adjacências e estados precisam da verificação manual abaixo.

### Checks de qualidade sem cache

- `node node_modules/turbo/bin/turbo run lint --force -- --incremental false`: **exit 0, 10 tarefas bem-sucedidas, zero em cache**, `lint-fixed.log`.
- `node node_modules/turbo/bin/turbo run typecheck --force -- --incremental false`: **exit 0, 10 tarefas bem-sucedidas, zero em cache**, `typecheck-uncached.log`.
- Os scripts executados são os mesmos tsc dos comandos lint/typecheck da raiz; `--force` ignora o cache Turbo e `--incremental false` desativa o incremental do TypeScript. Lint atual não equivale a um conjunto completo de regras ESLint.
- Duas tentativas via encaminhamento de argumentos do pnpm perderam o separador e foram rejeitadas pelo CLI, sem executar checks (`lint.log`, `lint-final.log`). A invocação direta do launcher Turbo preservou o separador. A primeira execução real revelou tipos potencialmente undefined no parser do novo teste de contraste (`lint-uncached.log`); foram adicionados guards/tuplas explícitas, sem relaxar TypeScript. A repetição acima passou.
- Prettier check passou para os seis arquivos novos de código/teste e este relatório (`format-check.log`). Arquivos existentes receberam alterações pontuais, sem reformatação geral.
- `pnpm build --force`: **exit 0, sete tarefas bem-sucedidas, zero em cache**, Next 15.5.28 compilado e 38 páginas geradas; `build.log`. Permanecem avisos de Prisma package.json#prisma, ESLint em arquivos fora do escopo e output de packages/ui no Turbo; regras não foram desligadas. Nenhum dos onze arquivos alterados de código/testes foi listado com aviso no build.
- `git diff --cached --check` passou. Gitleaks 8.30.1 no diff staged desta fase passou sem findings (`gitleaks.json/log`); isso não elimina o alerta histórico do hash do manifesto BMAD nem certifica ausência de falhas.
- Scripts de dependência existentes executam Prisma generate durante os checks/build e informam carregamento automático de arquivos env. Não foram lidos/impressos seus valores pelo agente; gerar cliente não é migração nem teste contra banco. Não houve seed, inicialização de API/Postgres ou modificação de dados nesta fase.

## Revisão técnica, responsiva, acessível e de segurança

A revisão final inspecionou o diff, os caminhos de consulta/eventos e os testes:

- **Qualidade/manutenção:** funções focadas, sem abstração de framework ou biblioteca nova. Contagem extraída sem alterar condição; controlador de presença separado permite testar ciclo de vida sem instalar DOM simulado. O parser de teste falha explicitamente se cor/token estiver ausente ou usar sintaxe não suportada.
- **Responsividade estática:** resumo usa min-w-0/break-words dentro dos metadados flex-wrap/max-width existentes. Nenhuma largura fixa nova, grid, container query ou gutter foi alterado. Tooltip conserva max-width da viewport e posicionamento existente. Reflow/zoom reais permanecem pendentes.
- **Acessibilidade:** tooltip continua role=tooltip, aria-describedby e botão nomeado; foco não é redirecionado. Nome do filtro inclui contagem com singular/plural e badge oculto da árvore acessível. Live region, aria-busy, retry, skeleton/vazio e reduced motion foram preservados. Nenhuma declaração de conformidade WCAG global.
- **Segurança:** React continua escapando os textos; não há HTML bruto, eval, envio a fornecedor, storage novo ou dado sensível em logs. Não houve mudança de auth/tenant, download, refresh token ou webhook. A mudança no envelope é somente de apresentação local; a origem do dataset permanece explícita.
- **Compatibilidade/regressão:** structuredClone já era requisito do painel existente. Não houve mudança de contrato de API ou objeto retornado pelo adapter. Testes verificam identidade dos dados e snapshot de filtros; nova chave local evita cache com formato antigo. TypeScript estrito permanece habilitado.
- **Superfície compartilhada:** ConceptHelp é usado também por outros componentes Tracking, inclusive análises adjacentes. A permanência da ajuda muda nesses usos; portais de gráficos foram preservados. O roteiro manual inclui uma comparação em outra tela que reutilize a ajuda.

Nenhum achado bloqueante de negócio/segurança foi identificado nessa revisão estática. Isso não substitui revisão humana, navegador ou scanners remotos. Vulnerabilidades e pendências de CI relatadas na fase 4 não foram corrigidas nem reclassificadas aqui.

## Limite visual e roteiro manual

Não foi apresentado um ambiente de aplicação autorizado disponível. O MCP está registrado, mas a rejeição anterior de `Next start` em `127.0.0.1:3107` (“blocked by policy”) permanece: não se repetiu a inicialização nem se trocou porta/servidor para contorná-la. A configuração Playwright habitual que lê .env/reutiliza storageState não foi executada. **Validação visual bloqueada, não aprovada.**

Quando houver ambiente autorizado com dados fictícios e sessão de teste isolada:

1. Abrir `/tracking/vendas` em 375, 768 e 1440 px, HD com sidebar expandida/recolhida e zoom 200/400%. Confirmar que o resumo do recorte quebra sem esconder filtro, datas ou valores.
2. Conferir light/dark: traçado líquido e legenda continuam verdes, preenchimento original preservado, chip negativo legível. Medir cores computadas/contraste nas adjacências e durante atualização, quando existe opacidade de seção.
3. Passar o ponteiro do botão de informação ao texto, inclusive lentamente/com ampliação; ler sem fechamento. Sair de ambas as áreas sem foco mantido no gatilho, pressionar Escape, rolar, redimensionar e abrir outra ajuda: confirmar fechamento e ausência de tooltip fantasma. Enquanto o gatilho mantiver foco, a explicação deve permanecer até dismiss ou perda desse foco/hover.
4. Usar Tab/foco, hover simultâneo e toque: não perder foco nem criar trap; conferir aria-describedby e leitura da explicação. Comparar uma ajuda reutilizada em outra tela Tracking.
5. Abrir filtros: leitor de tela anuncia nenhum/um/vários ativos. Editar rascunho sem aplicar não muda dados; aplicar “Novos / 2ª compra” atualiza resumo e métricas juntos. Conferir datas inválidas, limpar e reabrir.
6. Simular falha/atraso somente em fixture autorizada: dados A e contexto A permanecem enquanto B carrega/falha, mensagem de erro aparece; retry bem-sucedido muda ambos para B. Badge demonstrativo não desaparece. Conferir loading/empty/error, refresh repetido e reduced motion.

Registrar screenshots antes/depois e resultados reais desse roteiro. Não executar passos invasivos em produção ou com clientes reais. Pendentes: navegador autenticado, foco/hover/touch reais, leitor de tela, contraste computado, zoom/reflow e comparação visual. Não há screenshot atual desta fase.

## Reversão

Reverter somente o commit desta fase com `git revert <commit-da-fase-5>` após revisar alterações posteriores; não usar reset/clean. Para reversão parcial, restaurar o conjunto coerente: envelope/metadados/contagem + seus testes; controlador/eventos da ajuda + seus testes; ou CSS/gradiente + regressões de contraste. Remover apenas helpers novos deixaria imports quebrados.

Não há migração, banco, API ou integração a reverter. Preservar os artefatos locais anteriores e logs necessários à revisão. Nenhum push, merge ou deploy foi realizado.
