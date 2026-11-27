import {
  Body,
  Controller,
  ForbiddenException,
  Headers,
  Param,
  Post,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Public } from "../auth/decorators/public.decorator";
import { ConnectionsInboundService } from "./connections-inbound.service";
import { ConnectionProviderRegistry } from "./providers/connection-provider.registry";

@ApiTags("Connections")
@Controller("webhooks/connections")
export class ConnectionsWebhookController {
  constructor(
    private readonly providers: ConnectionProviderRegistry,
    private readonly inbound: ConnectionsInboundService,
  ) {}

  @Public()
  @Post(":provider/:externalInstanceId")
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @ApiOperation({ summary: "Receive a signed connection provider event" })
  async receive(
    @Param("provider") providerName: string,
    @Param("externalInstanceId") externalInstanceId: string,
    @Headers("x-connection-signature") signature: string | undefined,
    @Body() payload: unknown,
  ) {
    const provider = this.providers.get(providerName);
    if (!provider.validateWebhook(payload, signature)) {
      throw new ForbiddenException("Invalid webhook signature");
    }
    const event = provider.normalizeWebhook(payload);
    if (event.kind === "ignored") {
      return { accepted: true, ignored: true };
    }
    const channel = await this.inbound.resolveChannel(providerName, externalInstanceId);
    return this.inbound.process(channel, event);
  }
}
