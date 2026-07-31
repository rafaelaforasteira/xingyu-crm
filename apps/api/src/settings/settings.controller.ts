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
import { SettingsService } from "./settings.service";
import { OrganizationId } from "../common/decorators/organization.decorator";
import {
  CreateTeamDto,
  UpdateTeamDto,
  CreateTagDto,
  UpdateTagDto,
  CreateCustomFieldDto,
  UpdateCustomFieldDto,
  UpdateUserDto,
  QuerySettingsDto,
} from "./dto/settings.dto";

@ApiTags("settings")
@ApiHeader({ name: "X-Demo-User-Id", required: false })
@Controller("settings")
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: "Settings overview" })
  overview(@OrganizationId() orgId: string) {
    return this.settingsService.overview(orgId);
  }

  @Get("users")
  listUsers(@OrganizationId() orgId: string, @Query() query: QuerySettingsDto) {
    return this.settingsService.listUsers(orgId, query);
  }

  @Patch("users/:id")
  updateUser(
    @OrganizationId() orgId: string,
    @Param("id") id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.settingsService.updateUser(orgId, id, dto);
  }

  @Get("teams")
  listTeams(@OrganizationId() orgId: string, @Query() query: QuerySettingsDto) {
    return this.settingsService.listTeams(orgId, query);
  }

  @Post("teams")
  createTeam(@OrganizationId() orgId: string, @Body() dto: CreateTeamDto) {
    return this.settingsService.createTeam(orgId, dto);
  }

  @Patch("teams/:id")
  updateTeam(
    @OrganizationId() orgId: string,
    @Param("id") id: string,
    @Body() dto: UpdateTeamDto,
  ) {
    return this.settingsService.updateTeam(orgId, id, dto);
  }

  @Delete("teams/:id")
  removeTeam(@OrganizationId() orgId: string, @Param("id") id: string) {
    return this.settingsService.removeTeam(orgId, id);
  }

  @Get("tags")
  listTags(@OrganizationId() orgId: string, @Query() query: QuerySettingsDto) {
    return this.settingsService.listTags(orgId, query);
  }

  @Post("tags")
  createTag(@OrganizationId() orgId: string, @Body() dto: CreateTagDto) {
    return this.settingsService.createTag(orgId, dto);
  }

  @Patch("tags/:id")
  updateTag(
    @OrganizationId() orgId: string,
    @Param("id") id: string,
    @Body() dto: UpdateTagDto,
  ) {
    return this.settingsService.updateTag(orgId, id, dto);
  }

  @Delete("tags/:id")
  removeTag(@OrganizationId() orgId: string, @Param("id") id: string) {
    return this.settingsService.removeTag(orgId, id);
  }

  @Get("custom-fields")
  listCustomFields(@OrganizationId() orgId: string, @Query() query: QuerySettingsDto) {
    return this.settingsService.listCustomFields(orgId, query);
  }

  @Post("custom-fields")
  createCustomField(@OrganizationId() orgId: string, @Body() dto: CreateCustomFieldDto) {
    return this.settingsService.createCustomField(orgId, dto);
  }

  @Patch("custom-fields/:id")
  updateCustomField(
    @OrganizationId() orgId: string,
    @Param("id") id: string,
    @Body() dto: UpdateCustomFieldDto,
  ) {
    return this.settingsService.updateCustomField(orgId, id, dto);
  }

  @Delete("custom-fields/:id")
  removeCustomField(@OrganizationId() orgId: string, @Param("id") id: string) {
    return this.settingsService.removeCustomField(orgId, id);
  }

  @Get("integrations")
  @ApiOperation({ summary: "Integrations status (mock/demo)" })
  integrations() {
    return this.settingsService.integrationsStatus();
  }
}
