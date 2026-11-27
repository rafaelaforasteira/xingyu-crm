# Corrigir dependências, arquivos privados e concorrência no BRAINX

Downloads em /api/uploads/files eram servidos fora dos guards, refresh podia criar duas sucessoras e webhooks variavam de identidade conforme o timestamp do envelope. Agora arquivos exigem sessão, organização e acesso ao recurso; uploads validam bytes/MIME/extensão/limites; refresh é consumido condicionalmente em transação; webhooks são serializados por canal e reconhecem IDs estáveis e recibos antigos.

A atualização dirigida de dependências eliminou os críticos/altos reportados por pnpm e Trivy, incluindo dependências de desenvolvimento. Next permanece na linha 15. Vitest/Vite e Zod/resolvers foram ajustados conforme os advisories e validados por compilação/testes. Não houve migração nova, alteração de dados reais ou chamada a fornecedor real.

Semgrep usa imagem CE oficial fixada por digest no CI; falhas do scanner falham o job, findings permanecem consultivos até revisão remota. Trivy inclui dev e vulnerabilidades sem patch. A base de engenharia da fase 1 permanece nesta branch.

Resultados, falhas iniciais preservadas, versões, contratos, limites de cobertura, lista de arquivos e reversão estão em [EXECUTION.md](./EXECUTION.md), seção Fase 2. Validação visual ficou bloqueada pela revisão automática do servidor Next; Semgrep real/Actions dependem de execução posterior, sem alegação de sucesso remoto.

Branch de trabalho: codex/brainx-quality-security; base original feature/beta-orders-operation-center. Para revisar apenas fase 2, comparar com dc44b04. Não mudar a base para main sem revisar a feature inteira. Nenhum push, PR remoto, merge ou deploy foi feito.

Antes de publicar: validar em staging autorizado o browser e os formulários, revisar scanners e evitar mistura de instâncias antigas/novas durante webhook processing. Rollback por git revert dos commits da fase, sem reset/clean; rollback do download privado exige contenção equivalente para não reabrir a exposição estática.

# Configuração adicional da fase 3

Camada de agentes instalada com papéis separados e planejamento obrigatório para funcionalidades complexas; não altera runtime, telas ou regras de negócio. Evidências, versões, limites e reversão em [PHASE-3-AGENTS.md](./PHASE-3-AGENTS.md). Lint/typecheck/test/build passaram; Playwright MCP validado em about:blank, sem alegação de validação visual do CRM. As fases anteriores descritas neste documento permanecem no escopo da branch.
