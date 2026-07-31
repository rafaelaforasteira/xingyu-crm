import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags, ApiHeader } from "@nestjs/swagger";
import { ActivitiesService } from "./activities.service";
import { OrganizationId } from "../common/decorators/organization.decorator";
import { QueryActivitiesDto } from "./dto/activity.dto";

@ApiTags("activities")
@ApiHeader({ name: "X-Demo-User-Id", required: false })
@Controller("activities")
export class ActivitiesController {
  constructor(private readonly service: ActivitiesService) {}

  @Get()
  findAll(@OrganizationId() organizationId: string, @Query() query: QueryActivitiesDto): Promise<unknown> {
    return this.service.findAll(organizationId, query);
  }

  @Get("timeline")
  timeline(@OrganizationId() organizationId: string, @Query() query: QueryActivitiesDto): Promise<unknown> {
    return this.service.timeline(organizationId, query);
  }
}
