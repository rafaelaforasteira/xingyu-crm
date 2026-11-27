import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AuthRole, GoalMetric, GoalScope, Prisma } from "@xingyu/database";
import type { AuthenticatedUser } from "../auth/types";
import { PrismaService } from "../prisma/prisma.service";
import { buildGoalCurve, calculateGoalPace } from "./domain/goal-math";
import type { QueryGoalsDto, UpsertGoalDto } from "./dto/goal.dto";

const REVENUE_STATUSES = [
  "PAYMENT_APPROVED",
  "DELIVERED",
  "COMPLETED",
  "NATIONAL_TRANSPORT",
] as const;

@Injectable()
export class GoalsService {
  constructor(private readonly prisma: PrismaService) {}

  private visibility(user: AuthenticatedUser): Prisma.GoalWhereInput {
    if (user.role === AuthRole.ADMIN) return {};
    return {
      OR: [
        { scope: GoalScope.ORGANIZATION },
        ...(user.teamId ? [{ scope: GoalScope.TEAM, teamId: user.teamId } as const] : []),
        { scope: GoalScope.USER, userId: user.id },
      ],
    };
  }

  async list(organizationId: string, user: AuthenticatedUser, query: QueryGoalsDto) {
    return this.prisma.goal.findMany({
      where: {
        organizationId,
        archivedAt: null,
        ...this.visibility(user),
        ...(query.metric ? { metric: query.metric } : {}),
        ...(query.scope ? { scope: query.scope } : {}),
        ...(query.teamId ? { teamId: query.teamId } : {}),
        ...(query.userId ? { userId: query.userId } : {}),
        ...(query.pipelineId ? { pipelineId: query.pipelineId } : {}),
        ...(query.from ? { periodEnd: { gt: new Date(query.from) } } : {}),
        ...(query.to ? { periodStart: { lt: new Date(query.to) } } : {}),
      },
      include: {
        team: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, teamId: true } },
        pipeline: { select: { id: true, name: true } },
      },
      orderBy: [{ periodStart: "desc" }, { scope: "asc" }, { createdAt: "desc" }],
    });
  }

  private async validateTarget(
    organizationId: string,
    user: AuthenticatedUser,
    input: UpsertGoalDto,
    allowedPipelineIds: string[] | null,
  ) {
    const start = new Date(input.periodStart);
    const end = new Date(input.periodEnd);
    if (!(start < end))
      throw new BadRequestException("O fim da meta deve ser posterior ao início.");
    if (input.scope === GoalScope.ORGANIZATION && (input.teamId || input.userId)) {
      throw new BadRequestException("Meta organizacional não possui equipe ou pessoa alvo.");
    }
    if (input.scope === GoalScope.TEAM && (!input.teamId || input.userId)) {
      throw new BadRequestException("Meta de equipe exige somente uma equipe alvo.");
    }
    if (input.scope === GoalScope.USER && (!input.userId || input.teamId)) {
      throw new BadRequestException("Meta individual exige somente uma pessoa alvo.");
    }
    if (user.role === AuthRole.MANAGER) {
      if (input.scope === GoalScope.ORGANIZATION) {
        throw new ForbiddenException("Somente administradores gerenciam metas organizacionais.");
      }
      if (input.teamId && input.teamId !== user.teamId)
        throw new ForbiddenException("Equipe fora do seu escopo.");
      if (input.userId) {
        const member = await this.prisma.user.count({
          where: {
            id: input.userId,
            organizationId,
            teamId: user.teamId ?? "__none__",
            deletedAt: null,
          },
        });
        if (!member) throw new ForbiddenException("Pessoa fora da sua equipe.");
      }
    }
    if (input.teamId) {
      const exists = await this.prisma.team.count({
        where: { id: input.teamId, organizationId, deletedAt: null },
      });
      if (!exists) throw new BadRequestException("Equipe inválida.");
    }
    if (input.userId) {
      const exists = await this.prisma.user.count({
        where: { id: input.userId, organizationId, deletedAt: null },
      });
      if (!exists) throw new BadRequestException("Pessoa inválida.");
    }
    if (input.pipelineId) {
      if (allowedPipelineIds && !allowedPipelineIds.includes(input.pipelineId))
        throw new ForbiddenException("Pipeline fora do seu escopo.");
      const exists = await this.prisma.pipeline.count({
        where: { id: input.pipelineId, organizationId, deletedAt: null },
      });
      if (!exists) throw new BadRequestException("Pipeline inválido.");
    }
    return { start, end };
  }

  private targetWhere(input: UpsertGoalDto): Prisma.GoalWhereInput {
    return {
      metric: input.metric,
      scope: input.scope,
      teamId: input.teamId ?? null,
      userId: input.userId ?? null,
      pipelineId: input.pipelineId ?? null,
    };
  }

  async create(
    organizationId: string,
    user: AuthenticatedUser,
    input: UpsertGoalDto,
    allowedPipelineIds: string[] | null,
  ) {
    const { start, end } = await this.validateTarget(
      organizationId,
      user,
      input,
      allowedPipelineIds,
    );
    const overlap = await this.prisma.goal.count({
      where: {
        organizationId,
        archivedAt: null,
        ...this.targetWhere(input),
        periodStart: { lt: end },
        periodEnd: { gt: start },
      },
    });
    if (overlap) throw new BadRequestException("Já existe uma meta conflitante nesse período.");
    return this.prisma.$transaction(async (tx) => {
      const goal = await tx.goal.create({
        data: {
          organizationId,
          metric: input.metric,
          scope: input.scope,
          teamId: input.teamId,
          userId: input.userId,
          pipelineId: input.pipelineId,
          targetValue: new Prisma.Decimal(input.targetValue),
          periodStart: start,
          periodEnd: end,
          createdByUserId: user.id,
        },
      });
      await tx.auditLog.create({
        data: {
          organizationId,
          userId: user.id,
          action: "GOAL_CREATED",
          entityType: "Goal",
          entityId: goal.id,
          after: goal as unknown as Prisma.InputJsonValue,
        },
      });
      return goal;
    });
  }

  private async editableGoal(organizationId: string, user: AuthenticatedUser, id: string) {
    const goal = await this.prisma.goal.findFirst({ where: { id, organizationId } });
    if (!goal) throw new NotFoundException("Meta não encontrada.");
    if (user.role === AuthRole.MANAGER) {
      const allowed =
        goal.scope === GoalScope.TEAM
          ? goal.teamId === user.teamId
          : goal.scope === GoalScope.USER &&
            !!goal.userId &&
            !!(await this.prisma.user.count({
              where: { id: goal.userId, organizationId, teamId: user.teamId ?? "__none__" },
            }));
      if (!allowed) throw new ForbiddenException("Meta fora do seu escopo.");
    }
    return goal;
  }

  async update(
    organizationId: string,
    user: AuthenticatedUser,
    id: string,
    input: UpsertGoalDto,
    allowedPipelineIds: string[] | null,
  ) {
    const before = await this.editableGoal(organizationId, user, id);
    const { start, end } = await this.validateTarget(
      organizationId,
      user,
      input,
      allowedPipelineIds,
    );
    const overlap = await this.prisma.goal.count({
      where: {
        organizationId,
        id: { not: id },
        archivedAt: null,
        ...this.targetWhere(input),
        periodStart: { lt: end },
        periodEnd: { gt: start },
      },
    });
    if (overlap) throw new BadRequestException("Já existe uma meta conflitante nesse período.");
    return this.prisma.$transaction(async (tx) => {
      const goal = await tx.goal.update({
        where: { id },
        data: {
          metric: input.metric,
          scope: input.scope,
          teamId: input.teamId ?? null,
          userId: input.userId ?? null,
          pipelineId: input.pipelineId ?? null,
          targetValue: new Prisma.Decimal(input.targetValue),
          periodStart: start,
          periodEnd: end,
        },
      });
      await tx.auditLog.create({
        data: {
          organizationId,
          userId: user.id,
          action: "GOAL_UPDATED",
          entityType: "Goal",
          entityId: id,
          before: before as unknown as Prisma.InputJsonValue,
          after: goal as unknown as Prisma.InputJsonValue,
        },
      });
      return goal;
    });
  }

  async archive(organizationId: string, user: AuthenticatedUser, id: string) {
    const before = await this.editableGoal(organizationId, user, id);
    if (before.archivedAt) return before;
    return this.prisma.$transaction(async (tx) => {
      const goal = await tx.goal.update({ where: { id }, data: { archivedAt: new Date() } });
      await tx.auditLog.create({
        data: {
          organizationId,
          userId: user.id,
          action: "GOAL_ARCHIVED",
          entityType: "Goal",
          entityId: id,
          before: before as unknown as Prisma.InputJsonValue,
          after: goal as unknown as Prisma.InputJsonValue,
        },
      });
      return goal;
    });
  }

  private orderWhere(goal: {
    organizationId: string;
    teamId: string | null;
    userId: string | null;
    pipelineId: string | null;
    periodStart: Date;
    periodEnd: Date;
  }) {
    return {
      organizationId: goal.organizationId,
      deletedAt: null,
      orderedAt: { gte: goal.periodStart, lt: goal.periodEnd },
      status: { in: [...REVENUE_STATUSES] },
      ...(goal.userId ? { ownerId: goal.userId } : {}),
      ...(goal.teamId ? { owner: { teamId: goal.teamId } } : {}),
      ...(goal.pipelineId ? { deal: { pipelineId: goal.pipelineId } } : {}),
    } satisfies Prisma.OrderWhereInput;
  }

  async analytics(organizationId: string, user: AuthenticatedUser, query: QueryGoalsDto) {
    const goals = await this.list(organizationId, user, query);
    const rows = await Promise.all(
      goals.map(async (goal) => {
        const where = this.orderWhere(goal);
        const orders = await this.prisma.order.findMany({
          where,
          select: {
            orderedAt: true,
            finalValue: true,
            contactId: true,
            isFirstPurchase: true,
            purchaseOrdinal: true,
          },
        });
        const actual =
          goal.metric === GoalMetric.REVENUE
            ? orders.reduce((sum, order) => sum + Number(order.finalValue), 0)
            : goal.metric === GoalMetric.ORDERS
              ? orders.length
              : new Set(
                  orders
                    .filter((order) =>
                      goal.metric === GoalMetric.NEW_CUSTOMERS
                        ? order.isFirstPurchase === true
                        : order.isFirstPurchase === false || (order.purchaseOrdinal ?? 0) > 1,
                    )
                    .map((order) => order.contactId)
                    .filter(Boolean),
                ).size;
        const daily = new Map<string, number>();
        for (const order of orders) {
          const eligible =
            goal.metric === GoalMetric.REVENUE ||
            goal.metric === GoalMetric.ORDERS ||
            (goal.metric === GoalMetric.NEW_CUSTOMERS
              ? order.isFirstPurchase === true
              : order.isFirstPurchase === false || (order.purchaseOrdinal ?? 0) > 1);
          if (!eligible) continue;
          const day = order.orderedAt.toISOString().slice(0, 10);
          daily.set(
            day,
            (daily.get(day) ?? 0) +
              (goal.metric === GoalMetric.REVENUE ? Number(order.finalValue) : 1),
          );
        }
        const target = Number(goal.targetValue);
        return {
          ...goal,
          targetValue: target,
          ...calculateGoalPace(actual, target, goal.periodStart, goal.periodEnd),
          curve: buildGoalCurve(
            target,
            goal.periodStart,
            goal.periodEnd,
            [...daily].map(([date, value]) => ({ date: new Date(`${date}T00:00:00.000Z`), value })),
          ),
        };
      }),
    );
    return {
      goals: rows,
      registry: {
        REVENUE: { unit: "currency", source: "Order.finalValue" },
        ORDERS: { unit: "count", source: "Order" },
        NEW_CUSTOMERS: { unit: "count", source: "Order.isFirstPurchase" },
        REPEAT_CUSTOMERS: { unit: "count", source: "Order.purchaseOrdinal" },
      },
    };
  }
}
