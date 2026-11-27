# Tracking → Recuperação

## Auditoria e escopo

Implementação local na branch `feature/beta-orders-operation-center`. O checkout continha alterações não commitadas de autenticação, regras de acesso, Visão Geral, sidebar e topbar, além de imagens e componentes não rastreados. Esse trabalho foi preservado; não houve checkout, reset, commit, push ou merge.

Os dois adapters Shopify existentes (`integrations/shopify.adapter.ts` e `integrations/adapters/shopify.adapter.ts`) são demonstrativos. Não existe ingestão normalizada de checkouts abandonados. Order/OrderItem usam Prisma Decimal, têm identificadores externos e relações de atribuição, mas isso não constitui evidência suficiente para reconhecer checkouts ou métodos de recuperação.

O módulo usa `DemoShopifyRecoveryDataSource`, isolado atrás de `RecoveryDataSource`, sem criar registros em Prisma. A API retorna `source="demo"` e a página informa que os resultados não são reais. Nenhuma integração de CRM é chamada. A taxonomia de aquisição é a mesma de Visão Geral, inclusive seus logos oficiais.

## Arquitetura e arquivos

- Contratos normalizados e DTOs públicos: `packages/types/src/recovery.ts`.
- Domínio, fonte, matching, atribuição, analytics, modelo, DTO de query e API: `apps/api/src/tracking/recovery/`.
- Página, filtros, resumo, charts, Intelligence, segmentos, produtos, oportunidades, qualidade e CSS: `apps/web/src/components/crm/tracking/recovery/`.
- Rota existente na arquitetura App Router: `apps/web/src/app/(app)/tracking/recuperacao/page.tsx`.
- Navegação: entrada Recuperação em ambos os grupos Tracking de `apps/web/src/lib/nav.ts`.
- API registrada no `AppModule`.
- Dependência workspace de tipos adicionada aos manifests web/API e lockfile, sem biblioteca externa de ML.

Visão Geral e seus cálculos/componentes não foram alterados. Estilos, ConceptHelp, ChartTooltip, TrackingTooltipPortal, TrackingSelect, TrackingPeriodSelector, TrackingMotion, AnimatedMetric, tokens, cores, fontes e formatadores são reutilizados.

O TrackingSelect compartilhado recebeu uma correção de scroll: navegar pelas opções rola somente o menu portado, sem mover a página e tirar o seletor da viewport. O problema apareceu no E2E da ordenação de oportunidades. Não houve redesenho do componente.

## Acesso e segurança

ADMIN acessa Recuperação. MANAGER/CONSULTANT veem a entrada bloqueada através de LockedSidebarItem. A política canAccessCrmRoute impede acesso direto e RequireAuth impede renderização de conteúdo protegido; AppLayout aplica a mesma regra no servidor. A política canAccessCrmApi nega os endpoints de Recovery para contas secundárias. O controller adiciona `@Roles(ADMIN)` como segunda barreira.

As exceções preexistentes de conta própria (perfil e saída) foram preservadas. Não foi ampliado o acesso a módulos administrativos.

OrganizationId vem exclusivamente da sessão autenticada. Parâmetro de organização enviado pelo cliente não pertence ao DTO e é rejeitado pelo whitelist da API. Matching filtra ambos os lados por organização, provedor e moeda. O endpoint de auditoria procura casos apenas na organização autenticada.

Endpoints (sob o prefixo /api):

- GET /tracking/recovery/overview
- GET /tracking/recovery/opportunities
- GET /tracking/recovery/cases/:id (evidência normalizada auditável)

Queries aceitas: startDate, endDate, status, method, customerType, valueBand, channel, currency, page, pageSize, sort, search. Busca é exclusiva da lista de oportunidades. pageSize máximo 50; intervalo máximo 366 dias. A UI usa página de 10.

## Fonte e normalização

