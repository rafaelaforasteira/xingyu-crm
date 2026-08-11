import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiHeader } from "@nestjs/swagger";
import { DealsService } from "./deals.service";
import { OrganizationId } from "../common/decorators/organization.decorator";
import { DemoUser, type DemoUser as DemoUserType } from "../common/decorators/demo-user.decorator";
import {
  CreateDealDto,
  UpdateDealDto,
  QueryDealsDto,
  MoveStageDto,
  WinLoseDto,
  BulkMoveDealsDto,
  CreateManualLeadDto,
  LookupManualLeadDto,
} from "./dto/deal.dto";

@ApiTags("deals")
@ApiHeader({ name: "X-Demo-User-Id", required: false })
@Controller("deals")
export class DealsController {
  constructor(private readonly dealsService: DealsService) {}

  @Get()
  @ApiOperation({ summary: "List deals" })
  findAll(@OrganizationId() orgId: string, @Query() query: QueryDealsDto) {
    return this.dealsService.findAll(orgId, query);
  }

  @Get("kanban/:pipelineId")
  @ApiOperation({ summary: "Kanban board data for pipeline" })
  kanban(@OrganizationId() orgId: string, @Param("pipelineId") pipelineId: string) {
    return this.dealsService.kanban(orgId, pipelineId);
  }

  @Get("manual-lead/lookup")
  @ApiOperation({ summary: "Lookup identity for manual lead creation" })
  lookupManualLead(@OrganizationId() orgId: string, @Query() query: LookupManualLeadDto) {
    return this.dealsService.lookupManualLead(orgId, query);
  }

  @Post("manual-lead")
  @ApiOperation({ summary: "Create a manual lead with its initial context" })
  createManualLead(
    @OrganizationId() orgId: string,
    @DemoUser() user: DemoUserType,
    @Body() dto: CreateManualLeadDto,
  ) {
    return this.dealsService.createManualLead(orgId, dto, user.id);
  }

  @Post("bulk/move")
  @ApiOperation({ summary: "Bulk move deals to stage" })
  bulkMove(
    @OrganizationId() orgId: string,
    @DemoUser() user: DemoUserType,
    @Body() dto: BulkMoveDealsDto,
  ) {
    return this.dealsService.bulkMove(orgId, dto, user.id);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get deal by id" })
  findOne(@OrganizationId() orgId: string, @Param("id") id: string) {
    return this.dealsService.findOne(orgId, id);
  }

  @Post()
  @ApiOperation({ summary: "Create deal" })
  create(
    @OrganizationId() orgId: string,
    @DemoUser() user: DemoUserType,
    @Body() dto: CreateDealDto,
  ) {
    return this.dealsService.create(orgId, dto, user.id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update deal" })
  update(
    @OrganizationId() orgId: string,
    @DemoUser() user: DemoUserType,
    @Param("id") id: string,
    @Body() dto: UpdateDealDto,
  ) {
    return this.dealsService.update(orgId, id, dto, user.id);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Soft-delete deal" })
  remove(@OrganizationId() orgId: string, @DemoUser() user: DemoUserType, @Param("id") id: string) {
    return this.dealsService.remove(orgId, id, user.id);
  }

  @Post(":id/move")
  @ApiOperation({ summary: "Move deal to stage" })
  moveStage(
    @OrganizationId() orgId: string,
    @DemoUser() user: DemoUserType,
    @Param("id") id: string,
    @Body() dto: MoveStageDto,
  ) {
    return this.dealsService.moveStage(orgId, id, dto, user.id);
  }

  @Post(":id/win")
  @ApiOperation({ summary: "Mark deal as won" })
  win(
    @OrganizationId() orgId: string,
    @DemoUser() user: DemoUserType,
    @Param("id") id: string,
    @Body() dto: WinLoseDto,
  ) {
    return this.dealsService.win(orgId, id, dto, user.id);
  }

  @Post(":id/lose")
  @ApiOperation({ summary: "Mark deal as lost" })
  lose(
    @OrganizationId() orgId: string,
    @DemoUser() user: DemoUserType,
    @Param("id") id: string,
    @Body() dto: WinLoseDto,
  ) {
    return this.dealsService.lose(orgId, id, dto, user.id);
  }
}
