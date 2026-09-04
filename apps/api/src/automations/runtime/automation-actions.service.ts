import { Injectable } from "@nestjs/common";
import { ActivityType, DealStatus, PipelineStageType, Prisma } from "@xingyu/database";
import { PrismaService } from "../../prisma/prisma.service";
import { ConnectionProviderRegistry } from "../../connections/providers/connection-provider.registry";
import { normalizePhone } from "../../common/phone-normalization";
import { interpolate, interpolateRecord } from "../domain/expressions";
import { asConditionGroup, evaluateGroup } from "../domain/conditions";
import { truncateJson } from "../domain/redaction";
import { safeFetch } from "../domain/ssrf";
import { AUTOMATION_LIMITS, DOMAIN_EVENT_TYPES } from "../domain/constants";
import { parseNodeType } from "../catalog/node-catalog";
import { DomainEventsService } from "./domain-events.service";

export interface ActionContext {
  organizationId: string;
  executionId: string;
  automationId: string;
  nodeId: string;
  dryRun: boolean;
  actorId?: string | null;
  context: Record<string, unknown>;
}

export interface ActionResult {
  output: Record<string, unknown>;
  simulated?: boolean;
  delayUntil?: Date;
  wait?: {
    eventType: string;
    subjectType?: string;
    subjectId?: string;
    timeoutAt?: Date;
    timeoutHandle: string;
  };
  stop?: "SUCCEEDED" | "FAILED" | "SKIPPED";
  error?: string;
  branch?: string;
}

