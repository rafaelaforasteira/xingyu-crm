# Limpeza e ordenação dos pipelines

A navegação continua totalmente dinâmica. O backend retorna pipelines ativos por `position`, usando `name` e `id` como desempates determinísticos. A API atribui a um novo pipeline a maior `position` atual mais um; editar nome ou descrição não altera a posição.

A sidebar deriva o número do índice da lista ordenada, com `String(index).padStart(2, "0")`. O número não é persistido e o header do workspace usa apenas `Pipeline.name`. Assim, renomear preserva o número, criar acrescenta ao fim e uma futura reordenação por `position` recalculará automaticamente todos os rótulos.

O badge de total foi removido do item pai `Pipelines`. Chevron, estado ativo, ícones, recuo, truncamento de nomes longos e o atalho `Todos os leads` foram preservados. Esse atalho não pertence à lista recebida da API e não entra na numeração.

Depois da limpeza local, a navegação ativa é:

- `01. COMERCIAL PRINCIPAL`
- `02. PÓS-VENDA`

Um terceiro pipeline legítimo continua permitido e aparecerá como `03`, sem filtros permanentes por nome.
