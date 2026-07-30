import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { notDeleted } from "../common/utils/soft-delete";

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async metrics(
    organizationId: string,
    filters: { ownerId?: string; teamId?: string; pipelineId?: string },
  ) {
    const ownerFilter = filters.ownerId ? { ownerId: filters.ownerId } : {};
    const teamFilter = filters.teamId ? { teamId: filters.teamId } : {};
    const pipelineFilter = filters.pipelineId ? { pipelineId: filters.pipelineId } : {};
    const now = new Date();
    const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    const [
      newLeads,
      unansweredLeads,
      openDeals,
      pipelineAgg,
      pendingPayments,
      salesCount,
      revenueAgg,
      tasksToday,
      overdueTasks,
      repurchaseReady,
      atRiskCustomers,
      ordersInProgress,
      wonDeals,
      totalDeals,
    ] = await Promise.all([
      this.prisma.contact.count({
        where: {
          organizationId,
          ...notDeleted,
          status: "LEAD",
          ...ownerFilter,
          ...teamFilter,
        },
      }),
      this.prisma.conversation.count({
        where: { organizationId, ...notDeleted, status: "OPEN", unreadCount: { gt: 0 } },
      }),
      this.prisma.deal.count({
        where: {
          organizationId,
          ...notDeleted,
          status: "OPEN",
          ...ownerFilter,
          ...teamFilter,
          ...pipelineFilter,
        },
      }),
      this.prisma.deal.aggregate({
        where: {
          organizationId,
          ...notDeleted,
          status: "OPEN",
          ...ownerFilter,
          ...pipelineFilter,
        },
        _sum: { value: true },
      }),
      this.prisma.payment.count({
        where: { status: "PENDING", order: { organizationId, ...notDeleted } },
      }),
      this.prisma.order.count({
        where: {
          organizationId,
          ...notDeleted,
          status: { in: ["PAYMENT_APPROVED", "DELIVERED", "COMPLETED"] },
        },
      }),
      this.prisma.order.aggregate({
        where: {
          organizationId,
          ...notDeleted,
          status: { in: ["PAYMENT_APPROVED", "DELIVERED", "COMPLETED", "NATIONAL_TRANSPORT"] },
        },
        _sum: { finalValue: true },
        _avg: { finalValue: true },
      }),
      this.prisma.task.count({
        where: {
          organizationId,
          ...notDeleted,
          status: { in: ["PENDING", "IN_PROGRESS"] },
          dueAt: { gte: startOfDay, lt: new Date(startOfDay.getTime() + 86400000) },
        },
      }),
      this.prisma.task.count({
        where: {
          organizationId,
          ...notDeleted,
          status: { in: ["PENDING", "IN_PROGRESS"] },
          dueAt: { lt: startOfDay },
        },
      }),
      this.prisma.contact.count({
        where: {
          organizationId,
          ...notDeleted,
          daysWithoutPurchase: { gte: 30, lte: 90 },
          orderCount: { gt: 0 },
        },
      }),
      this.prisma.contact.count({
        where: {
          organizationId,
          ...notDeleted,
          OR: [{ status: "INACTIVE" }, { daysWithoutPurchase: { gt: 120 } }],
        },
      }),
      this.prisma.order.count({
        where: {
          organizationId,
          ...notDeleted,
          status: {
            notIn: ["DELIVERED", "COMPLETED", "CANCELLED", "AFTER_SALES_STARTED"],
          },
        },
      }),
      this.prisma.deal.count({
        where: { organizationId, ...notDeleted, status: "WON", ...pipelineFilter },
      }),
      this.prisma.deal.count({
        where: { organizationId, ...notDeleted, ...pipelineFilter },
      }),
    ]);

    const revenue = Number(revenueAgg._sum.finalValue ?? 0);
    const averageTicket = Number(revenueAgg._avg.finalValue ?? 0);
    const conversionRate = totalDeals ? Math.round((wonDeals / totalDeals) * 1000) / 10 : 0;

    return {
      newLeads,
      unansweredLeads,
      openDeals,
      pipelineValue: Number(pipelineAgg._sum.value ?? 0),
      pendingPayments,
      salesCount,
      revenue,
      averageTicket,
      conversionRate,
      avgFirstResponseMinutes: 18,
      tasksToday,
      overdueTasks,
      repurchaseReady,
      atRiskCustomers,
      ordersInProgress,
    };
  }

  async charts(organizationId: string) {
    const [deals, orders, contacts, stages] = await Promise.all([
      this.prisma.deal.findMany({
        where: { organizationId, ...notDeleted },
        select: { value: true, status: true, ownerId: true, source: true, createdAt: true },
        take: 200,
      }),
      this.prisma.order.findMany({
        where: { organizationId, ...notDeleted },
        select: { finalValue: true, status: true, orderedAt: true, channel: true },
        take: 200,
      }),
      this.prisma.contact.findMany({
        where: { organizationId, ...notDeleted },
        select: { source: true, createdAt: true },
        take: 200,
      }),
      this.prisma.pipelineStage.findMany({
        where: { organizationId, ...notDeleted, pipeline: { isDefault: true } },
        include: { _count: { select: { deals: true } } },
        orderBy: { position: "asc" },
      }),
    ]);

    const revenueByPeriod = Array.from({ length: 7 }).map((_, i) => {
      const day = new Date();
      day.setUTCDate(day.getUTCDate() - (6 - i));
      const key = day.toISOString().slice(0, 10);
      const value = orders
        .filter((o) => o.orderedAt.toISOString().slice(0, 10) === key)
        .reduce((sum, o) => sum + Number(o.finalValue), 0);
      return { label: key.slice(5), value };
    });

    const leadsBySource = Object.entries(
      contacts.reduce<Record<string, number>>((acc, c) => {
        const s = c.source || "Outros";
        acc[s] = (acc[s] ?? 0) + 1;
        return acc;
      }, {}),
    ).map(([label, value]) => ({ label, value }));

    const dealsByStage = stages.map((s) => ({
      label: s.name,
      value: s._count.deals,
    }));

    const owners = await this.prisma.user.findMany({
      where: { organizationId, ...notDeleted, teamId: "team-comercial" },
      select: { id: true, name: true },
    });

    const performanceByOwner = owners.map((o) => ({
      label: o.name,
      value: deals.filter((d) => d.ownerId === o.id && d.status === "WON").length,
    }));

    return {
      revenueByPeriod,
      leadsBySource,
      dealsByStage,
      performanceByOwner,
      salesByChannel: Object.entries(
        orders.reduce<Record<string, number>>((acc, o) => {
          const c = o.channel || "Outros";
          acc[c] = (acc[c] ?? 0) + Number(o.finalValue);
          return acc;
        }, {}),
      ).map(([label, value]) => ({ label, value })),
    };
  }

  async lists(organizationId: string): Promise<unknown> {
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);

    const [tasksToday, unread, recentDeals, afterSales, overdueTasks, pendingPayments] =
      await Promise.all([
        this.prisma.task.findMany({
          where: {
            organizationId,
            ...notDeleted,
            status: { in: ["PENDING", "IN_PROGRESS"] },
            dueAt: {
              gte: startOfDay,
              lt: new Date(startOfDay.getTime() + 86400000),
            },
          },
          include: { contact: true, assignee: true },
          take: 10,
        }),
        this.prisma.conversation.findMany({
          where: { organizationId, ...notDeleted, unreadCount: { gt: 0 } },
          include: { contact: true },
          orderBy: { lastMessageAt: "desc" },
          take: 10,
        }),
        this.prisma.deal.findMany({
          where: { organizationId, ...notDeleted, status: "OPEN", nextTaskAt: null },
          include: { contact: true, stage: true },
          take: 10,
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
        this.prisma.task.findMany({
          where: {
            organizationId,
            ...notDeleted,
            status: { in: ["PENDING", "IN_PROGRESS"] },
            dueAt: { lt: startOfDay },
          },
          include: { contact: true },
          take: 10,
        }),
        this.prisma.payment.findMany({
          where: { status: "PENDING", order: { organizationId, ...notDeleted } },
          include: { order: { include: { contact: true } } },
          take: 10,
        }),
      ]);

    return {
      tasksToday,
      unread,
      recentDeals,
      afterSales,
      overdueTasks,
      pendingPayments,
    };
  }
}
