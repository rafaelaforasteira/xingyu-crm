import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiHeader, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";
import { ReactivationService } from "./reactivation.service";
import { OrganizationId } from "../common/decorators/organization.decorator";
import { PaginationQueryDto } from "../common/dto/pagination.dto";

class QueryReactivationDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  segment?: string;
}

@ApiTags("reactivation")
@ApiHeader({ name: "X-Demo-User-Id", required: false })
@Controller("reactivation")
export class ReactivationController {
  constructor(private readonly service: ReactivationService) {}

  @Get()
  @ApiOperation({ summary: "List reactivation opportunities from inactive contacts" })
  list(@OrganizationId() organizationId: string, @Query() query: QueryReactivationDto) {
    return this.service.list(organizationId, query, query.segment);
  }
}
