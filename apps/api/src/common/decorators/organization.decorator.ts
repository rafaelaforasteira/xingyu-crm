import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { DEMO_ORG_ID } from "../constants";
import type { AuthenticatedUser } from "../../auth/types";

type OrganizationRequest = {
  user?: Pick<AuthenticatedUser, "organizationId">;
  organizationId?: string;
};

/**
 * Tenant resolution is session-bound.
 * Query strings and X-Organization-Id MUST NEVER override an authenticated user's org.
 */
export function resolveOrganizationId(request: OrganizationRequest): string {
  const fromSession = request.user?.organizationId ?? request.organizationId;
  if (fromSession) return fromSession;
  return DEMO_ORG_ID;
}

export const OrganizationId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    return resolveOrganizationId(
      ctx.switchToHttp().getRequest<OrganizationRequest>(),
    );
  },
);
