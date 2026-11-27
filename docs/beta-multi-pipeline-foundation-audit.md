# Auditoria da fundação multi-pipeline

Base auditada: `feature/beta-deal-workspace-unification` em `5828894a3fc4555bbfb3242acb00d6a0a5eabd2c`. Referência visual e funcional: `e3dad237777a571cd17aedc8c00595317f1ed96f`.

| Item | Implementação atual | Histórico | Source of truth | Ação |
| --- | --- | --- | --- | --- |
| Sidebar / Operação | O modo beta escolhia `Operação` e badge de conversas | Seção expansível com pipelines | `GET /pipelines/navigation` | Restaurado `Pipelines`, filhos e contagem ativos dinâmicos |
| Routes / middleware | `/pipelines` era bloqueada e enviada a `/operacao` | Rotas por `pipelineId` | `/pipelines/:pipelineId?view=` | Pipeline reativado; `/operacao` redireciona para `/pipelines` |
| Feature flags | `NEXT_PUBLIC_BETA_SINGLE_PIPELINE_MODE` e `NEXT_PUBLIC_BETA_PIPELINE_ID` controlavam navegação e entidade | Multi-pipeline nativo | Parâmetro de rota | Flags mantidas apenas para compatibilidade, sem selecionar pipeline ou bloquear rotas |
| Pipeline page / selector | Página existia, mas ficava inacessível no beta | Cards, busca, criação e summaries | API paginada | Reativada sem restaurar código antigo |
| Pipeline API / create | CRUD e navigation existentes | CRUD completo | PostgreSQL via Prisma | Reutilizado; criação transacional inclui etapa inicial `Nova oportunidade` |
| Pipeline stages | Genéricas e isoladas por pipeline | `PipelineStage.pipelineId` | API de stages | Reutilizado; `isInitial` e `position=0` no fallback |
| Kanban / Conversations | UI beta moderna fixava `pipe-novos` e `/operacao` | Páginas por pipeline | `pipelineId` da rota | Componentes modernos parametrizados e compartilhados |
| Deal Workspace / Lead Context | Compartilhados no workspace beta | Drawer e contexto do negócio | Deal aberto na query | Preservados, sem cópia por pipeline |
| Create Lead / duplicate | Diálogo moderno usa o board carregado | Criação vinculada ao pipeline | Pipeline e etapa do board | Preservado e agora recebe o pipeline da rota |
| Filters / tags | Busca, prioridade, responsável e tags pertencem aos componentes modernos | Recursos posteriores ao histórico | Query + APIs atuais | Preservados |
| Tasks / notes / files / history / orders / tracking | Implementados no Lead Context atual | Ausentes ou menos completos na referência | APIs atuais do contexto | Preservados integralmente |

## Hardcodes single-pipeline encontrados

| Arquivo | Hardcode | Função | Ação |
| --- | --- | --- | --- |
| `apps/web/src/middleware.ts` | bloqueio de `/pipelines` e home `/operacao` | roteamento beta | Removido do fluxo oficial |
| `apps/web/src/lib/nav.ts` | item `Operação` | menu beta | Substituído por `Pipelines` expansível |
| `apps/web/src/components/crm/beta/beta-operation-page.tsx` | `BETA_PIPELINE_ID` e `/operacao` | escolha do workspace | Substituído por prop originada da rota |
| `apps/web/src/components/crm/beta/beta-kanban-view.tsx` | `BETA_PIPELINE_ID` e `/operacao` | board, links e drawer | Parametrizado por `pipelineId` e `basePath` |
| `apps/web/src/components/crm/beta/beta-conversations-view.tsx` | `BETA_PIPELINE_ID` e `/operacao` | lista, seleção e busca | Parametrizado por `pipelineId` e `basePath` |
| `apps/web/src/lib/beta-config.ts` | fallback `pipe-novos` | compatibilidade legada e testes | Mantido sem participar das rotas oficiais |
| seeds e fixtures | ids determinísticos como `pipe-novos` | dados de desenvolvimento/teste | Fixtures | Mantidos; não são lógica runtime |

## Dados e schema

O schema atual já possui `Pipeline`, `PipelineStage`, `Deal.pipelineId`, `Deal.stageId`, `position` e `isInitial`; nenhuma migration foi criada. O seed histórico atual já define `Novos leads`, `Comercial principal` e `Pós-venda`, com etapas e cores próprias. Esses registros são reutilizados de forma idempotente; não foi criado um segundo pipeline com nomes equivalentes.

## Escopo

Renomear, arquivar, duplicar e excluir continuam nas capacidades históricas existentes da página, sem expansão de schema. A mudança não altera regras de RBAC nem isolamento por organização. O backend filtra pipelines, stages, summaries e boards por `organizationId`; a movimentação usa a etapa validada no pipeline corrente.
