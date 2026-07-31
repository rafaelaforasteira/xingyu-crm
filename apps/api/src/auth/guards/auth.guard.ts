import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { AuthRole, UserStatus } from "@xingyu/database";
import { Request } from "express";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { AUTH_COOKIE } from "../cookie.config";
import { PrismaService } from "../../prisma/prisma.service";
import type { AccessTokenPayload, AuthenticatedUser } from "../types";
import type { DemoUser } from "../../common/decorators/demo-user.decorator";

type AuthRequest = Request & {
  user?: AuthenticatedUser;
  demoUser?: DemoUser;
  organizationId?: string;
  cookies?: Record<string, string>;
};

function roleLabel(role: AuthRole): string {
  switch (role) {
    case AuthRole.ADMIN:
      return "Administradora";
    case AuthRole.MANAGER:
      return "Gestora";
    case AuthRole.CONSULTANT:
      return "Consultora";
    default:
      return role;
  }
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthRequest>();
    const token = request.cookies?.[AUTH_COOKIE.access];
    if (!token) {
      throw new UnauthorizedException("Sessão não autenticada.");
    }

    let payload: AccessTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<AccessTokenPayload>(token, {
        secret: this.config.getOrThrow<string>("JWT_ACCESS_SECRET"),
      });
    } catch {
      throw new UnauthorizedException("Sessão expirada ou inválida.");
    }

    if (!payload?.sub || !payload.sessionId || !payload.role) {
      throw new UnauthorizedException("Sessão inválida.");
    }

    const session = await this.prisma.userSession.findUnique({
      where: { id: payload.sessionId },
      select: {
        id: true,
        userId: true,
        revokedAt: true,
        expiresAt: true,
      },
    });

    if (
      !session ||
      session.userId !== payload.sub ||
      session.revokedAt ||
      session.expiresAt.getTime() <= Date.now()
    ) {
      throw new UnauthorizedException("Sessão inválida ou revogada.");
    }

    const user = await this.prisma.user.findFirst({
      where: {
        id: payload.sub,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        authRole: true,
        status: true,
        organizationId: true,
        teamId: true,
        team: { select: { name: true } },
      },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException("Usuário indisponível.");
    }

    const authenticated: AuthenticatedUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.authRole,
      status: user.status,
      organizationId: user.organizationId,
      teamId: user.teamId,
      sessionId: session.id,
    };

    request.user = authenticated;
    request.organizationId = user.organizationId;
    request.demoUser = {
      id: user.id,
      name: user.name,
      role: roleLabel(user.authRole),
      teamId: user.teamId ?? "",
      team: user.team?.name ?? "",
    };

    return true;
  }
}
