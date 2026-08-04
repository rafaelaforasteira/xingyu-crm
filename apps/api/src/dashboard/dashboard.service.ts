import { Injectable } from "@nestjs/common";
import { Prisma } from "@xingyu/database";
import { PrismaService } from "../prisma/prisma.service";
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
    let customEnd = parseDayBound(to, true);
    if (customStart && customEnd) {
      if (customStart.getTime() > customEnd.getTime()) {
        const swap = customStart;
        customStart = parseDayBound(to, false)!;
        customEnd = parseDayBound(from, true)!;
      }
      const durationMs = Math.max(
        customEnd.getTime() - customStart.getTime(),
        86_400_000,
      );
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

    const staleTrackingBefore = new Date(
      Date.now() - TRACKING_STALE_DAYS * 86_400_000,
    );

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

    const channelMap = new Map<
      string,
      { revenue: number; sales: number; leads: number }
    >();
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
        const idleDays = Math.max(
          0,
          Math.floor((Date.now() - reference.getTime()) / 86_400_000),
        );
        let reason = "Sem próxima atividade";
        if (deal.unreadMessages > 0) reason = "Cliente aguardando retorno";
        else if (idleDays >= 3) reason = `Parado há ${idleDays} dias`;
        else if (!deal.nextTaskAt) reason = "Sem próxima tarefa";
        const priority =
          idleDays >= 5 || Number(deal.value) >= 5000
            ? "HIGH"
            : idleDays >= 3
              ? "MEDIUM"
              : "LOW";
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

  private async buildJourneySummaries(organizationId: string) {
    const staleTrackingBefore = new Date(
      Date.now() - TRACKING_STALE_DAYS * 86_400_000,
    );
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
        const waitingMinutes = last?.sentAt
          ? waitingMinutesSince(last.sentAt)
          : 0;
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
