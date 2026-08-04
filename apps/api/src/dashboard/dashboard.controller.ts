import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiHeader } from "@nestjs/swagger";
import { DashboardService } from "./dashboard.service";
import { OrganizationId } from "../common/decorators/organization.decorator";

@ApiTags("dashboard")
@ApiHeader({ name: "X-Demo-User-Id", required: false })
@Controller("dashboard")
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get("metrics")
  @ApiOperation({ summary: "Operational KPIs" })
  metrics(
    @OrganizationId() orgId: string,
    @Query("ownerId") ownerId?: string,
    @Query("teamId") teamId?: string,
    @Query("pipelineId") pipelineId?: string,
    @Query("period") period?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("channel") channel?: string,
    @Query("source") source?: string,
  ) {
    return this.service.metrics(orgId, {
      ownerId,
      teamId,
      pipelineId,
      period,
      from,
      to,
      channel,
      source,
    });
  }

  @Get("charts")
  @ApiOperation({ summary: "Dashboard charts and funnel" })
  charts(
    @OrganizationId() orgId: string,
    @Query("ownerId") ownerId?: string,
    @Query("teamId") teamId?: string,
    @Query("pipelineId") pipelineId?: string,
    @Query("period") period?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("channel") channel?: string,
    @Query("source") source?: string,
  ) {
    return this.service.charts(orgId, {
      ownerId,
      teamId,
      pipelineId,
      period,
      from,
      to,
      channel,
      source,
    });
  }

  @Get("lists")
  @ApiOperation({ summary: "Dashboard operational lists" })
  lists(
    @OrganizationId() orgId: string,
    @Query("ownerId") ownerId?: string,
    @Query("teamId") teamId?: string,
    @Query("pipelineId") pipelineId?: string,
    @Query("period") period?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ): Promise<unknown> {
    return this.service.lists(orgId, {
      ownerId,
      teamId,
      pipelineId,
      period,
      from,
      to,
    });
  }
}
