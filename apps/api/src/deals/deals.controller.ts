import { Controller, Get, Post, Patch, Delete, Body, Param, Query, ForbiddenException } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiHeader } from "@nestjs/swagger";
import { DealsService } from "./deals.service";
import { OrganizationId } from "../common/decorators/organization.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../auth/types";
import { PipelineAccessService } from "../pipelines/pipeline-access.service";
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
  constructor(private readonly dealsService: DealsService, private readonly access: PipelineAccessService) {}

  @Get()
  @ApiOperation({ summary: "List deals" })
  async findAll(@OrganizationId() orgId: string, @CurrentUser() user: AuthenticatedUser, @Query() query: QueryDealsDto) {
    return this.dealsService.findAll(orgId, query, await this.access.accessiblePipelineIds(user), user.role === "ADMIN" ? undefined : user.id);
  }

  @Get("kanban/:pipelineId")
  @ApiOperation({ summary: "Kanban board data for pipeline" })
  async kanban(@OrganizationId() orgId: string, @CurrentUser() user: AuthenticatedUser, @Param("pipelineId") pipelineId: string) {
    await this.access.assertAccess(user, pipelineId);
    return this.dealsService.kanban(orgId, pipelineId, user);
  }

  @Get("manual-lead/lookup")
  @ApiOperation({ summary: "Lookup identity for manual lead creation" })
  async lookupManualLead(@OrganizationId() orgId: string, @CurrentUser() user: AuthenticatedUser, @Query() query: LookupManualLeadDto) {
    await this.access.assertAccess(user, query.pipelineId);
    return this.dealsService.lookupManualLead(orgId, query, await this.access.accessiblePipelineIds(user));
  }

  @Post("manual-lead")
  @ApiOperation({ summary: "Create a manual lead with its initial context" })
  async createManualLead(
    @OrganizationId() orgId: string,
    @DemoUser() user: DemoUserType,
    @Body() dto: CreateManualLeadDto,
    @CurrentUser() authUser: AuthenticatedUser,
  ) {
    await this.access.assertAccess(authUser, dto.pipelineId);
    if (authUser.role !== "ADMIN" && dto.ownerId && dto.ownerId !== authUser.id) throw new ForbiddenException("Somente administradores podem atribuir leads a outra pessoa.");
    await this.access.assertEligibleUser(authUser, dto.pipelineId, dto.ownerId ?? authUser.id);
    return this.dealsService.createManualLead(orgId, dto, user.id);
  }

  @Post("bulk/move")
  @ApiOperation({ summary: "Bulk move deals to stage" })
  async bulkMove(
    @OrganizationId() orgId: string,
    @DemoUser() user: DemoUserType,
    @Body() dto: BulkMoveDealsDto,
    @CurrentUser() authUser: AuthenticatedUser,
  ) {
    await Promise.all(dto.dealIds.map((id) => this.access.assertDealAccess(authUser, id)));
    return this.dealsService.bulkMove(orgId, dto, user.id);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get deal by id" })
  async findOne(@OrganizationId() orgId: string, @CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    await this.access.assertDealAccess(user, id);
    return this.dealsService.findOne(orgId, id);
  }

  @Post()
  @ApiOperation({ summary: "Create deal" })
  async create(
    @OrganizationId() orgId: string,
    @DemoUser() user: DemoUserType,
    @Body() dto: CreateDealDto,
    @CurrentUser() authUser: AuthenticatedUser,
  ) {
    await this.access.assertAccess(authUser, dto.pipelineId);
    await this.access.assertEligibleUser(authUser, dto.pipelineId, dto.ownerId ?? authUser.id);
    return this.dealsService.create(orgId, dto, user.id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update deal" })
  async update(
    @OrganizationId() orgId: string,
    @DemoUser() user: DemoUserType,
    @Param("id") id: string,
    @Body() dto: UpdateDealDto,
    @CurrentUser() authUser: AuthenticatedUser,
  ) {
    await this.access.assertDealAccess(authUser, id);
    if (dto.ownerId !== undefined) {
      if (authUser.role !== "ADMIN") throw new ForbiddenException("Somente administradores podem transferir responsáveis.");
      const deal = await this.dealsService.findOne(orgId, id);
      await this.access.assertEligibleUser(authUser, deal.pipelineId, dto.ownerId);
    }
    return this.dealsService.update(orgId, id, dto, user.id);
  }

  @Post(":id/tags/:tagId")
  async addTag(
    @OrganizationId() orgId: string,
    @DemoUser() user: DemoUserType,
    @Param("id") id: string,
    @Param("tagId") tagId: string,
    @CurrentUser() authUser: AuthenticatedUser,
  ) {
    await this.access.assertDealAccess(authUser, id);
    return this.dealsService.addTag(orgId, id, tagId, user.id);
  }

  @Delete(":id/tags/:tagId")
  async removeTag(
    @OrganizationId() orgId: string,
    @Param("id") id: string,
    @Param("tagId") tagId: string,
    @CurrentUser() authUser: AuthenticatedUser,
  ) {
    await this.access.assertDealAccess(authUser, id);
    return this.dealsService.removeTag(orgId, id, tagId);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Soft-delete deal" })
  async remove(@OrganizationId() orgId: string, @DemoUser() user: DemoUserType, @CurrentUser() authUser: AuthenticatedUser, @Param("id") id: string) {
    await this.access.assertDealAccess(authUser, id);
    return this.dealsService.remove(orgId, id, user.id);
  }

  @Post(":id/move")
  @ApiOperation({ summary: "Move deal to stage" })
  async moveStage(
    @OrganizationId() orgId: string,
    @DemoUser() user: DemoUserType,
    @Param("id") id: string,
    @Body() dto: MoveStageDto,
    @CurrentUser() authUser: AuthenticatedUser,
  ) {
    await this.access.assertDealAccess(authUser, id);
    return this.dealsService.moveStage(orgId, id, dto, user.id);
  }

  @Post(":id/win")
  @ApiOperation({ summary: "Mark deal as won" })
  async win(
    @OrganizationId() orgId: string,
    @DemoUser() user: DemoUserType,
    @Param("id") id: string,
    @Body() dto: WinLoseDto,
    @CurrentUser() authUser: AuthenticatedUser,
  ) {
    await this.access.assertDealAccess(authUser, id);
    return this.dealsService.win(orgId, id, dto, user.id);
  }

  @Post(":id/lose")
  @ApiOperation({ summary: "Mark deal as lost" })
  async lose(
    @OrganizationId() orgId: string,
    @DemoUser() user: DemoUserType,
    @Param("id") id: string,
    @Body() dto: WinLoseDto,
    @CurrentUser() authUser: AuthenticatedUser,
  ) {
    await this.access.assertDealAccess(authUser, id);
    return this.dealsService.lose(orgId, id, dto, user.id);
  }
}
