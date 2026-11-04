# Integrações — inventário pelo código

Revisão local BRAINX: não foram feitos envios ou chamadas a contas de fornecedores.

- `apps/api/src/integrations/shopify-admin.client.ts`: cliente real Shopify Admin, token em memória, requisição de token compartilhada entre chamadas concorrentes, timeout de 10 segundos e redirecionamentos rejeitados. Adapters Shopify demonstrativos também existem; não presumir sincronização completa por haver cliente real.
- `connections/providers/evolution-whatsapp.provider.ts`: cliente real Evolution, timeout de 15 segundos, webhook configurado com segredo em header e comparação de tamanho/tempo constante. Esse header autentica por segredo compartilhado; não é HMAC do corpo bruto. Validar contrato com a versão de staging antes de ativar.
- `connections/providers/fake-whatsapp.provider.ts`: provider de teste/demo com HMAC de JSON serializado. A registry permite fake em produção quando configurado explicitamente; revisar essa exceção antes de publicar.
- WhatsApp/Instagram/Meta Ads/Analytics e webhooks genéricos têm adapters demo. `integrations/webhooks.adapter.ts::verifySignature` sempre retorna true e não deve ser reutilizado como validador de webhook real. O endpoint público de conexões utiliza o provider, não esse método.
- `connections-inbound.service.ts`: recibo único por canal/evento e processamento em transação Serializable. Conferir identidade estável do evento: Evolution inclui timestamp no event ID, portanto retries com timestamp diferente precisam de regressão por externalMessageId. O catch genérico de P2002 também requer revisão.
- Automações têm fila PostgreSQL com lease, `FOR UPDATE SKIP LOCKED`, chaves de deduplicação e máximo de tentativas. O atraso padrão é fixo (20s para jobs, 15s para eventos), não backoff exponencial. Reenvio de mensagem após timeout precisa de reconciliação/idempotência no fornecedor para evitar efeito duplo.

IDs de eventos/mensagens fornecem rastreabilidade. Corpos de mensagens aparecem em atividades e eventos persistidos; definir retenção e acesso. Não registrar tokens, cookies, corpos ou dados de clientes em relatórios de CI.

Nunca substituir mocks por conectores reais sem credenciais válidas, autorização e ambiente de staging. Pendências em [engineering/EXECUTION.md](engineering/EXECUTION.md).
