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
import { TasksService } from "./tasks.service";
import { OrganizationId } from "../common/decorators/organization.decorator";
import { DemoUser, type DemoUser as DemoUserType } from "../common/decorators/demo-user.decorator";
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
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @ApiOperation({ summary: "List tasks" })
  findAll(@OrganizationId() orgId: string, @Query() query: QueryTasksDto) {
    return this.tasksService.findAll(orgId, query);
  }

  @Get("board")
  @ApiOperation({ summary: "Task board grouped by custom status" })
  board(@OrganizationId() orgId: string, @Query() query: QueryTasksDto) {
    return this.tasksService.board(orgId, query);
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
  createStatus(
    @OrganizationId() orgId: string,
    @Body() dto: CreateTaskStatusDto,
  ) {
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
  reorderStatuses(
    @OrganizationId() orgId: string,
    @Body() dto: ReorderTaskStatusesDto,
  ) {
    return this.tasksService.reorderStatuses(orgId, dto.statusIds);
  }

  @Get("today")
  @ApiOperation({ summary: "List tasks due today" })
  today(@OrganizationId() orgId: string) {
    return this.tasksService.today(orgId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get task" })
  findOne(@OrganizationId() orgId: string, @Param("id") id: string) {
    return this.tasksService.findOne(orgId, id);
  }

  @Post()
  @ApiOperation({ summary: "Create task" })
  create(
    @OrganizationId() orgId: string,
    @DemoUser() user: DemoUserType,
    @Body() dto: CreateTaskDto,
  ) {
    return this.tasksService.create(orgId, dto, user.id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update task" })
  update(
    @OrganizationId() orgId: string,
    @DemoUser() user: DemoUserType,
    @Param("id") id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasksService.update(orgId, id, dto, user.id);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Soft-delete task" })
  remove(@OrganizationId() orgId: string, @Param("id") id: string) {
    return this.tasksService.remove(orgId, id);
  }

  @Post(":id/complete")
  @ApiOperation({ summary: "Complete task" })
  complete(
    @OrganizationId() orgId: string,
    @DemoUser() user: DemoUserType,
    @Param("id") id: string,
  ) {
    return this.tasksService.complete(orgId, id, user.id);
  }

  @Post(":id/reopen")
  @ApiOperation({ summary: "Reopen task" })
  reopen(
    @OrganizationId() orgId: string,
    @DemoUser() user: DemoUserType,
    @Param("id") id: string,
  ) {
    return this.tasksService.reopen(orgId, id, user.id);
  }

  @Post(":id/reschedule")
  @ApiOperation({ summary: "Reschedule task" })
  reschedule(
    @OrganizationId() orgId: string,
    @Param("id") id: string,
    @Body() dto: RescheduleTaskDto,
  ) {
    return this.tasksService.reschedule(orgId, id, dto);
  }
}
