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
};

@Injectable()
export class DemoUserMiddleware implements NestMiddleware {
  use(req: DemoRequest, _res: Response, next: NextFunction) {
    const userId =
      (req.headers[DEMO_USER_HEADER] as string | undefined) ?? DEMO_USER_ID;

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