RecoveryCase representa um abandono elegível. Valores são inteiros seguros em centavos; a fonte real deve converter Decimal ou strings decimais sem usar Float como verdade financeira. Somatórios rejeitam frações, negativos e overflow. Alocação por produto usa BigInt e distribuição do resto em centavos.

Snapshots de cliente e aquisição são registrados no abandono. A identidade interna estável é opcional; ausência de cliente, origem ou método permanece explícita. Nenhum nome de consultora é inferido. Nomes com “demonstrativa” existem somente na fixture.

Duplicatas externas idênticas são deduplicadas; duplicatas conflitantes, valores ausentes/inválidos, datas inválidas e cestas inválidas são excluídos e diagnosticados. Pedidos duplicados conflitantes não produzem matches. Cases com janela encerrada, mas observação truncada antes do prazo, são excluídos: não são oportunidades atuais nem negativos de ML.

Moedas não são somadas entre si. A demo e a UI inicial usam BRL. Antes de habilitar outras moedas, adaptar labels das faixas e formatadores por currency; não há câmbio implícito.

## Coorte, janela e timezone

O intervalo seleciona a **data de abandono**, inclusive início/fim. Eventos têm timestamps ISO com timezone; datas de negócio são extraídas em America/Sao_Paulo, informado pela fonte. O frontend resolve presets pela mesma data de negócio; não usa a data local do navegador para reinterpretar eventos.

A regra única `RECOVERY_RULES.attributionDays` começa em 15 dias. Prazo = timestamp do abandono + janela em horas corridas. PaidAt deve estar entre abandono e prazo inclusive, e não pode superar o cutoff observável ou “agora”.

- OPEN: sem match, janela ainda observável em andamento.
- RECOVERED: pedido pago elegível associado dentro da janela; é maduro mesmo recuperando cedo.
- EXPIRED: janela completamente observada sem match válido.

Maduros = RECOVERED + EXPIRED. OPEN nunca é negativo de treinamento.

Período anterior tem igual número de datas inclusivas, imediatamente antes do atual. Filtros e regras são idênticos. Totais são observados no mesmo asOf. Comparações de volume/receita são descritivas e podem ser parciais se a janela atual não acabou; a comparação da taxa e insights de tendência são suprimidos quando qualquer coorte possui casos em aberto. Isso evita tratar maturidades diferentes como tendência comprovada.

## Matching checkout → pedido

Hierarquia centralizada:

1. CheckoutId explícito do pedido.
2. RecoveryCaseId explícito.
3. CheckoutToken preservado.
4. Relação determinística fornecida pelo adapter.
5. Fallback opt-in: identidade estável, basket similarity por quantidade/SKU ≥ 0,8, diferença de valor ≤ 10%, janela compatível.

O fallback é **desabilitado por padrão**. Email/telefone iguais nunca são critério suficiente.

Pedidos são processados deterministicamente por paidAt e id. Candidatos usam nível de evidência, abandono mais próximo, similaridade da cesta e diferença de valor. Evidências explícitas que apontam a casos concorrentes, ou empate equivalente, ficam ambíguas sem recuperação atribuída. Um pedido pode recuperar no máximo um caso; um caso tem no máximo um pedido primário.

Cada caso conserva reason, confidence, matchedAt e ambiguous. Nenhuma venda é adicionada ao dashboard de vendas: Recovery apenas classifica a venda já existente.

## Receita e KPIs

Todas as fórmulas se aplicam ao mesmo recorte de casos elegíveis:

| Métrica               | Fórmula                                                                |
| --------------------- | ---------------------------------------------------------------------- |
| Valor abandonado      | soma do total original de checkout                                     |
| Receita recuperada    | soma do netCents dos pedidos pagos associados                          |
| Carrinhos recuperados | count(RECOVERED)                                                       |
| Taxa madura           | 100 × recuperados / (recuperados + expirados)                          |
| Valor em recuperação  | soma do total dos casos OPEN                                           |
| Receita estimada ML   | soma de valor aberto × probabilidade calibrada, arredondada ao centavo |

