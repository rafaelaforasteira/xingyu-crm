# BRAINX — execução local e entrega

## Escopo, origem e aceite

Execução em 2026-11-04 (America/Sao_Paulo). Raiz confirmada por package.json `xingyu-crm`, pnpm-workspace.yaml e manifests web/API.
Origem: `feature/beta-orders-operation-center`, commit `ca58790`. Trabalho: `codex/brainx-quality-security`.
Preexistentes e preservados: `artifacts/layout-fix/` e `artifacts/tracking-recovery/` (não versionados).

Problema: implantar base de engenharia confiável sem reescrever aplicação nem usar banco/contas reais.
Aceite: overlay importado apenas onde ausente, checks separados, CI preservado, testes com alvo explícito, evidências e limites documentados.
Não houve alteração de schema, migração nova, runtime de produção, design system, rotas ou regras de negócio.

## Arquitetura e recursos existentes

Monorepo pnpm 9.15.4/Turborepo; Next.js/React/TypeScript/Tailwind/TanStack Query na web; NestJS na API; PostgreSQL/Prisma em packages/database; pacotes compartilhados config/types/ui/validation. Jest na API, Vitest na web/banco/validation e Playwright E2E já instalados.
Autenticação existente: Argon2id, JWT de acesso, refresh opaco com hash SHA-256, cookies HttpOnly/Lax, logout com revogação e guards globais de sessão, roles e permissões. O guard usa usuário/organização obtidos no servidor; política atual restringe módulos de negócio a ADMIN. Já havia testes auth HTTP, RBAC, IDOR e tenant spoofing. Isso não demonstra cobertura completa de todos os endpoints.
Integrações são mistas: Shopify Admin e Evolution têm clientes reais; adapters demonstrativos coexistem. Conexões processam recibos em transação Serializable; automações usam fila PostgreSQL com leases/deduplicação/limite de tentativas.

## Adicionado e corrigido

- Seis arquivos do ZIP foram copiados diretamente de `overlay/`, somente por inexistência. INSTALL-LOCAL.ps1 foi inspecionado, não executado. O kit é material de referência; o pedido de execução anexado definiu o escopo.
- AGENTS.md adaptado com risco, aceite, contratos, permissões de servidor, webhooks, loading/empty/error, acessibilidade e preservação do trabalho local.
- Workflow independente Gitleaks/Semgrep/Trivy, contents:read, timeouts, concorrência e relatórios com retenção de 7 dias. Scans consultivos enquanto baseline não for revisada; instalação ainda falha normalmente. Não há branch protection criada nem alegação de resultados do GitHub Actions.
- Gitleaks CLI evita dependência de licença organizacional da action. Semgrep fixado em 1.183.0; métricas desativadas. Dependabot semanal para pnpm lock v9 e GitHub Actions, limites de PRs e grupo minor/patch.
- CI usa banco efêmero *_test e credenciais de administrador geradas em runtime e mascaradas no log para o seed. Mantém migrate deploy, seed, lint, typecheck, teste, cobertura e build. CI e Security cobrem PRs para qualquer branch e permitem workflow_dispatch.
- Duas suítes PostgreSQL deixaram de procurar URL em .env/.env.example. Exigem TEST_DATABASE_URL explícita, loopback, protocolo PostgreSQL, nome *_test e apenas parâmetro schema. Sete regressões validam rejeição de configurações inseguras e seleção explícita do alvo. Essa validação reduz erro de configuração; o operador continua responsável por criar um banco descartável.
- Turborepo repassa TEST_DATABASE_URL/DATABASE_URL aos testes e não reutiliza cache dos testes com estado externo.
- README, inventário de integrações e auth atualizados conforme código.

## Ambiente e dependências

