# Arquitetura futura — Rastreamento de vendas

## Objetivo

Registrar a **atribuição de cada compra** identificada para um cliente/lead, de forma **append-only**, sem sobrescrever vendas anteriores quando a jornada de marketing mudar.

## Compra como evento histórico

Cada pedido gera (ou atualiza de forma auditável) um **Sale Attribution Snapshot** — fotografia dos dados de tracking relevantes **naquele momento**.

A compra mais recente **não** altera snapshots anteriores.

## Exemplo obrigatório — Luciana Vargas

### Primeira jornada

- 01/08/2026
- `utm_source=meta`
- `utm_medium=paid_social`
- `utm_campaign=china_no_brasil`

### Compra A

- Pedido **#5832**
- 10/08/2026
- R$ 1.842,90

**SaleTrackingRecord A**

- source=`meta`
- medium=`paid_social`
- campaign=`china_no_brasil`

### Segunda jornada

- 01/10/2026
- `utm_source=whatsapp`
- `utm_medium=remarketing`
- `utm_campaign=alta_temporada`

### Compra B

- Pedido **#6179**
- 04/10/2026
- R$ 2.310,00

**SaleTrackingRecord B**

- source=`whatsapp`
- medium=`remarketing`
- campaign=`alta_temporada`

**Record B NÃO modifica Record A.**

## Shopify (futuro)

```
Shopify envia pedido
→ CRM recebe
→ matching seguro de cliente
→ vínculo Order ↔ Contact (+ Deal/Conversation opcional)
→ snapshot de atribuição
```

Matching **não confirmado** → não atribuir automaticamente; possível fila de revisão.

**Não** implementar OAuth/webhook/Admin API nesta fundação.

## Contact vs Conversation vs Order

- **Contact**: identidade comercial (pessoa).
- **Conversation**: thread por número/canal; **não mesclar** conversas ao vincular identidade.
- **Order**: preferência de vínculo ao Contact; Deal/Conversation opcionais.

Número A → Conversa A; Número B → Conversa B. Um pedido Shopify no Número B não pode depender só do telefone da conversa A.

## Modelo conceitual (referência — não persistido agora)

```
SaleTrackingRecord
  id, organizationId
  contactId
  dealId?
  conversationId?
  orderId, orderNumber
  purchasedAt, amount, currency
  entryChannelId?
  source, medium, campaign, content, term
  utmParams (raw)
  landingPage, referrer
  firstTouchEventId?, lastTouchEventId?
  attributionModel?
  createdAt
```

Adaptar ao schema real quando a feature for implementada. **Não criar migration agora.**

## TrackingEvent (append-only, futuro)

Exemplos: `LEAD_CREATED`, `FIRST_INBOUND_MESSAGE`, `FIRST_OUTBOUND_MESSAGE`, `LANDING_PAGE_VISIT`, `UTM_CAPTURED`, `SHOPIFY_ORDER_CREATED`, `PURCHASE_ATTRIBUTED`, `RETURNED_FROM_CAMPAIGN`.

Permite First Touch / Last Touch / modelos futuros sem gravar uma “verdade” irreversível sem histórico.

## First Touch / Last Touch

Documentados como **futuros**. Não implementar algoritmos nesta tarefa. Preservar eventos/raw suficientes.

## Attribution model

Não decidir ainda entre First Click, Last Click, Linear, Position Based, Data Driven.

## UI futura (Contexto do Lead)

Sob **Rastreamento**, após o bloco do lead:

```
────────────────────
Rastreamento de vendas

Pedido #6179 · 04/10/2026 · R$ 2.310,00  >
Pedido #5832 · 10/08/2026 · R$ 1.842,90  >
```

Mais recente primeiro; accordion por pedido; **não** renderizar UI morta sem dados reais.

## Distinção crítica

| Bloco                  | Significado                      |
| ---------------------- | -------------------------------- |
| Rastreamento (lead)    | Origem/jornada conhecida do lead |
| Rastreamento de vendas | Snapshot **por compra**          |

Tags CRM **não** são banco de atribuição.

## Métricas futuras (não construir dashboard agora)

Receita por origem/UTM/campanha; conversão; ticket; recompra; tempo até compra; First/Last touch revenue; LTV por origem; pedidos/receita por canal.

## Correção auditável

Correções futuras devem **adicionar** registro/evento de correção, não apagar silenciosamente o snapshot original.

# Snapshot de venda por pedido

O histórico comercial implementado em `docs/beta-lead-context-orders.md` estabelece `Order` como unidade persistente do fato de compra. Identidade, endereço, itens, pagamento e tracking devem ser copiados como snapshot no momento da importação; alterações posteriores em `Contact`, conversa ou atribuição não podem reescrever pedidos antigos.

O matching futuro de múltiplos números deve associar pedidos ao contato consolidado sem usar o telefone da conversa como chave exclusiva e sem alterar os snapshots originais.
