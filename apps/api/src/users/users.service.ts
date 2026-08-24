import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash, randomBytes } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { AuthService } from "../auth/auth.service";
import { paginate, paginationArgs } from "../common/types/paginated-response";
import { InviteUserDto, QueryUsersDto, UpdateManagedUserDto } from "./dto/user.dto";
import { AuthRole, UserStatus } from "@xingyu/database";

/** Days after deactivation before soft-archive (deletedAt). */
export const USER_INACTIVE_ARCHIVE_DAYS = 90;

@Injectable()
export class UsersService {
  private lastArchiveSweepAt = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  private hashToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }
  private inviteUrl(token: string) {
    return `${this.config.get("WEB_URL") ?? "http://localhost:3000"}/accept-invite?token=${encodeURIComponent(token)}`;
  }

  /** Soft-archive INACTIVE users past the retention window. Idempotent; no hard delete. */
  async archiveExpiredInactiveUsers(now = new Date()) {
    const cutoff = new Date(now.getTime() - USER_INACTIVE_ARCHIVE_DAYS * 24 * 60 * 60 * 1000);
    const expired = await this.prisma.user.findMany({
      where: {
        status: UserStatus.INACTIVE,
        deletedAt: null,
        deactivatedAt: { not: null, lte: cutoff },
      },
      select: { id: true, organizationId: true, authRole: true },
    });

    let archived = 0;
    for (const user of expired) {
      if (user.authRole === AuthRole.ADMIN) {
        const activeAdmins = await this.prisma.user.count({
          where: {
            organizationId: user.organizationId,
            authRole: AuthRole.ADMIN,
            status: UserStatus.ACTIVE,
            deletedAt: null,
          },
        });
        if (activeAdmins === 0) continue;
      }
      await this.prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: user.id },
          data: { deletedAt: now },
        });
        await tx.userSession.updateMany({
          where: { userId: user.id, revokedAt: null },
          data: { revokedAt: now },
        });
        await tx.userInvite.updateMany({
          where: { userId: user.id, usedAt: null, revokedAt: null },
          data: { revokedAt: now },
        });
      });
      archived += 1;
    }
    return { archived };
  }

  private async maybeSweepArchives() {
    const now = Date.now();
    if (now - this.lastArchiveSweepAt < 60 * 60 * 1000) return;
    this.lastArchiveSweepAt = now;
    await this.archiveExpiredInactiveUsers();
  }

  async list(organizationId: string, query: QueryUsersDto) {
    await this.maybeSweepArchives();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const { skip, take } = paginationArgs(page, pageSize);
    const search = query.search?.trim();
    const baseWhere = {
      organizationId,
      deletedAt: null,
    };
    const where = {
      ...baseWhere,
      ...(query.status ? { status: query.status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { email: { contains: search, mode: "insensitive" as const } },
              { phone: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };
    const [data, total, all, active, invited, inactive, activeAdmins] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { name: "asc" },
        include: {
          team: { select: { id: true, name: true } },
          sessions: {
            where: { revokedAt: null, expiresAt: { gt: new Date() } },
            select: { id: true },
          },
          pipelineAccesses: { select: { pipelineId: true } },
          channelOwnerships: {
            where: { deletedAt: null },
            select: { id: true, name: true, type: true, status: true },
          },
          invites: {
            where: { usedAt: null, revokedAt: null },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { expiresAt: true },
          },
        },
        omit: { passwordHash: true },
      }),
      this.prisma.user.count({ where }),
      this.prisma.user.count({ where: baseWhere }),
      this.prisma.user.count({ where: { ...baseWhere, status: UserStatus.ACTIVE } }),
      this.prisma.user.count({ where: { ...baseWhere, status: UserStatus.INVITED } }),
      this.prisma.user.count({ where: { ...baseWhere, status: UserStatus.INACTIVE } }),
      this.prisma.user.count({
        where: { ...baseWhere, status: UserStatus.ACTIVE, authRole: AuthRole.ADMIN },
      }),
    ]);
    const pageResult = paginate(
      data.map((row) => {
        const { sessions, pipelineAccesses, invites, ...user } = row;
        const safeUser = { ...user } as typeof user & { passwordHash?: string };
        delete safeUser.passwordHash;
        const inviteExpiresAt = invites[0]?.expiresAt?.toISOString() ?? null;
        return {
          ...safeUser,
          deactivatedAt: user.deactivatedAt?.toISOString() ?? null,
          lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
          inviteExpiresAt,
          activeSessions: sessions.length,
          directPipelineIds: pipelineAccesses.map((access) => access.pipelineId),
        };
      }),
      total,
      page,
      pageSize,
    );
    return {
      ...pageResult,
      totals: {
        all,
        active,
        invited,
        inactive,
        activeAdmins,
      },
    };
  }

  async invite(organizationId: string, createdByUserId: string, dto: InviteUserDto) {
    const email = this.auth.normalizeEmail(dto.email);
    if (
      dto.teamId &&
      !(await this.prisma.team.count({
        where: { id: dto.teamId, organizationId, deletedAt: null },
      }))
    )
      throw new BadRequestException("Equipe inválida para esta organização.");
    if (await this.prisma.user.count({ where: { organizationId, email, deletedAt: null } }))
      throw new ConflictException("Já existe um usuário com este e-mail.");
    const rawToken = randomBytes(48).toString("base64url");
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          organizationId,
          name: dto.name.trim(),
          email,
          phone: dto.phone?.trim() || null,
          authRole: dto.role,
          teamId: dto.teamId || null,
          status: "INVITED",
          passwordHash: null,
        },
      });
      await tx.userInvite.create({
        data: {
          organizationId,
          userId: created.id,
          createdByUserId,
          tokenHash: this.hashToken(rawToken),
          expiresAt,
        },
      });
      return created;
    });
    return { user: this.auth.toPublicUser(user), inviteUrl: this.inviteUrl(rawToken), expiresAt };
  }

  async regenerateInvite(organizationId: string, userId: string, createdByUserId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, organizationId, deletedAt: null, status: "INVITED" },
    });
    if (!user) throw new NotFoundException("Usuário convidado não encontrado.");
    const rawToken = randomBytes(48).toString("base64url");
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.userInvite.updateMany({
        where: { userId, usedAt: null, revokedAt: null },
        data: { revokedAt: now },
      });
      await tx.userInvite.create({
        data: {
          organizationId,
          userId,
          createdByUserId,
          tokenHash: this.hashToken(rawToken),
          expiresAt,
        },
      });
    });
    return { inviteUrl: this.inviteUrl(rawToken), expiresAt };
  }

  async inspectInvite(rawToken: string) {
    const invite = await this.prisma.userInvite.findUnique({
      where: { tokenHash: this.hashToken(rawToken) },
      include: { user: { select: { name: true, email: true, status: true } } },
    });
    if (
      !invite ||
      invite.usedAt ||
      invite.revokedAt ||
      invite.expiresAt <= new Date() ||
      invite.user.status !== "INVITED"
    )
      throw new BadRequestException("Convite inválido ou expirado.");
    return { name: invite.user.name, email: invite.user.email, expiresAt: invite.expiresAt };
  }

  async acceptInvite(rawToken: string, password: string, confirmPassword: string) {
    if (password !== confirmPassword) throw new BadRequestException("As senhas não coincidem.");
    const tokenHash = this.hashToken(rawToken);
    const invite = await this.prisma.userInvite.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    const now = new Date();
    if (
      !invite ||
      invite.usedAt ||
      invite.revokedAt ||
      invite.expiresAt <= now ||
      invite.user.status !== "INVITED"
    )
      throw new BadRequestException("Convite inválido ou expirado.");
    const passwordHash = await this.auth.hashPassword(password);
    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.userInvite.updateMany({
        where: { id: invite.id, usedAt: null, revokedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
      });
      if (claimed.count !== 1) throw new BadRequestException("Convite já utilizado.");
      await tx.user.update({
        where: { id: invite.userId },
        data: { passwordHash, status: "ACTIVE", deactivatedAt: null },
      });
    });
    return { ok: true };
  }

  async update(organizationId: string, userId: string, dto: UpdateManagedUserDto) {
    const current = await this.prisma.user.findFirst({
      where: { id: userId, organizationId, deletedAt: null },
      select: { authRole: true },
    });
    if (!current) throw new NotFoundException("Usuário não encontrado.");
    if (
      current.authRole === AuthRole.ADMIN &&
      dto.role &&
      dto.role !== AuthRole.ADMIN &&
      (await this.prisma.user.count({
        where: {
          organizationId,
          authRole: AuthRole.ADMIN,
          status: "ACTIVE",
          deletedAt: null,
        },
      })) <= 1
    )
      throw new BadRequestException("A organização deve manter ao menos um administrador ativo.");
    if (
      dto.teamId &&
      !(await this.prisma.team.count({
        where: { id: dto.teamId, organizationId, deletedAt: null },
      }))
    )
      throw new BadRequestException("Equipe inválida.");
    return this.prisma.user.update({
      where: { id: userId, organizationId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone.trim() || null } : {}),
        ...(dto.title !== undefined ? { title: dto.title.trim() || null } : {}),
        ...(dto.role !== undefined ? { authRole: dto.role } : {}),
        ...(dto.teamId !== undefined ? { teamId: dto.teamId || null } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        title: true,
        authRole: true,
        status: true,
        teamId: true,
      },
    });
  }

  async setActive(organizationId: string, userId: string, active: boolean) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, organizationId, deletedAt: null },
    });
    if (!user) throw new NotFoundException("Usuário não encontrado.");
    if (
      !active &&
      user.authRole === AuthRole.ADMIN &&
      (await this.prisma.user.count({
        where: {
          organizationId,
          authRole: AuthRole.ADMIN,
          status: "ACTIVE",
          deletedAt: null,
        },
      })) <= 1
    )
      throw new BadRequestException("O último administrador ativo não pode ser desativado.");
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: active
          ? { status: UserStatus.ACTIVE, deactivatedAt: null }
          : { status: UserStatus.INACTIVE, deactivatedAt: now },
      });
      if (!active) {
        await tx.userSession.updateMany({
          where: { userId, revokedAt: null },
          data: { revokedAt: now },
        });
        await tx.userInvite.updateMany({
          where: { userId, usedAt: null, revokedAt: null },
          data: { revokedAt: now },
        });
      }
    });
    return { id: userId, status: active ? "ACTIVE" : "INACTIVE" };
  }

  async revokeSessions(organizationId: string, userId: string) {
    if (!(await this.prisma.user.count({ where: { id: userId, organizationId, deletedAt: null } })))
      throw new NotFoundException("Usuário não encontrado.");
    const result = await this.prisma.userSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { revoked: result.count };
  }
}
