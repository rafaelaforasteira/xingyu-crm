import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
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

@Controller("users")
export class UsersController {
  constructor(private readonly users: UsersService) {}
  @Get() @Roles(AuthRole.ADMIN) list(
    @OrganizationId() orgId: string,
    @Query() query: QueryUsersDto,
  ) {
    return this.users.list(orgId, query);
  }
  @Post("invite") @Roles(AuthRole.ADMIN) invite(
    @OrganizationId() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: InviteUserDto,
  ) {
    return this.users.invite(orgId, user.id, dto);
  }
  @Post(":id/resend-invite") @Roles(AuthRole.ADMIN) resend(
    @OrganizationId() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.users.regenerateInvite(orgId, id, user.id);
  }
  @Patch(":id") @Roles(AuthRole.ADMIN) update(
    @OrganizationId() orgId: string,
    @Param("id") id: string,
    @Body() dto: UpdateManagedUserDto,
  ) {
    return this.users.update(orgId, id, dto);
  }
  @Post(":id/deactivate") @Roles(AuthRole.ADMIN) deactivate(
    @OrganizationId() orgId: string,
    @Param("id") id: string,
  ) {
    return this.users.setActive(orgId, id, false);
  }
  @Post(":id/reactivate") @Roles(AuthRole.ADMIN) reactivate(
    @OrganizationId() orgId: string,
    @Param("id") id: string,
  ) {
    return this.users.setActive(orgId, id, true);
  }
  @Post(":id/revoke-sessions") @Roles(AuthRole.ADMIN) revoke(
    @OrganizationId() orgId: string,
    @Param("id") id: string,
  ) {
    return this.users.revokeSessions(orgId, id);
  }
  @Public() @Get("invites/:token") inspect(@Param("token") token: string) {
    return this.users.inspectInvite(token);
  }
  @Public() @Post("invites/:token/accept") accept(
    @Param("token") token: string,
    @Body() dto: AcceptInviteDto,
  ) {
    return this.users.acceptInvite(token, dto.password, dto.confirmPassword);
  }
}
