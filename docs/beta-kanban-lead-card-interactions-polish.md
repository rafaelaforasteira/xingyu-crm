# Polimento e interações do card Kanban

O Lead Code mantém o primeiro nível com peso `medium`. O bloco de contato recebeu 12 px de respiro; nome e telefone usam `text-xs`, peso normal e cor muted. O valor permanece na cor primary, com 16 px de margem. A última interação também recebeu 16 px para distribuir melhor o card.

Channel e tags têm 20 px de altura, `rounded-md`, fonte de 10 px e largura máxima de 116 px. `truncate` combina overflow, ellipsis e nowrap; `title` expõe o conteúdo completo. O limite continua em dois chips e `+N` lista os extras no tooltip.

O rail agora contém três botões reais:

- responsável abre um Popover pesquisável de membros e persiste `ownerId`;
- Bell abre `LeadTasks` filtrado pelo Deal, inclusive no estado vazio;
- Flag abre o seletor dos níveis persistidos de `Deal.priority`.

Responsável e prioridade atualizam o estado local de forma otimista, fazem rollback com toast em falha e invalidam somente board, deal, histórico e conversas relevantes. O backend existente mantém isolamento organizacional e registra mudanças de responsável no histórico.

O Bell permanece cinza sem tarefas ou apenas com tarefas futuras, âmbar para hoje e vermelho para atrasadas. Seu contador é o total aberto. Somente o ícone anima por aproximadamente 600 ms dentro de um ciclo CSS de 10 segundos; reduced motion desativa o movimento.

Os controles interrompem pointer/click propagation para não iniciar drag nem abrir o card. O restante do card mantém DnD, clique e teclado. Há uma única consulta compartilhada de membros e nenhuma consulta adicional por card.

Limitação: o schema não possui prioridade `NONE`; valores legados ausentes têm visual neutro, mas limpar prioridade exigiria mudança de domínio/migration e ficou fora do escopo.
