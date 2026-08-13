import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags, ApiHeader } from "@nestjs/swagger";
import { SearchService } from "./search.service";
import { OrganizationId } from "../common/decorators/organization.decorator";
import { GlobalSearchDto } from "./dto/search.dto";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../auth/types";
import { PipelineAccessService } from "../pipelines/pipeline-access.service";

@ApiTags("search")
@ApiHeader({ name: "X-Demo-User-Id", required: false })
@Controller("search")
export class SearchController {
  constructor(private readonly service: SearchService, private readonly access: PipelineAccessService) {}

  @Get()
  async search(@OrganizationId() organizationId: string, @CurrentUser() user: AuthenticatedUser, @Query() query: GlobalSearchDto) {
    return this.service.global(organizationId, query, await this.access.accessiblePipelineIds(user));
  }
}