Denominador zero retorna null e é apresentado como “—”. A receita estimada permanece null até READY real validado. Valor abandonado recuperado é preservado separadamente do valor líquido do pedido.

Filtros de status/método selecionam pelo resultado. Para evitar “100% de recuperação automática” sem saber exposição, a taxa geral e por segmento são null quando esses filtros são usados. Totais por método continuam disponíveis; não são taxas de conversão por método.

## Atribuição de intervenção

RecoveryAttributionResolver lê apenas RecoverySignal normalizado e verificado pelo adapter:

1. Declaração explícita.
2. Token assinado, previamente verificado.
3. Metadado de ator automático/humano.
4. Mapping único de campanha/cupom.

AUTOMATIC exige evidência automática. CONSULTANT exige evidência humana. MIXED exige declaração explícita de combinação ou intervenções válidas concorrentes no mesmo nível de metadados/mapping. Declarações explícitas ou tokens assinados contraditórios são UNKNOWN, não uma combinação inventada. Evidência inferior contraditória é diagnosticada mesmo quando a precedência resolve o resultado.

WhatsApp não equivale a humano, cupom não equivale a consultora e Shopify não equivale a automação. Sem evidência: UNKNOWN. Identidade humana desconhecida: “Consultora não identificada”.

Cada caso conserva method, confidence, evidence[], reason, conflict e identidade opcional. Cobertura da receita = receita identificada (método ≠ UNKNOWN) / receita recuperada. Cobertura dos casos usa o mesmo critério por count. Os quatro grupos reconciliam com 100% dos casos/receita; denominador zero permanece null.

Sem população comparável de intervenções, a tabela de consultoras mostra apenas totais associados e tempo, sem ranking de performance.

## Tempo, segmentos, produtos e qualidade

Média/mediana usam delay de paidAt − abandonedAt, apenas recuperados. Buckets contínuos: ≤1h; >1–6h; >6–24h; >1–3d; >3–7d; >7d até fim da janela. Último bucket acompanha a janela configurada. Nenhum intervalo de 24 horas fica sem bucket.

Segmentos de cliente, valor e origem exibem população, maduros, recuperados, valores, taxa e tempo. Padrões destacados precisam de pelo menos 20 maduros. Intervalo de Wilson 95% acompanha taxas disponíveis. Segmentação é associativa, não causal.

Produtos são multi-valuados por cesta. Count de casos por SKU e count de linhas são distintos; não devem ser somados para contar pedidos. Receita recuperada é alocada pela proporção dos itens **da cesta abandonada**, não reivindicada como receita efetiva do SKU vendido. Alocações em centavos reconciliam exatamente.

Diagnósticos têm escopo explícito do histórico normalizado carregado da organização. Cobertura e reconciliação da coorte selecionada aparecem separadamente. Invariantes: statuses = elegíveis; métodos = recuperados; receita por método = recuperada; time buckets = recuperados; ordens primárias únicas.

## BRAINX Intelligence

Engine determinístico de RecoveryInsight[] com id, categoria, severidade, título, resumo, evidência métrica, confiança e actionStatus. Observações vêm de tempo, cobertura, coortes maduras, segmentos e volume aberto. Não há dependência de LLM nem texto gerado sem números de origem.

Proposta futura: Analytics/ML → evidência estruturada → verbalização opcional. Um LLM não deve recalcular métricas. Interface atual permite inspecionar as evidências via ConceptHelp.

## ML, prontidão e fallback

Não existe runtime treinado aprovado no repositório. Implementado:

- RecoveryModelProvider e LearningRecoveryModelProvider.
- Features anteriores ao abandono: valor, itens, SKUs, desconto, frete/valor, perfil, compras/gasto anteriores, dias desde compra, hora/dia em timezone de negócio, origem e composição da cesta.
- Dataset com label recoveredWithinWindow, apenas resultados maduros e não ambíguos.
- Rejeição de snapshots posteriores ao abandono e de histórico com timestamp futuro/inválido.
- Split temporal purgado: label precisa estar disponível antes do cutoff de treino; validação usa abandonos mais novos.
- DTO de versão, estado e validação; gate para probabilidades calibradas.

