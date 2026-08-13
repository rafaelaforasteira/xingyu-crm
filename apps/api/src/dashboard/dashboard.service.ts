import { ForbiddenException, Injectable } from "@nestjs/common";
import { Prisma } from "@xingyu/database";
import { PrismaService } from "../prisma/prisma.service";
import type { AuthenticatedUser } from "../auth/types";
import { notDeleted } from "../common/utils/soft-delete";
import {
  closedDealConversionDeltaPp,
  closedDealConversionRate,
} from "./domain/closed-deal-conversion";
import {
  IN_TRANSIT_ORDER_STATUSES,
  TRACKING_STALE_DAYS,
  aggregateDelayedCount,
} from "./domain/order-fulfillment";
import {
  REACTIVATION_INACTIVE_MIN_DAYS,
  repurchaseReadyDescription,
  repurchaseReadyPrismaFilter,
} from "./domain/repurchase-bands";
import {
  classifyWaitingKind,
  formatWaitingDuration,
  isConversationAwaitingReply,
  waitingKindLabel,
  waitingMinutesSince,
} from "./domain/waiting-conversations";
import { responseEpisodes, responseSummary } from "./domain/response-episodes";

type DashboardFilters = {
  ownerId?: string;
  teamId?: string;
  pipelineId?: string;
  period?: string;
  /** ISO date YYYY-MM-DD — used when period=custom */
  from?: string;
  /** ISO date YYYY-MM-DD — used when period=custom */
  to?: string;
  channel?: string;
  source?: string;
  channelId?: string;
  allowedPipelineIds?: string[] | null;
  viewerRole?: AuthenticatedUser["role"];
  viewerId?: string;
};

/**
 * Dashboard metric definitions (shared contract):
 * - confirmedRevenue: sum of order.finalValue with paid/confirmed statuses in period
 * - negotiatingValue: sum of OPEN deal values
 * - awaitingPayment: OPEN deals in stages whose name matches /pagament/i
 * - conversionRate: WON / (WON + LOST) among deals closed in the period (null if none closed)
 * - monthlyGoal: sum of User.monthlyGoal (owner/team scoped when filtered); null if unset
 * - stalledDeals: OPEN deals with no interaction for >3 days
 * - waitingConversations: OPEN conversations whose latest non-internal message is INBOUND
 * - repurchaseReady: contacts with orderCount>0 and daysWithoutPurchase in [30,90]
 *   (bands: Até 30 dias from day 30, 31–60, 61–90). See repurchase-bands.ts
 * - ordersDelayed: in-transit orders past expectedAt; null when no expectedAt is available
 * - ordersStaleTracking: in-transit orders without tracking update for > TRACKING_STALE_DAYS
 */
function parseDayBound(isoDate: string, endOfDay: boolean): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null;
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  if (endOfDay) date.setUTCHours(23, 59, 59, 999);
  return date;
}

function resolvePeriod(period?: string, from?: string, to?: string) {
  const end = new Date();
  const start = new Date(end);
  const label = period ?? "30d";

  if (label === "custom" && from && to) {
    let customStart = parseDayBound(from, false);
    let customEnd = parseDayBound(to, false);
    if (customStart && customEnd) {
      if (customStart.getTime() > customEnd.getTime()) {
        const swap = customStart;
        customStart = parseDayBound(to, false)!;
        customEnd = parseDayBound(from, false)!;
      }
      customEnd.setUTCDate(customEnd.getUTCDate() + 1);
      const durationMs = Math.max(customEnd.getTime() - customStart.getTime(), 86_400_000);
      return {
        start: customStart,
        end: customEnd,
        prevStart: new Date(customStart.getTime() - durationMs),
        prevEnd: new Date(customStart),
        label: "custom",
      };
    }
  }

  switch (label) {
    case "today":
      start.setUTCHours(0, 0, 0, 0);
      break;
    case "7d":
      start.setUTCDate(start.getUTCDate() - 7);
      break;
    case "month":
      start.setUTCDate(1);
      start.setUTCHours(0, 0, 0, 0);
      break;
    case "previous-month": {
      end.setUTCDate(1);
      end.setUTCHours(0, 0, 0, 0);
      start.setTime(end.getTime());
      start.setUTCMonth(start.getUTCMonth() - 1);
      break;
    }
    case "30d":
    default:
      start.setUTCDate(start.getUTCDate() - 30);
      break;
  }

  const durationMs = Math.max(end.getTime() - start.getTime(), 86_400_000);
  const prevEnd = new Date(start);
  const prevStart = new Date(start.getTime() - durationMs);
  return { start, end, prevStart, prevEnd, label };
}

