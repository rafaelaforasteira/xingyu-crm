# Autenticação — homologação

Fundação de autenticação própria do Xingyu CRM para ambientes de
desenvolvimento e homologação. A API NestJS é a autoridade; o frontend
Next.js consome a sessão via cookies HttpOnly (`credentials: "include"`).

## Variáveis obrigatórias

Defina no `.env` da raiz (nunca versionar valores reais):

```env
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
COOKIE_SECURE=false
COOKIE_DOMAIN=
CORS_ORIGIN=http://localhost:3000
DEMO_MODE=false
ADMIN_EMAIL=
ADMIN_INITIAL_PASSWORD=
```

No browser, use `NEXT_PUBLIC_API_URL` apontando para a origem do Next
(`http://localhost:3000/api` em local). O `next.config` faz rewrite para a API
Nest, para que cookies HttpOnly fiquem no mesmo site do CRM.

Em homologação / staging:

- `DEMO_MODE=false`
- `COOKIE_SECURE=true` (HTTPS)
- `CORS_ORIGIN` com a origem explícita do front (nunca `*` com credentials)
- segredos JWT distintos e fortes

`DEMO_MODE=true` só é permitido com `NODE_ENV=development` ou `test`.
Se `NODE_ENV=production` e `DEMO_MODE=true`, a API **recusa iniciar**.

## Seed do administrador

```powershell
pnpm db:seed
```

Cria/atualiza somente em development/homologação o usuário:

- nome: Administradora Xingyu
- e-mail: `ADMIN_EMAIL`
- senha: `ADMIN_INITIAL_PASSWORD` (Argon2id)
- role: `ADMIN`

Se as variáveis faltarem, o seed falha com mensagem clara (sem exibir senhas).

## Endpoints

| Método | Rota | Público | Descrição |
|--------|------|---------|-----------|
| POST | `/api/auth/login` | sim | login + cookies |
| POST | `/api/auth/refresh` | sim | rotação de refresh |
| POST | `/api/auth/logout` | sim | revoga sessão |
| GET | `/api/auth/me` | não | usuário atual |

Cookies: `xingyu_access_token` (curto) e `xingyu_refresh_token` (longo, hash no banco).

## Frontend

- Rota `/login`
- Grupo `(app)` protegido (`RequireAuth` + middleware soft de cookie)
- Header: nome, perfil traduzido, Sair
- Cliente HTTP tenta refresh uma vez em 401

## Testes e autenticação

- Preferir login real (`POST /api/auth/login`) com cookie jar / Playwright `storageState`
- Em testes Nest, sobrescrever `AuthGuard` com usuário explícito quando necessário
- Não usar `X-Demo-User-Id` como bypass de segurança fora de `DEMO_MODE` em development/test
- Documentação detalhada também em `docs/local-development.md`
