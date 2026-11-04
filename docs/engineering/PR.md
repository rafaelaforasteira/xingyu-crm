# Implantar base BRAINX de qualidade e segurança

As suítes PostgreSQL procuravam DATABASE_URL no .env habitual e o CI chamava seed sem credenciais do administrador. Agora testes exigem TEST_DATABASE_URL local explícita para banco *_test, Turbo repassa a variável sem cache de testes, e o CI usa banco efêmero com senha de seed gerada em runtime.

Adiciona orientação de engenharia por risco, Dependabot e workflow independente de Gitleaks/Semgrep/Trivy em modo consultivo para revisão inicial. Atualiza auth/integrações conforme implementação real. Não altera schema, runtime de produção nem interface.

Validação detalhada, resultados e riscos em [EXECUTION.md](./EXECUTION.md). Antes do merge, conferir resultado final dos testes e primeiros scans Actions. Pendências de produção: downloads privados, dependências críticas/altas, concorrência de refresh e deduplicação por identidade estável do webhook.

Criar PR da branch codex/brainx-quality-security para feature/beta-orders-operation-center, respeitando a política de branches da equipe. CI e Security aceitam PRs para qualquer branch, incluindo a base feature atual, e execução manual por workflow_dispatch após publicação. Não alterar a base para main sem revisar a diferença da feature inteira.

Não houve push nem PR remoto nesta execução. Nenhum dado local de artifacts/ ou .temp/ deve entrar no PR. Reversão por git revert do commit desta entrega; sem rollback de schema.
