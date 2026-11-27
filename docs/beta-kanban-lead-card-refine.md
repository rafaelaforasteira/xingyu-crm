# Card operacional do lead no Kanban

O card do Deal é um resumo de decisão rápida, sem substituir o Contexto do Lead. A hierarquia é Lead Code permanente, nome real do Contact, telefone principal formatado, valor, última mensagem e chips operacionais.

O badge roxo usa exclusivamente `Conversation.unreadCount`. A rail direita mostra responsável, quantidade de tarefas abertas e a prioridade do Deal. Tarefas abertas usam `TaskStatusDefinition.category != DONE`, com fallback para os estados legados pendente/em andamento. O resumo agregado contém apenas `open`, `today` e `overdue`.

O sino fica neutro para tarefas futuras, âmbar para hoje e vermelho para atrasadas. Estados de hoje/atraso recebem um wiggle CSS curto em ciclo de dez segundos; `prefers-reduced-motion` desativa a animação. Prioridades LOW, MEDIUM, HIGH e URGENT usam uma Flag com intensidade progressiva; temperatura não é exibida.

Valor zero/ausente, telefone ausente e última interação ausente são omitidos. “Última interação” usa exclusivamente a última Message não interna. Canal aparece antes das tags reais; no máximo dois chips principais são mostrados e o restante vira `+N`, com tooltip. Canal duplicado como tag é removido.

Drag-and-drop, clique, seleção, colunas, contadores e scroll do board foram preservados. O endpoint do board continua sendo uma única chamada HTTP. Contato, owner, tags, conversa e tarefas são carregados em consultas agregadas no backend, sem request por card. O componente é independente do nome e da quantidade de pipelines.

Limitações: Deals legados sem `leadSequence` usam “Lead sem código”; o schema atual torna prioridade obrigatória com default MEDIUM; avatar continua usando o componente existente, que aplica iniciais quando não há foto.
