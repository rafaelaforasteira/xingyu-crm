import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { RepurchaseService } from "./repurchase.service";
import { OrganizationId } from "../common/decorators/organization.decorator";
import {
  DemoUser,
  type DemoUser as DemoUserType,
} from "../common/decorators/demo-user.decorator";
import { QueryRepurchaseDto } from "./dto/repurchase.dto";
import { CreateReactivationOpportunityDto } from "../reactivation/dto/reactivation.dto";

@ApiTags("repurchase")
@ApiHeader({ name: "X-Demo-User-Id", required: false })
@Controller("repurchase")
export class RepurchaseController {
  constructor(private readonly repurchaseService: RepurchaseService) {}

  @Get()
  @ApiOperation({ summary: "List repurchase opportunities from purchase history" })
  @ApiOkResponse({ description: "Paginated repurchase opportunities" })
  repurchase(@OrganizationId() orgId: string, @Query() query: QueryRepurchaseDto) {
    return this.repurchaseService.listRepurchaseOpportunities(orgId, query);
  }

  @Post(":contactId/opportunity")
  @ApiOperation({ summary: "Convert a repurchase candidate into an opportunity" })
  @ApiCreatedResponse({ description: "Opportunity created atomically" })
  @ApiConflictResponse({ description: "The contact already has an open deal" })
  createOpportunity(
    @OrganizationId() organizationId: string,
    @DemoUser() user: DemoUserType,
    @Param("contactId") contactId: string,
    @Body() dto: CreateReactivationOpportunityDto,
  ) {
    return this.repurchaseService.createOpportunity(
      organizationId,
      contactId,
      dto,
      user.id,
    );
  }
}
