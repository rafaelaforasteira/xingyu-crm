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
import { AutomationsService } from "./automations.service";
import { OrganizationId } from "../common/decorators/organization.decorator";
import { PaginationQueryDto } from "../common/dto/pagination.dto";
import {
  CreateAutomationDto,
  UpdateAutomationDto,
  QueryAutomationsDto,
  ToggleAutomationDto,
} from "./dto/automation.dto";

@ApiTags("automations")
@ApiHeader({ name: "X-Demo-User-Id", required: false })
@Controller("automations")
export class AutomationsController {
  constructor(private readonly automationsService: AutomationsService) {}

  @Get()
  @ApiOperation({ summary: "List automations" })
  findAll(@OrganizationId() orgId: string, @Query() query: QueryAutomationsDto) {
    return this.automationsService.findAll(orgId, query);
  }

  @Get(":id")
  findOne(@OrganizationId() orgId: string, @Param("id") id: string) {
    return this.automationsService.findOne(orgId, id);
  }

  @Post()
  create(@OrganizationId() orgId: string, @Body() dto: CreateAutomationDto) {
    return this.automationsService.create(orgId, dto);
  }

  @Patch(":id")
  update(
    @OrganizationId() orgId: string,
    @Param("id") id: string,
    @Body() dto: UpdateAutomationDto,
  ) {
    return this.automationsService.update(orgId, id, dto);
  }

  @Delete(":id")
  remove(@OrganizationId() orgId: string, @Param("id") id: string) {
    return this.automationsService.remove(orgId, id);
  }

  @Post(":id/toggle")
  @ApiOperation({ summary: "Enable/disable automation" })
  toggle(
    @OrganizationId() orgId: string,
    @Param("id") id: string,
    @Body() dto: ToggleAutomationDto,
  ) {
    return this.automationsService.toggle(orgId, id, dto);
  }

  @Get(":id/executions")
  @ApiOperation({ summary: "List automation executions" })
  executions(
    @OrganizationId() orgId: string,
    @Param("id") id: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.automationsService.listExecutions(orgId, id, query);
  }
}