@Injectable()
export class AutomationActionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly providers: ConnectionProviderRegistry,
    private readonly events: DomainEventsService,
  ) {}

  async execute(
    type: string,
    config: Record<string, unknown>,
    ctx: ActionContext,
  ): Promise<ActionResult> {
    const interpolated = interpolateRecord(config, ctx.context);
    const kind = parseNodeType(type).type;
    if (ctx.dryRun && this.isSideEffect(kind)) {
      return {
        output: { simulated: true, action: kind, config: interpolated },
        simulated: true,
        branch: "out",
      };
    }
    switch (kind) {
      case "logic.filter":
        return evaluateGroup(asConditionGroup(interpolated), ctx.context)
          ? { output: { matched: true }, branch: "out" }
          : { output: { matched: false }, stop: "SKIPPED" };
      case "logic.if": {
        const matched = evaluateGroup(asConditionGroup(interpolated), ctx.context);
        return { output: { matched }, branch: matched ? "true" : "false" };
      }
      case "logic.switch":
        return this.switchBranch(interpolated, ctx.context);
      case "logic.randomSplit":
        return this.randomSplit(interpolated);
      case "logic.merge":
        return { output: { merged: true }, branch: "out" };
      case "logic.stop":
        return { output: { stopped: true }, stop: "SUCCEEDED" };
      case "logic.stopError":
        return {
          output: { stopped: true },
          stop: "FAILED",
          error: String(interpolated.message ?? "Encerrado com erro pela automação."),
        };
      case "logic.delay":
        return {
          output: { delay: true },
          delayUntil: this.delayUntil(interpolated, ctx.context),
          branch: "out",
        };
      case "logic.waitForEvent":
        return this.waitForEvent(interpolated, ctx);
      case "logic.loop":
        return this.loop(interpolated, ctx.context);
      case "data.findContact":
        return this.findContact(interpolated, ctx);
      case "data.findDeal":
        return this.findDeal(interpolated, ctx);
      case "data.findOrder":
        return this.findOrder(interpolated, ctx);
      case "data.findDuplicates":
        return this.findDuplicates(interpolated, ctx);
      case "data.setVariable":
        return { output: { name: interpolated.name, value: interpolated.value }, branch: "out" };
      case "action.deal.moveStage":
        return this.moveStage(interpolated, ctx);
      case "action.deal.assignOwner":
        return this.assignOwner(interpolated, ctx);
      case "action.deal.assignRoundRobin":
        return this.assignRoundRobin(interpolated, ctx);
      case "action.deal.updateField":
        return this.updateDealField(interpolated, ctx);
      case "action.contact.updateField":
        return this.updateContactField(interpolated, ctx);
      case "action.deal.addTag":
        return this.addTag(interpolated, ctx);
      case "action.deal.removeTag":
        return this.removeTag(interpolated, ctx);
      case "action.task.create":
        return this.createTask(interpolated, ctx);
      case "action.note.create":
        return this.createNote(interpolated, ctx);
      case "action.order.updateStatus":
        return this.updateRelatedStatus(interpolated, ctx);
      case "action.notify.user":
        return this.notifyUser(interpolated, ctx);
      case "action.whatsapp.send":
        return this.sendWhatsApp(interpolated, ctx);
      case "action.http.request":
        return this.httpRequest(interpolated);
      default:
        if (kind.startsWith("trigger.") || kind.startsWith("visual.")) {
          return { output: { passthrough: true }, branch: "out" };
        }
        throw new Error(`Etapa não suportada: ${type}`);
    }
  }

  private isSideEffect(kind: string) {
    return kind.startsWith("action.");
  }

  private dealId(ctx: ActionContext, config: Record<string, unknown>) {
    return String(
      config.dealId ??
        this.path(ctx.context, "current.deal.id") ??
        this.path(ctx.context, "trigger.deal.id") ??
        "",
    );
  }

  private orderId(ctx: ActionContext, config: Record<string, unknown>) {
    return String(
      config.orderId ??
        this.path(ctx.context, "current.order.id") ??
        this.path(ctx.context, "trigger.order.id") ??
        "",
    );
  }

  private path(source: unknown, path: string) {
    return path
      .split(".")
      .reduce<unknown>(
        (acc, key) =>
          acc && typeof acc === "object" ? (acc as Record<string, unknown>)[key] : undefined,
        source,
      );
  }

  private switchBranch(
    config: Record<string, unknown>,
    context: Record<string, unknown>,
  ): ActionResult {
    const field = String(config.field ?? "");
    const actual = String(this.path(context, field) ?? "");
    const cases = Array.isArray(config.cases)
      ? (config.cases as Array<{ value: string; handle: string }>)
      : [];
    const match = cases.find((item) => String(item.value) === actual);
    return {
      output: { value: actual, handle: match?.handle ?? "default" },
      branch: match?.handle ?? "default",
    };
  }

  private randomSplit(config: Record<string, unknown>): ActionResult {
    const a = Number(config.percentA ?? 50);
    const roll = Math.random() * 100;
    const branch = roll < a ? "a" : "b";
    return { output: { roll, branch }, branch };
  }

  private delayUntil(config: Record<string, unknown>, context: Record<string, unknown>) {
    if (config.until) {
      const until = new Date(String(interpolate(config.until, context)));
      if (!Number.isNaN(until.getTime())) return until;
    }
    const minutes = Number(config.durationMinutes ?? 0);
    const hours = Number(config.durationHours ?? 0);
    const days = Number(config.durationDays ?? 0);
    const ms = ((days * 24 + hours) * 60 + minutes || 5) * 60_000;
    return new Date(Date.now() + ms);
  }

  private waitForEvent(config: Record<string, unknown>, ctx: ActionContext): ActionResult {
    const timeoutMinutes = Number(config.timeoutMinutes ?? 60);
    return {
      output: { waiting: true, eventType: config.eventType },
      wait: {
        eventType: String(config.eventType ?? ""),
        subjectType: config.subjectType ? String(config.subjectType) : undefined,
        subjectId: config.subjectId
          ? String(interpolate(config.subjectId, ctx.context))
          : String(this.path(ctx.context, "trigger.aggregateId") ?? ""),
        timeoutAt: new Date(Date.now() + Math.max(1, timeoutMinutes) * 60_000),
        timeoutHandle: "timeout",
      },
    };
  }

  private loop(config: Record<string, unknown>, context: Record<string, unknown>): ActionResult {
    const items = this.path(context, String(config.itemsPath ?? "nodes.prev.output.matches"));
    const list = Array.isArray(items) ? items.slice(0, AUTOMATION_LIMITS.maxLoopIterations) : [];
    return { output: { items: list, count: list.length }, branch: list.length ? "item" : "done" };
  }

  private async findContact(
    config: Record<string, unknown>,
    ctx: ActionContext,
  ): Promise<ActionResult> {
    const searchBy = String(config.searchBy ?? "");
    const searchValue = String(config.searchValue ?? "").trim();
    if (!["phone", "email", "contactId"].includes(searchBy) || !searchValue) {
      throw new Error("Configure como o contato deve ser buscado.");
    }
    const phone = searchBy === "phone" ? normalizePhone(searchValue) : null;
    const email = searchBy === "email" ? searchValue.toLowerCase() : null;
    const id = searchBy === "contactId" ? searchValue : null;
    const contacts = await this.prisma.contact.findMany({
      where: {
        organizationId: ctx.organizationId,
        deletedAt: null,
        ...(id ? { id } : {}),
        ...(phone || email
          ? {
              OR: [
                ...(phone ? [{ phone }, { whatsapp: phone }] : []),
                ...(email ? [{ email }] : []),
              ],
            }
          : {}),
      },
      orderBy: { createdAt: String(config.matchStrategy ?? "newest") === "oldest" ? "asc" : "desc" },
      take: 2,
    });
    if (contacts.length > 1 && config.matchStrategy === "error") {
      throw new Error("Mais de um contato corresponde à busca.");
    }
    const contact = contacts[0] ?? null;
    return {
      output: { found: Boolean(contact), contact },
      branch: contact ? "found" : "notFound",
    };
  }

  private async findDeal(
    config: Record<string, unknown>,
    ctx: ActionContext,
  ): Promise<ActionResult> {
    const searchBy = String(config.searchBy ?? "");
    const searchValue = String(config.searchValue ?? "").trim();
    if (!["dealId", "contactId"].includes(searchBy) || !searchValue) {
      throw new Error("Configure como o lead deve ser buscado.");
    }
    const deals = await this.prisma.deal.findMany({
      where: {
        organizationId: ctx.organizationId,
        deletedAt: null,
        ...(searchBy === "dealId" ? { id: searchValue } : { contactId: searchValue }),
      },
      include: { stage: true, pipeline: true, tags: true, contact: true },
      orderBy: { createdAt: String(config.matchStrategy ?? "newest") === "oldest" ? "asc" : "desc" },
      take: 2,
    });
    if (deals.length > 1 && config.matchStrategy === "error") {
      throw new Error("Mais de um lead corresponde à busca.");
    }
    const deal = deals[0] ?? null;
    return { output: { found: Boolean(deal), deal }, branch: deal ? "found" : "notFound" };
  }

  private async findOrder(
    config: Record<string, unknown>,
    ctx: ActionContext,
  ): Promise<ActionResult> {
    const searchBy = String(config.searchBy ?? "");
    const searchValue = String(config.searchValue ?? "").trim();
    if (!["orderId", "contactId"].includes(searchBy) || !searchValue) {
      throw new Error("Configure como o pedido deve ser buscado.");
    }
    const orders = await this.prisma.order.findMany({
      where: {
        organizationId: ctx.organizationId,
        deletedAt: null,
        ...(searchBy === "orderId" ? { id: searchValue } : { contactId: searchValue }),
      },
      orderBy: { createdAt: String(config.matchStrategy ?? "newest") === "oldest" ? "asc" : "desc" },
      take: config.matchStrategy === "error" ? 2 : 1,
      include: { payments: true },
    });
    if (orders.length > 1 && config.matchStrategy === "error") {
      throw new Error("Mais de um pedido corresponde à busca.");
    }
    return {
      output: { found: orders.length > 0, orders, order: orders[0] ?? null },
      branch: orders.length ? "found" : "notFound",
    };
  }

  private async findDuplicates(
    config: Record<string, unknown>,
    ctx: ActionContext,
  ): Promise<ActionResult> {
    const dealId = this.dealId(ctx, config);
    const deal = await this.prisma.deal.findFirst({
      where: { id: dealId, organizationId: ctx.organizationId, deletedAt: null },
      include: { contact: true, pipeline: true, stage: true },
    });
    if (!deal?.contact) return { output: { found: false, matches: [] }, branch: "out" };
    const phone = deal.contact.phone || deal.contact.whatsapp;
    const email = deal.contact.email;
    const matches = await this.prisma.deal.findMany({
      where: {
        organizationId: ctx.organizationId,
        deletedAt: null,
        id: { not: deal.id },
        contact: {
          deletedAt: null,
          OR: [...(phone ? [{ phone }, { whatsapp: phone }] : []), ...(email ? [{ email }] : [])],
        },
      },
      include: { pipeline: true, stage: true, owner: { select: { id: true, name: true } } },
      take: 20,
    });
    const ignoreAfterSales = config.ignoreAfterSales !== false;
    const filtered = matches.filter((item) => {
      const hay = `${item.pipeline?.name ?? ""} ${item.stage?.name ?? ""}`.toLowerCase();
      if (
        ignoreAfterSales &&
        (hay.includes("pós") || hay.includes("pos-venda") || hay.includes("after"))
      )
        return false;
      return true;
    });
    const otherOwner = filtered.filter(
      (item) => item.ownerId && deal.ownerId && item.ownerId !== deal.ownerId,
    );
    return {
      output: {
        found: filtered.length > 0,
        matches: filtered,
        canonicalRecord: filtered[0] ?? null,
        belongsToOtherOwner: otherOwner.length > 0,
      },
      branch: "out",
    };
  }

  private async moveStage(
    config: Record<string, unknown>,
    ctx: ActionContext,
  ): Promise<ActionResult> {
    const dealId = this.dealId(ctx, config);
    const targetStageId = String(config.stageId ?? config.targetStageId ?? "");
    const deal = await this.prisma.deal.findFirst({
      where: { id: dealId, organizationId: ctx.organizationId, deletedAt: null },
    });
    if (!deal) throw new Error("Lead não encontrado para mover de etapa.");
    if (!targetStageId) throw new Error("Selecione a etapa de destino.");
    const fromPipelineId = String(config.fromPipelineId ?? "");
    const fromStageId = String(config.fromStageId ?? "");
    if (fromPipelineId && deal.pipelineId !== fromPipelineId) {
      return {
        output: { unchanged: true, dealId, reason: "pipeline-origin-mismatch" },
        branch: "out",
      };
    }
    if (fromStageId && deal.stageId !== fromStageId) {
      return {
        output: { unchanged: true, dealId, reason: "stage-origin-mismatch" },
        branch: "out",
      };
    }
    if (deal.stageId === targetStageId)
      return { output: { unchanged: true, dealId }, branch: "out" };
    const stage = await this.prisma.pipelineStage.findFirst({
      where: {
        id: targetStageId,
        organizationId: ctx.organizationId,
        deletedAt: null,
        archived: false,
        ...(config.pipelineId
          ? { pipelineId: String(config.pipelineId) }
          : { pipelineId: deal.pipelineId }),
      },
    });
    if (!stage) throw new Error("A etapa selecionada não existe neste pipeline.");
    const now = new Date();
    const status =
      stage.isWon || stage.type === PipelineStageType.WON
        ? DealStatus.WON
        : stage.isLost || stage.type === PipelineStageType.LOST
          ? DealStatus.LOST
          : DealStatus.OPEN;
    await this.prisma.$transaction(async (tx) => {
      await tx.deal.update({
        where: { id: deal.id },
        data: {
          stageId: stage.id,
          enteredStageAt: now,
          status,
          closedAt: status === DealStatus.OPEN ? null : now,
        },
      });
      await tx.dealStageHistory.create({
        data: {
          dealId: deal.id,
          stageId: stage.id,
          fromStageId: deal.stageId,
          movedById: ctx.actorId ?? null,
          movedAt: now,
          note: "Movido por automação",
        },
      });
      await tx.activity.create({
        data: {
          organizationId: ctx.organizationId,
          type: ActivityType.STAGE_CHANGED,
          title: `Automação moveu o lead para ${stage.name}`,
          dealId: deal.id,
          contactId: deal.contactId,
          actorId: null,
          metadata: {
            automationId: ctx.automationId,
            executionId: ctx.executionId,
            nodeId: ctx.nodeId,
            origin: "AUTOMATION",
          },
        },
      });
      await this.events.emit(tx, {
        organizationId: ctx.organizationId,
        eventType: DOMAIN_EVENT_TYPES.DEAL_STAGE_CHANGED,
        aggregateType: "deal",
        aggregateId: deal.id,
        origin: "AUTOMATION",
        correlationId: ctx.executionId,
        payload: {
          dealId: deal.id,
          pipelineId: deal.pipelineId,
          stageId: stage.id,
          fromStageId: deal.stageId,
          contactId: deal.contactId,
        },
        metadata: {
          automationId: ctx.automationId,
          executionId: ctx.executionId,
          nodeId: ctx.nodeId,
        },
        subjectType: "deal",
        subjectId: deal.id,
        deduplicationKey: `${ctx.executionId}:${ctx.nodeId}:deal.stage.changed`,
      });
    });
    return {
      output: {
        dealId: deal.id,
        fromStageId: deal.stageId,
        stageId: stage.id,
        stageName: stage.name,
      },
      branch: "out",
    };
  }

  private async assignOwner(
    config: Record<string, unknown>,
    ctx: ActionContext,
  ): Promise<ActionResult> {
    const dealId = this.dealId(ctx, config);
    const deal = await this.prisma.deal.findFirst({
      where: { id: dealId, organizationId: ctx.organizationId, deletedAt: null },
    });
    if (!deal) throw new Error("Lead não encontrado para alterar responsável.");
    let ownerId = config.ownerId ? String(config.ownerId) : deal.ownerId;
    if (config.mode === "channelOwner") {
      const channelId = String(
        this.path(ctx.context, "trigger.channelId") ?? config.channelId ?? "",
      );
      if (channelId) {
        const channel = await this.prisma.channel.findFirst({
          where: { id: channelId, organizationId: ctx.organizationId, deletedAt: null },
          select: { ownerUserId: true },
        });
        ownerId = channel?.ownerUserId ?? ownerId;
      }
    }
    if (!ownerId) throw new Error("Nenhum responsável pôde ser definido.");
    const owner = await this.prisma.user.findFirst({
      where: {
        id: ownerId,
        organizationId: ctx.organizationId,
        deletedAt: null,
        deactivatedAt: null,
      },
      select: { id: true, name: true },
    });
    if (!owner) throw new Error("O responsável selecionado está inativo ou não existe.");
    await this.prisma.$transaction(async (tx) => {
      await tx.deal.update({ where: { id: deal.id }, data: { ownerId: owner.id } });
      await tx.activity.create({
        data: {
          organizationId: ctx.organizationId,
          type: ActivityType.OWNER_CHANGED,
          title: `Automação definiu responsável: ${owner.name}`,
          dealId: deal.id,
          actorId: null,
          metadata: {
            automationId: ctx.automationId,
            executionId: ctx.executionId,
            origin: "AUTOMATION",
          },
        },
      });
      await this.events.emit(tx, {
        organizationId: ctx.organizationId,
        eventType: DOMAIN_EVENT_TYPES.DEAL_OWNER_CHANGED,
        aggregateType: "deal",
        aggregateId: deal.id,
        origin: "AUTOMATION",
        correlationId: ctx.executionId,
        payload: { dealId: deal.id, ownerId: owner.id, contactId: deal.contactId },
        metadata: {
          automationId: ctx.automationId,
          executionId: ctx.executionId,
          nodeId: ctx.nodeId,
        },
        subjectType: "deal",
        subjectId: deal.id,
        deduplicationKey: `${ctx.executionId}:${ctx.nodeId}:deal.owner.changed`,
      });
    });
    return { output: { ownerId: owner.id, ownerName: owner.name }, branch: "out" };
  }

  private async assignRoundRobin(
    config: Record<string, unknown>,
    ctx: ActionContext,
  ): Promise<ActionResult> {
    const dealId = this.dealId(ctx, config);
    const deal = await this.prisma.deal.findFirst({
      where: { id: dealId, organizationId: ctx.organizationId, deletedAt: null },
    });
    if (!deal) throw new Error("Lead não encontrado para distribuir.");
    const pipelineId = String(config.pipelineId ?? "");
    if (!pipelineId) throw new Error("Selecione o pipeline da distribuição.");
    const pipeline = await this.prisma.pipeline.findFirst({
      where: { id: pipelineId, organizationId: ctx.organizationId, deletedAt: null, archived: false },
      select: { accessMode: true },
    });
    if (!pipeline) throw new Error("Pipeline da distribuição não encontrado.");
    const excludedUserIds = Array.isArray(config.excludedUserIds)
      ? config.excludedUserIds.map(String).filter(Boolean)
      : [];
    const candidates = await this.prisma.user.findMany({
      where: {
        organizationId: ctx.organizationId,
        deletedAt: null,
        deactivatedAt: null,
        status: "ACTIVE",
        ...(excludedUserIds.length ? { id: { notIn: excludedUserIds } } : {}),
        ...(pipeline.accessMode === "RESTRICTED"
          ? {
              OR: [
                { authRole: "ADMIN" },
                { pipelineAccesses: { some: { pipelineId } } },
                { team: { pipelineAccesses: { some: { pipelineId } } } },
              ],
            }
          : {}),
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    if (!candidates.length) throw new Error("Nenhum usuário ativo está disponível para distribuição.");
    const counts = await this.prisma.deal.groupBy({
      by: ["ownerId"],
      where: {
        organizationId: ctx.organizationId,
        deletedAt: null,
        status: "OPEN",
        pipelineId,
        ownerId: { in: candidates.map((candidate) => candidate.id) },
      },
      _count: { _all: true },
    });
    const loads = new Map(counts.map((item) => [item.ownerId, item._count._all]));
    const selected = [...candidates].sort(
      (a, b) => (loads.get(a.id) ?? 0) - (loads.get(b.id) ?? 0) || a.id.localeCompare(b.id),
    )[0]!;
    return this.assignOwner({ ...config, ownerId: selected.id, mode: "specific" }, ctx);
  }

  private async updateDealField(
    config: Record<string, unknown>,
    ctx: ActionContext,
  ): Promise<ActionResult> {
    const allowed = new Set(["name", "value", "priority", "status", "source", "campaign", "lostReason"]);
    const field = String(config.field ?? "");
    if (!allowed.has(field)) throw new Error("Selecione um campo permitido do lead.");
    const dealId = this.dealId(ctx, config);
    const deal = await this.prisma.deal.findFirst({ where: { id: dealId, organizationId: ctx.organizationId, deletedAt: null } });
    if (!deal) throw new Error("Lead não encontrado para atualização.");
    let value: unknown = config.value ?? null;
    if (field === "value") value = Number(value);
    await this.prisma.deal.update({ where: { id: deal.id }, data: { [field]: value } as never });
    await this.events.emitStandalone({
      organizationId: ctx.organizationId, eventType: DOMAIN_EVENT_TYPES.DEAL_UPDATED,
      aggregateType: "deal", aggregateId: deal.id, origin: "AUTOMATION", correlationId: ctx.executionId,
      payload: { dealId: deal.id, pipelineId: deal.pipelineId, stageId: deal.stageId, contactId: deal.contactId, changedFields: [field], before: { [field]: deal[field as keyof typeof deal] }, after: { [field]: value } },
      subjectType: "deal", subjectId: deal.id,
      deduplicationKey: `${ctx.executionId}:${ctx.nodeId}:deal.updated:${field}`,
    });
    return { output: { dealId: deal.id, field, value }, branch: "out" };
  }

  private async updateContactField(
    config: Record<string, unknown>,
    ctx: ActionContext,
  ): Promise<ActionResult> {
    const allowed = new Set(["firstName", "lastName", "phone", "whatsapp", "email", "city", "state", "country", "status", "source", "campaign", "observations", "nextContactAt"]);
    const field = String(config.field ?? "");
    if (!allowed.has(field)) throw new Error("Selecione um campo permitido do contato.");
    const contactId = String(config.contactId ?? this.path(ctx.context, "current.contact.id") ?? this.path(ctx.context, "trigger.contactId") ?? "");
    const contact = await this.prisma.contact.findFirst({ where: { id: contactId, organizationId: ctx.organizationId, deletedAt: null } });
    if (!contact) throw new Error("Contato não encontrado para atualização.");
    let value: unknown = config.value ?? null;
    if (field === "nextContactAt" && value) value = new Date(String(value));
    await this.prisma.contact.update({ where: { id: contact.id }, data: { [field]: value } as never });
    await this.events.emitStandalone({
      organizationId: ctx.organizationId, eventType: DOMAIN_EVENT_TYPES.CONTACT_UPDATED,
      aggregateType: "contact", aggregateId: contact.id, origin: "AUTOMATION", correlationId: ctx.executionId,
      payload: { contactId: contact.id, changedFields: [field], before: { [field]: contact[field as keyof typeof contact] }, after: { [field]: value } },
      subjectType: "contact", subjectId: contact.id,
      deduplicationKey: `${ctx.executionId}:${ctx.nodeId}:contact.updated:${field}`,
    });
    return { output: { contactId: contact.id, field, value }, branch: "out" };
  }

  private async addTag(config: Record<string, unknown>, ctx: ActionContext): Promise<ActionResult> {
    const dealId = this.dealId(ctx, config);
    const tagId = String(config.tagId ?? "");
    const tag = await this.prisma.tag.findFirst({
      where: { id: tagId, organizationId: ctx.organizationId, deletedAt: null },
    });
    if (!tag) throw new Error("Tag não encontrada nesta organização.");
    await this.prisma.$transaction(async (tx) => {
      await tx.dealTag.createMany({ data: [{ dealId, tagId }], skipDuplicates: true });
      await tx.activity.create({
        data: {
          organizationId: ctx.organizationId,
          type: ActivityType.TAG_ADDED,
          title: `Automação adicionou a tag ${tag.name}`,
          dealId,
          actorId: null,
          metadata: {
            automationId: ctx.automationId,
            executionId: ctx.executionId,
            tagId,
            origin: "AUTOMATION",
          },
        },
      });
      await this.events.emit(tx, {
        organizationId: ctx.organizationId,
        eventType: DOMAIN_EVENT_TYPES.DEAL_TAG_ADDED,
        aggregateType: "deal",
        aggregateId: dealId,
        origin: "AUTOMATION",
        correlationId: ctx.executionId,
        payload: { dealId, tagId, tagName: tag.name },
        metadata: {
          automationId: ctx.automationId,
          executionId: ctx.executionId,
          nodeId: ctx.nodeId,
        },
        subjectType: "deal",
        subjectId: dealId,
        deduplicationKey: `${ctx.executionId}:${ctx.nodeId}:deal.tag.added:${tagId}`,
      });
    });
    return { output: { tagId, tagName: tag.name }, branch: "out" };
  }

  private async removeTag(
    config: Record<string, unknown>,
    ctx: ActionContext,
  ): Promise<ActionResult> {
    const dealId = this.dealId(ctx, config);
    const tagId = String(config.tagId ?? "");
    await this.prisma.$transaction(async (tx) => {
      await tx.dealTag.deleteMany({ where: { dealId, tagId } });
      await this.events.emit(tx, {
        organizationId: ctx.organizationId,
        eventType: DOMAIN_EVENT_TYPES.DEAL_TAG_REMOVED,
        aggregateType: "deal",
        aggregateId: dealId,
        origin: "AUTOMATION",
        correlationId: ctx.executionId,
        payload: { dealId, tagId },
        metadata: {
          automationId: ctx.automationId,
          executionId: ctx.executionId,
          nodeId: ctx.nodeId,
        },
        subjectType: "deal",
        subjectId: dealId,
        deduplicationKey: `${ctx.executionId}:${ctx.nodeId}:deal.tag.removed:${tagId}`,
      });
    });
    return { output: { tagId, removed: true }, branch: "out" };
  }

  private async createTask(
    config: Record<string, unknown>,
    ctx: ActionContext,
  ): Promise<ActionResult> {
    const title = String(config.title ?? "").trim();
    if (!title) throw new Error("Informe o título da tarefa.");
    const key = `${ctx.executionId}:${ctx.nodeId}:task:${title}`;
    const existing = await this.prisma.automationIdempotency.findUnique({
      where: { organizationId_key: { organizationId: ctx.organizationId, key } },
    });
    if (existing?.result && typeof existing.result === "object") {
      return { output: existing.result as Record<string, unknown>, branch: "out" };
    }
    const requestedStatusId = String(config.statusDefinitionId ?? "").trim();
    const status = await this.prisma.taskStatusDefinition.findFirst({
      where: {
        organizationId: ctx.organizationId,
        deletedAt: null,
        archived: false,
        active: true,
        ...(requestedStatusId ? { id: requestedStatusId } : { category: "OPEN" }),
      },
      orderBy: { position: "asc" },
    });
    if (!status) throw new Error("O status selecionado para a tarefa não está disponível.");
    const dealId = this.dealId(ctx, config) || null;
    const deal = dealId
      ? await this.prisma.deal.findFirst({
          where: { id: dealId, organizationId: ctx.organizationId },
        })
      : null;
    const dueInMinutes = Number(config.dueInMinutes ?? 0);
    const dueDate = String(config.dueDate ?? "").trim();
    const dueTime = String(config.dueTime ?? "").trim();
    const configuredDueAt = dueDate
      ? new Date(`${dueDate}T${dueTime || "09:00"}:00`)
      : null;
    if (configuredDueAt && Number.isNaN(configuredDueAt.getTime())) {
      throw new Error("A data ou o horário da tarefa é inválido.");
    }
    const taskStatus =
      status.category === "DONE"
        ? "COMPLETED"
        : status.category === "IN_PROGRESS"
          ? "IN_PROGRESS"
          : "PENDING";
    const task = await this.prisma.task.create({
      data: {
        organizationId: ctx.organizationId,
        title,
        description: config.description ? String(config.description) : null,
        type: "FOLLOW_UP",
        status: taskStatus,
        statusDefinitionId: status.id,
        priority: (typeof config.priority === "string" ? config.priority : "MEDIUM") as never,
        dueAt:
          configuredDueAt ??
          (dueInMinutes > 0 ? new Date(Date.now() + dueInMinutes * 60_000) : null),
        assigneeId: (config.assigneeId as string) || deal?.ownerId || ctx.actorId || null,
        contactId:
          deal?.contactId ?? (this.path(ctx.context, "current.contact.id") as string) ?? null,
        dealId: deal?.id ?? null,
        orderId: this.orderId(ctx, config) || null,
        pipelineId: deal?.pipelineId ?? null,
        stageId: deal?.stageId ?? null,
      },
    });
    await this.prisma.activity.create({
      data: {
        organizationId: ctx.organizationId,
        type: ActivityType.TASK_CREATED,
        title: `Tarefa criada pela automação: ${title}`,
        taskId: task.id,
        dealId: deal?.id,
        actorId: null,
        metadata: {
          automationId: ctx.automationId,
          executionId: ctx.executionId,
          origin: "AUTOMATION",
        },
      },
    });
    const output = { taskId: task.id, title };
    await this.prisma.automationIdempotency
      .create({
        data: {
          organizationId: ctx.organizationId,
          key,
          executionId: ctx.executionId,
          result: output as Prisma.InputJsonValue,
        },
      })
      .catch(() => undefined);
    return { output, branch: "out" };
  }

  private async createNote(
    config: Record<string, unknown>,
    ctx: ActionContext,
  ): Promise<ActionResult> {
    const body = String(config.body ?? "").trim();
    if (!body) throw new Error("Informe o texto da nota.");
    const dealId = this.dealId(ctx, config) || null;
    const note = await this.prisma.note.create({
      data: {
        organizationId: ctx.organizationId,
        content: body,
        dealId,
        contactId: (this.path(ctx.context, "current.contact.id") as string) ?? null,
      },
    });
    await this.prisma.activity.create({
      data: {
        organizationId: ctx.organizationId,
        type: ActivityType.NOTE_CREATED,
        title: "Nota criada pela automação",
        dealId,
        actorId: null,
        metadata: {
          automationId: ctx.automationId,
          executionId: ctx.executionId,
          noteId: note.id,
          origin: "AUTOMATION",
        },
      },
    });
    return { output: { noteId: note.id }, branch: "out" };
  }

  private async updateRelatedStatus(
    config: Record<string, unknown>,
    ctx: ActionContext,
  ): Promise<ActionResult> {
    const status = String(config.status ?? "");
    if (!status) throw new Error("Selecione o novo status.");
    const orderStatuses = new Set([
      "PENDING",
      "PAYMENT_APPROVED",
      "SEPARATING",
      "SHIPPED",
      "DELIVERED",
      "CANCELED",
    ]);
    const configuredType = String(
      config.entityType ?? (orderStatuses.has(status) ? "ORDER" : "AUTO"),
    ).toUpperCase();
    const dealId = this.dealId(ctx, config);
    const orderId = this.orderId(ctx, config);
    const taskId = String(
      config.taskId ??
        this.path(ctx.context, "current.task.id") ??
        this.path(ctx.context, "trigger.task.id") ??
        "",
    );
    const entityType =
      configuredType === "AUTO"
        ? dealId
          ? "DEAL"
          : orderId
            ? "ORDER"
            : taskId
              ? "TASK"
              : ""
        : configuredType;

    if (entityType === "DEAL") {
      if (!dealId) throw new Error("Nenhum card de lead está relacionado à automação.");
      const deal = await this.prisma.deal.findFirst({
        where: { id: dealId, organizationId: ctx.organizationId, deletedAt: null },
      });
      if (!deal) throw new Error("Card do lead não encontrado.");
      const stage = await this.prisma.pipelineStage.findFirst({
        where: {
          id: status,
          pipelineId: deal.pipelineId,
          pipeline: { organizationId: ctx.organizationId, deletedAt: null },
        },
      });
      if (!stage) throw new Error("O status selecionado não pertence ao pipeline atual do lead.");
      const movedAt = new Date();
      await this.prisma.deal.update({
        where: { id: deal.id },
        data: {
          stageId: stage.id,
          enteredStageAt: movedAt,
          status: stage.type === "WON" ? "WON" : stage.type === "LOST" ? "LOST" : "OPEN",
          closedAt: stage.type === "OPEN" ? null : movedAt,
          ...(ctx.actorId ? { updatedById: ctx.actorId } : {}),
        },
      });
      await this.prisma.dealStageHistory.create({
        data: {
          dealId: deal.id,
          stageId: stage.id,
          fromStageId: deal.stageId,
          movedById: ctx.actorId ?? null,
          movedAt,
          note: "Status alterado por automação",
        },
      });
      return { output: { dealId: deal.id, status: stage.id }, branch: "out" };
    }

    if (entityType === "TASK") {
      if (!taskId) throw new Error("Nenhuma tarefa está relacionada à automação.");
      const definition = await this.prisma.taskStatusDefinition.findFirst({
        where: {
          id: status,
          organizationId: ctx.organizationId,
          active: true,
          archived: false,
          deletedAt: null,
        },
      });
      if (!definition) throw new Error("Status da tarefa não encontrado.");
      const task = await this.prisma.task.findFirst({
        where: { id: taskId, organizationId: ctx.organizationId, deletedAt: null },
      });
      if (!task) throw new Error("Tarefa não encontrada.");
      const taskStatus =
        definition.category === "DONE"
          ? "COMPLETED"
          : definition.category === "IN_PROGRESS"
            ? "IN_PROGRESS"
            : "PENDING";
      await this.prisma.task.update({
        where: { id: task.id },
        data: {
          statusDefinitionId: definition.id,
          status: taskStatus,
          completedAt: taskStatus === "COMPLETED" ? new Date() : null,
        },
      });
      return { output: { taskId: task.id, status: definition.id }, branch: "out" };
    }

    if (entityType !== "ORDER") {
      throw new Error("Não foi possível identificar o item relacionado à automação.");
    }
    if (!orderId) throw new Error("Nenhum pedido está relacionado à automação.");
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, organizationId: ctx.organizationId, deletedAt: null },
    });
    if (!order) throw new Error("Pedido não encontrado.");
    await this.prisma.order.update({ where: { id: order.id }, data: { status: status as never } });
    return { output: { orderId: order.id, status }, branch: "out" };
  }

  private async notifyUser(
    config: Record<string, unknown>,
    ctx: ActionContext,
  ): Promise<ActionResult> {
    const title = String(config.title ?? "").trim();
    if (!title) throw new Error("Informe o título da notificação.");
    const dealId = this.dealId(ctx, config);
    const deal = dealId
      ? await this.prisma.deal.findFirst({
          where: { id: dealId, organizationId: ctx.organizationId },
        })
      : null;
    const userId = String(config.userId ?? deal?.ownerId ?? ctx.actorId ?? "");
    if (!userId) throw new Error("Não há usuário para notificar.");
    const href = deal ? `/pipelines?dealId=${deal.id}` : config.href ? String(config.href) : null;
    await this.prisma.notification.create({
      data: {
        organizationId: ctx.organizationId,
        userId,
        type: "SYSTEM",
        title,
        body: config.body ? String(config.body) : null,
        href,
        entityType: deal ? "DEAL" : null,
        entityId: deal?.id ?? null,
      },
    });
    return { output: { userId, title }, branch: "out" };
  }

  private async sendWhatsApp(
    config: Record<string, unknown>,
    ctx: ActionContext,
  ): Promise<ActionResult> {
    const body = String(config.body ?? "").trim();
    if (!body) throw new Error("Informe a mensagem.");
    const channelId = String(config.channelId ?? this.path(ctx.context, "trigger.channelId") ?? "");
    if (!channelId) throw new Error("Selecione um canal do Connections Center.");
    const channel = await this.prisma.channel.findFirst({
      where: {
        id: channelId,
        organizationId: ctx.organizationId,
        deletedAt: null,
        archivedAt: null,
      },
    });
    if (!channel?.provider || !channel.externalAccountId) {
      throw new Error("Não foi possível enviar a mensagem porque o canal está desconectado.");
    }
    const contactId = String(
      config.contactId ??
        this.path(ctx.context, "current.contact.id") ??
        this.path(ctx.context, "trigger.contactId") ??
        "",
    );
    const contact = contactId
      ? await this.prisma.contact.findFirst({
          where: { id: contactId, organizationId: ctx.organizationId },
        })
      : null;
    const destination = normalizePhone(
      String(config.phone ?? contact?.whatsapp ?? contact?.phone ?? ""),
    );
    if (!destination) throw new Error("O contato não possui telefone para envio.");
    const key = `${ctx.executionId}:${ctx.nodeId}:wa:${destination}:${body}`;
    const existing = await this.prisma.automationIdempotency.findUnique({
      where: { organizationId_key: { organizationId: ctx.organizationId, key } },
    });
    if (existing)
      return { output: { duplicate: true, ...(existing.result as object) }, branch: "out" };
    const provider = this.providers.get(channel.provider);
    const sent = await provider.sendText(channel.id, channel.externalAccountId, destination, body);
    const output = {
      channelId: channel.id,
      destination,
      externalMessageId: sent.externalMessageId,
    };
    await this.prisma.automationIdempotency
      .create({
        data: {
          organizationId: ctx.organizationId,
          key,
          executionId: ctx.executionId,
          result: output as Prisma.InputJsonValue,
        },
      })
      .catch(() => undefined);
    return { output, branch: "out" };
  }

  private async httpRequest(config: Record<string, unknown>): Promise<ActionResult> {
    const headers = (
      config.headers && typeof config.headers === "object" ? config.headers : {}
    ) as Record<string, string>;
    const safeHeaders = Object.fromEntries(
      Object.entries(headers).filter(([key]) => !/authorization|cookie/i.test(key)),
    );
    const result = await safeFetch(String(config.url ?? ""), {
      method: String(config.method ?? "GET"),
      headers: safeHeaders,
      body: config.body ? JSON.stringify(config.body) : undefined,
    });
    return { output: truncateJson(result).value as Record<string, unknown>, branch: "out" };
  }
}
