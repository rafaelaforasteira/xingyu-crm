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
    @Param("id") id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasksService.update(orgId, id, dto);
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
  reopen(@OrganizationId() orgId: string, @Param("id") id: string) {
    return this.tasksService.reopen(orgId, id);
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
