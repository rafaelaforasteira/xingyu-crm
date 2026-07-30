import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiHeader } from "@nestjs/swagger";
import { ReportsService } from "./reports.service";
import { OrganizationId } from "../common/decorators/organization.decorator";
import { ReportQueryDto } from "./dto/report.dto";

@ApiTags("reports")
@ApiHeader({ name: "X-Demo-User-Id", required: false })
@Controller("reports")
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get("dashboard")
  @ApiOperation({ summary: "Dashboard metrics" })
  dashboard(@OrganizationId() orgId: string, @Query() query: ReportQueryDto) {
    return this.reportsService.dashboard(orgId, query);
  }

  @Get("sales")
  @ApiOperation({ summary: "Sales report" })
  sales(@OrganizationId() orgId: string, @Query() query: ReportQueryDto) {
    return this.reportsService.sales(orgId, query);
  }

  @Get("pipeline")
  @ApiOperation({ summary: "Pipeline funnel report" })
  pipeline(@OrganizationId() orgId: string, @Query() query: ReportQueryDto) {
    return this.reportsService.pipeline(orgId, query);
  }

  @Get("tasks")
  @ApiOperation({ summary: "Tasks report" })
  tasks(@OrganizationId() orgId: string, @Query() query: ReportQueryDto) {
    return this.reportsService.tasks(orgId, query);
  }
}
