# Header operacional do lead na conversa

## Problema anterior

O cabeçalho da thread mostrava `← Nome`, badge de canal e o status técnico `OPEN`, com seta de voltar no desktop. Abrir `/operacao?view=conversations` auto-selecionava a primeira conversa via `router.replace`, adicionando `conversation=` sem ação da usuária.

## Nova estrutura

```
Amanda Vieira                         [ Em negociação ▾ ]
Lead #0048   [IR]   [WhatsApp Xingyu]
```

Componentes:

- `conversation-lead-header.tsx` — identidade + metadata + seletor
- `pipeline-stage-selector.tsx` — dropdown de etapas
- `conversation-empty-state.tsx` — estado sem seleção
- `hooks/use-move-deal-stage.ts` — mutation compartilhada (`dealsApi.move`)
- `conversation-selection.ts` — `conversation` ausente ⇒ `null` (sem auto-select)
- `pipeline-stage-utils.ts` — ordenação e label da etapa

## Sem auto-seleção

Ausência de `conversation=` é estado válido. Empty state central; lista à esquerda; painel direito pede seleção. Não há `router.replace` bootstrap.

## Empty state

Copy: “Nenhuma conversa selecionada” / “Selecione uma conversa ao lado…”. Sem CTA.

## Seta e OPEN

Seta só em `md:hidden` (mobile). `OPEN` não é renderizado no header. Status permanece no modelo/API.

## Display name / lead code / responsável / canal

Reutiliza `conversationContactDisplayName`, `formatLeadCode`, `assigneeShortCode` e `ConversationChannelBadge` (mesma lógica dos cards).

## Etapa

Fonte única: `Deal.stageId`. Stages vêm de `pipelinesApi.get(pipelineId).stages` ordenadas por `position`. Mutation: `PATCH /deals/:id` `{ stageId }` via `dealsApi.move`.

Optimistic update + rollback; toasts:

- sucesso: `Lead movido para {etapa}.`
- erro: `Não foi possível alterar a etapa do lead.`

Invalidates: board, detail do pipeline, lists, deal detail, conversation detail/context.

## Filtros

Se o lead sai do filtro de etapas após o move, a thread permanece aberta e `conversation=` permanece na URL.

## URL

Seleção só altera `conversation`, preservando `view`, `q`, filtros. Sem seleção automática.

## Segurança

Backend continua validando organização/pipeline do stage. Frontend não cria segunda fonte de verdade.

## Acessibilidade

`aria-label` no código, responsável, canal e seletor (`Alterar etapa do lead. Etapa atual: …`). Teclado: Escape fecha o menu; trigger clicável inteiro.

## Testes

Unitários: seleção, display helpers, stages, contratos de patch. E2E: empty state, header, move + sync Kanban, filtro de etapa, conversation inválido.

## Limitações

- Seta mobile preservada; sem redesign mobile completo.
- Sem badge excepcional para RESOLVED/ARCHIVED nesta tarefa.
- Troca de responsável/canal fora do escopo.
- Sem `Tooltip` Radix (usa `title` nativo).
