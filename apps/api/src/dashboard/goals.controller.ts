import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiHeader, ApiTags } from "@nestjs/swagger";
import { AuthRole } from "@xingyu/database";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import type { AuthenticatedUser } from "../auth/types";
import { OrganizationId } from "../common/decorators/organization.decorator";
import { PipelineAccessService } from "../pipelines/pipeline-access.service";
import { QueryGoalsDto, UpsertGoalDto } from "./dto/goal.dto";
import { GoalsService } from "./goals.service";

@ApiTags("dashboard-goals")
@ApiHeader({ name: "X-Demo-User-Id", required: false })
@Controller("dashboard/goals")
export class GoalsController {
  constructor(
    private readonly goals: GoalsService,
    private readonly access: PipelineAccessService,
  ) {}

  @Get() list(
    @OrganizationId() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryGoalsDto,
  ) {
    return this.goals.list(orgId, user, query);
  }

  @Get("analytics") analytics(
    @OrganizationId() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryGoalsDto,
  ) {
    return this.goals.analytics(orgId, user, query);
  }

  @Post()
  @Roles(AuthRole.ADMIN, AuthRole.MANAGER)
  async create(
    @OrganizationId() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UpsertGoalDto,
  ) {
    return this.goals.create(orgId, user, body, await this.access.accessiblePipelineIds(user));
  }

  @Patch(":id")
  @Roles(AuthRole.ADMIN, AuthRole.MANAGER)
  async update(
    @OrganizationId() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() body: UpsertGoalDto,
  ) {
    return this.goals.update(orgId, user, id, body, await this.access.accessiblePipelineIds(user));
  }

  @Delete(":id")
  @Roles(AuthRole.ADMIN, AuthRole.MANAGER)
  archive(
    @OrganizationId() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.goals.archive(orgId, user, id);
  }
}
