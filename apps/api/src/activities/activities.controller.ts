import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags, ApiHeader } from "@nestjs/swagger";
import { ActivitiesService } from "./activities.service";
import { OrganizationId } from "../common/decorators/organization.decorator";
import { QueryActivitiesDto } from "./dto/activity.dto";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../auth/types";
import { PipelineAccessService } from "../pipelines/pipeline-access.service";

@ApiTags("activities")
@ApiHeader({ name: "X-Demo-User-Id", required: false })
@Controller("activities")
export class ActivitiesController {
  constructor(private readonly service: ActivitiesService, private readonly access: PipelineAccessService) {}

  @Get()
  async findAll(@OrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Query() query: QueryActivitiesDto): Promise<unknown> {
    if (query.dealId) await this.access.assertDealAccess(user, query.dealId);
    return this.service.findAll(organizationId, query, await this.access.accessiblePipelineIds(user));
  }

  @Get("timeline")
  async timeline(@OrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Query() query: QueryActivitiesDto): Promise<unknown> {
    if (query.dealId) await this.access.assertDealAccess(user, query.dealId);
    return this.service.timeline(organizationId, query, await this.access.accessiblePipelineIds(user));
  }
}
