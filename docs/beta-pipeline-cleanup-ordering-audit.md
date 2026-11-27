# Auditoria de limpeza e ordenação dos pipelines

Organização local auditada: `org-xingyu` (`Xingyu`). Inventário obtido antes de qualquer exclusão, em `feature/beta-multi-pipeline-foundation` (`d584e54f4ac4fadee02212eb9f47bb48388ddf16`).

## Inventário anterior

| ID | Nome | Position | Stages | Deals | Contatos | Conversas | Tasks | Decisão | Origem provável |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| `pipe-novos` | Novos leads | 0 | 14 | 41 | 40 | 6 | 22 | BLOCKED / arquivado | seed + desenvolvimento beta |
| `pipe-comercial` | Comercial principal | 1 | 6 | 20 | 20 | 13 | 6 | KEEP | seed |
| `pipe-site` | Compras do site | 2 | 5 | 4 | 4 | 2 | 2 | BLOCKED / arquivado | seed |
| `pipe-pagamento` | Aguardando pagamento | 3 | 4 | 4 | 4 | 2 | 4 | BLOCKED / arquivado | seed |
| `pipe-posvenda` | Pós-venda | 4 | 4 | 2 | 2 | 0 | 1 | KEEP | seed |
| `pipe-recompra` | Recompra | 5 | 5 | 2 | 2 | 1 | 2 | BLOCKED / arquivado | seed |
| `pipe-reativacao` | Reativação | 6 | 5 | 2 | 2 | 0 | 2 | BLOCKED / arquivado | seed |
| `pipe-garantias` | Garantias e ocorrências | 7 | 5 | 2 | 2 | 1 | 2 | BLOCKED / arquivado | seed |
| `cms77hj620003swvg10nlb5mg` | E2E Canais 1785397353628-8egvg2 | 8 | 1 | 0 | 0 | 0 | 0 | DELETE SAFE | E2E histórico |
| `cms7xgh8v0009sww46m0t29um` | TESTE | 10 | 1 | 1 | 1 | 0 | 2 | BLOCKED / arquivado | criação manual/teste |
| `cms86fv3z0019sw003rjay91a` | estamos testando | 11 | 1 | 0 | 0 | 0 | 0 | DELETE SAFE | criação manual/teste |
| `cmsffxmx1002nswi4j90kzask` | E2E Kanban Destino 1785895271661-dh4jei | 13 | 1 | 1 | 1 | 0 | 0 | BLOCKED / arquivado | E2E histórico |
| `cmsfg03en0036swi40udpfk2j` | E2E Etapas 1785895386053-4cb5wz | 14 | 3 | 1 | 1 | 0 | 0 | BLOCKED / arquivado | E2E histórico |
| `cmsfgehaq000tswtwa9o2sz3m` | E2E Simulação 1785896057280-jlnejz | 15 | 1 | 0 | 0 | 0 | 0 | DELETE SAFE | E2E histórico |

## Aplicação local

Os três IDs `DELETE SAFE` foram excluídos individualmente dentro de uma transação, depois de uma segunda verificação de `dealCount=0` e `taskCount=0`. Suas três stages exclusivas e uma conexão de canal foram removidas pelo relacionamento dependente. Os nove candidatos com Deals não foram excluídos: foram arquivados para que apenas os dois pipelines legítimos permaneçam ativos, sem perda de dados.

Contagens de negócio antes e depois: 164 Deals, 116 Contacts, 56 Conversations, 79 Tasks, 20 Orders, 32 Notes, 2 Files e 671 Activities. Todas permaneceram idênticas. A checagem retornou zero stages órfãs.

Estado ativo final:

| ID | Nome persistido | Position | Stages | Deals |
| --- | --- | ---: | ---: | ---: |
| `pipe-comercial` | COMERCIAL PRINCIPAL | 0 | 6 | 20 |
| `pipe-posvenda` | PÓS-VENDA | 1 | 4 | 2 |

## Origem, seed e E2E

O seed principal era a origem de oito pipelines ativos. Ele foi corrigido para criar somente Comercial Principal e Pós-venda como ativos; os seis pipelines que sustentam fixtures relacionais continuam criados como arquivados, preservando os Deals e os testes que dependem de seus IDs/stages. Resíduos com prefixo `E2E` vieram de execuções históricas que criaram dados na organização compartilhada e não fizeram teardown. Os E2E atuais no repositório não contêm mais esses criadores.

O schema confirma: stages e conexões usam cascade ao excluir Pipeline; Tasks usam `SetNull`; Deals restringem a exclusão. Não houve migration, reset, truncate, delete global, alteração de produção ou homologação.
