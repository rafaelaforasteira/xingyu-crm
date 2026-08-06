# Auditoria — compositor de mensagens

Base: `feature/beta-conversation-list-crm-cards` (`f6ec241`).  
Branch: `feature/beta-conversation-composer-polish`.

## Componente encontrado

`apps/web/src/components/crm/conversation/conversation-composer.tsx`  
Montado em `conversation-thread.tsx` no rodapé da coluna central (`flex-shrink` implícito via fluxo: messages `flex-1 min-h-0`, composer abaixo).

## Estrutura atual

```
composer-shell (border-t)
  anexos / áudio / gravação (opcionais)
  form.flex.items-end
    [emoji] [anexo] [textarea + hint] [mic] [enviar]
```

O texto auxiliar fica **dentro** da coluna `flex-1` do textarea.

## Handlers

- Teclado: `shouldSendOnEnter` em `inbox-utils.ts` (Enter envia; Shift+Enter e `isComposing`/keyCode 229 não enviam).
- Envio: `submitMessage` + `form onSubmit` + botão `type="submit"` (mesmo fluxo).
- Auto-resize: `resizeTextarea` local — `height = min(max(scrollHeight, 44), 130)`.

## Causa do desalinhamento

`items-end` no form alinha emoji/mic/enviar à **borda inferior da coluna do campo**, que inclui o hint (`mt-1`). Os botões ficam visualmente abaixo do centro do textarea.

## Causa do scrollbar “fora”

O `Textarea` compartilhado traz borda própria; o scroll rola no próprio elemento com borda. Sem wrapper com `overflow-hidden` + padding direito estável, a trilha fica colada à borda e visualmente perto do microfone. `min-h-[80px]` do UI base também conflita com `min-h-[44px]`.

## Reutilizado

- `Button`, `Textarea` (UI)
- `ConversationEmojiPicker` (já existe)
- Anexos/gravação existentes (preservar; sem ampliar escopo)
- `shouldSendOnEnter` / `canSendMessage`

## Estratégia

1. Flex de 3 colunas (`items-end`): ações esq | wrapper do campo (`flex-1 min-w-0`) | ações dir.
2. Hint na segunda linha, só sob a coluna do campo (spacers laterais).
3. Wrapper com borda/`focus-within`; textarea sem borda própria; overflow dinâmico; `scrollbar-gutter: stable`.
4. Hook `useAutoResizeTextarea` com min 44 / max 160.
5. `spellCheck`, `lang="pt-BR"`, `autoCorrect`, `autoCapitalize`; sem bloquear context menu.
6. Não alterar lista, filtros, cards, header, painel.
7. Evitar `grid-cols-[…]` arbitrário — neste projeto o utilitário não era emitido e o layout empilhava em bloco.
