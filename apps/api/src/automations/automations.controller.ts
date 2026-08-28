import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Headers,
} from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AutomationsService } from "./automations.service";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Permissions } from "../auth/decorators/permissions.decorator";
import type { AuthenticatedUser } from "../auth/types";
import { OrganizationId } from "../common/decorators/organization.decorator";
import { PaginationQueryDto } from "../common/dto/pagination.dto";
import {
  CreateAutomationDto,
  ManualRunDto,
  QueryAutomationsDto,
  QueryExecutionsDto,
  RetryExecutionDto,
  SaveDraftDto,
  TestAutomationDto,
  TestNodeDto,
  ToggleAutomationDto,
  UpdateAutomationDto,
} from "./dto/automation.dto";

@ApiTags("automations")
@ApiHeader({ name: "X-Demo-User-Id", required: false })
@Controller("automations")
@Permissions("automations.manage")
export class AutomationsController {
  constructor(private readonly automationsService: AutomationsService) {}

  @Get()
  @ApiOperation({ summary: "List automations" })
  findAll(@OrganizationId() orgId: string, @Query() query: QueryAutomationsDto) {
    return this.automationsService.findAll(orgId, query);
  }

  @Get("metrics")
  metrics(@OrganizationId() orgId: string) {
    return this.automationsService.metrics(orgId);
  }

  @Get("runtime/health")
  runtimeHealth() {
    return this.automationsService.runtimeHealth();
  }

  @Get("node-catalog")
  catalog() {
    return this.automationsService.catalog();
  }

  @Get("templates")
  templates() {
    return this.automationsService.templates();
  }

  @Get("executions")
  listAllExecutions(@OrganizationId() orgId: string, @Query() query: QueryExecutionsDto) {
    return this.automationsService.listAllExecutions(orgId, query);
  }

  @Get("executions/recent")
  recentExecutions(@OrganizationId() orgId: string) {
    return this.automationsService.recentExecutions(orgId);
  }

  @Get("executions/:executionId")
  getExecution(@OrganizationId() orgId: string, @Param("executionId") executionId: string) {
    return this.automationsService.getExecution(orgId, executionId);
  }

  @Post("executions/:executionId/retry")
  retryExecution(
    @OrganizationId() orgId: string,
    @Param("executionId") executionId: string,
    @Body() dto: RetryExecutionDto,
  ) {
    return this.automationsService.retryExecution(orgId, executionId, dto.fromStart);
  }

  @Post("executions/:executionId/cancel")
  cancelExecution(@OrganizationId() orgId: string, @Param("executionId") executionId: string) {
    return this.automationsService.cancelExecution(orgId, executionId);
  }

  @Post("test-node")
  testNode(@OrganizationId() orgId: string, @Body() dto: TestNodeDto) {
    return this.automationsService.testNode(orgId, dto);
  }

  @Get(":id")
  findOne(@OrganizationId() orgId: string, @Param("id") id: string) {
    return this.automationsService.findOne(orgId, id);
  }

  @Post()
  create(
    @OrganizationId() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAutomationDto,
  ) {
    return this.automationsService.create(orgId, user.id, dto);
  }

  @Patch(":id")
  update(
    @OrganizationId() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateAutomationDto,
  ) {
    return this.automationsService.update(orgId, id, user.id, dto);
  }

  @Put(":id/draft")
  saveDraft(
    @OrganizationId() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: SaveDraftDto,
  ) {
    return this.automationsService.saveDraft(orgId, id, user.id, dto);
  }

  @Post(":id/validate")
  validate(@OrganizationId() orgId: string, @Param("id") id: string) {
    return this.automationsService.validate(orgId, id);
  }

  @Post(":id/publish")
  publish(
    @OrganizationId() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.automationsService.publish(orgId, id, user.id);
  }

  @Post(":id/pause")
  pause(
    @OrganizationId() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: ToggleAutomationDto,
  ) {
    return this.automationsService.pause(orgId, id, user.id, dto.enabled);
  }

  @Post(":id/toggle")
  toggle(
    @OrganizationId() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: ToggleAutomationDto,
  ) {
    return this.automationsService.toggle(orgId, id, user.id, dto);
  }

  @Post(":id/archive")
  archive(
    @OrganizationId() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.automationsService.archive(orgId, id, user.id);
  }

  @Post(":id/duplicate")
  duplicate(
    @OrganizationId() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.automationsService.duplicate(orgId, id, user.id);
  }

  @Get(":id/export")
  exportWorkflow(@OrganizationId() orgId: string, @Param("id") id: string) {
    return this.automationsService.exportWorkflow(orgId, id);
  }

  @Get(":id/versions")
  versions(@OrganizationId() orgId: string, @Param("id") id: string) {
    return this.automationsService.versions(orgId, id);
  }

  @Post(":id/versions/:versionId/restore")
  restoreVersion(
    @OrganizationId() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Param("versionId") versionId: string,
  ) {
    return this.automationsService.restoreVersion(orgId, id, versionId, user.id);
  }

  @Post(":id/test")
  test(@OrganizationId() orgId: string, @Param("id") id: string, @Body() dto: TestAutomationDto) {
    return this.automationsService.test(orgId, id, dto);
  }

  @Post(":id/run")
  run(
    @OrganizationId() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: ManualRunDto,
  ) {
    return this.automationsService.manualRun(orgId, id, user.id, dto);
  }

  @Get(":id/executions")
  executions(
    @OrganizationId() orgId: string,
    @Param("id") id: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.automationsService.listExecutions(orgId, id, query);
  }
}
