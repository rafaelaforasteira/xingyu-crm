# Documentação da API (Swagger / OpenAPI)

## URLs locais

- UI: `http://localhost:3333/docs`
- JSON: `http://localhost:3333/docs-json`

Ativar com `SWAGGER_ENABLED=true`. Em ambientes travados, deixar `false` — a API sobe nos dois casos.

## Autenticação

A API usa **cookie HttpOnly** (`xingyu_access_token`), não Bearer Token.

No Swagger: Authorize → cookie `xingyu_access_token` após `POST /api/auth/login`.

Prefixo global: `/api`.

## Como documentar um endpoint novo

1. `@ApiTags("modulo")` no controller
2. `@ApiOperation({ summary: "..." })` em cada handler
3. `@ApiResponse` para 200/401/403/404 quando o contrato for estável
4. DTO com `@ApiProperty` / `@ApiPropertyOptional`
5. Nunca documentar `passwordHash`, `refreshTokenHash`, secrets

## Settings vs Users

- `GET /api/users` — administração de convites, papéis, sessões (`@Roles(ADMIN)`)
- `GET /api/settings/users` — listagem no painel de settings (`@Permissions("users.manage")`)

Ambos exigem autorização de backend. O menu escondido **não** é a segurança.

## AuthRole vs Role

- `User.authRole` (`ADMIN` | `MANAGER` | `CONSULTANT`) — autorização efetiva
- `User.roleId` / tabela `Role` — rótulo organizacional legado (marketing, finance…)

Não unificar nesta missão; `authRole` é a fonte da verdade de RBAC.
