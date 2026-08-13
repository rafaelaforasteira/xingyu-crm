import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiHeader } from "@nestjs/swagger";
import { TasksService } from "./tasks.service";
import { OrganizationId } from "../common/decorators/organization.decorator";
import { DemoUser, type DemoUser as DemoUserType } from "../common/decorators/demo-user.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../auth/types";
import { PipelineAccessService } from "../pipelines/pipeline-access.service";
import {
  CreateTaskDto,
  UpdateTaskDto,
  QueryTasksDto,
  RescheduleTaskDto,
  CreateTaskStatusDto,
  UpdateTaskStatusDto,
  ReorderTaskStatusesDto,
} from "./dto/task.dto";

@ApiTags("tasks")
@ApiHeader({ name: "X-Demo-User-Id", required: false })
@Controller("tasks")
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
    private readonly access: PipelineAccessService,
  ) {}

  @Get()
  @ApiOperation({ summary: "List tasks" })
  async findAll(
    @OrganizationId() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryTasksDto,
  ) {
    return this.tasksService.findAll(
      orgId,
      query,
      user,
      await this.access.accessiblePipelineIds(user),
    );
  }

  @Get("board")
  @ApiOperation({ summary: "Task board grouped by custom status" })
  async board(
    @OrganizationId() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryTasksDto,
  ) {
    return this.tasksService.board(orgId, query, await this.access.accessiblePipelineIds(user));
  }

  @Get("statuses")
  @ApiOperation({ summary: "List custom task statuses" })
  listStatuses(
    @OrganizationId() orgId: string,
    @Query("includeArchived") includeArchived?: string,
  ) {
    return this.tasksService.listStatuses(orgId, includeArchived === "true");
  }

  @Post("statuses")
  @ApiOperation({ summary: "Create custom task status" })
  createStatus(@OrganizationId() orgId: string, @Body() dto: CreateTaskStatusDto) {
    return this.tasksService.createStatus(orgId, dto);
  }

  @Patch("statuses/:id")
  @ApiOperation({ summary: "Update custom task status" })
  updateStatus(
    @OrganizationId() orgId: string,
    @Param("id") id: string,
    @Body() dto: UpdateTaskStatusDto,
  ) {
    return this.tasksService.updateStatus(orgId, id, dto);
  }

  @Post("statuses/reorder")
  @ApiOperation({ summary: "Reorder custom task statuses" })
  reorderStatuses(@OrganizationId() orgId: string, @Body() dto: ReorderTaskStatusesDto) {
    return this.tasksService.reorderStatuses(orgId, dto.statusIds);
  }

  @Get("today")
  @ApiOperation({ summary: "List tasks due today" })
  async today(@OrganizationId() orgId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.tasksService.today(orgId, await this.access.accessiblePipelineIds(user));
  }

  @Get(":id")
  @ApiOperation({ summary: "Get task" })
  async findOne(
    @OrganizationId() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    await this.access.assertTaskAccess(user, id);
    return this.tasksService.findOne(orgId, id);
  }

  @Post()
  @ApiOperation({ summary: "Create task" })
  async create(
    @OrganizationId() orgId: string,
    @DemoUser() user: DemoUserType,
    @Body() dto: CreateTaskDto,
    @CurrentUser() authUser: AuthenticatedUser,
  ) {
    if (dto.dealId) await this.access.assertDealAccess(authUser, dto.dealId);
    else if (dto.pipelineId) await this.access.assertAccess(authUser, dto.pipelineId);
    const taskPipelineId =
      dto.pipelineId ??
      (dto.dealId ? await this.tasksService.pipelineIdForDeal(orgId, dto.dealId) : null);
    if (taskPipelineId)
      await this.access.assertEligibleUser(authUser, taskPipelineId, dto.assigneeId ?? authUser.id);
    return this.tasksService.create(orgId, dto, user.id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update task" })
  async update(
    @OrganizationId() orgId: string,
    @DemoUser() user: DemoUserType,
    @Param("id") id: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() authUser: AuthenticatedUser,
  ) {
    await this.access.assertTaskAccess(authUser, id);
    if (dto.dealId) await this.access.assertDealAccess(authUser, dto.dealId);
    else if (dto.pipelineId) await this.access.assertAccess(authUser, dto.pipelineId);
    if (dto.assigneeId !== undefined) {
      const taskPipelineId =
        dto.pipelineId ??
        (dto.dealId
          ? await this.tasksService.pipelineIdForDeal(orgId, dto.dealId)
          : await this.tasksService.pipelineIdForTask(orgId, id));
      if (taskPipelineId)
        await this.access.assertEligibleUser(authUser, taskPipelineId, dto.assigneeId);
    }
    return this.tasksService.update(orgId, id, dto, user.id);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Soft-delete task" })
  async remove(
    @OrganizationId() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    await this.access.assertTaskAccess(user, id);
    return this.tasksService.remove(orgId, id);
  }

  @Post(":id/complete")
  @ApiOperation({ summary: "Complete task" })
  async complete(
    @OrganizationId() orgId: string,
    @DemoUser() user: DemoUserType,
    @Param("id") id: string,
    @CurrentUser() authUser: AuthenticatedUser,
  ) {
    await this.access.assertTaskAccess(authUser, id);
    return this.tasksService.complete(orgId, id, user.id);
  }

  @Post(":id/reopen")
  @ApiOperation({ summary: "Reopen task" })
  async reopen(
    @OrganizationId() orgId: string,
    @DemoUser() user: DemoUserType,
    @Param("id") id: string,
    @CurrentUser() authUser: AuthenticatedUser,
  ) {
    await this.access.assertTaskAccess(authUser, id);
    return this.tasksService.reopen(orgId, id, user.id);
  }

  @Post(":id/reschedule")
  @ApiOperation({ summary: "Reschedule task" })
  async reschedule(
    @OrganizationId() orgId: string,
    @Param("id") id: string,
    @Body() dto: RescheduleTaskDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.access.assertTaskAccess(user, id);
    return this.tasksService.reschedule(orgId, id, dto);
  }
}