Features não incluem nome/email/telefone/demografia, pedido recuperado, status futuro, resultado da automação ou interação futura.

Safeguards centralizados: mínimo 500 maduros e 50 positivos. Demo fica LEARNING, mesmo tendo muitas fixtures. Produção com amostra suficiente e sem modelo validado fica EXPERIMENTAL. READY requer versão, amostra, split temporal, métricas finitas, ROC AUC ≥ 0,65 e erro de calibração ≤ 0,10. Esses limiares são salvaguardas iniciais, não garantias universais.

Contrato de validação: ROC AUC, PR AUC, log loss, Brier, erro de calibração, precision/recall e share de receita capturada no topo. Um futuro pipeline deve usar treino → validação → calibração cronologicamente separados, avaliar drift e publicar artefato versionado antes de habilitar READY. Não há métrica de validação fabricada nem modelo ajustado nesta entrega.

Sem READY, probability e expectedRecoverableCents são null. Ranking usa valor × recuperação empírica de clientes do mesmo perfil com amostra mínima, rotulado **Estimativa histórica**. Sem amostra, usa valor do carrinho. Uma prioridade explica numerador/denominador e não se apresenta como probabilidade de ML.

## Contrato de instrumentação futura

Ações/links de recuperação deverão carregar recoveryCaseId, recoveryActionId, actorType (HUMAN/AUTOMATIC), actorId?, automationId?, campaignId?, issuedAt e versão/signature verificada pelo adapter. Mapas de campanha/cupom precisam ser explícitos e não ambíguos. Integridade, tenant, expiração e replay deverão ser verificados antes de aceitar RecoverySignal. O módulo não implementa automações nem assinatura de tokens agora.

Enriquecimento de CRM futuro é provider-agnostic: etapa, responsável, ação, execução automática, follow-up, resposta, SLA e duração. O Recovery domain continua sendo a fronteira de verdade, sem acoplamento a provedor de CRM.

## UX e acessibilidade

Filtros usam draft → aplicar, limpar e calendário/Select existentes. TanStack Query preserva dados durante atualização; falha mantém o último recorte com aviso. Overview é uma requisição agregada; oportunidades são outra, paginada. Refresh invalida a lista de oportunidades.

Skeleton aproxima a geometria. Estados distintos: sem abandonos, sem maduros, sem recuperações, sem atribuição e modelo em aprendizado. Charts e tabela têm resumo semântico, headers, rótulos, foco, tooltips de teclado/Escape. Motion usa preferências reduzidas; nenhuma animação pesada foi instalada.

Layout HD-first; seis KPIs no desktop, três em tablet e dois em mobile. Tabelas têm scroll próprio sem expandir a página. Dark usa os mesmos tokens de Visão Geral; não há pastéis claros fixos.

## Limitações para produção

Esta é uma fundação funcional, não ingestão Shopify real nem modelo treinado. Antes de produção: adapter autenticado, paginado e incremental; verificação de evidência; observação histórica completa; moeda/timezone reais da organização; persistência idempotente de snapshots auditáveis; monitoramento de qualidade e reconciliação; treinamento/validação/calibração e publicação de versão. Nenhuma coluna Prisma especulativa foi criada.

A fixture começa em janeiro de 2024, é estável para a mesma data de observação e contém múltiplas cestas por cliente, pedidos distintos do valor original, métodos/evidências, origem desconhecida, duplicatas, valor ausente e ambiguidade. Datas futuras não aparecem.

## Validação local — 10/10/2026

