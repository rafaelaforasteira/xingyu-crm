import { Body, Controller, Headers, Param, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "../auth/decorators/public.decorator";
import { AutomationsService } from "./automations.service";

@ApiTags("automations")
@Controller("automations/hooks")
export class AutomationsWebhookController {
  constructor(private readonly automations: AutomationsService) {}

  @Public()
  @Post(":token")
  @ApiOperation({ summary: "Inbound automation webhook" })
  receive(
    @Param("token") token: string,
    @Body() body: unknown,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.automations.receiveWebhook(token, body, headers);
  }
}
