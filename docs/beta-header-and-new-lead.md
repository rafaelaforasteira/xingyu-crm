# Beta header e criação de lead

## Problema

A barra superior do beta espalhava “Hoje”, notificações e busca com grande espaço vazio. A busca era apenas visual (toast), com lupa roxa à esquerda e cápsula `⌘K` à direita. O botão “Novo” também só exibia placeholder do beta.

## Solução

- Header em grid coeso (`auto / minmax / auto`, centralizado) com gap curto entre os três grupos.
- Campo de busca real com placeholder `Buscar contatos, deals e pedidos…`, lupa neutra à direita e sem atalho visual.
- Query param `q` (debounce ~250ms) como fonte de verdade.
- Menu “Novo” → “Novo lead” abre formulário que persiste um **Deal** no pipeline beta.

## Header

Grupos: `[Hoje][sino]` · `[busca]` · `[Novo]`. Controles com altura ~36px (`h-9`). Grupo esquerdo com gap ~6px. Busca até ~680px. Novo ~104–108px.

## Busca

Campos considerados (client-side no Kanban): nome do deal, contato, e-mail, telefone/WhatsApp (também dígitos), empresa, preview de mensagem, id.

Sem resultados: colunas preservadas + “Nenhum lead encontrado.”

Em Conversas: o mesmo `q` sincroniza a lista (`externalSearch` / `onExternalSearchChange`).

## Novo lead

- Entidade: `Deal` (opcionalmente cria `Contact` vinculado).
- Pipeline: `BETA_PIPELINE_ID` (`pipe-novos` por padrão).
- Etapa: `isInitial` ou primeira por posição.
- Sem seletor de pipeline na UI; `pipelineId` aceito pelo diálogo para evolução futura.
- Após sucesso: invalida o board, toast “Lead criado com sucesso.”, URL `view=kanban&deal=…`, abre o drawer.

## Limitações

- “Hoje” e notificações continuam placeholder do beta.
- Sem busca global da plataforma / Elasticsearch.
- Sem múltiplos pipelines nesta fase.
- Criação contato+deal não é uma única transação no backend.

## Testes

- Unitários: `operation-utils`, `beta-config`, `beta-header-search`.
- E2E: `beta-header-and-new-lead.spec.ts`.
- Screenshots locais: `apps/web/e2e/.beta-screenshots/header-adjustment/` (gitignored).
