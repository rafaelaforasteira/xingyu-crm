# Performance baseline

Data: 2026-08-19  
Ambiente: Windows 10 local, API `http://localhost:3333/api`, Postgres Embedded 17.6 na porta 5432.  
Ferramenta: k6 **não instalado**; Node fallback (`scripts/load-test.mjs`).  
Hardware: AMD Athlon 3000G with Radeon Vega Graphics, 14 GB RAM, Node v24.14.1, pnpm 9.15.4.

## Resultados coletados

| Cenário | VUs | Requests | RPS | p50 | p95 | p99 | Error % | Resultado |
|---------|-----|----------|-----|-----|-----|-----|---------|-----------|
| Smoke (health, após SkipThrottle) | 2 | 202 | 6.73 | 7 ms | 226 ms | 535 ms | 0 | PASSOU |
| Smoke (health, antes do SkipThrottle) | 2 | 16939 | 564.52 | 2 ms | 10 ms | 34 ms | 98.83 (429) | FALHOU — throttle global 200/min |
| Baseline autenticado (health, me, pipelines, orders) | 5 | 1018 | 16.92 | 20 ms | 314 ms | 768 ms | 16.01 (163× HTTP 429, 0× 5xx) | EXECUTADO; 429 esperado com `RATE_LIMIT_MAX=200` no mesmo IP |
| Business | — | — | — | — | — | — | — | NÃO EXECUTADO (ambiente local já 429 no baseline; Athlon 2c/14 GB) |
| Stress | — | — | — | — | — | — | — | NÃO EXECUTADO (`ALLOW_STRESS_TEST` ausente; guard testado) |

## Observações

- Produção (`xingyu.com.br`) é bloqueada por `assertSafeLoadTarget` (teste unitário, sem tráfego de rede).
- Endpoints mais lentos no baseline (p95): `/health` 364 ms, `/orders` 323 ms, `/auth/me` 254 ms, `/pipelines` 247 ms.
- Latências incluem contenção do throttler; não otimizamos queries sem evidência de N+1 neste run.
- Para baseline k6 real (10 VUs / 2 min) instalar k6 e, em ambiente de performance, subir `RATE_LIMIT_MAX` — não em produção.
