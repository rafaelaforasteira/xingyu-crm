import { Body, Controller, Get, Param, Put } from "@nestjs/common";
import { ApiCookieAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthRole } from "@xingyu/database";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import type { AuthenticatedUser } from "../auth/types";
import { OrganizationId } from "../common/decorators/organization.decorator";
import { PipelineAccessService } from "./pipeline-access.service";

@ApiTags("pipeline-access")
@ApiCookieAuth("xingyu_access_token")
@Controller("pipelines/access")
export class PipelineAccessController {
  constructor(private readonly access: PipelineAccessService) {}

  @Get()
  @Roles(AuthRole.ADMIN)
  @ApiOperation({ summary: "Visão de acessos de pipelines (admin)" })
  overview(@OrganizationId() orgId: string) { return this.access.overview(orgId); }

  @Put(":pipelineId")
  @Roles(AuthRole.ADMIN)
  @ApiOperation({ summary: "Atualizar modo de acesso de um pipeline" })
  update(@OrganizationId() orgId: string, @Param("pipelineId") id: string, @Body() body: { accessMode: "ORGANIZATION" | "RESTRICTED"; teamIds?: string[]; userIds?: string[] }, @CurrentUser() _user: AuthenticatedUser) {
    return this.access.update(orgId, id, body);
  }

  @Get(":pipelineId/eligible-users")
  @ApiOperation({ summary: "Usuários elegíveis para acesso ao pipeline" })
  eligibleUsers(@CurrentUser() user: AuthenticatedUser, @Param("pipelineId") pipelineId: string) {
    return this.access.eligibleUsers(user, pipelineId);
  }
}
