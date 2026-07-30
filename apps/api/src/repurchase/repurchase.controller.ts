import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiHeader } from "@nestjs/swagger";
import { RepurchaseService } from "./repurchase.service";
import { OrganizationId } from "../common/decorators/organization.decorator";
import { QueryRepurchaseDto } from "./dto/repurchase.dto";

@ApiTags("repurchase")
@ApiHeader({ name: "X-Demo-User-Id", required: false })
@Controller("repurchase")
export class RepurchaseController {
  constructor(private readonly repurchaseService: RepurchaseService) {}

  @Get()
  @ApiOperation({ summary: "List repurchase opportunities from won deals" })
  repurchase(@OrganizationId() orgId: string, @Query() query: QueryRepurchaseDto) {
    return this.repurchaseService.listRepurchaseOpportunities(orgId, query);
  }
}
