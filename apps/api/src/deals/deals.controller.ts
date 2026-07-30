import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from "@nestjs/common";
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

  @Post("bulk/move")
  @ApiOperation({ summary: "Bulk move deals to stage" })
  bulkMove(@OrganizationId() orgId: string, @Body() dto: BulkMoveDealsDto) {
    return this.dealsService.bulkMove(orgId, dto);
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
    @Param("id") id: string,
    @Body() dto: UpdateDealDto,
  ) {
    return this.dealsService.update(orgId, id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Soft-delete deal" })
  remove(@OrganizationId() orgId: string, @Param("id") id: string) {
    return this.dealsService.remove(orgId, id);
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
