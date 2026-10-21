import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AuthRole } from "@xingyu/database";
import { Roles } from "../../auth/decorators/roles.decorator";
import { OrganizationId } from "../../common/decorators/organization.decorator";
import { TrackingOverviewService } from "./tracking-overview.service";

@ApiTags("tracking-overview")
@Controller("tracking/overview")
@Roles(AuthRole.ADMIN)
export class TrackingOverviewController {
  constructor(private readonly overview: TrackingOverviewService) {}

  @Get()
  getOverview(@OrganizationId() organizationId: string) {
    return this.overview.getOverview(organizationId);
  }
}