Node v24.14.1; pnpm 9.15.4; Prisma Client gerado v6.19.3. CI continua Node 20: execução Linux/Node20 depende do Actions.
Docker CLI 29.6.2 instalado, daemon indisponível (named pipe dockerDesktopLinuxEngine ausente). PostgreSQL embutido 17.6 já era dependência: criado cluster novo `.temp/brainx/pgdata`, loopback porta 55439, bancos `brainx_test` e `brainx_ui_test`, somente dados de seed fictícios. Nenhum reset ou comando de migração/seed no banco habitual do CRM.
`pnpm install --frozen-lockfile` não mudou manifests nem lockfile. Nenhuma dependência nova da aplicação. Gitleaks 8.30.1 e Trivy 0.76.1 baixados das releases oficiais para TEMP, com SHA-256 conferido contra checksums publicados. Semgrep não instalado localmente: Python Windows é apenas alias e WSL Ubuntu falhou com ERROR_TIMEOUT. BMAD/Superpowers/Playwright MCP não instalados: testes e browser Playwright já existem, sem lacuna que justifique instalação adicional.

## Evidências e comandos

Logs brutos locais ficam em `.temp/brainx/` (ignorados pelo Git; não publicar indiscriminadamente).

- Descoberta: git status --short; git branch --show-current; git log -1 --oneline; inventário via rg; leitura de README, architecture, homologation-auth, integrations, manifests, CI, auth/guards, webhooks/providers, inbound, schema e automações: executado.
- `git switch -c codex/brainx-quality-security`: passou.
- `pnpm install --frozen-lockfile`: passou, lockfile preservado.
- `pnpm db:generate`: passou. Aviso preexistente sobre package.json#prisma (migração futura para Prisma 7).
- `pnpm lint`: passou (10 tasks; 8 em cache). Os scripts lint atuais são tsc; não equivalem a um lint abrangente de segurança/estilo.
- `pnpm typecheck`: passou (10 tasks; 8 em cache).
- `pnpm db:migrate:deploy` e `pnpm db:seed`: passaram nos DOIS bancos isolados. Logs migrate.log/seed.log/ui-migrate.log/ui-seed.log. Senha do admin de teste é sintética; não foi versionada.
- Primeiro `pnpm test`: falhou em duas suítes porque Turbo não repassava TEST_DATABASE_URL; a proteção bloqueou a conexão antes do Prisma. Web: 62 arquivos/372 testes passaram. Corrigido turbo.json e repetido o comando completo.
- Segundo `pnpm test`: passou, 68 suítes/419 testes API e 62 arquivos/372 testes web; database e validation também passaram. Sete regressões novas incluídas. Logs test.log (primeira falha) e test-final.log (sucesso). `pnpm test:load:helpers`: passou, 7 testes. Cobertura separada de CI não executada localmente.
- `pnpm build`: passou (7 tasks; 5 em cache; API e web executados, web gerou 38 páginas). Avisos ESLint preexistentes, sem suprimir regras. Log build.log.
- `pnpm audit --json`: exit 1, metadata: 9 críticos, 49 altos, 41 moderados, 10 baixos. São contagens do scanner, não confirmação de exploração nem 109 pacotes distintos. Ex.: alertas em next, tinypool, vitest, proxy-addr e handlebars. Não houve atualização em lote. Log pnpm-audit.json.
- `gitleaks git . --redact --report-format json`: passou no histórico; `gitleaks dir` passou nos arquivos alterados na revisão. Relatórios locais redigidos. Isso não garante inexistência de segredos.
- Trivy 0.76.1: primeira tentativa falhou por timeout na análise de configuração. Repetição com `trivy fs --timeout 10m --scanners vuln,misconfig --severity CRITICAL,HIGH --ignore-unfixed --exit-code 1` em cópia dos arquivos versionados + alterações passou pela análise e terminou exit 1 por findings: 4 críticos e 33 altos em pnpm-lock.yaml (dependências de runtime; dev omitidas pelo padrão). Detectou zero arquivos de configuração suportados; não é evidência de IaC validada. Críticos: next 15.5.22 (scanner indica patches 15.5.24/15.5.28 conforme alerta) e proxy-addr 2.0.7 (fix 2.0.8). Logs trivy.log/trivy-final.log e JSON trivy-final.json.
- Semgrep local: não executado; Python ausente e WSL indisponível. Configurado para CI, primeira execução remota pendente.
- Playwright E2E/browser: não executado. Chromium já existe, mas revisão automática rejeitou duas tentativas de iniciar Next.js, inclusive com bind 127.0.0.1, por “blocked by policy”, sem detalhar motivo. Preparação do banco UI passou; API isolada iniciada para preparação foi encerrada. Não alegar validação visual de login/dashboard/Kanban/conversa/responsividade.
- Merge/deploy/push/PR remoto/branch protection: não executados. Não foram solicitadas credenciais nem lidos valores de .env pelo agente; Prisma/seed carregam o arquivo por implementação existente, com URL de teste definida explicitamente e sem imprimir valores.

