import { Module } from "@nestjs/common";
import { ConnectionsController } from "./connections.controller";
import { ConnectionsInboundService } from "./connections-inbound.service";
import { ConnectionsService } from "./connections.service";
import { ConnectionsWebhookController } from "./connections.webhook.controller";
import { ConnectionProviderRegistry } from "./providers/connection-provider.registry";
import { FakeWhatsAppProvider } from "./providers/fake-whatsapp.provider";

@Module({
  controllers: [ConnectionsController, ConnectionsWebhookController],
  providers: [
    ConnectionsService,
    ConnectionsInboundService,
    ConnectionProviderRegistry,
    FakeWhatsAppProvider,
  ],
  exports: [ConnectionsService, ConnectionsInboundService],
})
export class ConnectionsModule {}

export { canUserAccessConnection } from "./connection-access";
