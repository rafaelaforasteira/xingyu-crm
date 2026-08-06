# Filtros de conversas — popover (beta)

## Problema

Filtros “Todos os canais”, “Não lidas” e “Aguardando resposta” ficavam sempre visíveis abaixo da busca, empurrando a lista e poluindo a coluna.

## Solução

Linha única: **Buscar conversas…** + botão circular com ícone `Filter`.

Opções abrem em popover (Portal), com draft/aplicado e rodapé Limpar / Aplicar.

## URL (após Aplicar)

| Param | Significado |
|-------|-------------|
| `channels` | IDs CSV (OR) |
| `unread=1` | unreadCount > 0 |
| `reply=mine\|customer` | última msg INBOUND / OUTBOUND |
| `conversationState=open\|closed` | OPEN/PENDING vs RESOLVED/ARCHIVED |
| `stages` | IDs CSV (OR) |
| `tags` | IDs CSV (OR) |
| `period` | today \| 7d \| 30d \| older30 |

Preserva `view`, `conversation`, `q`.

## Semântica

- Unread ≠ aguardando minha resposta.
- OR dentro de canais/etapas/tags; AND entre grupos.
- Etapas: pipeline beta (`BETA_PIPELINE_ID`).
- Tags: contato ou deal (`settings/tags`).
- Canais: conexões ativas do pipeline.
- Sem filtro de responsável.

## Ordenação

Prioridade: inbound+unread → inbound → outbound → outras abertas → encerradas; depois `lastMessageAt` desc (backend offset list).

## Limitações

- Ordenação custom usa candidatos em memória (adequado ao volume beta).
- Canais são por organização (sem membership por usuária no schema).
- Cursor pagination mantém ordenação antiga.
