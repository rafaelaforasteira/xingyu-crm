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
import { PipelinesService } from "./pipelines.service";
import { OrganizationId } from "../common/decorators/organization.decorator";
import {
  CreatePipelineDto,
  UpdatePipelineDto,
  QueryPipelinesDto,
  CreateStageDto,
  UpdateStageDto,
} from "./dto/pipeline.dto";

@ApiTags("pipelines")
@ApiHeader({ name: "X-Demo-User-Id", required: false })
@Controller("pipelines")
export class PipelinesController {
  constructor(private readonly pipelinesService: PipelinesService) {}

  @Get()
  @ApiOperation({ summary: "List pipelines" })
  findAll(@OrganizationId() orgId: string, @Query() query: QueryPipelinesDto) {
    return this.pipelinesService.findAll(orgId, query);
  }

  @Get(":id/board")
  @ApiOperation({ summary: "Kanban board for pipeline" })
  board(@OrganizationId() orgId: string, @Param("id") id: string) {
    return this.pipelinesService.board(orgId, id);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get pipeline with stages" })
  findOne(@OrganizationId() orgId: string, @Param("id") id: string) {
    return this.pipelinesService.findOne(orgId, id);
  }

  @Post()
  @ApiOperation({ summary: "Create pipeline" })
  create(@OrganizationId() orgId: string, @Body() dto: CreatePipelineDto) {
    return this.pipelinesService.create(orgId, dto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update pipeline" })
  update(
    @OrganizationId() orgId: string,
    @Param("id") id: string,
    @Body() dto: UpdatePipelineDto,
  ) {
    return this.pipelinesService.update(orgId, id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Soft-delete pipeline" })
  remove(@OrganizationId() orgId: string, @Param("id") id: string) {
    return this.pipelinesService.remove(orgId, id);
  }

  @Post(":id/stages")
  @ApiOperation({ summary: "Add stage to pipeline" })
  addStage(
    @OrganizationId() orgId: string,
    @Param("id") id: string,
    @Body() dto: CreateStageDto,
  ) {
    return this.pipelinesService.addStage(orgId, id, dto);
  }

  @Patch(":id/stages/:stageId")
  @ApiOperation({ summary: "Update stage" })
  updateStage(
    @OrganizationId() orgId: string,
    @Param("id") id: string,
    @Param("stageId") stageId: string,
    @Body() dto: UpdateStageDto,
  ) {
    return this.pipelinesService.updateStage(orgId, id, stageId, dto);
  }

  @Delete(":id/stages/:stageId")
  @ApiOperation({ summary: "Remove stage" })
  removeStage(
    @OrganizationId() orgId: string,
    @Param("id") id: string,
    @Param("stageId") stageId: string,
  ) {
    return this.pipelinesService.removeStage(orgId, id, stageId);
  }
}
