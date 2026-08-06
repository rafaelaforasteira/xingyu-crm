# Compositor de mensagens — polish

Branch: `feature/beta-conversation-composer-polish`  
Base: `feature/beta-conversation-list-crm-cards`

## Problema anterior

Os botões compartilhavam `items-end` com uma coluna que incluía o textarea **e** o texto auxiliar. Isso deslocava emoji/anexo/mic/enviar para baixo do centro do campo. A borda e o scroll viviam no próprio `Textarea`, deixando a barra visualmente colada à borda e perto do microfone.

## Estrutura final

Flex de 3 colunas (`shrink-0 | flex-1 min-w-0 | shrink-0`) com `items-end`:

1. linha principal: ações esq · wrapper do campo · ações dir  
2. linha do hint: spacers · texto auxiliar · spacers  

(Nota: `grid-cols-[…]` arbitrário não estava entrando no CSS gerado pelo Tailwind neste app; flex é a implementação estável.)

## Alturas

- Mínima: **44px** (`MIN_COMPOSER_TEXTAREA_HEIGHT`)
- Máxima: **160px** (`MAX_COMPOSER_TEXTAREA_HEIGHT`)
- Botões: **40×40** (`h-10 w-10`)

## Scroll

Antes do limite: `overflow-y: hidden`.  
No limite: `overflow-y: auto` no textarea interno.  
Wrapper: borda + `overflow-hidden` + `focus-within`. Textarea sem borda própria; `scrollbar-gutter: stable`.

## Teclado

- Enter → `shouldSendOnEnter` → `submitMessage` (mesmo do botão)
- Shift+Enter → quebra nativa
- Composição IME / keyCode 229 → não envia

## Ortografia

`spellCheck`, `lang="pt-BR"`, `autoCorrect="on"`, `autoCapitalize="sentences"`.  
Sugestões dependem do navegador/SO; sem API externa; context menu não bloqueado.

## Limitações

Áudio/anexo/emoji picker existentes preservados, sem novo provider WhatsApp. Ortografia nativa não é controlada pixel a pixel pelo CRM.
