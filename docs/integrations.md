# Integrations

All integrations ship with:

- TypeScript interface
- Mock adapter (demo mode)
- Service wrapper
- Env-based configuration
- Status endpoint under settings/integrations

| Integration | Env vars | Demo behavior |
|-------------|----------|---------------|
| Shopify | `SHOPIFY_STORE_DOMAIN`, `SHOPIFY_ACCESS_TOKEN` | Simulated catalog/order sync log |
| WhatsApp | `WHATSAPP_API_URL`, `WHATSAPP_API_TOKEN` | Composer saves outbound Message locally |
| Instagram | `INSTAGRAM_ACCESS_TOKEN` | Mock inbound/outbound |
| Meta Ads | `META_ADS_ACCESS_TOKEN` | Attribution demo metrics |
| Google Analytics | `GOOGLE_ANALYTICS_MEASUREMENT_ID` | Mock event payload |
| Webhooks | `WEBHOOK_SECRET` | Signed payload echo in logs |

Never commit real credentials. Keep `.env` local.