- `pnpm lint`: 10 tarefas aprovadas.
- `pnpm typecheck`: 10 tarefas aprovadas.
- `pnpm test`: 7 tarefas aprovadas; API 65 suites / 380 testes; web 61 arquivos / 360 testes; database 4 testes; validation 3 testes.
- Recovery cobre valores em centavos e conversão decimal exata, maturidade, observação truncada, tenant/moeda, deduplicação, matching ambíguo, conflitos de método, reconciliação, filtros, datas/timezone e prevenção de leakage/probabilidade prematura.
- Controller testa 401/403, ADMIN, organização autenticada, parâmetros inválidos e auditoria de caso de outra organização.
- Expectativas antigas de navegação/RBAC foram ajustadas para a política restritiva já presente no checkout e para a nova entrada bloqueada; não houve ampliação de permissões.
- Capturas em `artifacts/tracking-recovery/`: light 1366, 1440, 1920, 390, 1440 com sidebar recolhido e dark 1440. Inspeção visual e testes de overflow passaram.
- A primeira execução E2E encontrou o scroll indevido no seletor compartilhado de oportunidades. Corrigido para rolar somente o menu. Uma tentativa subsequente de login coincidiu com reinício da API (502); não foi tratada como sucesso.
- Execução final contra o build de produção: **5/5 E2E aprovados em 29,7s**, incluindo autenticação, HD/mobile/dark, filtros/calendário/estado vazio, oportunidades/erro de API e bloqueio de conta secundária.
- `pnpm build`: **7 tarefas aprovadas**, rota `/tracking/recuperacao` gerada; avisos preexistentes de lint sem erros bloqueantes.
- `git diff --check`: aprovado. Nenhum commit, push ou merge.
- CRM deixado em execução local, API e web usando o build de produção validado. Evidência final: `artifacts/tracking-recovery/final-preview.png`; logs locais de lint, typecheck, build e E2E no mesmo diretório.

## Revisão visual — 11/10/2026

Referência: Visão Geral atual inspecionada no navegador em HD e no código local. Nenhum componente visual de Visão Geral nem backend foi alterado nesta revisão. O frontend voltou ao servidor de desenvolvimento para refletir o redesign ao vivo.

Componentes de Recuperação alterados: summary, intelligence/prediction, charts/method/time, segments/products, opportunities, data-quality, page e CSS local. Intelligence tem leitura principal priorizada por confiança e leituras secundárias; métodos usam comparação blue/pink com composição e cobertura; segmentos são cards/rankings; produtos têm Top 5 e expansão local; predição destaca o estado e a amostra disponíveis; oportunidades mantêm tabela e filtros; qualidade revela detalhes por disclosure. Todas as métricas antigas continuam em cards, labels, tooltips ou disclosure.

Pills Alta/Média/Baixa expressam urgência visual da janela (até 24h, até 72h, acima de 72h restantes), explicitada no tooltip. A ordenação e a prioridade analítica fornecidas pelo backend permanecem intactas. O progresso preditivo representa somente a amostra elegível em relação ao mínimo; não representa treinamento concluído nem validação.

Reutilizados: tokens e superfícies de Tracking, estilos executive, ChannelBrandMark e paleta de canal, TrackingMotion/useInViewOnce/AnimatedMetric, ConceptHelp, ChartTooltip/TrackingTooltipPortal, TrackingSelect e período existente. Sem dependências novas.

Validação: lint e typecheck com 10 tarefas aprovadas cada; 360 testes web em 61 arquivos; 30 testes de analytics/controller de Recuperação. E2E cobre HD/mobile/dark, ausência de overflow, filtros, estados vazios, tooltips/reduced motion, tabs, expansão de produtos, diagnóstico completo, oportunidades e acesso secundário. Capturas em 1366/1440/1920/390 px, sidebar expandido/recolhido e dark 1440 no diretório de artifacts. Nenhum commit, push ou merge.

Execução final do redesign: 6/6 E2E aprovados em 1,8 minuto. Prévia executiva: `redesign-preview-1366.png`; comparação de métodos: `redesign-methods-1366.png`. A captura do donut aguarda a geometria da animação estabilizar, evitando uma evidência tirada no primeiro frame vazio.
