# Correção da âncora do seletor de status

O círculo de cada tarefa continua sendo simultaneamente trigger e âncora, agora com alvo de clique de 28 px, botão semântico, `aria-label`, `aria-expanded`, foco visível e retorno de foco ao fechar com Escape. A linha inteira não abre o seletor.

O Popover mede a altura real do conteúdo no Portal e calcula colisão a partir dessa medida. Para tarefas, a configuração é `side="bottom"`, `align="start"`, `sideOffset={6}`, `collisionPadding={8}` e largura de 180 px. Ele abre abaixo quando há espaço, inverte para cima somente quando necessário, limita-se à viewport e recalcula em resize ou scroll, sem coordenadas específicas do painel.

O menu mantém padding de 6 px, itens de 32 px e rolagem interna para muitas opções. O status atual recebe destaque e foco inicial. Labels, cores, ordem e quantidade permanecem dinâmicos a partir de `TaskStatusDefinition`; labels longos são truncados visualmente e preservados no atributo `title`, sem criar requests por tarefa.

A mutation, o update otimista, o rollback e todas as invalidações existentes foram preservados. Por isso, concluir uma tarefa atualiza a lista e a contagem abertas, e as invalidações sincronizam o sino do Kanban e demais consumidores sem reload nem reset deliberado do scroll.

Não há migration, biblioteca nova ou mudança de backend.
