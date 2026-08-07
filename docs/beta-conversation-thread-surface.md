# Superfície visual da thread de conversas

## Problema anterior

A área de mensagens usava um único `div` com `conversation-thread-bg` + `overflow-y-auto`: cantos quadrados, scrollbar no extremo direito e textura (quando existia) rolando junto com as mensagens.

## Estrutura final

```
ConversationLeadHeader          (branco — sem textura)
ConversationThreadShell         (bege #efeae2, rounded-2xl, overflow-hidden)
  ├── texture layer             (absolute, pointer-events-none, aria-hidden)
  └── scroll container          (listRef, overflow-y-auto)
ConversationComposer            (fora do shell — sem textura)
```

Empty state (`!conversationId`) permanece branco/neutro, **sem** shell/textura.

## Radius e clipping

- `rounded-2xl` ≈ **16px**
- Shell: `overflow-hidden` (+ `isolate`)
- Scroll container fica **dentro** do shell → scrollbar clipada pelo raio

## Cor e textura

- Base: `#efeae2` (mesma bege)
- Textura: CSS `radial-gradient` + `linear-gradient` (pontos, arcos incompletos, traços diagonais)
- Repetição ~96–140px; opacidade perceptual ~3–5%
- Textura **fixixa** na shell (não rola com mensagens)
- Sem PNG/JPG/SVG externo

## Scrollbar

- Classe `conversation-thread-scroll`
- Largura ~7px (WebKit)
- Thumb cinza/lilás dessaturado; track transparente
- `scrollbar-gutter: stable`
- `margin` no track + `border` no thumb para respiro (~2–4px)
- **Não** ocultada

## Scroll / paginação

- `listRef` permanece no elemento rolável
- Auto-scroll via `messagesEndRef` inalterado
- Load older preserva `scrollTop`/`scrollHeight` como antes

## Fora de escopo (preservado)

Header, composer, balões, separadores, lista, painel, filtros, Kanban.

## Testes

- Unit: contratos de classes do shell/texture/scroll
- E2E: radius computado, overflow, bbox contida, empty sem textura, load older, screenshots

## Limitações

- Textura abstrata própria (não doodles WhatsApp)
- Estilos `::-webkit-scrollbar` específicos do Chromium; Firefox usa `scrollbar-width`/`scrollbar-color`
- Margem leve (`mx-1.5` / `my`) para o raio respirar sobre `bg-muted/20`
