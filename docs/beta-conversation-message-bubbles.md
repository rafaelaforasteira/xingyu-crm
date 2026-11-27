# Balões de mensagem — redesign

Branch: `feature/beta-conversation-message-bubbles`  
Base: `feature/beta-conversation-composer-polish`

## Estrutura anterior

Meta única no topo (`Recebido de` / `Enviado por · horário · data`) e status textual no rodapé (`Enviado` / `Entregue` / `Lido`), inclusive em inbound. Imagem podia aparecer depois do texto.

## Estrutura final

```
MessageBubble
├── MessageSenderLabel (somente outbound / automação)
├── InboundSenderLabel (somente GROUP futuro)
├── MessageContentRenderer
│   ├── TEXT | IMAGE | VIDEO | AUDIO | VOICE | DOCUMENT | STICKER | UNSUPPORTED
│   └── MessageCaption (após a mídia)
└── MessageMetadata → horário + MessageDeliveryStatus (outbound)
```

## Inbound (conversa individual)

- Conteúdo + horário
- Sem “Recebido de”, sem checks, sem “Entregue”

## Outbound

- `Enviado por {autor histórico}` no topo (truncado + tooltip)
- Conteúdo / mídia + legenda
- Horário + ticks compactos

## Status

| Status | Visual |
|--------|--------|
| SENDING / PENDING | loader |
| SENT | 1 check neutro |
| DELIVERED | 2 checks neutros |
| READ | 2 checks `text-primary` |
| FAILED | alerta destrutivo |

Não inventamos READ/DELIVERED sem o valor no registro. Fallback sem status + mensagem persistida: SENT.

## Horário / timezone

- Relógio e tooltip: `America/Sao_Paulo` (pt-BR)
- Tooltip: `dd/MM/yyyy às HH:mm`
- Separadores de dia inalterados (mesma zona)

## Mídia

- Mapper: mídia + `body` legado → `caption`
- Ordem: mídia → legenda → metadata
- Renderers preparados para vídeo/áudio/voz/documento/figurinha
- Fallbacks: mídia/arquivo indisponível; unsupported sem payload técnico

## Compatibilidade

- Sem migration nesta rodada
- Autor via `sender`/`author` da API
- Composer, lista, filtros, header e painel intactos

## Limitações

- Sem `deliveredAt`/`readAt` no schema — tooltips de status usam o horário da mensagem
- Sem grupos reais (flag `shouldShowInboundSender` pronta)
- Player de áudio ainda nativo; coordenação “um áudio por vez” documentada para evolução
- Lightbox de imagem reutiliza Dialog existente

# Ações de mídia

Attachments elegíveis agora oferecem o menu **Guardar em Arquivos**. A ação cria apenas uma referência curada no deal atual, sem copiar o binário nem alterar caption, status, direção ou renderização da mensagem. Cada attachment de uma mensagem múltipla possui estado independente; texto e sticker não oferecem essa ação.
