import { Module } from "@nestjs/common";
import { ConnectionsController } from "./connections.controller";
import { ConnectionsInboundService } from "./connections-inbound.service";
import { ConnectionsService } from "./connections.service";
import { ConnectionsWebhookController } from "./connections.webhook.controller";
import { ConnectionProviderRegistry } from "./providers/connection-provider.registry";
import { EvolutionWhatsAppProvider } from "./providers/evolution-whatsapp.provider";
import { FakeWhatsAppProvider } from "./providers/fake-whatsapp.provider";

@Module({
  controllers: [ConnectionsController, ConnectionsWebhookController],
  providers: [
    ConnectionsService,
    ConnectionsInboundService,
    ConnectionProviderRegistry,
    FakeWhatsAppProvider,
    EvolutionWhatsAppProvider,
  ],
  exports: [ConnectionsService, ConnectionsInboundService],
})
export class ConnectionsModule {}

export { canUserAccessConnection } from "./connection-access";
