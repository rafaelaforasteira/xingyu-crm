import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiHeader } from "@nestjs/swagger";
import { OccurrencesService } from "./occurrences.service";
import { OrganizationId } from "../common/decorators/organization.decorator";
import { DemoUser, type DemoUser as DemoUserType } from "../common/decorators/demo-user.decorator";
import {
  CreateOccurrenceDto,
  UpdateOccurrenceDto,
  QueryOccurrencesDto,
} from "./dto/occurrence.dto";

@ApiTags("occurrences")
@ApiHeader({ name: "X-Demo-User-Id", required: false })
@Controller("occurrences")
export class OccurrencesController {
  constructor(private readonly occurrencesService: OccurrencesService) {}

  @Get()
  @ApiOperation({ summary: "List after-sales occurrences" })
  findAll(@OrganizationId() orgId: string, @Query() query: QueryOccurrencesDto) {
    return this.occurrencesService.findAll(orgId, query);
  }

  @Get(":id")
  findOne(@OrganizationId() orgId: string, @Param("id") id: string) {
    return this.occurrencesService.findOne(orgId, id);
  }

  @Post()
  create(
    @OrganizationId() orgId: string,
    @DemoUser() user: DemoUserType,
    @Body() dto: CreateOccurrenceDto,
  ) {
    return this.occurrencesService.create(orgId, dto, user.id);
  }

  @Patch(":id")
  update(
    @OrganizationId() orgId: string,
    @Param("id") id: string,
    @Body() dto: UpdateOccurrenceDto,
  ) {
    return this.occurrencesService.update(orgId, id, dto);
  }

  @Delete(":id")
  remove(@OrganizationId() orgId: string, @Param("id") id: string) {
    return this.occurrencesService.remove(orgId, id);
  }
}
