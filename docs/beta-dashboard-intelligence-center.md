# Central de Inteligência do Dashboard

`/dashboard` possui exatamente seis áreas: Visão geral, Comercial, Atendimento, Equipe, Clientes e Canais. Dashboard volta ao topo da navegação principal, sem alterar submenu/numeração de Pipelines, Todos os Leads, Tarefas, sidebar fixa ou rodapé.

## Arquitetura

O frontend solicita somente a área ativa:

- `GET /dashboard/overview`
- `GET /dashboard/commercial`
- `GET /dashboard/attendance`
- `GET /dashboard/team`
- `GET /dashboard/customers`
- `GET /dashboard/channels`
- `GET /dashboard/filters`

O `DashboardService` continua como autoridade central, usando aggregates/grouping no backend. As queries têm limites explícitos nas séries que exigem leitura de fatos. A cache inclui área e todos os filtros.

## Filtros, URL e segurança

`tab`, `period`, `start`, `end`, `pipeline`, `team`, `responsible` e `channel` ficam na URL e persistem entre abas. O backend valida todos os IDs:

- ADMIN pode analisar a organização;
- MANAGER pode selecionar pessoas de sua equipe;
- CONSULTANT é forçado ao próprio owner;
- pipelines vêm da união efetiva de Pipeline Access;
- canais pessoais exigem owner, canais de pipeline exigem conexão com pipeline acessível;
- toda query permanece isolada por `organizationId`.

O timezone/currency da Organization é retornado pelo endpoint de filtros. Intervalos usam início inclusivo e fim exclusivo nas novas analytics.

## Atendimento

Um episódio começa no primeiro INBOUND ainda não respondido e termina no próximo OUTBOUND. INBOUNDs consecutivos não reiniciam o relógio. Média, mediana e SLA são calculados sobre episódios encerrados; conversas ainda aguardando não entram no tempo concluído.

## Interface

Cards diferenciam ausência (`—`) de zero real. As seis abas usam layouts próprios: resumo, funil, SLA, pódio/tabela completa, novos versus recorrentes/tags e ranking de canais. Filtros quebram em grid responsivo e tabelas permitem scroll horizontal.

## Limitações

Attribution histórica do vendedor, conversão histórica completa entre etapas, first touch e conversão de abordagem não são inferidos. O provider não foi implementado. Essas disponibilidades aparecem no contrato e no catálogo.
