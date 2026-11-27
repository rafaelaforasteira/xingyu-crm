import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AuthRole } from "@xingyu/database";
import { Roles } from "../auth/decorators/roles.decorator";
import { Public } from "../auth/decorators/public.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../auth/types";
import { OrganizationId } from "../common/decorators/organization.decorator";
import {
  AcceptInviteDto,
  InviteUserDto,
  QueryUsersDto,
  UpdateManagedUserDto,
} from "./dto/user.dto";
import { UsersService } from "./users.service";

@ApiTags("users")
@ApiCookieAuth("xingyu_access_token")
@ApiResponse({ status: 401, description: "Sessão não autenticada." })
@ApiResponse({ status: 403, description: "Permissão insuficiente." })
@Controller("users")
export class UsersController {
  constructor(private readonly users: UsersService) {}
  @Get()
  @Roles(AuthRole.ADMIN)
  @ApiOperation({ summary: "Listar usuários da organização (campos públicos)" })
  list(
    @OrganizationId() orgId: string,
    @Query() query: QueryUsersDto,
  ) {
    return this.users.list(orgId, query);
  }
  @Post("invite")
  @Roles(AuthRole.ADMIN)
  @ApiOperation({ summary: "Convidar usuário" })
  invite(
    @OrganizationId() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: InviteUserDto,
  ) {
    return this.users.invite(orgId, user.id, dto);
  }
  @Post(":id/resend-invite")
  @Roles(AuthRole.ADMIN)
  @ApiOperation({ summary: "Reenviar convite" })
  resend(
    @OrganizationId() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.users.regenerateInvite(orgId, id, user.id);
  }
  @Patch(":id")
  @Roles(AuthRole.ADMIN)
  @ApiOperation({ summary: "Atualizar usuário gerenciado" })
  update(
    @OrganizationId() orgId: string,
    @Param("id") id: string,
    @Body() dto: UpdateManagedUserDto,
  ) {
    return this.users.update(orgId, id, dto);
  }
  @Post(":id/deactivate")
  @Roles(AuthRole.ADMIN)
  @ApiOperation({ summary: "Desativar usuário (bloqueia último admin)" })
  deactivate(
    @OrganizationId() orgId: string,
    @Param("id") id: string,
  ) {
    return this.users.setActive(orgId, id, false);
  }
  @Post(":id/reactivate")
  @Roles(AuthRole.ADMIN)
  @ApiOperation({ summary: "Reativar usuário" })
  reactivate(
    @OrganizationId() orgId: string,
    @Param("id") id: string,
  ) {
    return this.users.setActive(orgId, id, true);
  }
  @Post(":id/revoke-sessions")
  @Roles(AuthRole.ADMIN)
  @ApiOperation({ summary: "Revogar sessões ativas" })
  revoke(
    @OrganizationId() orgId: string,
    @Param("id") id: string,
  ) {
    return this.users.revokeSessions(orgId, id);
  }
  @Public()
  @Get("invites/:token")
  @ApiOperation({ summary: "Inspecionar convite (público)" })
  inspect(@Param("token") token: string) {
    return this.users.inspectInvite(token);
  }
  @Public()
  @Post("invites/:token/accept")
  @ApiOperation({ summary: "Aceitar convite e definir senha" })
  accept(
    @Param("token") token: string,
    @Body() dto: AcceptInviteDto,
  ) {
    return this.users.acceptInvite(token, dto.password, dto.confirmPassword);
  }
}
