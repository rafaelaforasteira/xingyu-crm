# Rastreamento no Contexto do Lead

O fluxo [Criar lead](./beta-create-lead-flow.md) registra separadamente a origem informada manualmente, sem fabricar parâmetros UTM.

## Antes → Depois

**Antes:** seção `Canal` com badge do canal.

**Depois:** seção `Rastreamento` com origem, entrada, primeiro contato, criação do Deal e UTMs estruturados quando existirem.

## Fontes

| UI                | Fonte                                                            |
| ----------------- | ---------------------------------------------------------------- |
| Origem            | `context.channel` (Conversation → Channel)                       |
| Entrada           | `tracking.firstContactDirection` → Mensagem recebida / enviada   |
| Primeiro contato  | `tracking.firstContactAt` (1ª Message por `sentAt ASC`, backend) |
| Criado em         | `tracking.leadCreatedAt` = `Deal.createdAt`                      |
| UTM *             | `Attribution` do contato com `orderId = null`                    |
| Página de entrada | `Attribution.page` se preenchido                                 |

Sem Attribution: **UTM · Não identificada** (sem inventar valores).

## Contador

Sem badge numérico.

## Fora de escopo

- Tags CRM automáticas a partir de UTM
- Shopify / matching / SaleTrackingRecord
- UI de “Rastreamento de vendas” sem dados reais

Ver `docs/beta-lead-tracking-audit.md` e `docs/future-sales-tracking-architecture.md`.
