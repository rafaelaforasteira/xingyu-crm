# Auditoria — contexto do lead, scroll e tags

| Requisito         | Implementação anterior                 | Arquivo                  | Source of truth          | Ação                                                     |
| ----------------- | -------------------------------------- | ------------------------ | ------------------------ | -------------------------------------------------------- |
| Panel root/altura | Flex parcial, body sem `min-h-0`       | `lead-context-panel.tsx` | Workspace com `min-h-0`  | `h-full min-h-0 overflow-hidden`                         |
| Scroll/header     | Body rolável; header irmão             | `lead-context-panel.tsx` | CSS flex                 | Header `shrink-0`, body `flex-1 min-h-0 overflow-y-auto` |
| Accordion         | Estado local por seção                 | `CollapsibleSection`     | UI                       | Estado controlado e compartilhado                        |
| Default/session   | Apenas Resumo aberto                   | `lead-context-panel.tsx` | Session UI               | Todas abertas + `sessionStorage`                         |
| Seções            | Ordem já aprovada                      | `ContextBody`            | Context DTO              | Ordem preservada                                         |
| Rastreamento      | Aquisição/UTM                          | `lead-tracking-utils.ts` | Attribution/Message      | Mantido; Tags após divisória                             |
| Tags              | União Contact + Deal                   | `getContext`             | `ContactTag` e `DealTag` | Bloco interno em Rastreamento                            |
| Tag schema        | Relacional e org-scoped                | `schema.prisma`          | Tag/ContactTag/DealTag   | Reutilizado, zero migration                              |
| Tag list/create   | Settings API                           | `settings.service.ts`    | `/settings/tags`         | Reutilizada, trim e duplicidade case-insensitive         |
| Tag assign/remove | Contact bulk; Deal sem rota específica | Contacts/Deals services  | Relações reais           | Validação org + rotas idempotentes de Deal               |
| Cores             | `Tag.color`                            | Tag                      | Banco                    | Indicador tonal discreto                                 |
| Cache             | Context, conversations e board         | `query-keys.ts`          | React Query              | Optimistic update e invalidação focada                   |
| Kanban            | Consome tags de Contact e Deal         | `pipelines.service.ts`   | Board DTO                | Sincronizado sem nova consulta por card                  |

Não existe accordion independente chamado Tags. Tasks, Orders, Notes, Files, History e Other Deals mantêm seus componentes e limites de preview.
