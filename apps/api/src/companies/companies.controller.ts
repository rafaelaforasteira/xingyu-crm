import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiHeader } from "@nestjs/swagger";
import { CompaniesService } from "./companies.service";
import { OrganizationId } from "../common/decorators/organization.decorator";
import { DemoUser, type DemoUser as DemoUserType } from "../common/decorators/demo-user.decorator";
import { CreateCompanyDto, UpdateCompanyDto, QueryCompaniesDto } from "./dto/company.dto";

@ApiTags("companies")
@ApiHeader({ name: "X-Demo-User-Id", required: false })
@Controller("companies")
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get()
  @ApiOperation({ summary: "List companies" })
  findAll(@OrganizationId() orgId: string, @Query() query: QueryCompaniesDto) {
    return this.companiesService.findAll(orgId, query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get company by id" })
  findOne(@OrganizationId() orgId: string, @Param("id") id: string) {
    return this.companiesService.findOne(orgId, id);
  }

  @Post()
  @ApiOperation({ summary: "Create company" })
  create(
    @OrganizationId() orgId: string,
    @DemoUser() user: DemoUserType,
    @Body() dto: CreateCompanyDto,
  ) {
    return this.companiesService.create(orgId, dto, user.id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update company" })
  update(
    @OrganizationId() orgId: string,
    @Param("id") id: string,
    @Body() dto: UpdateCompanyDto,
  ) {
    return this.companiesService.update(orgId, id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Soft-delete company" })
  remove(@OrganizationId() orgId: string, @Param("id") id: string) {
    return this.companiesService.remove(orgId, id);
  }
}
