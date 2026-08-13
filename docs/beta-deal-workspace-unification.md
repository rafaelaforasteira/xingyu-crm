# Deal Workspace unificado

O drawer lateral aprovado continua sobre o Kanban, com a mesma largura, overlay, fechamento e estado por URL. Sua estrutura agora é header fixo, tabs fixas, conteúdo rolável independente e composer fixo fornecido pelo `ConversationThread`.

O header usa nome do contato, Lead # permanente, telefone formatado, valor do Deal, canal, seletor compartilhado de etapa, responsável, contador de tarefas e prioridade. O título artificial do Deal e chips de temperatura não são apresentados.

As tabs são: Conversa, Visão geral, Tarefas, Pedidos, Notas, Arquivos e Histórico. Cada uma compõe o componente usado no modo Conversas; apenas a tab ativa é montada. A Conversa não mistura notas no histórico de mensagens.

Mudanças de stage usam o hook e caches compartilhados, permitindo que o card mude de coluna sem fechar o drawer. Tasks, notes, files e seus efeitos em histórico e indicadores mantêm as mutations e invalidações já consolidadas.

Não houve alteração de schema, backend, autenticação, integrações ou layout do Kanban.
