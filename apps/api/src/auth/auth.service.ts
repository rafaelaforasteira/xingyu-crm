import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { AuthRole, UserStatus } from "@xingyu/database";
import * as argon2 from "argon2";
import { createHash, randomBytes } from "node:crypto";
import { Response, Request } from "express";
import { PrismaService } from "../prisma/prisma.service";
import {
  AUTH_COOKIE,
  accessTokenExpiresIn,
  accessTokenMaxAgeMs,
  cookieDomain,
  isCookieSecure,
  refreshTokenExpiresIn,
  refreshTokenMaxAgeMs,
} from "./cookie.config";
import type { AccessTokenPayload, AuthenticatedUser, PublicUser } from "./types";
import type { LoginDto } from "./dto/login.dto";
import type { ChangePasswordDto } from "./dto/change-password.dto";
import { accessManifest } from "./access-policy";

const INVALID_CREDENTIALS = "E-mail ou senha inválidos.";
const WRONG_CURRENT_PASSWORD = "Senha atual incorreta.";

const ARGON2_OPTIONS = {
  type: argon2.argon2id as 0 | 1 | 2,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  toPublicUser(user: {
    id: string;
    name: string;
    email: string;
    authRole: AuthRole;
    status: UserStatus;
    phone?: string | null;
    avatarUrl?: string | null;
    title?: string | null;
    locale?: string;
    timezone?: string;
  }): PublicUser {
    const access = accessManifest(user.authRole);
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.authRole,
      status: user.status,
      phone: user.phone ?? null,
      avatarUrl: user.avatarUrl ?? null,
      title: user.title ?? null,
      locale: user.locale ?? "pt-BR",
      timezone: user.timezone ?? "America/Sao_Paulo",
      permissions: access.permissions,
      scopes: access.scopes,
    };
  }

  async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, ARGON2_OPTIONS);
  }

  async verifyPassword(hash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }

  hashRefreshToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private generateRefreshToken(): string {
    return randomBytes(48).toString("base64url");
  }

  private async signAccessToken(payload: AccessTokenPayload): Promise<string> {
    return this.jwt.signAsync(
      { sub: payload.sub, role: payload.role, sessionId: payload.sessionId },
      {
        secret: this.config.getOrThrow<string>("JWT_ACCESS_SECRET"),
        expiresIn: Math.floor(accessTokenMaxAgeMs() / 1000),
      },
    );
  }

  private cookieOptions(maxAgeMs: number) {
    const domain = cookieDomain();
    return {
      httpOnly: true,
      secure: isCookieSecure(),
      sameSite: "lax" as const,
      path: "/",
      maxAge: maxAgeMs,
      ...(domain ? { domain } : {}),
    };
  }

  setAuthCookies(
    res: Response,
    tokens: { accessToken: string; refreshToken: string },
  ): void {
    res.cookie(
      AUTH_COOKIE.access,
      tokens.accessToken,
      this.cookieOptions(accessTokenMaxAgeMs()),
    );
    res.cookie(
      AUTH_COOKIE.refresh,
      tokens.refreshToken,
      this.cookieOptions(refreshTokenMaxAgeMs()),
    );
  }

  clearAuthCookies(res: Response): void {
    const domain = cookieDomain();
    const base = {
      httpOnly: true,
      secure: isCookieSecure(),
      sameSite: "lax" as const,
      path: "/",
      ...(domain ? { domain } : {}),
    };
    res.clearCookie(AUTH_COOKIE.access, base);
    res.clearCookie(AUTH_COOKIE.refresh, base);
  }

  private clientMeta(req: Request): { userAgent?: string; ipAddress?: string } {
    const userAgentHeader = req.headers["user-agent"];
    const userAgent =
      typeof userAgentHeader === "string" ? userAgentHeader.slice(0, 512) : undefined;
    const forwarded = req.headers["x-forwarded-for"];
    const ipAddress =
      typeof forwarded === "string"
        ? forwarded.split(",")[0]?.trim()
        : req.ip || req.socket.remoteAddress;
    return { userAgent, ipAddress: ipAddress?.slice(0, 128) };
  }

  async login(
    dto: LoginDto,
    req: Request,
    res: Response,
  ): Promise<{ user: PublicUser }> {
    const email = this.normalizeEmail(dto.email);
    const user = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        authRole: true,
        status: true,
        phone: true,
        avatarUrl: true,
        title: true,
        locale: true,
        timezone: true,
        passwordHash: true,
      },
    });

    if (!user?.passwordHash) {
      this.logger.warn(`Login falhou para e-mail não autenticável`);
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    if (user.status !== UserStatus.ACTIVE) {
      this.logger.warn(`Login bloqueado para usuário inativo id=${user.id}`);
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    const valid = await this.verifyPassword(user.passwordHash, dto.password);
    if (!valid) {
      this.logger.warn(`Login falhou por senha inválida id=${user.id}`);
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    const refreshToken = this.generateRefreshToken();
    const refreshTokenHash = this.hashRefreshToken(refreshToken);
    const meta = this.clientMeta(req);
    const expiresAt = new Date(Date.now() + refreshTokenMaxAgeMs());

    const session = await this.prisma.userSession.create({
      data: {
        userId: user.id,
        refreshTokenHash,
        userAgent: meta.userAgent,
        ipAddress: meta.ipAddress,
        expiresAt,
      },
    });

    const accessToken = await this.signAccessToken({
      sub: user.id,
      role: user.authRole,
      sessionId: session.id,
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    this.setAuthCookies(res, { accessToken, refreshToken });
    this.logger.log(`Login ok userId=${user.id} sessionId=${session.id}`);

    return { user: this.toPublicUser(user) };
  }

  async refresh(req: Request, res: Response): Promise<{ user: PublicUser }> {
    const rawRefresh = (req as Request & { cookies?: Record<string, string> })
      .cookies?.[AUTH_COOKIE.refresh];
    if (!rawRefresh) {
      throw new UnauthorizedException("Sessão não autenticada.");
    }

    const refreshTokenHash = this.hashRefreshToken(rawRefresh);
    const session = await this.prisma.userSession.findFirst({
      where: { refreshTokenHash },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            authRole: true,
            status: true,
            deletedAt: true,
          },
        },
      },
    });

    if (!session) {
      throw new UnauthorizedException("Sessão inválida.");
    }

    if (session.revokedAt) {
      // Reuse of a revoked refresh token → revoke all sessions for the user
      await this.prisma.userSession.updateMany({
        where: { userId: session.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      this.clearAuthCookies(res);
      this.logger.warn(
        `Refresh token revogado reutilizado; sessões encerradas userId=${session.userId}`,
      );
      throw new UnauthorizedException("Sessão inválida.");
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      await this.prisma.userSession.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      });
      this.clearAuthCookies(res);
      throw new UnauthorizedException("Sessão expirada.");
    }

    const user = session.user;
    if (!user || user.deletedAt || user.status !== UserStatus.ACTIVE) {
      await this.prisma.userSession.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      });
      this.clearAuthCookies(res);
      throw new UnauthorizedException("Usuário indisponível.");
    }

    const nextRefreshToken = this.generateRefreshToken();
    const nextHash = this.hashRefreshToken(nextRefreshToken);
    const meta = this.clientMeta(req);
    const expiresAt = new Date(Date.now() + refreshTokenMaxAgeMs());

    await this.prisma.$transaction([
      this.prisma.userSession.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      }),
      this.prisma.userSession.create({
        data: {
          userId: user.id,
          refreshTokenHash: nextHash,
          userAgent: meta.userAgent ?? session.userAgent,
          ipAddress: meta.ipAddress ?? session.ipAddress,
          expiresAt,
        },
      }),
    ]);

    const newSession = await this.prisma.userSession.findFirstOrThrow({
      where: { userId: user.id, refreshTokenHash: nextHash, revokedAt: null },
      orderBy: { createdAt: "desc" },
    });

    const accessToken = await this.signAccessToken({
      sub: user.id,
      role: user.authRole,
      sessionId: newSession.id,
    });

    this.setAuthCookies(res, {
      accessToken,
      refreshToken: nextRefreshToken,
    });

    return { user: this.toPublicUser(user) };
  }

  async logout(req: Request, res: Response): Promise<{ ok: true }> {
    const cookies = (req as Request & { cookies?: Record<string, string> }).cookies;
    const rawRefresh = cookies?.[AUTH_COOKIE.refresh];
    const accessToken = cookies?.[AUTH_COOKIE.access];

    if (rawRefresh) {
      const refreshTokenHash = this.hashRefreshToken(rawRefresh);
      await this.prisma.userSession.updateMany({
        where: { refreshTokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } else if (accessToken) {
      try {
        const payload = await this.jwt.verifyAsync<AccessTokenPayload>(accessToken, {
          secret: this.config.getOrThrow<string>("JWT_ACCESS_SECRET"),
          ignoreExpiration: true,
        });
        if (payload.sessionId) {
          await this.prisma.userSession.updateMany({
            where: { id: payload.sessionId, revokedAt: null },
            data: { revokedAt: new Date() },
          });
        }
      } catch {
        // Idempotent logout — ignore invalid access tokens
      }
    }

    this.clearAuthCookies(res);
    return { ok: true };
  }

  async me(userId: string): Promise<PublicUser> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        authRole: true,
        status: true,
        phone: true,
        avatarUrl: true,
        title: true,
        locale: true,
        timezone: true,
      },
    });
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException("Usuário indisponível.");
    }
    return this.toPublicUser(user);
  }

  async changePassword(user: AuthenticatedUser, dto: ChangePasswordDto) {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException("A confirmação da nova senha não confere.");
    }
    if (dto.newPassword === dto.currentPassword) {
      throw new BadRequestException("A nova senha deve ser diferente da atual.");
    }

    const record = await this.prisma.user.findFirst({
      where: { id: user.id, deletedAt: null },
      select: {
        id: true,
        status: true,
        passwordHash: true,
      },
    });

    if (!record?.passwordHash || record.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException("Usuário indisponível.");
    }

    const valid = await this.verifyPassword(record.passwordHash, dto.currentPassword);
    if (!valid) {
      throw new UnauthorizedException(WRONG_CURRENT_PASSWORD);
    }

    const passwordHash = await this.hashPassword(dto.newPassword);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      }),
      this.prisma.userSession.updateMany({
        where: {
          userId: user.id,
          revokedAt: null,
          ...(user.sessionId ? { id: { not: user.sessionId } } : {}),
        },
        data: { revokedAt: new Date() },
      }),
    ]);

    this.logger.log(`Password changed userId=${user.id}`);
    return { ok: true as const };
  }

  /** Exposes refresh TTL config for diagnostics without leaking secrets. */
  getTokenTtlLabels() {
    return {
      access: accessTokenExpiresIn(),
      refresh: refreshTokenExpiresIn(),
    };
  }
}
