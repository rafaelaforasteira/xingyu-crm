import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { ReactivationService } from "./reactivation.service";
import { OrganizationId } from "../common/decorators/organization.decorator";
import {
  DemoUser,
  type DemoUser as DemoUserType,
} from "../common/decorators/demo-user.decorator";
import {
  CreateReactivationActionDto,
  CreateReactivationOpportunityDto,
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

  @Post(":contactId/opportunity")
  @ApiOperation({ summary: "Convert a reactivation candidate into an opportunity" })
  @ApiCreatedResponse({ description: "Opportunity created atomically" })
  @ApiConflictResponse({ description: "The contact already has an open deal" })
  createOpportunity(
    @OrganizationId() organizationId: string,
    @DemoUser() user: DemoUserType,
    @Param("contactId") contactId: string,
    @Body() dto: CreateReactivationOpportunityDto,
  ) {
    return this.service.createOpportunity(organizationId, contactId, dto, user.id);
  }

  @Post(":contactId/actions")
  @ApiOperation({ summary: "Record a reactivation workflow action" })
  @ApiCreatedResponse({ description: "Workflow action recorded" })
  createAction(
    @OrganizationId() organizationId: string,
    @DemoUser() user: DemoUserType,
    @Param("contactId") contactId: string,
    @Body() dto: CreateReactivationActionDto,
  ) {
    return this.service.createAction(organizationId, contactId, dto, user.id);
  }
}
