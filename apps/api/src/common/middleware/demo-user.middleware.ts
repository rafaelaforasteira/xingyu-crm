import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import {
  DEMO_ORG_ID,
  DEMO_USER_ID,
  DEMO_USER_NAME,
  DEMO_TEAM_ID,
  DEMO_USER_HEADER,
  ORG_HEADER,
} from "../constants";
import type { DemoUser } from "../decorators/demo-user.decorator";

type DemoRequest = Request & {
  demoUser?: DemoUser;
  organizationId?: string;
  user?: unknown;
};

function isDemoModeEnabled(): boolean {
  const demoMode = process.env.DEMO_MODE === "true";
  const nodeEnv = (process.env.NODE_ENV ?? "development").toLowerCase();
  return demoMode && (nodeEnv === "development" || nodeEnv === "test");
}

/**
 * Demo identity is NEVER used as authentication.
 * AuthGuard is the authority for protected routes.
 *
 * When DEMO_MODE is enabled (development/test only), this middleware may
 * attach a soft demo context for tooling that still reads `req.demoUser`
 * before an authenticated user is bound. Authenticated requests overwrite
 * this via AuthGuard.
 *
 * How tests authenticate:
 * - Prefer real login (`POST /api/auth/login`) and cookie jar / Playwright storage.
 * - Or override AuthGuard in Nest testing modules with an explicit test user.
 * - Do not rely on X-Demo-User-Id as a security bypass outside DEMO_MODE.
 */
@Injectable()
export class DemoUserMiddleware implements NestMiddleware {
  use(req: DemoRequest, _res: Response, next: NextFunction) {
    if (req.user) {
      next();
      return;
    }

    if (!isDemoModeEnabled()) {
      const orgFromHeader = req.headers[ORG_HEADER] as string | undefined;
      const orgFromQuery =
        typeof req.query.organizationId === "string"
          ? req.query.organizationId
          : undefined;
      if (orgFromHeader || orgFromQuery) {
        req.organizationId = orgFromHeader ?? orgFromQuery;
      }
      next();
      return;
    }

    const userId =
      (req.headers[DEMO_USER_HEADER] as string | undefined) ?? DEMO_USER_ID;

    // Soft demo context only — does not satisfy AuthGuard.
    req.demoUser = {
      id: userId,
      name: userId === DEMO_USER_ID ? DEMO_USER_NAME : userId,
      role: "Administradora",
      teamId: DEMO_TEAM_ID,
      team: "Gestao",
    };

    req.organizationId =
      (req.headers[ORG_HEADER] as string | undefined) ??
      (typeof req.query.organizationId === "string"
        ? req.query.organizationId
        : undefined) ??
      DEMO_ORG_ID;

    next();
  }
}
