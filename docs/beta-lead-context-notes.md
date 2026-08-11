# Notas no contexto do lead

## Escopo

A seção **Notas** do contexto do lead agora funciona como um histórico de anotações internas, vinculado exclusivamente à negociação atual. O editor inline aceita texto simples de até 5.000 caracteres, rejeita conteúdo vazio e preserva o texto digitado quando a API falha.

A visão compacta mostra as três notas mais recentes com autor, avatar ou iniciais e data/hora. O contador usa o total retornado pela API e o diálogo **Ver todas as notas** apresenta o histórico completo carregado. Notas são append-only nesta entrega: não há ações de edição ou exclusão.

## Nota para tarefa

A ação **Criar tarefa a partir da nota** reutiliza o mesmo `CreateTaskDialog` da seção Tarefas. O título começa vazio, a descrição recebe o texto da nota e os padrões de status, responsável e vencimento permanecem iguais aos do fluxo normal.

`Task.sourceNoteId` registra a origem no backend. A validação garante que nota, tarefa e negociação pertençam à mesma organização e ao mesmo deal. O modelo permite que uma nota origine várias tarefas; nesta versão, a interface destaca apenas a tarefa mais recente. Mudanças de status invalidam o cache de notas para manter o indicador sincronizado.

## Dados e segurança

- A autoria vem do usuário autenticado resolvido pelo backend; o cliente não envia `authorId`.
- Conteúdo é renderizado como texto React, sem interpretação de HTML.
- A migration `20260811020000_add_note_task_link` adiciona a chave estrangeira opcional e índices para vínculo e histórico por negociação.
- Nenhuma nota é enviada ao WhatsApp ou exposta em mensagens externas.

A criação da nota gera “Adicionou uma nota” no Histórico do deal; `Note.content` nunca é duplicado no evento.
