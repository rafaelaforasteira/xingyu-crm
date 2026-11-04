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
