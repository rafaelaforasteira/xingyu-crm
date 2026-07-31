import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags, ApiHeader } from "@nestjs/swagger";
import { SearchService } from "./search.service";
import { OrganizationId } from "../common/decorators/organization.decorator";
import { GlobalSearchDto } from "./dto/search.dto";

@ApiTags("search")
@ApiHeader({ name: "X-Demo-User-Id", required: false })
@Controller("search")
export class SearchController {
  constructor(private readonly service: SearchService) {}

  @Get()
  search(@OrganizationId() organizationId: string, @Query() query: GlobalSearchDto) {
    return this.service.global(organizationId, query);
  }
}
