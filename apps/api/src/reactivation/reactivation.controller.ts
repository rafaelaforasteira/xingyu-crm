import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiHeader, ApiOkResponse } from "@nestjs/swagger";
import { ReactivationService } from "./reactivation.service";
import { OrganizationId } from "../common/decorators/organization.decorator";
import {
  PaginatedReactivationResponseDto,
  QueryReactivationDto,
} from "./dto/reactivation.dto";

@ApiTags("reactivation")
@ApiHeader({ name: "X-Demo-User-Id", required: false })
@Controller("reactivation")
export class ReactivationController {
  constructor(private readonly service: ReactivationService) {}

  @Get()
  @ApiOperation({ summary: "List reactivation opportunities from inactive contacts" })
  @ApiOkResponse({ type: PaginatedReactivationResponseDto })
  list(@OrganizationId() organizationId: string, @Query() query: QueryReactivationDto) {
    return this.service.list(organizationId, query);
  }
}
