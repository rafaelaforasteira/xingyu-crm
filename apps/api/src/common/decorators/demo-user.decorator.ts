import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { DEMO_USER_ID, DEMO_USER_NAME, DEMO_TEAM_ID } from "../constants";

export interface DemoUser {
  id: string;
  name: string;
  role: string;
  teamId: string;
  team: string;
}

export const DemoUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): DemoUser => {
    const request = ctx.switchToHttp().getRequest<{ demoUser?: DemoUser }>();
    return (
      request.demoUser ?? {
        id: DEMO_USER_ID,
        name: DEMO_USER_NAME,
        role: "Administradora",
        teamId: DEMO_TEAM_ID,
        team: "Gestão",
      }
    );
  },
);
