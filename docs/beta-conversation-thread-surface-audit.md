# Auditoria — superfície visual da thread de conversas

Base: `feature/beta-conversation-lead-header` (`c63034c`).
Objetivo: mapear scroll, background e clipping antes de arredondar + textura.

---

## 1. Componente da thread

**Arquivo:** `apps/web/src/components/crm/conversation/conversation-thread.tsx`

| Peça | Detalhe |
|------|---------|
| Shell externo | `<section data-testid="conversation-pane">` — coluna flex, sem radius próprio |
| Header | `ConversationLeadHeader` (branco) — fora da área de mensagens |
| Lista de mensagens | `div` com `ref={listRef}` — **mesmo elemento** tem background + scroll |
| Composer | `ConversationComposer` — irmão abaixo da lista |
| Empty state | `ConversationEmptyState` quando `!conversationId` — fundo branco, sem bege |

---

## 2. Background atual

**Classe:** `conversation-thread-bg` em `apps/web/src/app/globals.css` L62–71

- Cor base: `#efeae2` (bege aprovado)
- Já existe `background-image` com dots + diagonais em preto ~1–3.5% opacity
- Dark: `hsl(var(--muted) / 0.35)` + dots em foreground

**Problema:** texture e scroll estão no **mesmo** elemento; o pattern rola com as mensagens; cantos quadrados; scrollbar no edge do overflow.

---

## 3. Elemento rolável atual

```
div[ref=listRef]
  class: conversation-thread-bg scrollbar-thin flex-1 space-y-2 overflow-y-auto p-3 sm:p-4
  data-testid: message-list
```

| Comportamento | Implementação |
|---------------|---------------|
| Auto-scroll | `messagesEndRef.scrollIntoView` quando `stickToBottomRef` |
| Load older | `listRef.scrollHeight/scrollTop` preservados em `handleLoadOlder` |
| Scrollbar | utilitário global `.scrollbar-thin` (`scrollbar-width: thin`, `scrollbar-color`) |

**Crítico:** `listRef` **deve** continuar no elemento com `overflow-y-auto`.

---

## 4. Radius / clipping atual

- Workspace colunas: `rounded-xl` no grid externo
- Thread message area: **sem** `rounded-*` / `overflow-hidden`
- `--radius`: `0.875rem` (14px); Tailwind `rounded-2xl` default = 16px

---

## 5. Estratégia adotada

```
ConversationThreadShell (bege + overflow-hidden + rounded-2xl)
  ├── texture layer (::before ou div aria-hidden, pointer-events-none, fixed na shell)
  └── ConversationThreadScroll (listRef, overflow-y-auto, z-1)
        └── messages / separators / load-older
```

- Textura **não** rola com mensagens (fica no shell)
- Empty state **sem** textura
- Header / composer **fora** do shell
- Scrollbar: estilos específicos + gutter/respiro; clipping pelo shell
- Manter `#efeae2`; refinar pattern abstrato (3–6% perceptual)
- Sem PNG/SVG externo; 2–4 gradients CSS
