# BRAINX — Implantação controlada do sistema de engenharia

## Inventário do kit (preparação remota, 2026-11-03)

- Monorepo já usa Next.js, NestJS, Prisma/PostgreSQL, pnpm e Turborepo. **Não recriar o projeto.**
- Existe CI em `.github/workflows/ci.yml` com install, Prisma, migrações, seed, lint, typecheck, testes e build.
- `apps/web` tem Vitest e Playwright; `apps/api` tem Jest.
- README descreve versão demonstrativa sem login, mas `docs/homologation-auth.md` descreve autenticação JWT/cookies. **Verificar arquivos de implementação e testes antes de concluir a situação real**.
- Há múltiplas branches de features; `main` não deve ser presumida como contendo todas as alterações locais do BRAINX.
- Não foi executado `pnpm install`, teste, build ou auditoria dinâmica nesta preparação remota.

## Fases de implantação

### P0 — Auditoria e inventário

- Identificar branch de trabalho e mudanças não commitadas.
- Inventariar auth/RBAC, frontend, endpoints, schema Prisma, webhooks, filas, integrações e mocks.
- Documentar fluxos do CRM: Triagem, Comercial, Recuperação de Carrinho, E-commerce e Pós-venda.
- Resolver divergências entre README, docs e código; priorizar código/testes atuais.

### P1 — Qualidade e segurança automatizadas

- Habilitar workflow `security.yml` com Semgrep, Gitleaks e Trivy; revisar os primeiros resultados.
- Exigir via branch rules revisões e checks de CI/security antes do merge.
- Usar dependabot para propostas de atualização; nunca atualizar dependências sem testes.
- Testar autorização por usuário, expiração de sessão, CORS, cookies, uploads e proteção de dados.

### P2 — Consistência de integrações e dados

- Definir contratos, dados de entrada e saídas por integração (Shopify, Kommo, WhatsApp, Instagram).
- Verificar assinatura dos webhooks com payload bruto conforme fornecedor, processar idempotência e preservar trilha de auditoria.
- Reconciliar pagamentos, eventos duplicados, carrinhos anteriores e transições de pipeline.
- Cobrir falhas de rede, limites de API e reprocessamentos sem ações duplicadas.

### P3 — Frontend e identidade BRAINX

- Auditar design system atual e componentes existentes antes de adicionar shadcn/UI UX/Apple Design.
- Rever visual em desktop/mobile e estados de carregamento, erro e vazio.
- Integrar imagens/3D somente em telas onde tragam valor mensurável, preferencialmente como assets estáticos otimizados.

### P4 — Operação

- Staging com dados fictícios, fluxo de deploy com revisão, backups verificáveis e teste de restauração.
- Erros e tracing com proteção de PII; dashboards de saúde e procedimentos de rollback.
- Teste de carga dos fluxos críticos, sem ataques ativos em produção.

## Regra de escolha de ferramentas

Instalar somente o que preenche uma lacuna confirmada por P0. Skills do Codex são instruções de agente; Semgrep/Gitleaks/Trivy são scanners de CI; ComfyUI/Blender são serviços criativos separados, não dependências do runtime do CRM.

## Entrega esperada por fase

Issue/PR pequeno com escopo, riscos, comandos executados, resultados observados, pendências e critérios de aceite. O primeiro PR não deve alterar banco ou lógica de produção.

## Execução local

Estado e evidências atuais: [EXECUTION.md](./EXECUTION.md). A branch de origem real foi feature/beta-orders-operation-center, não main.
