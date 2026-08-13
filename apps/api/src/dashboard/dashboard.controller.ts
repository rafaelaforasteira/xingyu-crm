import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiHeader } from "@nestjs/swagger";
import { DashboardService } from "./dashboard.service";
import { OrganizationId } from "../common/decorators/organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../auth/types";
import { PipelineAccessService } from "../pipelines/pipeline-access.service";

@ApiTags("dashboard")
@ApiHeader({ name: "X-Demo-User-Id", required: false })
@Controller("dashboard")
export class DashboardController {
  constructor(
    private readonly service: DashboardService,
    private readonly access: PipelineAccessService,
  ) {}

  private async filters(
    orgId: string,
    user: AuthenticatedUser,
    query: Record<string, string | undefined>,
  ) {
    return this.service.authorizeFilters(
      orgId,
      user,
      query,
      await this.access.accessiblePipelineIds(user),
    );
  }

  @Get("metrics")
  @ApiOperation({ summary: "Operational KPIs" })
  async metrics(
    @OrganizationId() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query("ownerId") ownerId?: string,
    @Query("teamId") teamId?: string,
    @Query("pipelineId") pipelineId?: string,
    @Query("period") period?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("channel") channel?: string,
    @Query("source") source?: string,
  ) {
    return this.service.metrics(
      orgId,
      await this.filters(orgId, user, {
        ownerId,
        teamId,
        pipelineId,
        period,
        from,
        to,
        channel,
        source,
      }),
    );
  }

  @Get("charts")
  @ApiOperation({ summary: "Dashboard charts and funnel" })
  async charts(
    @OrganizationId() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query("ownerId") ownerId?: string,
    @Query("teamId") teamId?: string,
    @Query("pipelineId") pipelineId?: string,
    @Query("period") period?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("channel") channel?: string,
    @Query("source") source?: string,
  ) {
    return this.service.charts(
      orgId,
      await this.filters(orgId, user, {
        ownerId,
        teamId,
        pipelineId,
        period,
        from,
        to,
        channel,
        source,
      }),
    );
  }

  @Get("lists")
  @ApiOperation({ summary: "Dashboard operational lists" })
  async lists(
    @OrganizationId() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query("ownerId") ownerId?: string,
    @Query("teamId") teamId?: string,
    @Query("pipelineId") pipelineId?: string,
    @Query("period") period?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ): Promise<unknown> {
    return this.service.lists(
      orgId,
      await this.filters(orgId, user, {
        ownerId,
        teamId,
        pipelineId,
        period,
        from,
        to,
      }),
    );
  }

  @Get("filters")
  filterOptions(@OrganizationId() orgId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.filterOptions(orgId, user, this.access.accessiblePipelineIds(user));
  }

  @Get("overview")
  async overview(
    @OrganizationId() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: Record<string, string | undefined>,
  ) {
    return this.service.overview(orgId, await this.filters(orgId, user, query));
  }

  @Get("commercial")
  async commercial(
    @OrganizationId() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: Record<string, string | undefined>,
  ) {
    return this.service.commercial(orgId, await this.filters(orgId, user, query));
  }

  @Get("attendance")
  async attendance(
    @OrganizationId() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: Record<string, string | undefined>,
  ) {
    return this.service.attendance(orgId, await this.filters(orgId, user, query));
  }

  @Get("team")
  async team(
    @OrganizationId() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: Record<string, string | undefined>,
  ) {
    return this.service.team(orgId, await this.filters(orgId, user, query));
  }

  @Get("customers")
  async customers(
    @OrganizationId() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: Record<string, string | undefined>,
  ) {
    return this.service.customers(orgId, await this.filters(orgId, user, query));
  }

  @Get("channels")
  async channels(
    @OrganizationId() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: Record<string, string | undefined>,
  ) {
    return this.service.channels(orgId, await this.filters(orgId, user, query));
  }

  @Get("explore")
  async explore(
    @OrganizationId() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: Record<string, string | undefined>,
  ) {
    return this.service.explore(
      orgId,
      await this.filters(orgId, user, query),
      query.metric,
      query.dimension,
    );
  }
}
