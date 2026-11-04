# BRAINX — Regras de engenharia para agentes (Codex)

## Missão

Evoluir o BRAINX (Xingyu CRM) com segurança e previsibilidade, respeitando a arquitetura existente. O objetivo é resolver problemas de negócio demonstráveis, não introduzir bibliotecas, telas, tabelas ou integrações sem necessidade.

## Contexto técnico confirmado no repositório `xingyu-crm`

- Monorepo `pnpm` + Turborepo; `apps/web` (Next.js/React/TypeScript), `apps/api` (NestJS) e `packages/database` (PostgreSQL/Prisma).
- Pacotes compartilhados em `packages/*` e documentação em `docs/`.
- Testes e scripts existentes no `package.json`; workflow em `.github/workflows/ci.yml`.
- Consultar a implementação real, o schema Prisma e os testes antes de confiar em documentação de alto nível. O README e a documentação de autenticação divergem; confirmar o estado real no código.

## Processo obrigatório antes de implementar

1. Identificar branch, arquivos modificados, dependências e riscos. Não sobrescrever trabalho local do usuário.
2. Elaborar um mini-brief com problema, regra de negócio, escopo, não-escopo, contratos afetados e critérios de aceite.
3. Mapear o fluxo completo (entrada -> validação -> persistência -> efeitos externos -> apresentação -> observabilidade).
4. Reaproveitar padrões e componentes existentes. Toda dependência nova requer justificativa e licença verificada.
5. Escrever/atualizar testes que reproduzam o comportamento e casos de falha; somente então implementar o mínimo necessário.
6. Rodar lint, typecheck, testes e build relevantes; documentar comandos e resultados reais. Não declarar testes executados quando não houver execução.
7. Revisar segurança e manter as mudanças isoladas em branch/PR; não fazer merge ou deploy sem autorização.

## Regras inegociáveis

- Nunca ler, registrar, imprimir ou versionar credenciais reais. Variáveis sensíveis ficam fora do frontend e de logs. Não enviar dados de clientes a serviços de IA sem autorização e análise de privacidade.
- Não executar `pnpm db:reset`, apagar tabelas, mudar dados em produção nem aplicar migrações destrutivas sem aprovação explícita e backup verificável.
- Não expor rotas com dados pessoais sem autenticação e autorização. Validar ownership, escopos e permissões no servidor; interface não substitui controle de acesso.
- Não assumir que mocks do README refletem o estágio atual. Conferir adapters e flags de DEMO_MODE; mocks jamais devem substituir integrações reais silenciosamente em produção.
- Para webhooks: verificar autenticidade conforme documentação oficial, registrar `event_id`, idempotência, deduplicação, retries limitados e rastreabilidade. Nunca confiar em payload sem validação.
- Em pedidos Shopify, tratar ID do pedido como chave de negócio consistente; preservar histórico de origem/UTMs e vínculo do contato. Evitar cards duplicados em pipelines diferentes.
- Não criar serviços externos, filas, Redis, n8n, geração de imagens ou 3D se a feature não precisar; sem complexidade especulativa.
- Preservar tokens visuais, acessibilidade, responsividade e estados loading/empty/error; consultar `docs/ui-guidelines.md`.
- Ao encontrar conflito entre requisito, documentação e implementação, interromper a alteração correspondente e apresentar a divergência sem adivinhar.

## Comandos de verificação conhecidos

```bash
pnpm install --frozen-lockfile
pnpm db:generate
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Esses comandos exigem ambiente configurado e alguns podem requerer banco ou secrets de teste. Não executar contra banco de produção. `pnpm test:e2e` exige a aplicação e infraestrutura de teste em execução.

## Critérios de pronto

Requisito rastreável; migrações reversíveis/revisáveis; contratos e testes atualizados; verificações executadas; riscos documentados; nenhuma credencial ou dado pessoal em logs ou commits; PR com impacto, resultados, screenshots quando UI e plano de reversão quando necessário.

## Classificação por risco e aceite

- Baixo (documentação/configuração sem runtime): diff e validação dos comandos afetados.
- Médio (UI/contratos): testes de sucesso/falha; loading/empty/error; teclado, foco, rótulos e viewport móvel; preservar tokens e contratos existentes.
- Alto (auth, RBAC, webhooks, dados/migrações): casos negativos de autorização no servidor, tenant/ownership, assinatura e replay, concorrência, rollback e banco descartável explícito. Revisão humana antes de publicação.
- Integração com efeito externo: validar limites, timeout, retries limitados e idempotência antes de reenvio. Não testar envio real sem staging autorizado.
- Testes PostgreSQL exigem TEST_DATABASE_URL local com nome terminado em _test; nunca carregar credenciais de .env como fallback para testes.
