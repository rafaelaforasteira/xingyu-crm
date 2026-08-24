# Connections Center

The Connections Center (`/connections`) is the admin workspace for external channels connected to Xingyu CRM.

## Domain

- **Connection** = Prisma `Channel` (integration account). Independent of Pipeline.
- **Routing** = `PipelineChannelConnection` (`isDefault`, enabled pipelines). One inbound event resolves to **one** default destination.
- **Access** = `ChannelTeamAccess` / `ChannelUserAccess` (+ legacy `ChannelAccessMode`). Who may operate the connection — not the same as routing.
- **Provider** = adapter (`fake` in non-production / `CONNECTION_PROVIDER=fake`). QR is ephemeral (not stored in DB).
- **Webhook idempotency** = `ProviderEventReceipt` unique on `(channelId, externalEventId)`.
- **Conversation / Deal** = reuse open conversation for contact+channel; reuse open deal in enabled pipelines before creating; new deals use the pipeline's initial OPEN stage.

Flow: Provider → Connection → normalize → Contact → Conversation → resolve Pipeline → reuse/create Deal → Message.

## Frontend

- `ConnectionsCenter` owns authorization, filters, search, list/count queries, and action orchestration.
- `ConnectionCard` renders each full-width channel row with status, destination, pipelines, access, activity.
- `ConnectionDrawer` uses the shared wide `Dialog` as a large detail surface.
- `ConnectionWizard` creates WhatsApp connections: name → QR → routing → access → done.
- Homologation: `POST /connections/:id/simulate-scan` (fake provider) completes QR without a real phone.

Access: `integrations.manage` or `ADMIN`. Supervisor/Consultant are redirected away from the central.

## API

- `GET /connections`, `GET /connections/counts`, `POST /connections`
- `GET/PATCH /connections/:id`
- `POST /connections/:id/connect|reconnect|disconnect|archive|simulate-scan`
- `GET /connections/:id/qr|diagnostics|activity`
- `PATCH /connections/:id/routing|access`
- Webhook: `POST /webhooks/connections/:provider/:externalInstanceId` (resolve Connection by provider identity; never trust body `organizationId`)

Never return `secretReference`, tokens, or raw credentials.

## Testing

Playwright intercepts connection APIs with a fake provider for list/filters. Consultant fixture verifies route blocking. API Jest covers routing validation, deal reuse, webhook idempotency, and tenant isolation.
