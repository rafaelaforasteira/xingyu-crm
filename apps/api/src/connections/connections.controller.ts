import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthRole } from "@xingyu/database";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import type { AuthenticatedUser } from "../auth/types";
import { OrganizationId } from "../common/decorators/organization.decorator";
import {
  CreateConnectionDto,
  ListConnectionsQueryDto,
  UpdateConnectionAccessDto,
  UpdateConnectionDto,
  UpdateConnectionRoutingDto,
} from "./dto/connection.dto";
import { ConnectionsService } from "./connections.service";

@ApiTags("Connections")
@ApiCookieAuth("xingyu_access_token")
@Controller("connections")
@Roles(AuthRole.ADMIN)
export class ConnectionsController {
  constructor(private readonly connections: ConnectionsService) {}

  @Get()
  @ApiOperation({ summary: "List connection read models" })
  list(
    @OrganizationId() organizationId: string,
    @Query() query: ListConnectionsQueryDto,
  ) {
    return this.connections.list(organizationId, query);
  }

  @Get("counts")
  counts(@OrganizationId() organizationId: string) {
    return this.connections.counts(organizationId);
  }

  @Post()
  create(
    @OrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateConnectionDto,
  ) {
    return this.connections.create(organizationId, dto, user.id);
  }

  @Get(":id")
  get(@OrganizationId() organizationId: string, @Param("id") id: string) {
    return this.connections.get(organizationId, id);
  }

  @Patch(":id")
  update(
    @OrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateConnectionDto,
  ) {
    return this.connections.update(organizationId, id, dto, user.id);
  }

  @Post(":id/connect")
  connect(
    @OrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.connections.connect(organizationId, id, user.id);
  }

  @Get(":id/qr")
  qr(@OrganizationId() organizationId: string, @Param("id") id: string) {
    return this.connections.qr(organizationId, id);
  }

  @Post(":id/reconnect")
  reconnect(
    @OrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.connections.reconnect(organizationId, id, user.id);
  }

  @Post(":id/disconnect")
  disconnect(
    @OrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.connections.disconnect(organizationId, id, user.id);
  }

  @Post(":id/archive")
  @ApiOperation({
    summary: "Excluir conexão (soft-delete)",
    description:
      "Desconecta/remove a instância no provider externo e arquiva a conexão no CRM sem apagar histórico comercial.",
  })
  archive(
    @OrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.connections.archive(organizationId, id, user.id);
  }

  @Patch(":id/routing")
  routing(
    @OrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateConnectionRoutingDto,
  ) {
    return this.connections.updateRouting(organizationId, id, dto, user.id);
  }

  @Patch(":id/access")
  access(
    @OrganizationId() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateConnectionAccessDto,
  ) {
    return this.connections.updateAccess(organizationId, id, dto, user.id);
  }

  @Get(":id/diagnostics")
  diagnostics(@OrganizationId() organizationId: string, @Param("id") id: string) {
    return this.connections.diagnostics(organizationId, id);
  }

  @Get(":id/activity")
  activity(@OrganizationId() organizationId: string, @Param("id") id: string) {
    return this.connections.activity(organizationId, id);
  }

  @Post(":id/simulate-scan")
  @ApiOperation({ summary: "Homologation-only: simulate WhatsApp QR scan (fake provider)" })
  simulateScan(
    @OrganizationId() organizationId: string,
    @Param("id") id: string,
  ) {
    return this.connections.simulateScan(organizationId, id);
  }
}
