# Timeline de Histórico do lead

O fluxo [Criar lead](./beta-create-lead-flow.md) inicia o histórico com `DEAL_CREATED` e, quando aplicável, `NOTE_CREATED` e `TASK_CREATED`.

Histórico é a memória operacional automática, append-only e imutável do card. Usuários não escrevem eventos manualmente e a UI não reconstrói o passado pelo estado atual.

O backend reutiliza `Activity`. Mutations de deal, nota, tarefa e arquivo persistem o evento junto com a alteração principal em transação. Metadata guarda somente etapa/responsável anterior e novo e IDs técnicos. Corpo de notas, descrição de tarefas, mensagens e PII não são copiados.

O painel mostra cinco eventos recentes em ordem decrescente. O diálogo completo mantém a conversa e a URL, agrupa por Hoje/Ontem/data e pagina em blocos de 20. Actor é carregado na mesma query, com avatar/iniciais, tooltip e fallback Sistema. Datas usam o timezone padrão do CRM.

Consultas usam a organização autenticada, validam o deal e evitam N+1. Usuários desativados continuam renderizáveis. Tipos desconhecidos têm fallback seguro. Eventos antigos não são sintetizados; archive/reactivate, remoção de tag e pedidos dependem de instrumentação futura de suas mutations reais.

Movimentos em lote causados pela exclusão de uma etapa produzem, para cada Deal afetado, o mesmo evento de ciclo de vida `STAGE_CHANGED`, com ator e snapshots das etapas de origem e destino.
