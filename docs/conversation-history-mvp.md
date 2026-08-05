# Conversation History MVP

## Propósito

Primeira versão de testes da área **Conversas** do Xingyu CRM (`/operacao?view=conversations`).

O único objetivo desta rodada é **exibir e consultar o histórico completo de mensagens** dos clientes do pipeline — listar conversas, abrir uma delas, carregar mensagens (incluindo páginas anteriores), anexos, datas e remetentes.

## Escopo

### Implementado

- Lista de conversas do pipeline (largura ~340–380px no desktop)
- Busca única (`q`) e filtros `all | unread | awaiting`
- Seleção via `conversation=<id>` na URL
- Histórico amplo estilo WhatsApp (sem painel de contexto à direita)
- Separadores de dia (`Hoje` / `Ontem` / `dd/MM/yyyy`) em `America/Sao_Paulo`
- Paginação cursor da API + botão “Carregar mensagens anteriores”
- Remetentes e status traduzidos (Enviado / Entregue / Lido / Falhou)
- Anexos já armazenados (imagem, documento, áudio)
- Layout responsivo (desktop / notebook / tablet / mobile)
- Seed demo idempotente (5 conversas)
- Testes unitários e E2E

### Não implementado nesta rodada

- Envio de mensagens / composer / emoji / anexo / microfone
- WhatsApp Cloud API, webhooks Meta, mensagens reais
- WebSocket / SSE / polling em tempo real
- Painel “Contexto do lead”, abas de tarefas/pedidos/notas
- Automações novas e migrations desnecessárias

## Estrutura visual

```
┌────────────────────┬──────────────────────────────────────┐
│ Lista de conversas │ Cabeçalho compacto + histórico       │
│ Busca (no header)  │ (sem composer)                       │
└────────────────────┴──────────────────────────────────────┘
```

Rota: `/operacao?pipeline=<id>&view=conversations&conversation=<id>&q=&filter=`

A visualização Kanban permanece intacta em `view=kanban`.

## Lista

Cada item: avatar, nome (ou telefone), prévia, horário, não lidas, canal, etapa, indicador discreto de aguardando resposta.

No desktop, a primeira conversa é selecionada automaticamente quando nenhuma estiver na URL. Em tablet/mobile, a lista aparece primeiro.

## Histórico

- Ordem cronológica (antigas no topo, recentes embaixo)
- Recebidas à esquerda, enviadas à direita
- Fundo suave; balões com largura natural (máx. ~70% / 680px)
- Cabeçalho fixo; apenas a lista de mensagens rola

## Paginação

Ao abrir: página mais recente (`pageSize` 20), scroll no final.

Ao carregar anteriores: merge com deduplicação por `id`, ordem preservada, posição de scroll mantida.

## Separadores de data

Helper `buildMessageTimeline` em `apps/web/src/lib/inbox-utils.ts`. Datas persistidas no backend em UTC; fuso só na UI.

## Anexos

Renderizados no balão (thumbnail / player / link de documento). Sem upload nesta rodada.

## Mobile

Lista fullscreen → ao selecionar, histórico fullscreen com “Voltar às conversas”. Busca/filtros na URL preservados.

## Dados demo

Seed local (`pnpm db:seed`), bloqueado em `NODE_ENV=production`:

| Contato         | Conversa              | Destaque                          |
|-----------------|-----------------------|-----------------------------------|
| Cláudia Nunes   | `conv-operacao-demo`  | ~30 msgs, 3 dias, mídia           |
| Amanda Vieira   | `conv-01`             | Não lidas, aguardando resposta    |
| Letícia Araújo  | `conv-04`             | Histórico antigo, resolvida       |
| Luciana Vargas  | `conv-11`             | Mensagens curtas consecutivas     |
| Caroline Dias   | `conv-02`             | Canal Instagram + status/anexo    |

IDs estáveis + create-only; segunda execução não duplica.

## Limitações

- WhatsApp real ainda **não** conectado
- Sem envio neste MVP
- Sem tempo real — use **Atualizar**
- Arquivos demo em `apps/api/uploads/demo-history/`

## Próximos passos

1. Composer / envio CRM-only
2. Integração WhatsApp Cloud API
3. Tempo real (SSE/WebSocket)
4. Painel de contexto do lead