function decimal(value: unknown): number {
  return Number(value ?? 0);
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  private dealScope(organizationId: string, filters: DashboardFilters) {
    const channelOrSource = filters.channel || filters.source;
    return {
      organizationId,
      ...notDeleted,
      ...(filters.ownerId ? { ownerId: filters.ownerId } : {}),
      ...(filters.teamId ? { teamId: filters.teamId } : {}),
      ...(filters.pipelineId ? { pipelineId: filters.pipelineId } : {}),
      ...(!filters.pipelineId && filters.allowedPipelineIds
        ? { pipelineId: { in: filters.allowedPipelineIds } }
        : {}),
      ...(channelOrSource
        ? {
            source: {
              equals: channelOrSource,
              mode: "insensitive" as const,
            },
          }
        : {}),
    };
  }

  async authorizeFilters(
    organizationId: string,
    user: AuthenticatedUser,
    raw: Record<string, string | undefined>,
    allowedPipelineIds: string[] | null,
  ): Promise<DashboardFilters> {
    if (raw.pipelineId && allowedPipelineIds && !allowedPipelineIds.includes(raw.pipelineId)) {
      throw new ForbiddenException("Pipeline fora do seu escopo de análise.");
    }
    let ownerId = raw.ownerId;
    let teamId = raw.teamId;
    if (user.role !== "ADMIN") {
      if (ownerId) {
        const allowedOwner = await this.prisma.user.count({
          where: {
            id: ownerId,
            organizationId,
            deletedAt: null,
            status: "ACTIVE",
            ...(user.role === "CONSULTANT"
              ? { id: user.id }
              : { teamId: user.teamId ?? "__none__" }),
          },
        });
        if (!allowedOwner) throw new ForbiddenException("Pessoa fora do seu escopo de análise.");
      } else {
        ownerId = user.id;
      }
      teamId = undefined;
    } else if (ownerId || teamId) {
      const [ownerOk, teamOk] = await Promise.all([
        ownerId
          ? this.prisma.user.count({ where: { id: ownerId, organizationId, deletedAt: null } })
          : 1,
        teamId
          ? this.prisma.team.count({ where: { id: teamId, organizationId, deletedAt: null } })
          : 1,
      ]);
      if (!ownerOk || !teamOk) throw new ForbiddenException("Filtro fora da organização.");
    }
    let channelId: string | undefined;
    if (raw.channel) {
      const channelAccess: Prisma.ChannelWhereInput =
        user.role === "ADMIN"
          ? {}
          : {
              OR: [
                { accessMode: "ORGANIZATION" },
                { accessMode: "PERSONAL", ownerUserId: user.id },
                {
                  accessMode: "PIPELINE",
                  pipelineConnections: {
                    some: {
                      active: true,
                      deletedAt: null,
                      pipelineId: { in: allowedPipelineIds ?? [] },
                    },
                  },
                },
              ],
            };
      const channel = await this.prisma.channel.findFirst({
        where: {
          organizationId,
          deletedAt: null,
          AND: [
            { OR: [{ id: raw.channel }, { name: raw.channel }, { displayName: raw.channel }] },
            channelAccess,
          ],
        },
        select: { id: true, name: true },
      });
      if (!channel) throw new ForbiddenException("Canal fora do seu escopo de análise.");
      channelId = channel.id;
    }
    return {
      ownerId,
      teamId,
      pipelineId: raw.pipelineId,
      period: raw.period,
      from: raw.from,
      to: raw.to,
      channel: raw.channel,
      source: raw.source,
      channelId,
      allowedPipelineIds,
      viewerRole: user.role,
      viewerId: user.id,
    };
  }

  async filterOptions(
    organizationId: string,
    user: AuthenticatedUser,
    allowedPromise: Promise<string[] | null>,
  ) {
    const allowed = await allowedPromise;
    const [pipelines, teams, users, channels, organization] = await Promise.all([
      this.prisma.pipeline.findMany({
        where: {
          organizationId,
          deletedAt: null,
          archived: false,
          ...(allowed ? { id: { in: allowed } } : {}),
        },
        select: { id: true, name: true },
        orderBy: { position: "asc" },
      }),
      user.role === "ADMIN"
        ? this.prisma.team.findMany({
            where: { organizationId, deletedAt: null },
            select: { id: true, name: true },
            orderBy: { name: "asc" },
          })
        : user.teamId
          ? this.prisma.team.findMany({
              where: { id: user.teamId, organizationId, deletedAt: null },
              select: { id: true, name: true },
            })
          : [],
      this.prisma.user.findMany({
        where: {
          organizationId,
          deletedAt: null,
          status: "ACTIVE",
          ...(user.role === "ADMIN"
            ? {}
            : user.role === "MANAGER" && user.teamId
              ? { teamId: user.teamId }
              : { id: user.id }),
        },
        select: { id: true, name: true, teamId: true },
        orderBy: { name: "asc" },
      }),
      this.prisma.channel.findMany({
        where: {
          organizationId,
          deletedAt: null,
          isActive: true,
          ...(user.role === "ADMIN"
            ? {}
            : {
                OR: [
                  { accessMode: "ORGANIZATION" },
                  { accessMode: "PERSONAL", ownerUserId: user.id },
                  {
                    accessMode: "PIPELINE",
                    pipelineConnections: {
                      some: { active: true, deletedAt: null, pipelineId: { in: allowed ?? [] } },
                    },
                  },
                ],
              }),
        },
        select: { id: true, name: true, displayName: true, accessMode: true },
        orderBy: { name: "asc" },
      }),
      this.prisma.organization.findUnique({
        where: { id: organizationId },
        select: { timezone: true, currency: true },
      }),
    ]);
    return {
      pipelines,
      teams,
      users,
      channels,
      timezone: organization?.timezone ?? "UTC",
      currency: organization?.currency ?? "BRL",
    };
  }

  async metrics(organizationId: string, filters: DashboardFilters = {}) {
    const { start, end, prevStart, prevEnd } = resolvePeriod(
      filters.period,
      filters.from,
      filters.to,
    );
    const dealScope = this.dealScope(organizationId, filters);
    const threeDaysAgo = new Date(Date.now() - 3 * 86_400_000);
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);

    const paymentStages = (
      await this.prisma.pipelineStage.findMany({
        where: {
          organizationId,
          ...notDeleted,
          ...(filters.pipelineId ? { pipelineId: filters.pipelineId } : {}),
          OR: [
            { name: { contains: "pagament", mode: "insensitive" } },
            { name: { contains: "fechament", mode: "insensitive" } },
            { name: { contains: "proposta", mode: "insensitive" } },
          ],
        },
        select: { id: true, name: true, pipelineId: true },
      })
    ).filter((s) => /pagament/i.test(s.name));
    const paymentStageIds = paymentStages.map((s) => s.id);
    const primaryPaymentStage = paymentStages[0] ?? null;

    const goalUserWhere = {
      organizationId,
      ...notDeleted,
      status: "ACTIVE" as const,
      ...(filters.ownerId ? { id: filters.ownerId } : {}),
      ...(filters.teamId ? { teamId: filters.teamId } : {}),
    };

    const staleTrackingBefore = new Date(Date.now() - TRACKING_STALE_DAYS * 86_400_000);

    const [
      openDeals,
      pipelineAgg,
      awaitingPaymentAgg,
      awaitingPaymentCount,
      wonInPeriod,
      wonPrevPeriod,
      lostInPeriod,
      lostPrevPeriod,
      revenueAgg,
      revenuePrevAgg,
      monthlyGoalAgg,
      tasksToday,
      overdueTasks,
      waitingConversationsCount,
      unreadConversations,
      stalledDeals,
      repurchaseReady,
      afterSalesOpen,
      afterSalesCritical,
      ordersInProgress,
      ordersDelayedCandidates,
      ordersStaleTracking,
      atRiskCustomers,
      reactivationInProgress,
      pendingPayments,
    ] = await Promise.all([
      this.prisma.deal.count({ where: { ...dealScope, status: "OPEN" } }),
      this.prisma.deal.aggregate({
        where: { ...dealScope, status: "OPEN" },
        _sum: { value: true },
      }),
      this.prisma.deal.aggregate({
        where: {
          ...dealScope,
          status: "OPEN",
          ...(paymentStageIds.length
            ? { stageId: { in: paymentStageIds } }
            : { stage: { name: { contains: "pagament", mode: "insensitive" } } }),
        },
        _sum: { value: true },
        _count: true,
      }),
      this.prisma.deal.count({
        where: {
          ...dealScope,
          status: "OPEN",
          ...(paymentStageIds.length
            ? { stageId: { in: paymentStageIds } }
            : { stage: { name: { contains: "pagament", mode: "insensitive" } } }),
        },
      }),
      this.prisma.deal.count({
        where: {
          ...dealScope,
          status: "WON",
          closedAt: { gte: start, lte: end },
        },
      }),
      this.prisma.deal.count({
        where: {
          ...dealScope,
          status: "WON",
          closedAt: { gte: prevStart, lt: prevEnd },
        },
      }),
      this.prisma.deal.count({
        where: {
          ...dealScope,
          status: "LOST",
          closedAt: { gte: start, lte: end },
        },
      }),
      this.prisma.deal.count({
        where: {
          ...dealScope,
          status: "LOST",
          closedAt: { gte: prevStart, lt: prevEnd },
        },
      }),
      this.prisma.order.aggregate({
        where: {
          organizationId,
          ...notDeleted,
          status: { in: ["PAYMENT_APPROVED", "DELIVERED", "COMPLETED", "NATIONAL_TRANSPORT"] },
          orderedAt: { gte: start, lte: end },
          ...(filters.ownerId ? { ownerId: filters.ownerId } : {}),
          ...(filters.channel ? { channel: filters.channel } : {}),
        },
        _sum: { finalValue: true },
        _avg: { finalValue: true },
        _count: true,
      }),
      this.prisma.order.aggregate({
        where: {
          organizationId,
          ...notDeleted,
          status: { in: ["PAYMENT_APPROVED", "DELIVERED", "COMPLETED", "NATIONAL_TRANSPORT"] },
          orderedAt: { gte: prevStart, lt: prevEnd },
          ...(filters.ownerId ? { ownerId: filters.ownerId } : {}),
          ...(filters.channel ? { channel: filters.channel } : {}),
        },
        _sum: { finalValue: true },
      }),
      this.prisma.user.aggregate({
        where: goalUserWhere,
        _sum: { monthlyGoal: true },
      }),
      this.prisma.task.count({
        where: {
          organizationId,
          ...notDeleted,
          status: { in: ["PENDING", "IN_PROGRESS"] },
          dueAt: { gte: startOfDay, lt: new Date(startOfDay.getTime() + 86_400_000) },
          ...(filters.ownerId ? { assigneeId: filters.ownerId } : {}),
        },
      }),
      this.prisma.task.count({
        where: {
          organizationId,
          ...notDeleted,
          status: { in: ["PENDING", "IN_PROGRESS"] },
          dueAt: { lt: startOfDay },
          ...(filters.ownerId ? { assigneeId: filters.ownerId } : {}),
        },
      }),
      this.countAwaitingReplyConversations(organizationId, filters.ownerId),
      this.prisma.conversation.count({
        where: {
          organizationId,
          ...notDeleted,
          status: "OPEN",
          unreadCount: { gt: 0 },
          ...(filters.ownerId ? { assigneeId: filters.ownerId } : {}),
        },
      }),
      this.prisma.deal.count({
        where: {
          ...dealScope,
          status: "OPEN",
          OR: [
            { lastInteractionAt: { lt: threeDaysAgo } },
            { AND: [{ lastInteractionAt: null }, { updatedAt: { lt: threeDaysAgo } }] },
          ],
        },
      }),
      this.prisma.contact.count({
        where: {
          organizationId,
          ...notDeleted,
          ...repurchaseReadyPrismaFilter(),
        },
      }),
      this.prisma.occurrence.count({
        where: {
          organizationId,
          ...notDeleted,
          status: { in: ["OPEN", "UNDER_REVIEW", "AWAITING_CUSTOMER"] },
        },
      }),
      this.prisma.occurrence.count({
        where: {
          organizationId,
          ...notDeleted,
          status: { in: ["OPEN", "UNDER_REVIEW"] },
          priority: { in: ["HIGH", "URGENT"] },
        },
      }),
      this.prisma.order.count({
        where: {
          organizationId,
          ...notDeleted,
          status: { in: [...IN_TRANSIT_ORDER_STATUSES] },
        },
      }),
      this.prisma.order.findMany({
        where: {
          organizationId,
          ...notDeleted,
          status: { in: [...IN_TRANSIT_ORDER_STATUSES] },
        },
        select: {
          expectedAt: true,
          shipments: {
            where: { ...notDeleted },
            select: { expectedAt: true },
            orderBy: { updatedAt: "desc" },
            take: 1,
          },
        },
        take: 500,
      }),
      this.prisma.order.count({
        where: {
          organizationId,
          ...notDeleted,
          status: { in: [...IN_TRANSIT_ORDER_STATUSES] },
          OR: [
            { updatedAt: { lt: staleTrackingBefore } },
            {
              shipments: {
                some: {
                  ...notDeleted,
                  updatedAt: { lt: staleTrackingBefore },
                },
              },
            },
          ],
        },
      }),
      this.prisma.contact.count({
        where: {
          organizationId,
          ...notDeleted,
          OR: [
            { status: "INACTIVE" },
            { daysWithoutPurchase: { gte: REACTIVATION_INACTIVE_MIN_DAYS } },
          ],
        },
      }),
      this.prisma.lifecycleAction.count({
        where: {
          organizationId,
          kind: "REACTIVATION",
          action: { in: ["APPROACHED", "POSTPONED"] },
        },
      }),
      this.prisma.payment.count({
        where: { status: "PENDING", order: { organizationId, ...notDeleted } },
      }),
    ]);

    const revenue = decimal(revenueAgg._sum.finalValue);
    const revenuePrev = decimal(revenuePrevAgg._sum.finalValue);
    const revenueDeltaPct =
      revenuePrev > 0 ? Math.round(((revenue - revenuePrev) / revenuePrev) * 1000) / 10 : null;
    const rawGoal = decimal(monthlyGoalAgg._sum.monthlyGoal);
    const monthlyGoal = rawGoal > 0 ? rawGoal : null;
    const monthlyGoalProgress =
      monthlyGoal != null ? Math.round((revenue / monthlyGoal) * 1000) / 10 : null;
    const conversionRate = closedDealConversionRate(wonInPeriod, lostInPeriod);
    const conversionPrev = closedDealConversionRate(wonPrevPeriod, lostPrevPeriod);
    const conversionDenominator = wonInPeriod + lostInPeriod;
    const ordersDelayed = aggregateDelayedCount(
      ordersDelayedCandidates.map((order) => ({
        expectedAt: order.expectedAt ?? order.shipments[0]?.expectedAt ?? null,
      })),
    );

    return {
      // Legacy aliases (keep existing FE/API consumers working)
      openDeals,
      pipelineValue: decimal(pipelineAgg._sum.value),
      tasksToday,
      unreadConversations,
      unansweredLeads: waitingConversationsCount,
      waitingConversations: waitingConversationsCount,
      ordersInTransit: ordersInProgress,
      ordersInProgress,
      repurchaseReady,
      repurchaseReadyRule: repurchaseReadyDescription(),
      afterSalesOpen,
      conversionRate,
      pendingPayments,
      salesCount: revenueAgg._count,
      revenue,
      averageTicket: decimal(revenueAgg._avg.finalValue),
      overdueTasks,
      atRiskCustomers,
      avgFirstResponseMinutes: null as number | null,

      // Decision-center KPIs
      confirmedRevenue: revenue,
      confirmedRevenueDeltaPct: revenueDeltaPct,
      negotiatingValue: decimal(pipelineAgg._sum.value),
      awaitingPaymentValue: decimal(awaitingPaymentAgg._sum.value),
      awaitingPaymentCount,
      awaitingPaymentStageId: primaryPaymentStage?.id ?? null,
      awaitingPaymentPipelineId: primaryPaymentStage?.pipelineId ?? null,
      conversionDeltaPp: closedDealConversionDeltaPp(conversionRate, conversionPrev),
      monthlyGoal,
      monthlyGoalProgress,
      wonInPeriod,
      lostInPeriod,
      conversionDenominator,
      stalledDeals,
      afterSalesCritical,
      ordersDelayed,
      ordersStaleTracking,
      reactivationInProgress,
      newLeads: wonInPeriod + lostInPeriod,
    };
  }

  async charts(organizationId: string, filters: DashboardFilters = {}) {
    const { start, end } = resolvePeriod(filters.period, filters.from, filters.to);
    const dealScope = this.dealScope(organizationId, filters);

    const defaultPipeline = filters.pipelineId
      ? null
      : await this.prisma.pipeline.findFirst({
          where: { organizationId, ...notDeleted, isDefault: true },
          select: { id: true },
        });
    const pipelineId = filters.pipelineId ?? defaultPipeline?.id;

    const stages = pipelineId
      ? await this.prisma.pipelineStage.findMany({
          where: { organizationId, pipelineId, ...notDeleted, archived: false },
          orderBy: { position: "asc" },
          include: {
            deals: {
              where: { ...notDeleted, status: "OPEN" },
              select: { value: true },
            },
          },
        })
      : [];

    const funnelStages = stages.map((stage, index) => {
      const count = stage.deals.length;
      const value = stage.deals.reduce((sum, d) => sum + decimal(d.value), 0);
      const prevCount = index === 0 ? count : stages[index - 1].deals.length;
      const conversionFromPrevious =
        index === 0 ? 100 : prevCount > 0 ? Math.round((count / prevCount) * 1000) / 10 : 0;
      return {
        id: stage.id,
        label: stage.name,
        count,
        value,
        conversionFromPrevious,
        pipelineId: stage.pipelineId,
      };
    });

    const maxCount = Math.max(...funnelStages.map((s) => s.count), 1);
    const funnel = funnelStages.map((s) => ({
      ...s,
      barWidthPct: Math.max(8, Math.round((s.count / maxCount) * 100)),
    }));

    const wonDeals = await this.prisma.deal.findMany({
      where: { ...dealScope, status: "WON", closedAt: { gte: start, lte: end } },
      select: { value: true, closedAt: true, createdAt: true },
    });
    const lostAgg = await this.prisma.deal.aggregate({
      where: { ...dealScope, status: "LOST", closedAt: { gte: start, lte: end } },
      _sum: { value: true },
    });
    const avgCloseDays =
      wonDeals.length > 0
        ? Math.round(
            (wonDeals.reduce((sum, d) => {
              const closed = d.closedAt ?? end;
              return sum + (closed.getTime() - d.createdAt.getTime()) / 86_400_000;
            }, 0) /
              wonDeals.length) *
              10,
          ) / 10
        : null;
    const ticketMedio =
      wonDeals.length > 0
        ? Math.round(
            (wonDeals.reduce((sum, d) => sum + decimal(d.value), 0) / wonDeals.length) * 100,
          ) / 100
        : 0;

    const orders = await this.prisma.order.findMany({
      where: {
        organizationId,
        ...notDeleted,
        orderedAt: { gte: start, lte: end },
        status: { in: ["PAYMENT_APPROVED", "DELIVERED", "COMPLETED", "NATIONAL_TRANSPORT"] },
      },
      select: { finalValue: true, orderedAt: true, channel: true },
      take: 500,
    });

    const dayCount = Math.min(
      14,
      Math.max(7, Math.ceil((end.getTime() - start.getTime()) / 86_400_000)),
    );
    const revenueByPeriod = Array.from({ length: dayCount }).map((_, i) => {
      const day = new Date(end);
      day.setUTCDate(day.getUTCDate() - (dayCount - 1 - i));
      const key = day.toISOString().slice(0, 10);
      const value = orders
        .filter((o) => o.orderedAt.toISOString().slice(0, 10) === key)
        .reduce((sum, o) => sum + decimal(o.finalValue), 0);
      return { label: key.slice(5), value };
    });

    const contacts = await this.prisma.contact.findMany({
      where: { organizationId, ...notDeleted, createdAt: { gte: start, lte: end } },
      select: { source: true },
      take: 500,
    });

    const channelMap = new Map<string, { revenue: number; sales: number; leads: number }>();
    for (const order of orders) {
      const key = order.channel || "Outros";
      const current = channelMap.get(key) ?? { revenue: 0, sales: 0, leads: 0 };
      current.revenue += decimal(order.finalValue);
      current.sales += 1;
      channelMap.set(key, current);
    }
    for (const contact of contacts) {
      const key = contact.source || "Outros";
      const current = channelMap.get(key) ?? { revenue: 0, sales: 0, leads: 0 };
      current.leads += 1;
      channelMap.set(key, current);
    }

    const totalChannelRevenue = [...channelMap.values()].reduce((s, c) => s + c.revenue, 0);
    const channelPerformance = [...channelMap.entries()]
      .map(([label, stats]) => ({
        label,
        revenue: stats.revenue,
        sales: stats.sales,
        leads: stats.leads,
        conversionRate:
          stats.leads > 0 ? Math.round((stats.sales / stats.leads) * 1000) / 10 : null,
        sharePct:
          totalChannelRevenue > 0
            ? Math.round((stats.revenue / totalChannelRevenue) * 1000) / 10
            : 0,
        avgFirstResponseMinutes: null as number | null,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    const owners = await this.prisma.user.findMany({
      where: {
        organizationId,
        ...notDeleted,
        status: "ACTIVE",
        authRole: { in: ["ADMIN", "MANAGER", "CONSULTANT"] },
      },
      select: { id: true, name: true },
      take: 20,
    });

    const openDeals = await this.prisma.deal.findMany({
      where: { organizationId, ...notDeleted, status: "OPEN" },
      select: { ownerId: true, value: true, status: true },
      take: 500,
    });
    const wonByOwner = await this.prisma.deal.groupBy({
      by: ["ownerId"],
      where: {
        organizationId,
        ...notDeleted,
        status: "WON",
        closedAt: { gte: start, lte: end },
      },
      _count: true,
      _sum: { value: true },
    });
    const lostByOwner = await this.prisma.deal.groupBy({
      by: ["ownerId"],
      where: {
        organizationId,
        ...notDeleted,
        status: "LOST",
        closedAt: { gte: start, lte: end },
      },
      _count: true,
    });
    const overdueByOwner = await this.prisma.task.groupBy({
      by: ["assigneeId"],
      where: {
        organizationId,
        ...notDeleted,
        status: { in: ["PENDING", "IN_PROGRESS"] },
        dueAt: { lt: startOfDaySafe() },
      },
      _count: true,
    });
    const waitingByOwnerRows = await this.listAwaitingReplyConversations(
      organizationId,
      undefined,
      500,
    );
    const waitingByOwner = new Map<string, number>();
    for (const row of waitingByOwnerRows) {
      if (!row.assigneeId) continue;
      waitingByOwner.set(row.assigneeId, (waitingByOwner.get(row.assigneeId) ?? 0) + 1);
    }

    const performanceByOwner = owners.map((owner) => {
      const won = wonByOwner.find((w) => w.ownerId === owner.id);
      const lost = lostByOwner.find((w) => w.ownerId === owner.id);
      const open = openDeals.filter((d) => d.ownerId === owner.id);
      const overdue = overdueByOwner.find((o) => o.assigneeId === owner.id)?._count ?? 0;
      const waiting = waitingByOwner.get(owner.id) ?? 0;
      const wonCount = won?._count ?? 0;
      const lostCount = lost?._count ?? 0;
      const revenue = decimal(won?._sum.value);
      return {
        id: owner.id,
        name: owner.name,
        openDeals: open.length,
        revenue,
        conversionRate: closedDealConversionRate(wonCount, lostCount),
        averageTicket: wonCount > 0 ? Math.round((revenue / wonCount) * 100) / 100 : 0,
        overdueTasks: overdue,
        waitingConversations: waiting,
      };
    });

    // Legacy chart shapes
    const dealsByStage = funnel.map((s) => ({ label: s.label, value: s.count }));
    const revenueTrend = revenueByPeriod;
    const salesByChannel = channelPerformance.map((c) => ({
      label: c.label,
      value: c.revenue,
    }));

    return {
      funnel,
      funnelStats: {
        avgCloseDays,
        averageTicket: ticketMedio,
        lostValue: decimal(lostAgg._sum.value),
      },
      revenueByPeriod,
      revenueTrend,
      channelPerformance,
      salesByChannel,
      channelMix: salesByChannel,
      dealsByStage,
      pipelineByStage: dealsByStage,
      performanceByOwner,
      leadsBySource: Object.entries(
        contacts.reduce<Record<string, number>>((acc, c) => {
          const s = c.source || "Outros";
          acc[s] = (acc[s] ?? 0) + 1;
          return acc;
        }, {}),
      ).map(([label, value]) => ({ label, value })),
    };
  }

  async lists(organizationId: string, filters: DashboardFilters = {}): Promise<unknown> {
    const startOfDay = startOfDaySafe();
    const threeDaysAgo = new Date(Date.now() - 3 * 86_400_000);
    const dealScope = this.dealScope(organizationId, filters);

    const [
      tasksToday,
      overdueTasks,
      unread,
      waitingConversations,
      actionDeals,
      afterSales,
      pendingPayments,
      journeys,
    ] = await Promise.all([
      this.prisma.task.findMany({
        where: {
          organizationId,
          ...notDeleted,
          status: { in: ["PENDING", "IN_PROGRESS"] },
          dueAt: {
            gte: startOfDay,
            lt: new Date(startOfDay.getTime() + 86_400_000),
          },
          ...(filters.ownerId ? { assigneeId: filters.ownerId } : {}),
        },
        include: {
          contact: true,
          assignee: true,
          deal: { select: { id: true, name: true, pipelineId: true } },
        },
        orderBy: { dueAt: "asc" },
        take: 12,
      }),
      this.prisma.task.findMany({
        where: {
          organizationId,
          ...notDeleted,
          status: { in: ["PENDING", "IN_PROGRESS"] },
          dueAt: { lt: startOfDay },
          ...(filters.ownerId ? { assigneeId: filters.ownerId } : {}),
        },
        include: {
          contact: true,
          assignee: true,
          deal: { select: { id: true, name: true, pipelineId: true } },
        },
        orderBy: { dueAt: "asc" },
        take: 12,
      }),
      this.prisma.conversation.findMany({
        where: {
          organizationId,
          ...notDeleted,
          status: "OPEN",
          unreadCount: { gt: 0 },
          ...(filters.ownerId ? { assigneeId: filters.ownerId } : {}),
        },
        include: {
          contact: true,
          assignee: true,
          channel: { select: { id: true, name: true, type: true } },
          messages: {
            where: { ...notDeleted, isInternal: false },
            orderBy: { sentAt: "desc" },
            take: 1,
            select: { body: true, sentAt: true, direction: true },
          },
        },
        orderBy: { lastMessageAt: "asc" },
        take: 10,
      }),
      this.listAwaitingReplyConversations(organizationId, filters.ownerId, 10),
      this.prisma.deal.findMany({
        where: {
          ...dealScope,
          status: "OPEN",
          OR: [
            { lastInteractionAt: { lt: threeDaysAgo } },
            { AND: [{ lastInteractionAt: null }, { updatedAt: { lt: threeDaysAgo } }] },
            { nextTaskAt: null },
            { unreadMessages: { gt: 0 } },
          ],
        },
        include: {
          contact: true,
          stage: true,
          pipeline: { select: { id: true, name: true } },
          owner: { select: { id: true, name: true } },
        },
        orderBy: [{ value: "desc" }, { updatedAt: "asc" }],
        take: 12,
      }),
      this.prisma.occurrence.findMany({
        where: {
          organizationId,
          ...notDeleted,
          status: { in: ["OPEN", "UNDER_REVIEW", "AWAITING_CUSTOMER"] },
        },
        include: { contact: true },
        take: 10,
      }),
      this.prisma.payment.findMany({
        where: { status: "PENDING", order: { organizationId, ...notDeleted } },
        include: { order: { include: { contact: true } } },
        take: 10,
      }),
      this.buildJourneySummaries(organizationId),
    ]);

    const recentDeals = actionDeals;

    return {
      tasksToday,
      overdueTasks,
      unread,
      waitingConversations,
      recentDeals,
      dealsRequiringAction: actionDeals.map((deal) => {
        const reference = deal.lastInteractionAt ?? deal.updatedAt;
        const idleDays = Math.max(0, Math.floor((Date.now() - reference.getTime()) / 86_400_000));
        let reason = "Sem próxima atividade";
        if (deal.unreadMessages > 0) reason = "Cliente aguardando retorno";
        else if (idleDays >= 3) reason = `Parado há ${idleDays} dias`;
        else if (!deal.nextTaskAt) reason = "Sem próxima tarefa";
        const priority =
          idleDays >= 5 || Number(deal.value) >= 5000 ? "HIGH" : idleDays >= 3 ? "MEDIUM" : "LOW";
        return {
          ...deal,
          idleDays,
          reason,
          actionPriority: priority,
        };
      }),
      afterSales,
      pendingPayments,
      journeys,
    };
  }

  async overview(organizationId: string, filters: DashboardFilters) {
    const [metrics, charts, lists] = await Promise.all([
      this.metrics(organizationId, filters),
      this.charts(organizationId, filters),
      this.lists(organizationId, filters),
    ]);
    return {
      metrics,
      pipelines: charts.pipelineByStage,
      topSellers: charts.performanceByOwner.slice(0, 3),
      revenueByPeriod: charts.revenueByPeriod,
      channelPerformance: charts.channelPerformance,
      lists,
    };
  }

  async commercial(organizationId: string, filters: DashboardFilters) {
    const [metrics, charts] = await Promise.all([
      this.metrics(organizationId, filters),
      this.charts(organizationId, filters),
    ]);
    return {
      metrics,
      funnel: charts.funnel,
      funnelStats: charts.funnelStats,
      revenueByPeriod: charts.revenueByPeriod,
      availability: {
        stageEntries: "READY",
        stageConversion: "TRACKING_FROM_NOW",
        historicalSellerAttribution: "NOT_SUPPORTED",
        postSaleRate: "TRACKING_FROM_NOW",
      },
    };
  }

  async attendance(organizationId: string, filters: DashboardFilters) {
    const { start, end } = resolvePeriod(filters.period, filters.from, filters.to);
    const conversations = await this.prisma.conversation.findMany({
      where: {
        organizationId,
        deletedAt: null,
        createdAt: { gte: start, lt: end },
        ...(filters.ownerId ? { assigneeId: filters.ownerId } : {}),
        ...(filters.channelId ? { channelId: filters.channelId } : {}),
        ...(filters.pipelineId
          ? { deal: { pipelineId: filters.pipelineId } }
          : filters.allowedPipelineIds
            ? { OR: [{ deal: { pipelineId: { in: filters.allowedPipelineIds } } }, { deal: null }] }
            : {}),
      },
      select: {
        id: true,
        status: true,
        unreadCount: true,
        messages: {
          where: { deletedAt: null, isInternal: false, sentAt: { gte: start, lt: end } },
          orderBy: { sentAt: "asc" },
          select: { direction: true, sentAt: true },
        },
      },
      take: 2000,
    });
    const episodes = conversations.flatMap((conversation) =>
      responseEpisodes(conversation.messages),
    );
    const response = responseSummary(episodes);
    const initiatedByTeam = conversations.filter(
      (item) => item.messages[0]?.direction === "OUTBOUND",
    ).length;
    const initiatedByCustomer = conversations.filter(
      (item) => item.messages[0]?.direction === "INBOUND",
    ).length;
    const waitingOurResponse = conversations.filter(
      (item) => item.status === "OPEN" && item.messages.at(-1)?.direction === "INBOUND",
    ).length;
    const waitingCustomer = conversations.filter(
      (item) => item.status === "OPEN" && item.messages.at(-1)?.direction === "OUTBOUND",
    ).length;
    return {
      conversations: conversations.length,
      waitingOurResponse,
      waitingCustomer,
      unread: conversations.reduce((sum, item) => sum + item.unreadCount, 0),
      initiatedByTeam,
      initiatedByCustomer,
      ...response,
      sla: {
        under5: episodes.filter((value) => value <= 5).length,
        under15: episodes.filter((value) => value > 5 && value <= 15).length,
        under60: episodes.filter((value) => value > 15 && value <= 60).length,
        over60: episodes.filter((value) => value > 60).length,
      },
      availability: {
        providerDeliverySla: "BLOCKED_PROVIDER",
        approachConversion: "TRACKING_FROM_NOW",
      },
    };
  }

  async team(organizationId: string, filters: DashboardFilters) {
    const charts = await this.charts(organizationId, filters);
    const allowed = charts.performanceByOwner
      .filter((row) => !filters.ownerId || row.id === filters.ownerId)
      .sort((a, b) => b.revenue - a.revenue || a.name.localeCompare(b.name));
    return {
      podium: allowed.slice(0, 3),
      ranking: allowed,
      attribution: "Deal.ownerId at query time",
      availability: { historicalResponsible: "NOT_SUPPORTED", goals: "READY" },
    };
  }

  async customers(organizationId: string, filters: DashboardFilters) {
    const { start, end } = resolvePeriod(filters.period, filters.from, filters.to);
    const orders = await this.prisma.order.findMany({
      where: {
        organizationId,
        deletedAt: null,
        orderedAt: { gte: start, lt: end },
        status: { in: ["PAYMENT_APPROVED", "DELIVERED", "COMPLETED", "NATIONAL_TRANSPORT"] },
        ...(filters.ownerId ? { ownerId: filters.ownerId } : {}),
        ...(filters.pipelineId
          ? { deal: { pipelineId: filters.pipelineId } }
          : filters.allowedPipelineIds
            ? {
                OR: [
                  { deal: { pipelineId: { in: filters.allowedPipelineIds } } },
                  { dealId: null },
                ],
              }
            : {}),
      },
      select: {
        id: true,
        finalValue: true,
        isFirstPurchase: true,
        purchaseOrdinal: true,
        contact: {
          select: { tags: { select: { tag: { select: { id: true, name: true, color: true } } } } },
        },
      },
      take: 5000,
    });
    const first = orders.filter(
      (order) => order.isFirstPurchase === true || order.purchaseOrdinal === 1,
    );
    const recurring = orders.filter(
      (order) => order.isFirstPurchase === false || (order.purchaseOrdinal ?? 0) > 1,
    );
    const sum = (rows: typeof orders) =>
      rows.reduce((total, order) => total + decimal(order.finalValue), 0);
    const tags = new Map<
      string,
      { id: string; name: string; color: string; orders: number; revenue: number }
    >();
    for (const order of orders)
      for (const relation of order.contact?.tags ?? []) {
        const tag = relation.tag;
        const current = tags.get(tag.id) ?? { ...tag, orders: 0, revenue: 0 };
        current.orders += 1;
        current.revenue += decimal(order.finalValue);
        tags.set(tag.id, current);
      }
    return {
      newCustomers: first.length,
      recurringCustomers: recurring.length,
      newRevenue: sum(first),
      recurringRevenue: sum(recurring),
      newTicket: first.length ? sum(first) / first.length : null,
      recurringTicket: recurring.length ? sum(recurring) / recurring.length : null,
      tags: [...tags.values()].sort((a, b) => b.revenue - a.revenue),
      availability: { customerClassification: "READY", averagePurchaseInterval: "NOT_SUPPORTED" },
    };
  }

  async channels(organizationId: string, filters: DashboardFilters) {
    const charts = await this.charts(organizationId, filters);
    const attendance = await this.attendance(organizationId, filters);
    return {
      ranking:
        filters.viewerRole === "ADMIN"
          ? charts.channelPerformance
          : filters.channel
            ? charts.channelPerformance.filter((row) => row.label === filters.channel)
            : [],
      selectedChannelAttendance: filters.channel ? attendance : null,
      availability: {
        conversationChannel: "READY",
        orderChannelSnapshot: "READY",
        firstTouchAttribution: "TRACKING_FROM_NOW",
        providerCampaignDelivery: "BLOCKED_PROVIDER",
      },
    };
  }

  async explore(
    organizationId: string,
    filters: DashboardFilters,
    metric = "revenue",
    dimension = "seller",
  ) {
    const matrix: Record<string, string[]> = {
      revenue: ["seller", "channel", "pipeline", "tag", "customer_type"],
      orders: ["channel", "tag", "customer_type"],
      leads: ["channel", "pipeline"],
      conversion: ["seller", "channel"],
    };
    if (!matrix[metric]?.includes(dimension)) {
      throw new ForbiddenException("Combinação de métrica e dimensão não permitida.");
    }
    const [charts, customers] = await Promise.all([
      this.charts(organizationId, filters),
      dimension === "tag" || dimension === "customer_type"
        ? this.customers(organizationId, filters)
        : null,
    ]);
    let rows: Array<{ label: string; value: number | null }> = [];
    if (dimension === "seller")
      rows = charts.performanceByOwner.map((row) => ({
        label: row.name,
        value: metric === "conversion" ? row.conversionRate : row.revenue,
      }));
    if (dimension === "channel")
      rows = charts.channelPerformance.map((row) => ({
        label: row.label,
        value:
          metric === "orders"
            ? row.sales
            : metric === "leads"
              ? row.leads
              : metric === "conversion"
                ? row.conversionRate
                : row.revenue,
      }));
    if (dimension === "pipeline")
      rows = charts.pipelineByStage.map((row) => ({ label: row.label, value: row.value }));
    if (dimension === "tag")
      rows = (customers?.tags ?? []).map((row) => ({
        label: row.name,
        value: metric === "orders" ? row.orders : row.revenue,
      }));
    if (dimension === "customer_type" && customers)
      rows = [
        {
          label: "Novos",
          value: metric === "orders" ? customers.newCustomers : customers.newRevenue,
        },
        {
          label: "Recorrentes",
          value: metric === "orders" ? customers.recurringCustomers : customers.recurringRevenue,
        },
      ];
    return { metric, dimension, rows, matrix, availability: "READY" };
  }

  private async buildJourneySummaries(organizationId: string) {
    const staleTrackingBefore = new Date(Date.now() - TRACKING_STALE_DAYS * 86_400_000);
    const [
      repurchaseReady,
      inactive,
      afterSalesOpen,
      afterSalesCritical,
      ordersAwaiting,
      ordersInTransit,
      inTransitOrders,
      ordersStaleTracking,
    ] = await Promise.all([
      this.prisma.contact.count({
        where: {
          organizationId,
          ...notDeleted,
          ...repurchaseReadyPrismaFilter(),
        },
      }),
      this.prisma.contact.count({
        where: {
          organizationId,
          ...notDeleted,
          OR: [
            { status: "INACTIVE" },
            { daysWithoutPurchase: { gte: REACTIVATION_INACTIVE_MIN_DAYS } },
          ],
        },
      }),
      this.prisma.occurrence.count({
        where: {
          organizationId,
          ...notDeleted,
          status: { in: ["OPEN", "UNDER_REVIEW", "AWAITING_CUSTOMER"] },
        },
      }),
      this.prisma.occurrence.count({
        where: {
          organizationId,
          ...notDeleted,
          status: { in: ["OPEN", "UNDER_REVIEW"] },
          priority: { in: ["HIGH", "URGENT"] },
        },
      }),
      this.prisma.order.count({
        where: {
          organizationId,
          ...notDeleted,
          status: { in: ["PAYMENT_APPROVED", "SEPARATING", "IN_PRODUCTION"] },
        },
      }),
      this.prisma.order.count({
        where: {
          organizationId,
          ...notDeleted,
          status: { in: [...IN_TRANSIT_ORDER_STATUSES] },
        },
      }),
      this.prisma.order.findMany({
        where: {
          organizationId,
          ...notDeleted,
          status: { in: [...IN_TRANSIT_ORDER_STATUSES] },
        },
        select: {
          expectedAt: true,
          shipments: {
            where: { ...notDeleted },
            select: { expectedAt: true },
            orderBy: { updatedAt: "desc" },
            take: 1,
          },
        },
        take: 500,
      }),
      this.prisma.order.count({
        where: {
          organizationId,
          ...notDeleted,
          status: { in: [...IN_TRANSIT_ORDER_STATUSES] },
          updatedAt: { lt: staleTrackingBefore },
        },
      }),
    ]);

    let reactivationInProgress = 0;
    let reactivated = 0;
    try {
      reactivationInProgress = await this.prisma.lifecycleAction.count({
        where: {
          organizationId,
          kind: "REACTIVATION",
          action: { in: ["APPROACHED", "POSTPONED"] },
        },
      });
      reactivated = await this.prisma.lifecycleAction.count({
        where: { organizationId, kind: "REACTIVATION", action: "CONVERTED" },
      });
    } catch {
      // lifecycle queries are best-effort
    }

    const ordersDelayed = aggregateDelayedCount(
      inTransitOrders.map((order) => ({
        expectedAt: order.expectedAt ?? order.shipments[0]?.expectedAt ?? null,
      })),
    );

    return {
      repurchase: {
        ready: repurchaseReady,
        approached: null as number | null,
        completed: null as number | null,
        revenue: null as number | null,
        readyRule: repurchaseReadyDescription(),
        href: "/repurchase",
      },
      reactivation: {
        inactive,
        inProgress: reactivationInProgress,
        recovered: reactivated,
        revenue: null as number | null,
        href: "/reactivation",
      },
      afterSales: {
        open: afterSalesOpen,
        delayed: null as number | null,
        critical: afterSalesCritical,
        avgResolutionDays: null as number | null,
        href: "/after-sales",
      },
      ecommerce: {
        awaitingSeparation: ordersAwaiting,
        inTransit: ordersInTransit,
        delayed: ordersDelayed,
        missingTracking: ordersStaleTracking,
        staleTrackingLabel: `Sem atualização de rastreio há mais de ${TRACKING_STALE_DAYS} dias`,
        href: "/orders",
      },
    };
  }

  /**
   * Counts OPEN conversations whose latest non-internal message is INBOUND.
   * Relies on Message.direction (INBOUND/OUTBOUND). Unread count is ignored.
   */
  private async countAwaitingReplyConversations(
    organizationId: string,
    ownerId?: string,
  ): Promise<number> {
    const rows = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM "Conversation" c
      INNER JOIN LATERAL (
        SELECT m.direction
        FROM "Message" m
        WHERE m."conversationId" = c.id
          AND m."deletedAt" IS NULL
          AND m."isInternal" = false
        ORDER BY m."sentAt" DESC
        LIMIT 1
      ) last_msg ON true
      WHERE c."organizationId" = ${organizationId}
        AND c."deletedAt" IS NULL
        AND c.status = 'OPEN'
        AND last_msg.direction = 'INBOUND'
        ${ownerId ? Prisma.sql`AND c."assigneeId" = ${ownerId}` : Prisma.empty}
    `;
    return Number(rows[0]?.count ?? 0);
  }

  private async listAwaitingReplyConversations(
    organizationId: string,
    ownerId?: string,
    take = 10,
  ) {
    const idRows = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT c.id
      FROM "Conversation" c
      INNER JOIN LATERAL (
        SELECT m.direction
        FROM "Message" m
        WHERE m."conversationId" = c.id
          AND m."deletedAt" IS NULL
          AND m."isInternal" = false
        ORDER BY m."sentAt" DESC
        LIMIT 1
      ) last_msg ON true
      WHERE c."organizationId" = ${organizationId}
        AND c."deletedAt" IS NULL
        AND c.status = 'OPEN'
        AND last_msg.direction = 'INBOUND'
        ${ownerId ? Prisma.sql`AND c."assigneeId" = ${ownerId}` : Prisma.empty}
      ORDER BY c."lastMessageAt" ASC NULLS LAST
      LIMIT ${take}
    `;

    if (idRows.length === 0) return [];

    const conversations = await this.prisma.conversation.findMany({
      where: { id: { in: idRows.map((row) => row.id) }, ...notDeleted },
      include: {
        contact: true,
        assignee: true,
        channel: { select: { id: true, name: true, type: true } },
        messages: {
          where: { ...notDeleted, isInternal: false },
          orderBy: { sentAt: "desc" },
          take: 20,
          select: { body: true, sentAt: true, direction: true },
        },
      },
    });

    const byId = new Map(conversations.map((item) => [item.id, item]));
    return idRows
      .map((row) => byId.get(row.id))
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .map((conversation) => {
        const messages = conversation.messages ?? [];
        const last = messages[0];
        const awaiting = isConversationAwaitingReply({
          status: conversation.status,
          lastMessageDirection: last?.direction,
        });
        const hasPriorOutbound = messages.some((message) => message.direction === "OUTBOUND");
        const waitingKind = classifyWaitingKind(hasPriorOutbound);
        const waitingMinutes = last?.sentAt ? waitingMinutesSince(last.sentAt) : 0;
        return {
          ...conversation,
          lastMessagePreview: last?.body ?? null,
          lastMessageAt: last?.sentAt ?? conversation.lastMessageAt,
          awaitingReply: awaiting,
          waitingKind,
          waitingKindLabel: waitingKindLabel(waitingKind),
          waitingMinutes,
          waitingDurationLabel: formatWaitingDuration(waitingMinutes),
          lastClientMessageAt: last?.sentAt ?? null,
        };
      });
  }
}

function startOfDaySafe() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}
