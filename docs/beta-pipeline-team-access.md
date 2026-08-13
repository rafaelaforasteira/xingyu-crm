# Equipes e acessos

A Central fica em `/pipelines/access`, com `tab=teams` ou `tab=people`, e reutiliza `Team`, `User` e o design system.

- `ORGANIZATION`: qualquer usuário válido da organização acessa.
- `RESTRICTED`: união de acesso direto e herdado da equipe.
- `ADMIN`: bypass e permissão de gerenciamento.
- Não há deny nem níveis Viewer/Operator/Manager.

Grants são substituídos transacionalmente, possuem unicidade por Pipeline/Team ou Pipeline/User e são idempotentes. A Central administrativa continua exibindo todos os usuários válidos da organização.

O backend aplica a ACL a Deals e recursos derivados (Conversations/Messages, Tasks, Notes, Files, Activities/History e Orders vinculadas), além de Channels, Search e Todos os Leads. Listagens são filtradas no banco; leituras e mutations por ID resolvem o Pipeline pai.

Seletores operacionais usam `pipelinesApi.eligibleUsers(pipelineId)`, com cache compartilhado por Pipeline. O resultado considera modo organizacional, equipe, grant direto e ADMIN. Responsáveis existentes não são removidos automaticamente.
