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
import { AuthRole } from "@xingyu/database";

@Injectable()
export class UsersService {
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

  async list(organizationId: string, query: QueryUsersDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const { skip, take } = paginationArgs(page, pageSize);
    const where = {
      organizationId,
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" as const } },
              { email: { contains: query.search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };
    const [data, total] = await Promise.all([
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
        },
      }),
      this.prisma.user.count({ where }),
    ]);
    return paginate(
      data.map(({ passwordHash: _passwordHash, sessions, pipelineAccesses, ...user }) => ({
        ...user,
        activeSessions: sessions.length,
        directPipelineIds: pipelineAccesses.map((access) => access.pipelineId),
      })),
      total,
      page,
      pageSize,
    );
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
        data: { passwordHash, status: "ACTIVE" },
      });
    });
    return { ok: true };
  }

  async update(organizationId: string, userId: string, dto: UpdateManagedUserDto) {
    const current = await this.prisma.user.findFirst({ where: { id: userId, organizationId, deletedAt: null }, select: { authRole: true } });
    if (!current) throw new NotFoundException("Usuário não encontrado.");
    if (current.authRole === AuthRole.ADMIN && dto.role && dto.role !== AuthRole.ADMIN && await this.prisma.user.count({ where: { organizationId, authRole: AuthRole.ADMIN, status: "ACTIVE", deletedAt: null } }) <= 1) throw new BadRequestException("A organização deve manter ao menos um administrador ativo.");
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
        name: dto.name?.trim(),
        phone: dto.phone?.trim(),
        authRole: dto.role,
        ...(dto.teamId !== undefined ? { teamId: dto.teamId || null } : {}),
      },
      select: { id: true, name: true, email: true, authRole: true, status: true, teamId: true },
    });
  }
  async setActive(organizationId: string, userId: string, active: boolean) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, organizationId, deletedAt: null },
    });
    if (!user) throw new NotFoundException("Usuário não encontrado.");
    if (!active && user.authRole === AuthRole.ADMIN && await this.prisma.user.count({ where: { organizationId, authRole: AuthRole.ADMIN, status: "ACTIVE", deletedAt: null } }) <= 1) throw new BadRequestException("O último administrador ativo não pode ser desativado.");
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { status: active ? "ACTIVE" : "INACTIVE" },
      });
      if (!active)
        await tx.userSession.updateMany({
          where: { userId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
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
