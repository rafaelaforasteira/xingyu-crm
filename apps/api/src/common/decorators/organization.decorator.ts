import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { DEMO_ORG_ID } from "../constants";

export const OrganizationId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<{
      organizationId?: string;
      query?: { organizationId?: string };
      headers?: Record<string, string | undefined>;
    }>();
    return (
      request.organizationId ??
      request.query?.organizationId ??
      request.headers?.["x-organization-id"] ??
      DEMO_ORG_ID
    );
  },
);
