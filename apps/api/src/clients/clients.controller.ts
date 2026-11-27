import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { OrganizationId } from "../common/decorators/organization.decorator";
import { ClientsService } from "./clients.service";
import { QueryClientsDto } from "./dto/clients.dto";
import { Permissions } from "../auth/decorators/permissions.decorator";

@ApiTags("clients")
@Controller("clients")
@Permissions("clients.view")
export class ClientsController {
  constructor(private readonly clients: ClientsService) {}
  @Get() @ApiOperation({ summary: "List Customer 360 profiles" }) list(@OrganizationId() orgId: string, @Query() query: QueryClientsDto) { return this.clients.list(orgId, query); }
  @Get("dashboard") @ApiOperation({ summary: "Aggregate customer base dashboard" }) dashboard(@OrganizationId() orgId: string) { return this.clients.dashboard(orgId); }
  @Get(":profileId") @ApiOperation({ summary: "Get a Customer 360 profile" }) detail(@OrganizationId() orgId: string, @Param("profileId") profileId: string) { return this.clients.detail(orgId, profileId); }
}
