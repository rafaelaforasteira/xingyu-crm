# Testes de performance

## Ambiente

Somente localhost (ou staging com `ALLOW_REMOTE_LOAD_TEST=true`).

Produção (`xingyu.com.br`, `api.xingyu*`) é **bloqueada** por `assertSafeLoadTarget`.

```powershell
$env:LOAD_BASE_URL="http://localhost:3333/api"
$env:LOAD_TEST_EMAIL="admin@xingyu.local"
$env:LOAD_TEST_PASSWORD="<senha local>"
pnpm test:load:smoke
pnpm test:load:baseline
```

Stress exige:

```powershell
$env:ALLOW_STRESS_TEST="true"
pnpm test:load:stress
```

## Cenários

| Arquivo | Mix | Default |
|---------|-----|---------|
| `tests/load/smoke.js` | GET `/health` | 2 VUs / 30s |
| `tests/load/baseline.js` | health, me, pipelines, orders | 10 VUs / 2m |
| `tests/load/business.js` | 50% pipelines, 20% orders, 15% tasks, 10% dashboard, 5% search | 30 VUs / 5m |
| `tests/load/stress.js` | health ramp | manual |

Preferência: **k6**. Se k6 não estiver no PATH, `scripts/load-test.mjs` usa fallback Node:

- smoke: `GET /health` (2 workers, 30s, pacing 200ms)
- baseline: login real + health/me/pipelines/orders (até 60s)

O throttler global (`RATE_LIMIT_MAX`, default 200/min por IP) aplica-se a quase todos os endpoints. Health está em `@SkipThrottle()` para probes. Um baseline de vários VUs no mesmo IP gera HTTP 429 — isso é o limite funcionando, não 5xx.

## Thresholds iniciais

- smoke: error rate < 5%, p95 < 1500ms
- baseline: error rate < 1%, p95 < 800ms, p99 < 1500ms
- business: error rate < 2%, p95 < 1200ms
- dashboard pode ser mais lento que health; medir antes de otimizar

## Seed de massa

Não misturar com `pnpm db:seed`. Um `perf:seed` isolado **não** foi criado nesta missão para não arriscar o banco local. Analisar 1k/10k/50k conceitualmente; gerar massa só em ambiente de performance dedicado.

## Como adicionar cenário

1. Criar script k6 em `tests/load/`.
2. Reutilizar `config.js` + `helpers/auth.js`.
3. Registrar comando em `package.json`.
4. Atualizar `docs/performance-baseline.md` após executar.
