# Negociação no Contexto do Lead

## Objetivo da seção

A seção **Negociação** representa o **Deal atual** vinculado à conversa/lead em atendimento — não uma lista de negociações.

```
Contato (ex.: Luciana Vargas)
        ↓
Deal atual (Lead #0028)
        ├── Pipeline: Novos leads
        └── Etapa: Novo
```

A lista de outros Deals do contato permanece em **Outras negociações**.

## Estrutura final

Fechado:

```
> Negociação
```

Aberto:

```
⌄ Negociação

Lead #0028

Pipeline: Novos leads
Etapa: Novo
```

## O que foi removido (somente nesta seção)

| Elemento | Motivo |
|----------|--------|
| Contador `1` / `0` no header | Parecia notificação/pendência; a seção não é lista |
| `Deal.name` / título interno | Ruído operacional; o Lead # já identifica |
| Link “Abrir negociação” + ícone externo | O painel já mostra o necessário no atendimento |

O título do Deal **continua** no banco, API e outras telas (ex.: Outras negociações). Apenas **não é renderizado** aqui.

## Contadores de outras seções

Preservados:

- Tarefas
- Pedidos
- Notas
- Arquivos
- Histórico

`CollapsibleSection` continua aceitando `count?: number`. Negociação simplesmente **não passa** `count`.

## Fontes de verdade

| Campo | Fonte |
|-------|--------|
| Lead # | `formatLeadCode(currentDeal.leadSequence)` |
| Pipeline | `context.pipeline.name` (Deal → Pipeline) |
| Etapa | `context.stage.name` / `currentDeal.stageName` (Deal.stageId) |

Fallback:

- Pipeline ausente → `Não informado`
- Etapa ausente (com Deal) → `Sem etapa`
- Sem Deal → `Sem negociação vinculada.`
- Lead code legado ausente → omite a linha (sem `Lead #undefined`)

## Sync

`useMoveDealStage` invalida `conversations.context`. Alterar a etapa no header central atualiza:

- Negociação → `Etapa: …`
- Resumo → badge de etapa
- Lista / Kanban (mesma `stageId`)

Sem polling; accordion só revela dados já carregados no context.

## Fora de escopo

- Transformar Negociação em lista
- CTA substituto (“Ver negociação”, “Ir para Kanban”, …)
- Migration / alteração de `Deal.name` / API nova
- Mudanças em Resumo, Canal, thread, composer, Kanban visual
