# Contexto do lead: ficha vertical e tags

O painel usa a cadeia de altura do workspace: root `h-full min-h-0`, header fora do overflow e body `min-h-0 flex-1 overflow-y-auto`. Assim lista, thread e contexto mantêm scrolls independentes. Refetches preservam o elemento e sua posição; trocar `conversationId` volta somente o body do contexto ao topo.

As nove seções começam abertas. O estado é controlado no painel e salvo em `sessionStorage`, portanto fechar uma seção permanece ao trocar de lead na mesma aba. Dados novos ou sessão sem preferência herdam o padrão aberto.

Rastreamento mantém aquisição, entrada, primeiro contato, criação e UTMs como dados de atribuição. Depois de uma divisória leve há o bloco Tags, que representa classificações internas. Channel e UTMs não são convertidos automaticamente em tags.

Tags usam chips de 24 px, `rounded-md`, wrap, ellipsis e nome completo em `title`. O seletor portalizado permite busca, associação, remoção por touch e criação compacta. Remoção também está disponível no chip.

Listagem e criação reutilizam Settings. Associações usam `DealTag` quando existe Deal e `ContactTag` como fallback. Backend valida Deal/Contact e Tag na mesma organização; criação normaliza o nome e evita duplicidade case-insensitive. Inclusão é idempotente e `TAG_ADDED` entra no histórico do Deal.

O Context é atualizado otimisticamente, com rollback e toast em falha. Ao concluir, são invalidados Context, listas de conversas e boards; não há request por card nem migration.

Limitações: o enum de histórico possui `TAG_ADDED`, mas não `TAG_REMOVED`; remoções são persistidas sem inventar um evento incorreto. A criação e associação usa duas APIs existentes em sequência, então uma falha rara na associação pode deixar a nova Tag disponível, porém não vinculada.
