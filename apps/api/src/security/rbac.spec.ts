import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { AuthRole, UserStatus } from "@xingyu/database";
import { can } from "../auth/access-policy";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { ROLES_KEY } from "../auth/decorators/roles.decorator";
import { PERMISSIONS_KEY } from "../auth/decorators/permissions.decorator";
import type { AuthenticatedUser } from "../auth/types";

function user(role: AuthRole, organizationId = "org-a"): AuthenticatedUser {
  return {
    id: `${role.toLowerCase()}-1`,
    name: role,
    email: `${role.toLowerCase()}@${organizationId}.local`,
    role,
    status: UserStatus.ACTIVE,
    organizationId,
    teamId: "team-1",
    sessionId: "sess-1",
  };
}

function ctx(current?: AuthenticatedUser) {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user: current }) }),
  } as any;
}

describe("RBAC + tenant matrix", () => {
  it("ADMIN can manage users, finance and settings", () => {
    expect(can(AuthRole.ADMIN, "users.manage")).toBe(true);
    expect(can(AuthRole.ADMIN, "finance.sensitive")).toBe(true);
    expect(can(AuthRole.ADMIN, "organization.manage")).toBe(true);
    expect(can(AuthRole.ADMIN, "clients.view")).toBe(true);
  });

  it("MANAGER (supervisor) can operate pipelines/orders but not admin modules", () => {
    expect(can(AuthRole.MANAGER, "pipelines.view")).toBe(true);
    expect(can(AuthRole.MANAGER, "orders.edit")).toBe(true);
    expect(can(AuthRole.MANAGER, "users.manage")).toBe(false);
    expect(can(AuthRole.MANAGER, "organization.manage")).toBe(false);
    expect(can(AuthRole.MANAGER, "finance.sensitive")).toBe(false);
    expect(can(AuthRole.MANAGER, "integrations.manage")).toBe(false);
    expect(can(AuthRole.MANAGER, "clients.view")).toBe(false);
  });

  it("CONSULTANT cannot access administrative or financial APIs", () => {
    expect(can(AuthRole.CONSULTANT, "users.manage")).toBe(false);
    expect(can(AuthRole.CONSULTANT, "finance.view")).toBe(false);
    expect(can(AuthRole.CONSULTANT, "finance.sensitive")).toBe(false);
    expect(can(AuthRole.CONSULTANT, "organization.manage")).toBe(false);
    expect(can(AuthRole.CONSULTANT, "orders.view")).toBe(true);
  });

  it("PermissionsGuard forbids consultant on users.manage", () => {
    const reflector = {
      getAllAndOverride: jest.fn((key: string) =>
        key === PERMISSIONS_KEY ? ["users.manage"] : undefined,
      ),
    };
    const guard = new PermissionsGuard(reflector as never);
    expect(() => guard.canActivate(ctx(user(AuthRole.CONSULTANT)))).toThrow(ForbiddenException);
    expect(guard.canActivate(ctx(user(AuthRole.ADMIN)))).toBe(true);
  });

  it("RolesGuard forbids non-admin on @Roles(ADMIN)", () => {
    const reflector = {
      getAllAndOverride: jest.fn((key: string) =>
        key === ROLES_KEY ? [AuthRole.ADMIN] : undefined,
      ),
    };
    const guard = new RolesGuard(reflector as never);
    expect(() => guard.canActivate(ctx(user(AuthRole.MANAGER)))).toThrow(ForbiddenException);
    expect(() => guard.canActivate(ctx(user(AuthRole.CONSULTANT)))).toThrow(ForbiddenException);
    expect(guard.canActivate(ctx(user(AuthRole.ADMIN)))).toBe(true);
  });

  it("PermissionsGuard rejects unauthenticated callers", () => {
    const reflector = {
      getAllAndOverride: jest.fn(() => ["settings.view"]),
    };
    const guard = new PermissionsGuard(reflector as never);
    expect(() => guard.canActivate(ctx(undefined))).toThrow(ForbiddenException);
  });

  it("keeps organization identity on the user object for tenant scoping", () => {
    const adminA = user(AuthRole.ADMIN, "org-a");
    const adminB = user(AuthRole.ADMIN, "org-b");
    expect(adminA.organizationId).not.toBe(adminB.organizationId);
  });
});
