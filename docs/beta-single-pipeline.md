# Beta Single-Pipeline UI

## Propósito

Entregar a interface oficial do **beta single-pipeline** do Xingyu CRM: um único pipeline operacional com a aparência aprovada do pipeline clássico (`e3dad237`), sem expor os demais módulos do CRM.

## Pipeline único

- Variável: `NEXT_PUBLIC_BETA_PIPELINE_ID` (padrão `pipe-novos`)
- Modo: `NEXT_PUBLIC_BETA_SINGLE_PIPELINE_MODE` (ativo quando diferente de `false`)
- Sem seletor de pipeline; parâmetros `pipeline` arbitrários na URL são ignorados/removidos

## Rota principal

- `/operacao` → Kanban (default)
- `/operacao?view=kanban`
- `/operacao?view=kanban&deal=<id>`
- `/operacao?view=conversations`
- `/operacao?view=conversations&conversation=<id>`

## Fonte visual

Commit autoritativo: `e3dad237777a571cd17aedc8c00595317f1ed96f`  
(`feat: improve inbox conversation experience`)

Ver mapa detalhado em [`beta-single-pipeline-source-map.md`](./beta-single-pipeline-source-map.md).

## Shell

- **Sidebar**: somente item Operação; usuário + Sair no rodapé
- **Header**: topbar clássica (Hoje, sino, busca, + Novo). Ações de módulos ocultos mostram toast “Disponível nas próximas etapas do beta”
- **Main**: padding clássico do AppShell (sem `h-dvh` / header interno da antiga OperationPage)

## Kanban

Composição espelhada de `PipelineBoardPage`:

- PageHeader (nome + descrição do pipeline)
- PipelineViewSwitcher (Kanban / Conversas)
- Botão **Criar card**
- `KanbanBoard` (visual padrão, sem `variant="operation"`)
- Clique no card → `DealWorkspaceDrawer` (desktop) / fullscreen (mobile)
- Abas do drawer: Conversa, Resumo, Tarefas, Pedidos, Histórico, Arquivos + composer

## Conversas

Composição espelhada de `PipelineConversationsPage` + `ConversationWorkspace`:

- PageHeader + switcher
- Workspace card `max-w-[1480px]` com **três colunas** (280 / flex / 300)
- Lista com busca e filtros internos
- Thread central + composer
- `LeadContextPanel` à direita (Resumo, Negociação, Canal, Tarefas, Pedidos, Notas, Arquivos, Histórico, Outras negociações)

## Módulos ocultos

Com o modo beta ativo, rotas autenticadas como `/dashboard`, `/pipelines`, `/inbox`, `/contacts`, `/settings`, etc. redirecionam para `/operacao`. Arquivos e APIs **não** são apagados.

## Como desativar

```env
NEXT_PUBLIC_BETA_SINGLE_PIPELINE_MODE=false
```

A rota `/operacao` volta a usar `OperationPage` (layout operacional anterior). A navegação completa (ou core+settings) depende também de `NEXT_PUBLIC_CORE_OPERATION_MODE`.

## Limitações desta rodada

- Sem WhatsApp Cloud / Evolution / webhooks / realtime
- Sem múltiplos pipelines
- Header Hoje / busca / Novo ainda não abrem módulos completos
- Funcionalidades incompletas do drawer/contexto usam dados existentes e empty states

## Próximos passos

1. Integração real de canal (envio/recebimento)
2. Reativar módulos gradualmente (Configurações, Contatos)
3. RBAC e multi-pipeline quando o beta validar o fluxo único
