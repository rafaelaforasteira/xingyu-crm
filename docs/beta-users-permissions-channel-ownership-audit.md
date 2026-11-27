# Auditoria — fundação multiusuário

## Superfícies revisadas

- autenticação, hash de senha e revogação de sessões;
- rotas de usuários e aceite público de convite;
- listagem, detalhe e mutações de negócios;
- quadro de pipelines e redaction de cartões;
- listagem/detalhe/mensagens de conversas;
- configuração de conexões e ownership de canais;
- isolamento por `organizationId` e acesso efetivo a pipelines.

## Decisões

- `ADMIN` conserva visão operacional completa.
- `MANAGER` e `CONSULTANT` compartilham a mesma regra de ownership nesta fundação: detalhes e mutações apenas dos próprios negócios.
- O Kanban continua coletivo para consciência operacional, mas negócios alheios são DTOs de resumo, sem dados sensíveis e sem interação.
- Convites nunca armazenam o bearer token em texto claro; o link bruto só existe na resposta de criação/reemissão.
- Canais pessoais exigem owner ativo. Ao mudar para outro modo, `ownerUserId` é removido para evitar autoridade residual.
- Usuários inativos são excluídos das opções de responsabilidade e perdem sessões imediatamente.

## Compatibilidade e limitações conhecidas

- A entrega de e-mail não faz parte desta etapa; o link é copiado manualmente.
- Canais legados são migrados para `ORGANIZATION`, evitando bloqueio inesperado da operação existente.
- O runner E2E histórico possui hang conhecido; validações específicas devem ser executadas isoladamente quando necessário.
- A política atual não introduz níveis intermediários de acesso a negócios para gerentes; essa evolução deve ser feita explicitamente sobre a matriz acima.

## Evidências esperadas antes da publicação

- migration deploy sem reset;
- Prisma generate, typecheck e build;
- testes unitários de token, expiração, uso único, ownership de negócio e canal pessoal;
- testes web existentes;
- `git diff --check` e worktree restrita à feature.