## Achados e prioridades

1. **Alta — uploads fora dos guards:** main.ts usa useStaticAssets em /api/uploads/files. Middleware estático não passa por AuthGuard/ownership dos controllers. Mitigação necessária antes de produção: download autenticado por recurso ou URLs assinadas de curta duração. Não foi testada exploração contra dados reais.
2. **Alta — dependências:** triagem dos críticos/altos dos relatórios, separar runtime/dev e caminhos afetados, atualizar pequenos grupos com regressão e lockfile. Não publicar como produção homologada com base neste PR.
3. **Alta — refresh concorrente:** auth.service.ts consulta sessão e depois revoga com update por id em transação; não exige revokedAt:null no consumo. Possível criação de duas sessões sucessoras em concorrência. Próximo PR: consumo atômico e teste de duas chamadas simultâneas, além dos testes de replay já existentes.
4. **Média — CSRF:** cookies Lax e CORS explícito existem; não foi encontrado guard de Origin/Referer nem token CSRF. Avaliar threat model de subdomínios same-site, login/logout e mutações antes de reforçar contrato.
5. **Alta para ativação real — webhook/dedup:** Evolution usa segredo estático em header (não HMAC do corpo bruto); event ID de mensagem inclui timestamp e externalMessageId tem índice não único. Reentrega com outro timestamp pode escapar da deduplicação. Receipts são transacionais, porém P2002 genérico é tratado como duplicado. Validar contrato/identidade estável e teste concorrente em banco isolado antes de ativar fornecedor.
6. **Média — retry/efeitos externos:** fila tem lease e máximo de tentativas, atraso fixo 15s/20s; não há garantia de idempotência externa em timeout de envio. Definir reconciliação, backoff limitado/jitter e chave de efeito antes de retry automático.
7. **Média — demo e dados:** verifySignature genérico sempre aceita, embora não usado pelo endpoint público de conexões. Fake é permitido em produção se configurado explicitamente. Impedir reutilização indevida e revisar retenção/mascaramento de bodies persistidos e erros do worker.
8. **Operacional:** triagem dos primeiros relatórios Actions, conferir erros de scanner e então remover continue-on-error com aceites explícitos. Configurar reviews/checks obrigatórios manualmente com acesso administrativo. Validar Linux/Node20/Postgres16, pois local foi Windows/Node24/Postgres17.

Não é uma certificação de segurança completa. Integrações reais, permissões de todo domínio, navegador e concorrência de sessão/webhook permanecem pendências explícitas.

## Arquivos desta entrega

1. AGENTS.md (novo, overlay adaptado)
2. .github/dependabot.yml (novo)
3. .github/workflows/security.yml (novo, overlay adaptado)
4. .github/workflows/ci.yml
5. turbo.json
6. apps/api/src/common/test-database.ts (novo)
7. apps/api/src/common/test-database.spec.ts (novo)
8. apps/api/src/pipelines/pipeline-channel-lock.integration.spec.ts
9. apps/api/src/reactivation/reactivation.integration.spec.ts
10. README.md
11. docs/homologation-auth.md
12. docs/integrations.md
13. docs/engineering/ROADMAP.md (novo, overlay adaptado)
14. docs/engineering/SECURITY.md (novo, overlay adaptado)
15. docs/engineering/VERIFICATION.md (novo)
16. docs/engineering/EXECUTION.md (este relatório, novo)
17. docs/engineering/PR.md (descrição/instruções de PR, novo)

## Reversão e entrega

