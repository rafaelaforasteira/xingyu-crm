# Critérios de verificação — BRAINX

## Checklist por Pull Request

- Requisito registrado, escopo explícito e impacto de domínio identificado.
- Diff limitado; alterações preexistentes preservadas.
- Contratos de API e eventos atualizados quando afetados.
- Testes de sucesso, casos negativos, autorização e idempotência adicionados conforme o risco.
- Lint, typecheck, testes e build executados ou bloqueadores documentados.
- Scanners de segredos, SAST e dependências executados no CI; alertas revistos, sem supressões silenciosas.
- Migrações do Prisma verificadas, com impacto e plano de reversão.
- UI: desktop/mobile, loading/empty/error, screenshots e acessibilidade quando aplicável.
- Nenhum dado pessoal de cliente, senha, token ou `.env` em commits/logs.
- Nenhum deploy/merge automático sem as revisões exigidas.

## Riscos prioritários conhecidos

1. Divergência de documentação de autenticação entre o README e docs recentes: conferir código atual.
2. Integrações externas descritas como mocks na documentação inicial: não assumir que são reais nem que permanecem mocks.
3. Pipeline de CI existente usa migração/seed: confirmar que credenciais e configurações de autenticação para CI estão corretas.
4. Fluxos de CRM com múltiplos pipelines: testes devem prevenir duplicação de contatos/cards e perda de histórico.
5. Dependências/versões devem ser auditadas antes de atualização: não atualizar versões maiores em lote.

## Critério de saída de cada fase

Uma fase só está concluída quando há evidência (logs, testes, artefatos e arquivos modificados). Qualquer etapa não executada deve ser reportada como pendência.

## PostgreSQL isolado

Definir TEST_DATABASE_URL explicitamente para banco descartável local com nome terminado em _test. Aplicar migrate:deploy e seed apenas após confirmar o alvo. DATABASE_URL herdada não é autorização para testes. Turbo repassa as duas variáveis e o task test não usa cache. Nunca utilizar db:reset no ambiente habitual do CRM.
