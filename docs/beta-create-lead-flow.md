# Criação manual de lead

O fluxo “Criar lead” cria uma negociação (`Deal`) e identifica a pessoa (`Contact`) sem pedir um nome técnico para o card. O backend aloca o `leadSequence` permanente e atômico da organização e gera internamente `Lead #xxxx · Nome do contato`.

## Identidade e duplicidade

O telefone é normalizado de forma conservadora: pontuação é removida e o código 55 é acrescentado apenas a números nacionais de 10 ou 11 dígitos. O nono dígito nunca é inventado ou removido. Após debounce de 350 ms, o frontend consulta o endpoint de lookup. E-mail sozinho é apenas um possível match e não vincula automaticamente contatos.

- telefone desconhecido: cria Contact e Deal;
- Contact conhecido sem Deal `OPEN` no pipeline atual: reutiliza o Contact e permite nova negociação;
- Deal `OPEN` no mesmo pipeline: bloqueia e oferece “Verificar lead”;
- Deal encerrado ou pertencente a outro pipeline: não bloqueia.

O submit repete a verificação no backend. Um advisory lock transacional por organização, pipeline e Contact fecha a janela de corrida entre lookup e criação. Isolamento organizacional está presente em todas as consultas.

## Negociação e contexto inicial

As etapas vêm do pipeline atual e a seleção inicial usa `isInitial`, com fallback para a primeira posição. Responsável usa o default do pipeline ou o usuário atual. Valor ausente é enviado como `undefined`, distinto de zero. A origem informada é persistida no Deal e, quando preenchida, em `Attribution` com fonte manual, sem fabricar UTM.

Anotação e tarefa são opcionais e expansíveis. Quando informadas, são criadas como Note e Task reais, ligadas ao Contact e Deal. A tarefa usa o primeiro status configurado com categoria `OPEN` e o responsável do Deal.

Contact, Deal, histórico inicial de etapa, Attribution, Note, Task e eventos `DEAL_CREATED`, `NOTE_CREATED` e `TASK_CREATED` são gravados na mesma transação. O Deal nasce diretamente na etapa escolhida; nenhum movimento falso entre etapas é registrado.

## Sincronização e limitações

Após sucesso, caches de board, pipelines, contatos e conversas são invalidados, o modal fecha e o Deal é aberto na Operação sem perder os demais parâmetros relevantes da URL.

Não foram implementados multi-phone, merge, resolução probabilística de identidade, tags, temperatura, endereço, produtos ou seleção de pipeline. Telefones legados não normalizados precisam de saneamento futuro para equivalência completa. Nenhuma migration foi necessária.
