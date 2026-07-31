# Solução de problemas

## DATABASE_URL ausente

Execute `pnpm setup:local` ou configure o `.env` da raiz. A API agora encerra
antes do Prisma com uma mensagem explícita quando a variável não existe.

## API indisponível

Confirme as portas com `pnpm db:doctor` e inicie tudo com `pnpm dev:local`.
Consulte `http://localhost:3333/api/health`.

## Banco indisponível

Use `pnpm db:status`. Se a porta 5432 estiver ocupada por outro serviço,
encerre-o ou ajuste `POSTGRES_PORT` e `DATABASE_URL` em conjunto. Não apague
`.pgdata`; pastas incompletas são preservadas automaticamente como backup.

## Playwright

Instale o navegador pelo pacote web:
`pnpm --filter @xingyu/web exec playwright install chromium`.

## Hydration no layout raiz

O HTML enviado pelo servidor e o DOM inicial foram comparados em Chromium limpo:
`html`, a classe determinística do `next/font` no `body` e o conteúdo hidratado
coincidem. Os atributos `bis_register` e `__processed_*` não são gerados pelo
Xingyu CRM; são injetados por extensões antes da hidratação. Por isso,
`suppressHydrationWarning` existe somente no `body`, não no `html` nem em
componentes descendentes. Erros de hidratação fora desse caso continuam
visíveis.