Mudanças limitadas a orientação, documentação, CI e harness de testes. Reverter o commit desta entrega com `git revert <hash>` em branch apropriada; não usar reset/clean, e preservar as duas pastas de artefatos preexistentes. Não há migração de aplicação a reverter. PostgreSQL isolado encerrado com pg_ctl stop -m fast e wrapper encerrado; API de preparação também encerrada. Dados temporários podem ser removidos depois de confirmar o caminho .temp/brainx/pgdata e ausência de processos. Manter relatórios necessários à revisão antes da limpeza.

Fontes de ferramentas: [Gitleaks](https://github.com/gitleaks/gitleaks), [Semgrep CLI](https://semgrep.dev/docs/cli-reference), [métricas Semgrep](https://github.com/semgrep/semgrep/blob/develop/metrics.md), [Trivy Node/pnpm](https://www.trivy.dev/docs/latest/guide/coverage/language/nodejs/), [Trivy filesystem](https://www.trivy.dev/docs/latest/guide/references/configuration/cli/trivy_filesystem/).

## Revisão final

`git diff --check` passou após formatação. Foram revisados os diffs de CI, Turbo e proteção de banco, preservando os artefatos anteriores. Varredura Gitleaks dos arquivos finais e conferência de staging precedem o commit local. Não é possível declarar validação remota sem publicar/executar Actions.

# Fase 2 — correções de engenharia e segurança (2026-11-04)

Esta seção substitui o estado dos achados da fase 1 acima. Branch preservada: `codex/brainx-quality-security`, base local `dc44b04`. As pastas preexistentes `artifacts/layout-fix/` e `artifacts/tracking-recovery/` foram preservadas. Não houve push, merge, deploy ou migração nova.

## Mini-brief e fluxo revisado

Problema: dependências com alertas críticos/altos, downloads estáticos sem guard, consumo concorrente de refresh e recibos de webhook baseados no timestamp do envelope.
Escopo: patches direcionados, autorização de arquivos, validação de bytes/limites, transações concorrentes e execução portátil de SAST. Fora do escopo: reescrita, mudança de stack, contas reais, produção, filas externas e migrações destrutivas.
Aceite: preservar URLs/contratos funcionais, negar acesso sem sessão/organização/recurso, não aceitar MIME falsificado, selecionar uma única renovação e um único efeito de webhook no PostgreSQL, executar testes e registrar impedimentos.
Fluxos: multipart -> guards/permissão/recurso -> validação -> arquivo UUID privado -> vínculo no banco -> download autorizado; cookie refresh -> sessão -> consumo condicional + sucessora na mesma transação -> cookies; webhook autenticado pelo provider -> identidade estável -> lock transacional -> recibo + efeitos -> resposta/retry.

## Dependências: investigação e resultado

Baseline: 9 críticos, 49 altos, 41 moderados, 10 baixos. Resultado de `pnpm audit`: **0 críticos, 0 altos, 29 moderados, 5 baixos**. O pnpm 9 retornou exit 1 mesmo com `--audit-level high`, pois ainda há findings; a verificação explícita dos campos critical/high retornou 0. Não apresentar audit global como completamente limpo.
Trivy 0.76.1, com `--include-dev-deps --severity CRITICAL,HIGH`, sem ignorar não corrigidas: **exit 0, nenhum crítico/alto** no lockfile final. Snapshot apenas de manifests/lockfile; não é análise de código ou garantia de ausência de vulnerabilidades.
Lockfile SHA-256: `D3981037B6BF788417408E7C6FE32D336B8157B092260CD087C2CAF007A8677C`.

Decisões derivadas dos caminhos/advisories, sem `audit --fix` ou atualização geral:

- Next e eslint-config-next: 15.5.22 -> 15.5.28, permanecendo na linha 15, conforme release oficial de segurança.
- Vitest: 2.1.9 -> 4.1.0 nos três pacotes de teste. Vitest 3 ainda dependia de tinypool 1 vulnerável; a linha 4 remove essa dependência. Vite 6.4.4 adicionado explicitamente como peer de desenvolvimento, sem migrar a aplicação Next para Vite.
- Zod: 3.25.76 -> 4.6.6; resolvers de formulário 5.2.2 e react-hook-form ^7.62.0 para compatibilidade. A migração passou no typecheck/build e nas suítes existentes; interação visual dos formulários não foi validada.
- Overrides por linha afetada: body-parser 1.20.9; brace-expansion 1.1.20/2.1.6/5.0.11; fast-uri 3.1.7; glob 10.5.0; handlebars 4.7.10; js-yaml 3.15.2/4.3.2; lodash 4.18.0; multer 2.5.0 (incluindo a cópia transitiva do Nest); nanoid 3.3.18; picomatch 4.0.4; postcss 8.5.18; proxy-addr 2.0.8; source-map-js 1.2.2; tmp 0.2.7; sharp 0.35.5; deepmerge-ts 8.0.0; Vite mínimo 6.4.4.
- A primeira atualização revelou o advisory subsequente de tmp 0.2.6; corrigido para 0.2.7 e repetida a auditoria. Vite exigiu peer explícito, corrigido antes das verificações finais.
- Licenças consultadas nas versões publicadas: MIT para Next/Vitest/Vite/Zod/resolvers/tmp; BSD-3-Clause para deepmerge-ts; Apache-2.0 para sharp. Node local 24.14.1 atende aos engines. Sharp exige Node >=20.9; usar Node LTS compatível. Permanece aviso de peers opcionais WASM do resolver ESLint; build nativo Windows passou. Não foram instalados runtimes/serviços criativos nem ferramentas de agente.

## Uploads: todos os pontos de entrada encontrados

Auditoria por `FileInterceptor`, `FilesInterceptor`, `UploadedFile(s)`, `validateAndSaveUpload` e `useStaticAssets` encontrou quatro rotas multipart:

- POST `/api/conversations/:id/messages`: AuthGuard global e acesso à conversa antes da gravação; até 10 arquivos.
- POST `/api/tasks/:id/comments`: AuthGuard global e acesso à tarefa antes da gravação; até 10 arquivos.
- POST `/api/orders/:orderId/payments/:paymentId/receipt`: autenticação, finance.sensitive, acesso ao pedido e pagamento da organização; um arquivo, PDF/JPG/PNG.
- POST `/api/settings/profile/avatar`: autenticação, profile.edit e usuário derivado da sessão; um arquivo, JPG/PNG/WEBP, limite de transporte de 5 MB.

Multipart agora limita também campos, partes e tamanho de campo (20 campos, partes = arquivos + 20, 64 KiB/campo). Demais arquivos mantêm o limite configurado existente. Arquivos de conversa/tarefa são pré-validados em lote antes da primeira gravação.
Validação compartilhada exige buffer não vazio, confere tamanho declarado E real, extensão/MIME compatíveis e assinatura binária de formatos permitidos; texto exige UTF-8 sem bytes de controle inesperados. SVG/HTML e extensões executáveis não são aceitos. Arquivos recebem UUID, criação exclusiva `wx` e modo 0600; novos diretórios usam 0700 onde suportado. Não são usados nomes de cliente como caminho de armazenamento.

O middleware estático foi removido. GET/HEAD `/api/uploads/files/*` preservam as URLs, mas agora passam por sessão válida e resolução de referência pertencente à organização: anexo de mensagem/conversa, comentário/tarefa, comprovante/pedido, arquivo curado/deal ou avatar de colega. São aplicadas as permissões/políticas de domínio existentes; permitir a rota no guard não concede leitura do arquivo. Avatares de colegas continuam visíveis na mesma organização, inclusive para perfis restritos; arquivos de negócio não reabrem módulos restritos.
O caminho real deve permanecer no diretório configurado; traversal, ADS Windows, arquivos sem vínculo e symlinks externos são negados. Respostas usam no-store/private, nosniff, CSP sandbox; documentos e MIME legado desconhecido são baixados como anexo, mídia permitida permanece inline.

Limites explícitos: magic bytes identificam o contêiner, não fazem antivírus/CDR nem certificam conteúdo de Office/PDF. Arquivos órfãos por falhas de persistência não são publicamente acessíveis, mas retenção/limpeza transacional de disco continua uma tarefa operacional. Avaliar quotas e armazenamento por objeto antes de aumentar volume. Não foi alterado nem varrido o conteúdo de uploads reais.

## Refresh: concorrência corrigida e política preservada

A criação da sucessora agora ocorre na mesma transação de um `updateMany` condicional (`id`, revokedAt:null, expiresAt>agora). Apenas count=1 pode criar sucessora; count=0 retorna 401, sem apagar cookies que a resposta concorrente vencedora possa ter acabado de instalar. Falha ao persistir sucessora desfaz o consumo.
Testes reais usam duas instâncias de AuthService e uma barreira de leitura para obrigar a disputa no PostgreSQL: exatamente uma resposta bem-sucedida, duas sessões totais (antiga + sucessora) e apenas uma ativa. Outro teste injeta falha de criação dentro da transação e confirma rollback.
Web: auth bootstrap e retentativa da API compartilham uma única chamada e clones de resposta. Web Locks, quando disponíveis, serializam abas e verificam `/auth/me` depois do lock, reutilizando cookies renovados pela outra aba. Três testes cobrem compartilhamento, falha de rede e lock entre abas.
A política anterior de replay deliberado permanece: reapresentar token já revogado pode revogar todas as sessões. Navegadores sem Web Locks têm proteção por página, não garantia entre abas/processos externos. Não houve adoção de janela de tolerância que enfraqueça a detecção de replay.

## Webhooks: identidade, transação e retries

Evolution agora usa o ID de mensagem estável, sem timestamp de entrega, e ignora mensagens sem ID estável. A autenticação do fornecedor por segredo de header foi preservada; não foi inventado HMAC nem feita chamada a fornecedor real.
O processamento adquire advisory lock PostgreSQL por canal e lê recibos sob ReadCommitted, para que uma requisição que esperou o lock veja o commit anterior. Procura externalEventId OU externalMessageId, incluindo recibos legados com timestamp. Recibo e mensagem/contato/card/contadores/evento permanecem na mesma transação.
P2002 de domínio não é mais falsamente reconhecido como entrega duplicada. Apenas P2034 (conflito/deadlock) recebe até três tentativas com espera exponencial curta e jitter; demais falhas propagam erro para reentrega, sem confirmar sucesso inexistente.
Testes confirmam duplicidade sequencial, envelopes com timestamps diferentes, disputa entre duas instâncias, rollback do recibo, contadores sem duplicação e retry após corrigir uma rota inativa. Não foi necessária migração nem alteração de dados existentes.
Em implantação futura, não misturar workers/API antigos (que não usam o lock) com novos para o mesmo canal durante o processamento. Quiescer entregas ou atualizar conjuntamente. Contrato real, lotes do fornecedor, limites e reprocessamentos em staging continuam pendentes.

## Semgrep e CI

SAST passou a usar a imagem oficial `semgrep/semgrep:1.183.0`, com digest verificado no registro: `sha256:2e45517a85e13a9cca14a2a00df6bb48affd66b8ebfae1b0991cd57578362fb0`. Não depende de Python/WSL local ou pip do runner. Usa CE, métricas desligadas, configuração p/default e `--strict`; erros de pull/configuração/parser/execução falham o job, findings ERROR são consultivos e aparecem no resumo/artefato até a revisão da baseline. Não há supressão de findings.
YAML foi formatado/validado pelo Prettier e o script passou em `bash -n`. Tag/digest existem no registro. Execução real Semgrep ainda NÃO validada: daemon Docker local indisponível; Actions não foi executado porque não houve push. Próximo passo administrativo: executar workflow_dispatch e revisar o artefato.
Trivy do CI fixa 0.76.1, inclui dev dependencies e deixa de ignorar vulnerabilidades sem correção. Root `test:coverage` agora chama diretamente o script de cobertura da API, sem passar --coverage como argumento posicional.

## Evidências desta fase

Logs locais ignorados pelo Git em `.temp/phase2/`; relatórios não devem ser publicados indiscriminadamente. Cluster novo em `.temp/phase2/pgdata`, loopback 55441, usuário/banco sintéticos `phase2_test`. Nenhum comando de banco usou o alvo habitual do CRM.

- `pnpm install` dirigido pelos manifests/overrides: passou. `pnpm install --frozen-lockfile`: passou com o lockfile resultante.
- `pnpm db:generate`: passou. `pnpm db:migrate:deploy` e `pnpm db:seed`: passaram no banco novo isolado. A primeira conexão de migração falhou por nome incorreto do usuário sintético; corrigida a URL de teste. Logs migrate.log, migrate-final.log e seed.log.
- Regressões antes das correções: auth-before.log (2 falhas), upload-before.log (5 falhas), webhooks-before.log (4 falhas). Comando inicial de Jest via pnpm com flags na posição errada foi rejeitado; repetido corretamente por pnpm exec jest, sem declarar esse erro como execução de testes.
- `pnpm lint`/`pnpm typecheck`: primeiras tentativas falharam no tipo de retorno de Web Locks; corrigido com flatten da Promise. Repetições passaram. Logs lint-final.log/typecheck-final.log. Typecheck API após ampliar testes HTTP também passou.
- Segurança direcionada: 24 testes HTTP de uploads passaram (incluindo todos os quatro endpoints), 4 testes PostgreSQL de concorrência passaram, 3 testes web de renovação passaram; demais suites auth/provider/upload passaram nas execuções direcionadas e cobertura.
- `pnpm build`: passou, Next 15.5.28, 38 páginas; warnings ESLint preexistentes e aviso de output vazio de packages/ui, sem desligar regras. Prisma generate/migrate e build exercitaram a compatibilidade dos overrides de configuração e pacotes nativos.
- `pnpm test:coverage`: passou de verdade, 70 suítes / 456 testes API. Cobertura global de statements 42,61%; auth.service 89,14%, uploads.service 94,54%, connections-inbound 84,72%. Não alegar cobertura completa de contratos/autorização.
- Suíte completa final: passou, 70 suítes/456 testes API, 63 arquivos/458 testes web, 4 testes database e 3 validation; 7 tasks bem-sucedidos. Log test-complete.log. Primeira tentativa Vitest descobriu dist/index.test.js CommonJS; escopo do pacote validation foi explicitado como src. Duas tentativas posteriores falharam por timeout de um teste que agregava 84 combinações. As 84 combinações e todas as invariantes foram mantidas como casos separados (93 testes nesse arquivo), sem skip, sem aumentar timeout e sem alterar análise de produção. Repetição final registrada separadamente.
- `pnpm test:load:helpers`: passou, 7 testes; nenhum tráfego de carga contra aplicação real.
- Dependências: audit-before.json, audit-after1.json, audit-after.json, audit-final.json; verificação explícita critical/high passou. trivy-final.json/log: exit 0 incluindo dev, sem critical/high. Licenças/engines em licenses.json.
- Visual/Playwright ao vivo: NÃO executado. Nova tentativa de Next start em 127.0.0.1:3107 foi rejeitada pela revisão automática com “blocked by policy”, sem motivo adicional. API isolada subiu com ignoreEnvFile=true, banco fictício e provider fake; foi encerrada ao constatar o bloqueio da web. Não atribuir validação visual aos testes unitários de componentes.
- Semgrep real: NÃO executado local/remoto; validação de configuração e sintaxe apenas. Sem push/merge/deploy.
- Revisão final: git diff --check passou; Gitleaks 8.30.1, dir --redact nos 39 arquivos desta fase, passou sem findings. Logs gitleaks-final.json/log. Lint e typecheck de fechamento também passaram após a parametrização e formatação.

## Pendências priorizadas e reversão da fase 2

1. Executar Semgrep/CI em Linux Node20/Postgres16 e validação visual em ambiente autorizado; o ambiente local foi Windows Node24/Postgres17. Verificar login, dashboard, Kanban, conversa, anexos e formulários após Zod/resolver.
2. Triar os 29 moderados/5 baixos e peers opcionais WASM sem upgrades cegos. Revisar os primeiros relatórios remotos antes de tornar todos os scanners obrigatórios.
3. Manter download autenticado e não reintroduzir proxy/static externo sem a mesma autorização. Definir quotas, retenção/orphans, AV/CDR e armazenamento de objetos conforme volume.
4. Revisar CSRF/Origin/Referer, política de replay em múltiplas abas sem Web Locks e retenção/mascaramento de dados em atividades/erros. São riscos anteriores não declarados corrigidos por esta fase.
5. Homologar fornecedor com dados sintéticos, inclusive lotes, autenticação configurada, reentregas e idempotência de envio externo após timeout. A deduplicação inbound não torna envios externos exatamente uma vez.

Reversão por git revert dos commits desta fase, preservando o commit base da fase 1 e artefatos anteriores. Não há schema novo ou migração a desfazer. Reverter o código de downloads reabriria a exposição estática anterior: só fazê-lo com contenção equivalente. API e PostgreSQL descartáveis foram encerrados; cluster parado com pg_ctl stop -m fast, sem reset/clean. Dados sintéticos e logs foram preservados em .temp/phase2 para revisão.

Fontes: [Next 15.5.28](https://nextjs.org/blog/nextjs-security-update-october-14-2026), [migração Vitest](https://vitest.dev/guide/migration/), [transações Prisma](https://www.prisma.io/docs/orm/v6/prisma-client/queries/transactions), [Semgrep CE no CI](https://semgrep.dev/docs/semgrep-ci/sample-ci-configs), [Trivy action v0.36.0](https://github.com/aquasecurity/trivy-action/blob/v0.36.0/action.yaml). Os caminhos/advisories exatos de cada dependência estão no relatório JSON local do pnpm, sem reproduzir payloads ofensivos ou segredos.

## Arquivos editados/adicionados na fase 2 (39)

- `.github/workflows/security.yml`
- `apps/api/src/app.module.ts`
- `apps/api/src/auth/auth.service.spec.ts`
- `apps/api/src/auth/auth.service.ts`
- `apps/api/src/common/upload/upload.util.spec.ts`
- `apps/api/src/common/upload/upload.util.ts`
- `apps/api/src/common/upload/uploads.controller.ts`
- `apps/api/src/common/upload/uploads.http.spec.ts`
- `apps/api/src/common/upload/uploads.module.ts`
- `apps/api/src/common/upload/uploads.service.ts`
- `apps/api/src/connections/connections-inbound.service.spec.ts`
- `apps/api/src/connections/connections-inbound.service.ts`
- `apps/api/src/connections/providers/evolution-whatsapp.provider.spec.ts`
- `apps/api/src/connections/providers/evolution-whatsapp.provider.ts`
- `apps/api/src/conversations/conversations.controller.ts`
- `apps/api/src/conversations/conversations.service.ts`
- `apps/api/src/main.ts`
- `apps/api/src/orders/orders.controller.ts`
- `apps/api/src/security/concurrency.integration.spec.ts`
- `apps/api/src/settings/settings.controller.ts`
- `apps/api/src/tasks/tasks.controller.ts`
- `apps/api/src/tasks/tasks.service.ts`
- `apps/web/package.json`
- `apps/web/src/components/crm/tracking/sales-tracking.test.ts`
- `apps/web/src/lib/api.ts`
- `apps/web/src/lib/auth-api.ts`
- `apps/web/src/lib/session-refresh.test.ts`
- `apps/web/src/lib/session-refresh.ts`
- `docs/architecture.md`
- `docs/engineering/EXECUTION.md`
- `docs/engineering/PR.md`
- `docs/homologation-auth.md`
- `docs/integrations.md`
- `package.json`
- `packages/config/src/index.ts`
- `packages/database/package.json`
- `packages/validation/package.json`
- `packages/validation/vitest.config.ts`
- `pnpm-lock.yaml`

# Fase 3 — agentes de engenharia e design

Configuração e evidências em [PHASE-3-AGENTS.md](./PHASE-3-AGENTS.md); operação em [AGENT-WORKFLOW.md](./AGENT-WORKFLOW.md). BMAD 6.12.4, Superpowers nativo, Apple/UI UX, sete perfis e Playwright MCP instalados/reconhecidos. Lint, typecheck, testes e build passaram; smoke MCP em página vazia passou. Verificação visual do CRM permanece limitada pela rejeição anterior de inicialização local, sem bypass. Sem alterações de negócio, dados reais, push, merge ou deploy.
