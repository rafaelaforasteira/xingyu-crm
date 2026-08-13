# Contrato de dados externos — Tracking

Tracking registra aquisição/jornada; Conversation registra comunicação; Shopify registra comércio. Analytics correlaciona fatos sem misturar responsabilidades.

## Envelope

Cada evento deverá conter `organizationId`, `eventId` idempotente, `schemaVersion`, `occurredAt`, `receivedAt`, `visitorId`, `sessionId`, tipo e payload validado.

## Identificadores e privacidade

- `visitorId`: pseudônimo first-party, sem e-mail/telefone em texto puro.
- `sessionId`: identificador rotativo com expiração.
- Click IDs permitidos: `gclid`, `fbclid`, `ttclid` e equivalentes registrados no schema.
- Consentimento, finalidade, retenção, exclusão e minimização são requisitos de produção.
- IP/user-agent seguem política própria e não são requisito do Dashboard.

## Aquisição e eventos

UTMs: source, medium, campaign, content e term. IDs separados para campaign, ad set, ad, creative e click; nenhum é `Conversation.channelId`. Contexto pode incluir referrer, landing page e device quando permitido.

Eventos iniciais: `SESSION_STARTED`, `PAGE_VIEWED`, `FORM_SUBMITTED`, `CTA_CLICKED`, `CONVERSATION_STARTED`, `LEAD_IDENTIFIED`, `ORDER_PLACED` e `ORDER_CONFIRMED`. Cada tipo tem payload próprio; strings livres não criam métricas.

## Atribuição

- First touch é imutável após a primeira evidência válida; correção exige auditoria.
- Last touch recebe novas evidências elegíveis e nunca sobrescreve first touch.
- Acquisition source, conversation channel e order attribution são dimensões distintas.
- Multi-touch e janelas de atribuição dependem de regra de negócio explícita.

Visitor → Contact usa identity link com fonte, confiança, data e motivo. Session → Order preserva o evento de vínculo. Conflitos permanecem auditáveis.

## Estado atual

Há snapshots UTM/referrer/landing em `Order` e `Attribution` genérico. Não há visitor/session/event nem first touch imutável. Jornada e campanhas completas são `TRACKING_FROM_NOW`; nenhum passado será inferido.
