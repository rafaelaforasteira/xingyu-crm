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
import { ApiTags, ApiOperation, ApiHeader, ApiCookieAuth, ApiResponse } from "@nestjs/swagger";
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
  UpdateProfileDto,
  UpdateOrganizationDto,
} from "./dto/settings.dto";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../auth/types";
import { Permissions } from "../auth/decorators/permissions.decorator";

@ApiTags("settings")
@ApiCookieAuth("xingyu_access_token")
@ApiHeader({ name: "X-Demo-User-Id", required: false, description: "Apenas DEMO_MODE local; não autentica." })
@ApiResponse({ status: 401, description: "Sessão não autenticada." })
@ApiResponse({ status: 403, description: "Permissão insuficiente." })
@Controller("settings")
@Permissions("settings.view")
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get("profile")
  @ApiOperation({ summary: "Perfil do usuário autenticado" })
  profile(@OrganizationId() orgId: string, @CurrentUser() user: AuthenticatedUser) { return this.settingsService.profile(orgId, user.id); }

  @Patch("profile")
  @Permissions("profile.edit")
  @ApiOperation({ summary: "Atualizar próprio perfil" })
  updateProfile(@OrganizationId() orgId: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateProfileDto) { return this.settingsService.updateProfile(orgId, user.id, dto); }

  @Patch("organization")
  @Permissions("organization.manage")
  @ApiOperation({ summary: "Atualizar organização (admin)" })
  updateOrganization(@OrganizationId() orgId: string, @Body() dto: UpdateOrganizationDto) { return this.settingsService.updateOrganization(orgId, dto); }

  @Get()
  @Permissions("organization.manage")
  @ApiOperation({ summary: "Settings overview" })
  overview(@OrganizationId() orgId: string) {
    return this.settingsService.overview(orgId);
  }

  @Get("users")
  @Permissions("users.manage")
  @ApiOperation({ summary: "Listar usuários (admin; campos públicos)" })
  listUsers(@OrganizationId() orgId: string, @Query() query: QuerySettingsDto) {
    return this.settingsService.listUsers(orgId, query);
  }

  @Patch("users/:id")
  @Permissions("users.manage")
  @ApiOperation({ summary: "Atualizar usuário (admin; ignora campos internos no body)" })
  updateUser(
    @OrganizationId() orgId: string,
    @Param("id") id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.settingsService.updateUser(orgId, id, dto);
  }

  @Get("teams")
  @Permissions("teams.manage")
  @ApiOperation({ summary: "Listar equipes" })
  listTeams(@OrganizationId() orgId: string, @Query() query: QuerySettingsDto) {
    return this.settingsService.listTeams(orgId, query);
  }

  @Post("teams")
  @Permissions("teams.manage")
  @ApiOperation({ summary: "Criar equipe" })
  createTeam(@OrganizationId() orgId: string, @Body() dto: CreateTeamDto) {
    return this.settingsService.createTeam(orgId, dto);
  }

  @Patch("teams/:id")
  @Permissions("teams.manage")
  @ApiOperation({ summary: "Atualizar equipe" })
  updateTeam(
    @OrganizationId() orgId: string,
    @Param("id") id: string,
    @Body() dto: UpdateTeamDto,
  ) {
    return this.settingsService.updateTeam(orgId, id, dto);
  }

  @Delete("teams/:id")
  @Permissions("teams.manage")
  @ApiOperation({ summary: "Arquivar equipe" })
  removeTeam(@OrganizationId() orgId: string, @Param("id") id: string) {
    return this.settingsService.removeTeam(orgId, id);
  }

  @Get("tags")
  @Permissions("organization.manage")
  @ApiOperation({ summary: "Listar tags" })
  listTags(@OrganizationId() orgId: string, @Query() query: QuerySettingsDto) {
    return this.settingsService.listTags(orgId, query);
  }

  @Post("tags")
  @Permissions("organization.manage")
  @ApiOperation({ summary: "Criar tag" })
  createTag(@OrganizationId() orgId: string, @Body() dto: CreateTagDto) {
    return this.settingsService.createTag(orgId, dto);
  }

  @Patch("tags/:id")
  @Permissions("organization.manage")
  @ApiOperation({ summary: "Atualizar tag" })
  updateTag(
    @OrganizationId() orgId: string,
    @Param("id") id: string,
    @Body() dto: UpdateTagDto,
  ) {
    return this.settingsService.updateTag(orgId, id, dto);
  }

  @Delete("tags/:id")
  @Permissions("organization.manage")
  @ApiOperation({ summary: "Remover tag" })
  removeTag(@OrganizationId() orgId: string, @Param("id") id: string) {
    return this.settingsService.removeTag(orgId, id);
  }

  @Get("custom-fields")
  @Permissions("organization.manage")
  @ApiOperation({ summary: "Listar campos customizados" })
  listCustomFields(@OrganizationId() orgId: string, @Query() query: QuerySettingsDto) {
    return this.settingsService.listCustomFields(orgId, query);
  }

  @Post("custom-fields")
  @Permissions("organization.manage")
  @ApiOperation({ summary: "Criar campo customizado" })
  createCustomField(@OrganizationId() orgId: string, @Body() dto: CreateCustomFieldDto) {
    return this.settingsService.createCustomField(orgId, dto);
  }

  @Patch("custom-fields/:id")
  @Permissions("organization.manage")
  @ApiOperation({ summary: "Atualizar campo customizado" })
  updateCustomField(
    @OrganizationId() orgId: string,
    @Param("id") id: string,
    @Body() dto: UpdateCustomFieldDto,
  ) {
    return this.settingsService.updateCustomField(orgId, id, dto);
  }

  @Delete("custom-fields/:id")
  @Permissions("organization.manage")
  @ApiOperation({ summary: "Remover campo customizado" })
  removeCustomField(@OrganizationId() orgId: string, @Param("id") id: string) {
    return this.settingsService.removeCustomField(orgId, id);
  }

  @Get("integrations")
  @Permissions("integrations.manage")
  @ApiOperation({ summary: "Integrations status (mock/demo)" })
  integrations() {
    return this.settingsService.integrationsStatus();
  }
}
