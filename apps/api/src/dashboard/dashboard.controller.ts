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
  ) {
    return this.service.metrics(orgId, { ownerId, teamId, pipelineId });
  }

  @Get("charts")
  charts(@OrganizationId() orgId: string) {
    return this.service.charts(orgId);
  }

  @Get("lists")
  lists(@OrganizationId() orgId: string): Promise<unknown> {
    return this.service.lists(orgId);
  }
}
