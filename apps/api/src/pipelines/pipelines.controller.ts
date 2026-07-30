import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiTags } from "@nestjs/swagger";
import { DemoUser, type DemoUser as DemoUserType } from "../common/decorators/demo-user.decorator";
import { OrganizationId } from "../common/decorators/organization.decorator";
import {
  CreatePipelineDto,
  CreateStageDto,
  DeleteStageDto,
  DuplicatePipelineDto,
  QueryPipelinesDto,
  QueryStagesDto,
  ReorderStagesDto,
  UpdatePipelineDto,
  UpdateStageDto,
} from "./dto/pipeline.dto";
import { PipelinesService } from "./pipelines.service";

@ApiTags("pipelines")
@ApiHeader({ name: "X-Demo-User-Id", required: false })
@Controller("pipelines")
export class PipelinesController {
  constructor(private readonly pipelinesService: PipelinesService) {}

  @Get()
  @ApiOperation({ summary: "List pipelines with stages, deal metrics, and defaults" })
  findAll(@OrganizationId() orgId: string, @Query() query: QueryPipelinesDto) {
    return this.pipelinesService.findAll(orgId, query);
  }

  @Get(":id/board")
  @ApiOperation({ summary: "Kanban board for one pipeline" })
  board(@OrganizationId() orgId: string, @Param("id") id: string) {
    return this.pipelinesService.board(orgId, id);
  }

  @Get(":id/stages")
  @ApiOperation({ summary: "List stages for one pipeline" })
  stages(
    @OrganizationId() orgId: string,
    @Param("id") id: string,
    @Query() query: QueryStagesDto,
  ) {
    return this.pipelinesService.getStages(orgId, id, query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a pipeline with stages and metrics" })
  findOne(@OrganizationId() orgId: string, @Param("id") id: string) {
    return this.pipelinesService.findOne(orgId, id);
  }

  @Post()
  @ApiOperation({ summary: "Create a pipeline and its initial open stage" })
  create(
    @OrganizationId() orgId: string,
    @DemoUser() user: DemoUserType,
    @Body() dto: CreatePipelineDto,
  ) {
    return this.pipelinesService.create(orgId, dto, user.id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a pipeline" })
  update(
    @OrganizationId() orgId: string,
    @DemoUser() user: DemoUserType,
    @Param("id") id: string,
    @Body() dto: UpdatePipelineDto,
  ) {
    return this.pipelinesService.update(orgId, id, dto, user.id);
  }

  @Post(":id/duplicate")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Duplicate a pipeline and its stages" })
  duplicate(
    @OrganizationId() orgId: string,
    @DemoUser() user: DemoUserType,
    @Param("id") id: string,
    @Body() dto: DuplicatePipelineDto,
  ) {
    return this.pipelinesService.duplicate(orgId, id, dto, user.id);
  }

  @Post(":id/archive")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Archive a pipeline" })
  archive(
    @OrganizationId() orgId: string,
    @DemoUser() user: DemoUserType,
    @Param("id") id: string,
  ) {
    return this.pipelinesService.archive(orgId, id, user.id);
  }

  @Post(":id/restore")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Restore an archived pipeline" })
  restore(
    @OrganizationId() orgId: string,
    @DemoUser() user: DemoUserType,
    @Param("id") id: string,
  ) {
    return this.pipelinesService.restore(orgId, id, user.id);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Soft-delete an empty, non-default pipeline" })
  remove(
    @OrganizationId() orgId: string,
    @DemoUser() user: DemoUserType,
    @Param("id") id: string,
  ) {
    return this.pipelinesService.remove(orgId, id, user.id);
  }

  @Post(":id/stages/reorder")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Persist the complete active-stage order" })
  reorderStages(
    @OrganizationId() orgId: string,
    @DemoUser() user: DemoUserType,
    @Param("id") id: string,
    @Body() dto: ReorderStagesDto,
  ) {
    return this.pipelinesService.reorderStages(orgId, id, dto, user.id);
  }

  @Post(":id/stages")
  @ApiOperation({ summary: "Add a stage to a pipeline" })
  addStage(
    @OrganizationId() orgId: string,
    @DemoUser() user: DemoUserType,
    @Param("id") id: string,
    @Body() dto: CreateStageDto,
  ) {
    return this.pipelinesService.addStage(orgId, id, dto, user.id);
  }

  @Patch(":id/stages/:stageId")
  @ApiOperation({ summary: "Update a stage" })
  updateStage(
    @OrganizationId() orgId: string,
    @DemoUser() user: DemoUserType,
    @Param("id") id: string,
    @Param("stageId") stageId: string,
    @Body() dto: UpdateStageDto,
  ) {
    return this.pipelinesService.updateStage(orgId, id, stageId, dto, user.id);
  }

  @Delete(":id/stages/:stageId")
  @ApiOperation({
    summary: "Soft-delete a stage, moving active deals when targetStageId is supplied",
  })
  removeStage(
    @OrganizationId() orgId: string,
    @DemoUser() user: DemoUserType,
    @Param("id") id: string,
    @Param("stageId") stageId: string,
    @Query() dto: DeleteStageDto,
  ) {
    return this.pipelinesService.removeStage(orgId, id, stageId, dto, user.id);
  }
}
