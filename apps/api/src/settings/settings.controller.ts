import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { ApiTags, ApiOperation, ApiHeader, ApiCookieAuth, ApiResponse } from "@nestjs/swagger";
import { SettingsService } from "./settings.service";
import { OrganizationId } from "../common/decorators/organization.decorator";
import {
  CreateTeamDto,
  UpdateTeamDto,
  TeamMembersDto,
  ArchiveTeamDto,
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
import { uploadMaxBytes } from "../common/upload/upload.util";

@ApiTags("settings")
@ApiCookieAuth("xingyu_access_token")
@ApiHeader({ name: "X-Demo-User-Id", required: false, description: "Apenas DEMO_MODE local; não autentica." })
@ApiResponse({ status: 401, description: "Sessão não autenticada." })
@ApiResponse({ status: 403, description: "Permissão insuficiente." })
@Controller("settings")
@Permissions("settings.view")
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get("permissions")
  @Permissions("permissions.view")
  @ApiOperation({ summary: "Matriz canônica de permissões por função" })
  permissions() {
    return this.settingsService.permissions();
  }

  @Get("profile")
  @ApiOperation({ summary: "Perfil do usuário autenticado" })
  profile(@OrganizationId() orgId: string, @CurrentUser() user: AuthenticatedUser) { return this.settingsService.profile(orgId, user.id); }

  @Patch("profile")
  @Permissions("profile.edit")
  @ApiOperation({ summary: "Atualizar próprio perfil" })
  updateProfile(@OrganizationId() orgId: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateProfileDto) { return this.settingsService.updateProfile(orgId, user.id, dto); }

  @Post("profile/avatar")
  @Permissions("profile.edit")
  @ApiOperation({ summary: "Atualizar foto do próprio perfil" })
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: uploadMaxBytes(), files: 1 },
    }),
  )
  uploadAvatar(
    @OrganizationId() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.settingsService.uploadAvatar(orgId, user.id, file);
  }

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

  @Post("teams/:id/members")
  @Permissions("teams.manage")
  @ApiOperation({ summary: "Adicionar ou mover membros para a equipe" })
  addTeamMembers(
    @OrganizationId() orgId: string,
    @Param("id") id: string,
    @Body() dto: TeamMembersDto,
  ) {
    return this.settingsService.addTeamMembers(orgId, id, dto.userIds);
  }

  @Patch("teams/:id/members")
  @Permissions("teams.manage")
  @ApiOperation({ summary: "Substituir o conjunto de membros da equipe" })
  replaceTeamMembers(
    @OrganizationId() orgId: string,
    @Param("id") id: string,
    @Body() dto: TeamMembersDto,
  ) {
    return this.settingsService.replaceTeamMembers(orgId, id, dto.userIds);
  }

  @Post("teams/:id/archive")
  @Permissions("teams.manage")
  @ApiOperation({ summary: "Arquivar equipe (soft delete) com destino dos membros" })
  archiveTeam(
    @OrganizationId() orgId: string,
    @Param("id") id: string,
    @Body() dto: ArchiveTeamDto,
  ) {
    return this.settingsService.archiveTeam(orgId, id, dto);
  }

  @Delete("teams/:id")
  @Permissions("teams.manage")
  @ApiOperation({ summary: "Arquivar equipe (membros ficam sem equipe)" })
  removeTeam(@OrganizationId() orgId: string, @Param("id") id: string) {
    return this.settingsService.archiveTeam(orgId, id, { memberAction: "detach" });
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
