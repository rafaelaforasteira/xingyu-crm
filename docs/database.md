# Banco de dados local

O projeto usa `embedded-postgres`; Docker não é necessário. O cluster
persistente fica em `packages/database/.pgdata` e não é versionado.

O lifecycle verifica a porta e `PG_VERSION`. `database.initialise()` roda
somente para um cluster novo. Se a pasta tiver conteúdo sem `PG_VERSION`, ela é
renomeada para `.pgdata-backup-YYYYMMDDHHmmss` antes de um cluster novo ser
criado; o backup nunca é apagado automaticamente.

Migrações ficam em `packages/database/prisma/migrations`. A seed detecta a
organização demonstrativa por ID fixo e preserva tanto os dados demonstrativos
quanto registros criados manualmente em execuções posteriores.

`pnpm db:stop` preserva os dados. Não use `db:reset` em um banco com dados que
precisem ser mantidos.
