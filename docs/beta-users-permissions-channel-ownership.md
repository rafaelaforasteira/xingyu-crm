# Usuários, permissões e ownership de canais

Esta fundação adiciona gestão multiusuário sem substituir o modelo existente de acesso a pipelines.

## Convites e ciclo de vida

- Administradores criam usuários com status `INVITED` em **Configurações > Usuários**.
- O token aleatório tem 48 bytes, validade de 72 horas e somente seu SHA-256 é persistido.
- O link é exibido ao administrador para envio manual. Reemitir um convite revoga os anteriores.
- A aceitação exige senha de no mínimo 12 caracteres, faz uma reivindicação atômica de uso único e ativa o usuário.
- Desativar um usuário revoga todas as sessões abertas; reativar não recria sessões.

## Matriz de segurança

| Recurso | ADMIN | MANAGER / CONSULTANT |
| --- | --- | --- |
| Pipeline acessível | Todos da organização | União de acesso organizacional, direto e por equipe |
| Quadro Kanban | Dados completos | Próprios completos; demais somente resumo não interativo |
| Abrir/editar/mover negócio | Qualquer negócio acessível | Somente negócio cujo `ownerId` é o próprio usuário |
| Canal `ORGANIZATION` | Permitido | Conversa vinculada ao próprio negócio |
| Canal `PIPELINE` | Permitido | Se houver conexão ativa com pipeline acessível |
| Canal `PERSONAL` | Permitido | Somente `ownerUserId` do canal |
| Administrar usuários/canais | Permitido | Negado por role guard |

Negócios em modo resumo não expõem telefone, conteúdo de mensagens, tarefas ou ações de mutação. Toda leitura ou mutação direta repete a autorização no backend; a UI não é considerada uma fronteira de segurança.

## Ownership de canais

O endpoint administrativo `PATCH /pipelines/:pipelineId/channels/:connectionId/ownership` configura:

- `ORGANIZATION`: compatibilidade organizacional;
- `PIPELINE`: acesso derivado das conexões ativas e da matriz de Pipeline Access;
- `PERSONAL`: requer uma pessoa ativa da mesma organização.

As mudanças geram `AuditLog` com o estado anterior e posterior. Canais existentes permanecem `ORGANIZATION` por padrão, preservando compatibilidade.

## Operação

Aplicar a migration com `pnpm db:migrate:deploy`. A alteração é aditiva e não requer reset. Configure `WEB_URL` para que links de convite apontem ao frontend correto.
