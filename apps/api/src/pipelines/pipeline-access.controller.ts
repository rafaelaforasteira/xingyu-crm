import { Body, Controller, Get, Param, Put } from "@nestjs/common";
import { AuthRole } from "@xingyu/database";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import type { AuthenticatedUser } from "../auth/types";
import { OrganizationId } from "../common/decorators/organization.decorator";
import { PipelineAccessService } from "./pipeline-access.service";

@Controller("pipelines/access")
export class PipelineAccessController {
  constructor(private readonly access: PipelineAccessService) {}

  @Get()
  @Roles(AuthRole.ADMIN)
  overview(@OrganizationId() orgId: string) { return this.access.overview(orgId); }

  @Put(":pipelineId")
  @Roles(AuthRole.ADMIN)
  update(@OrganizationId() orgId: string, @Param("pipelineId") id: string, @Body() body: { accessMode: "ORGANIZATION" | "RESTRICTED"; teamIds?: string[]; userIds?: string[] }, @CurrentUser() _user: AuthenticatedUser) {
    return this.access.update(orgId, id, body);
  }

  @Get(":pipelineId/eligible-users")
  eligibleUsers(@CurrentUser() user: AuthenticatedUser, @Param("pipelineId") pipelineId: string) {
    return this.access.eligibleUsers(user, pipelineId);
  }
}
