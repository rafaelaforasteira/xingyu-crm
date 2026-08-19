import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { AuthenticatedUser } from "../auth/types";
import { PrismaService } from "../prisma/prisma.service";

type AccessRow = { id: string };
type PipelineResource = "deal" | "conversation" | "task" | "note" | "activity" | "order";

@Injectable()
export class PipelineAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async accessiblePipelineIds(user: AuthenticatedUser): Promise<string[] | null> {
    if (user.role === "ADMIN" || user.role === "MANAGER") return null;
    const rows = await this.prisma.$queryRaw<AccessRow[]>`
      SELECT DISTINCT p.id
      FROM "Pipeline" p
      LEFT JOIN "PipelineUserAccess" ua ON ua."pipelineId" = p.id AND ua."userId" = ${user.id}
      LEFT JOIN "PipelineTeamAccess" ta ON ta."pipelineId" = p.id
      LEFT JOIN "User" u ON u.id = ${user.id} AND u."organizationId" = p."organizationId"
      WHERE p."organizationId" = ${user.organizationId}
        AND p."deletedAt" IS NULL
        AND (p."accessMode" = 'ORGANIZATION' OR ua.id IS NOT NULL OR ta."teamId" = u."teamId")
    `;
    return rows.map((row) => row.id);
  }

  async assertAccess(user: AuthenticatedUser, pipelineId: string) {
    const ids = await this.accessiblePipelineIds(user);
    if (ids !== null && !ids.includes(pipelineId))
      throw new ForbiddenException("Sem acesso a este pipeline.");
  }

  async assertDealAccess(user: AuthenticatedUser, dealId: string) {
    const deal = await this.prisma.deal.findFirst({
      where: { id: dealId, organizationId: user.organizationId, deletedAt: null },
      select: { pipelineId: true, ownerId: true },
    });
    if (!deal) throw new NotFoundException("Lead não encontrado.");
    await this.assertAccess(user, deal.pipelineId);
    if (user.role === "CONSULTANT" && deal.ownerId !== user.id)
      throw new ForbiddenException("Este lead está atribuído a outra pessoa.");
  }

  async assertConversationAccess(user: AuthenticatedUser, conversationId: string) {
    if (user.role === "ADMIN") return;
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, organizationId: user.organizationId, deletedAt: null },
      select: {
        channel: {
          select: {
            accessMode: true,
            ownerUserId: true,
            pipelineConnections: {
              where: { deletedAt: null, active: true },
              select: { pipelineId: true },
            },
          },
        },
        deal: { select: { pipelineId: true, ownerId: true } },
      },
    });
    if (!conversation) throw new NotFoundException("Conversa não encontrada.");
    const channel = conversation.channel;
    if (channel?.accessMode === "PERSONAL") {
      if (channel.ownerUserId !== user.id)
        throw new ForbiddenException("Sem acesso a esta conversa.");
      return;
    }
    if (channel?.accessMode === "PIPELINE") {
      const accessible = await this.accessiblePipelineIds(user);
      if (
        accessible !== null &&
        !channel.pipelineConnections.some((connection) =>
          accessible.includes(connection.pipelineId),
        )
      )
        throw new ForbiddenException("Sem acesso a esta conversa.");
      return;
    }
    if (conversation.deal?.ownerId && conversation.deal.ownerId !== user.id)
      throw new ForbiddenException("Sem acesso a esta conversa.");
  }

  async conversationWhere(user: AuthenticatedUser) {
    if (user.role === "ADMIN") return {};
    const pipelineIds = await this.accessiblePipelineIds(user);
    return {
      OR: [
        { channel: { accessMode: "PERSONAL" as const, ownerUserId: user.id } },
        {
          channel: {
            accessMode: "PIPELINE" as const,
            pipelineConnections: {
              some: {
                active: true,
                deletedAt: null,
                ...(pipelineIds ? { pipelineId: { in: pipelineIds } } : {}),
              },
            },
          },
        },
        { channel: { accessMode: "ORGANIZATION" as const }, deal: { ownerId: user.id } },
        { channelId: null, deal: { ownerId: user.id } },
      ],
    };
  }

  async conversationPipelineId(user: AuthenticatedUser, conversationId: string) {
    return (
      (
        await this.prisma.conversation.findFirst({
          where: { id: conversationId, organizationId: user.organizationId, deletedAt: null },
          select: { deal: { select: { pipelineId: true } } },
        })
      )?.deal?.pipelineId ?? null
    );
  }

  async assertTaskAccess(user: AuthenticatedUser, taskId: string) {
    if (user.role === "ADMIN") return;
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, organizationId: user.organizationId, deletedAt: null },
      select: {
        assigneeId: true,
        pipelineId: true,
        deal: { select: { pipelineId: true, ownerId: true } },
      },
    });
    if (!task) throw new NotFoundException("Tarefa não encontrada.");
    const pipelineId = task.deal?.pipelineId ?? task.pipelineId;
    if (pipelineId) await this.assertAccess(user, pipelineId);
    if (task.assigneeId !== user.id && task.deal?.ownerId !== user.id) {
      throw new ForbiddenException("Sem acesso a esta tarefa.");
    }
  }

  async assertNoteAccess(user: AuthenticatedUser, noteId: string) {
    return this.assertResourceAccess(user, "note", noteId);
  }

  async assertActivityAccess(user: AuthenticatedUser, activityId: string) {
    return this.assertResourceAccess(user, "activity", activityId);
  }

  async assertOrderAccess(user: AuthenticatedUser, orderId: string) {
    if (user.role === "CONSULTANT") {
      const order = await this.prisma.order.findFirst({ where: { id: orderId, organizationId: user.organizationId, deletedAt: null }, select: { ownerId: true, operationalAssigneeId: true, deal: { select: { ownerId: true } } } });
      if (!order) throw new NotFoundException("Pedido não encontrado.");
      if (![order.ownerId, order.operationalAssigneeId, order.deal?.ownerId].includes(user.id)) throw new ForbiddenException("Sem acesso a este pedido.");
    }
    return this.assertResourceAccess(user, "order", orderId);
  }

  private async assertResourceAccess(
    user: AuthenticatedUser,
    resource: PipelineResource,
    id: string,
  ) {
    let pipelineId: string | null | undefined;
    if (resource === "deal") {
      pipelineId = (
        await this.prisma.deal.findFirst({
          where: { id, organizationId: user.organizationId, deletedAt: null },
          select: { pipelineId: true },
        })
      )?.pipelineId;
    } else if (resource === "conversation") {
      pipelineId = (
        await this.prisma.conversation.findFirst({
          where: { id, organizationId: user.organizationId, deletedAt: null },
          select: { deal: { select: { pipelineId: true } } },
        })
      )?.deal?.pipelineId;
    } else if (resource === "task") {
      const task = await this.prisma.task.findFirst({
        where: { id, organizationId: user.organizationId, deletedAt: null },
        select: { pipelineId: true, deal: { select: { pipelineId: true } } },
      });
      pipelineId = task?.deal?.pipelineId ?? task?.pipelineId;
    } else if (resource === "note") {
      pipelineId = (
        await this.prisma.note.findFirst({
          where: { id, organizationId: user.organizationId, deletedAt: null },
          select: { deal: { select: { pipelineId: true } } },
        })
      )?.deal?.pipelineId;
    } else if (resource === "activity") {
      const activity = await this.prisma.activity.findFirst({
        where: { id, organizationId: user.organizationId },
        select: {
          deal: { select: { pipelineId: true } },
          task: { select: { pipelineId: true, deal: { select: { pipelineId: true } } } },
          order: { select: { deal: { select: { pipelineId: true } } } },
        },
      });
      pipelineId =
        activity?.deal?.pipelineId ??
        activity?.task?.deal?.pipelineId ??
        activity?.task?.pipelineId ??
        activity?.order?.deal?.pipelineId;
    } else {
      pipelineId = (
        await this.prisma.order.findFirst({
          where: { id, organizationId: user.organizationId, deletedAt: null },
          select: { deal: { select: { pipelineId: true } } },
        })
      )?.deal?.pipelineId;
    }
    if (pipelineId) await this.assertAccess(user, pipelineId);
  }

  async eligibleUsers(user: AuthenticatedUser, pipelineId: string) {
    await this.assertAccess(user, pipelineId);
    const pipeline = await this.prisma.pipeline.findFirst({
      where: { id: pipelineId, organizationId: user.organizationId, deletedAt: null },
      select: { accessMode: true },
    });
    if (!pipeline) throw new NotFoundException("Pipeline nÃ£o encontrado.");
    return this.prisma.user.findMany({
      where:
        pipeline.accessMode === "ORGANIZATION"
          ? { organizationId: user.organizationId, deletedAt: null, status: "ACTIVE" }
          : {
              organizationId: user.organizationId,
              deletedAt: null,
              status: "ACTIVE",
              OR: [
                { authRole: "ADMIN" },
                { pipelineAccesses: { some: { pipelineId } } },
                { team: { pipelineAccesses: { some: { pipelineId } } } },
              ],
            },
      select: { id: true, name: true, avatarUrl: true, teamId: true, role: true },
      orderBy: { name: "asc" },
    });
  }

  async assertEligibleUser(
    user: AuthenticatedUser,
    pipelineId: string,
    candidateId?: string | null,
  ) {
    if (!candidateId) return;
    const users = await this.eligibleUsers(user, pipelineId);
    if (!users.some((candidate) => candidate.id === candidateId)) {
      throw new BadRequestException("ResponsÃ¡vel sem acesso a este pipeline.");
    }
  }

  async overview(organizationId: string) {
    const [pipelines, teams, users] = await Promise.all([
      this.prisma.$queryRaw<any[]>`SELECT p.id,p.name,p."accessMode",p.position,
        COALESCE(array_agg(DISTINCT ta."teamId") FILTER (WHERE ta."teamId" IS NOT NULL), '{}') AS "teamIds",
        COALESCE(array_agg(DISTINCT ua."userId") FILTER (WHERE ua."userId" IS NOT NULL), '{}') AS "userIds"
        FROM "Pipeline" p LEFT JOIN "PipelineTeamAccess" ta ON ta."pipelineId"=p.id
        LEFT JOIN "PipelineUserAccess" ua ON ua."pipelineId"=p.id
        WHERE p."organizationId"=${organizationId} AND p."deletedAt" IS NULL AND p.archived=false
        GROUP BY p.id ORDER BY p.position,p.name,p.id`,
      this.prisma.team.findMany({
        where: { organizationId, deletedAt: null },
        include: {
          members: {
            where: { deletedAt: null },
            select: { id: true, name: true, avatarUrl: true },
          },
        },
        orderBy: { name: "asc" },
      }),
      this.prisma.user.findMany({
        where: { organizationId, deletedAt: null },
        include: { team: { select: { id: true, name: true } } },
        orderBy: { name: "asc" },
      }),
    ]);
    return { pipelines, teams, users };
  }

  async update(
    organizationId: string,
    pipelineId: string,
    input: { accessMode: "ORGANIZATION" | "RESTRICTED"; teamIds?: string[]; userIds?: string[] },
  ) {
    const teamIds = [...new Set(input.teamIds ?? [])];
    const userIds = [...new Set(input.userIds ?? [])];
    if (input.accessMode === "RESTRICTED" && !teamIds.length && !userIds.length)
      throw new BadRequestException("Acesso restrito exige ao menos uma equipe ou pessoa.");
    const pipeline = await this.prisma.pipeline.findFirst({
      where: { id: pipelineId, organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!pipeline) throw new NotFoundException("Pipeline não encontrado.");
    const [teamCount, userCount] = await Promise.all([
      this.prisma.team.count({ where: { id: { in: teamIds }, organizationId, deletedAt: null } }),
      this.prisma.user.count({ where: { id: { in: userIds }, organizationId, deletedAt: null } }),
    ]);
    if (teamCount !== teamIds.length || userCount !== userIds.length)
      throw new BadRequestException("Equipe ou pessoa inválida para esta organização.");
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`DELETE FROM "PipelineTeamAccess" WHERE "pipelineId"=${pipelineId}`;
      await tx.$executeRaw`DELETE FROM "PipelineUserAccess" WHERE "pipelineId"=${pipelineId}`;
      for (const teamId of teamIds)
        await tx.$executeRaw`INSERT INTO "PipelineTeamAccess" (id,"organizationId","pipelineId","teamId") VALUES (${`pta-${pipelineId}-${teamId}`},${organizationId},${pipelineId},${teamId}) ON CONFLICT DO NOTHING`;
      for (const userId of userIds)
        await tx.$executeRaw`INSERT INTO "PipelineUserAccess" (id,"organizationId","pipelineId","userId") VALUES (${`pua-${pipelineId}-${userId}`},${organizationId},${pipelineId},${userId}) ON CONFLICT DO NOTHING`;
      await tx.$executeRaw`UPDATE "Pipeline" SET "accessMode"=${input.accessMode}::"PipelineAccessMode" WHERE id=${pipelineId} AND "organizationId"=${organizationId}`;
    });
    return this.overview(organizationId);
  }
}
