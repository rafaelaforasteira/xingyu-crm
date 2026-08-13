# Resumo do Contexto do Lead

## Estrutura anterior

```
[LV] Nome
     Ver contato
email|phone|whatsapp (raw)
tags (ex.: Lead WhatsApp, Quente)
Responsável: …
```

## Estrutura final

```
[LV] Nome
     +55 (47) 98833-4464
[WhatsApp Xingyu] [Novo|Em negociação|…]
Responsável: …
```

## Alterações

- Removido “Ver contato” do Resumo (rota `/contacts` permanece no app).
- Telefone principal abaixo do nome via `formatPhoneForDisplay`.
- Fonte do telefone: `contact.phone` → fallback `contact.whatsapp`.
- Email não substitui o telefone no Resumo.
- Tags deixam de ser exibidas no Resumo (dados preservados no banco).
- Canal: `ConversationChannelBadge` com `context.channel`.
- Etapa: `context.stage.name` / `currentDeal.stageName` (Deal.stageId).
- Responsável: texto read-only (`Não atribuído` se ausente).

## Formatação BR

- Móvel 9 dígitos: `+55 (DDD) XXXXX-XXXX`
- Fixo 8 dígitos: `+55 (DDD) XXXX-XXXX`
- **Não** adiciona nem remove o nono dígito
- Persistência inalterada (somente display)
- Internacional: representação conservadora com `+` e dígitos

## Sync

`useMoveDealStage` já invalida `conversations.context` → badge de etapa no Resumo acompanha header, lista e Kanban.

## Fora de escopo (documentado para o futuro)

- Múltiplos telefones / `[+2]` / Outros números
- Deduplicação / “pode ser a mesma pessoa”
- Vínculo de contatos / merge
- Conversas por número permanecem entidades distintas mesmo após vínculo futuro:
  - Número A → Conversa A
  - Número B → Conversa B
- Alteração de responsável / RBAC
- click-to-call / wa.me

## Limitações

Sem `libphonenumber`; máscara BR apenas quando a estrutura é inequívoca (55 + 10/11 dígitos nacionais, ou 10/11 nacionais sem `+`).
