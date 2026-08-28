import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { randomBytes } from "node:crypto";
import { Prisma } from "@xingyu/database";
import { PrismaService } from "../prisma/prisma.service";
import { PaginationQueryDto } from "../common/dto/pagination.dto";
import { paginate, paginationArgs } from "../common/types/paginated-response";
import { notDeleted } from "../common/utils/soft-delete";
import { catalogForApi, getCatalogEntry, parseNodeType } from "./catalog/node-catalog";
import { checksumDefinition, validateDefinition } from "./catalog/graph-validator";
import { compileLegacyConfig, readLegacyConfig } from "./catalog/legacy-compiler";
import { SYSTEM_TEMPLATES } from "./templates/system-templates";
import { emptyDefinition, parseDefinition, type WorkflowDefinition } from "./domain/definition";
import { DOMAIN_EVENT_TYPES } from "./domain/constants";
import { DomainEventsService } from "./runtime/domain-events.service";
import { AutomationRuntimeService } from "./runtime/automation-runtime.service";
import {
  CreateAutomationDto,
  ManualRunDto,
  QueryAutomationsDto,
  QueryExecutionsDto,
  SaveDraftDto,
  TestAutomationDto,
  TestNodeDto,
  ToggleAutomationDto,
  UpdateAutomationDto,
} from "./dto/automation.dto";

@Injectable()
export class AutomationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: DomainEventsService,
    private readonly runtime: AutomationRuntimeService,
  ) {}

  catalog() {
    return catalogForApi();
  }

  templates() {
    return SYSTEM_TEMPLATES.map((template) => ({
      key: template.key,
      name: template.name,
      description: template.description,
      category: template.category,
      nodeCount: template.definition.nodes.length,
    }));
  }

  runtimeHealth() {
    return this.runtime.health();
  }

  async metrics(organizationId: string) {
    const [active, running, waiting, failed] = await Promise.all([
      this.prisma.automation.count({ where: { organizationId, status: "ACTIVE", ...notDeleted } }),
      this.prisma.automationExecution.count({ where: { organizationId, status: "RUNNING" } }),
      this.prisma.automationExecution.count({ where: { organizationId, status: "WAITING" } }),
      this.prisma.automationExecution.count({
        where: { organizationId, status: "FAILED", startedAt: { gte: new Date(Date.now() - 24 * 60 * 60_000) } },
      }),
    ]);
    return { active, running, waiting, failed };
  }

  async findAll(organizationId: string, query: QueryAutomationsDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;
    const { skip, take } = paginationArgs(page, pageSize);
    const statusFilter = this.statusWhere(query.status, query.enabled);
    const where: Prisma.AutomationWhereInput = {
      organizationId,
      ...notDeleted,
      ...statusFilter,
      ...(query.triggerType ? { triggerType: query.triggerType } : {}),
      ...(query.pipelineId ? { scopeId: query.pipelineId } : {}),
      ...(query.search
        ? { OR: [{ name: { contains: query.search, mode: "insensitive" } }, { description: { contains: query.search, mode: "insensitive" } }] }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.automation.findMany({
        where,
        skip,
        take,
        orderBy: { updatedAt: "desc" },
        include: {
          executions: { take: 1, orderBy: { startedAt: "desc" } },
          _count: { select: { executions: true } },
        },
      }),
      this.prisma.automation.count({ where }),
    ]);
    const ids = rows.map((row) => row.id);
    const failed = ids.length
      ? await this.prisma.automationExecution.groupBy({
          by: ["automationId"],
          where: { automationId: { in: ids }, status: "FAILED", startedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60_000) } },
          _count: true,
        })
      : [];
    const failedMap = new Map(failed.map((item) => [item.automationId, item._count]));
    const succeeded = ids.length
      ? await this.prisma.automationExecution.groupBy({
          by: ["automationId"],
          where: { automationId: { in: ids }, status: { in: ["SUCCEEDED", "SUCCESS"] } },
          _count: true,
        })
      : [];
    const successMap = new Map(succeeded.map((item) => [item.automationId, item._count]));
    const data = rows.map(({ executions, _count, ...automation }) => {
      const executionCount = _count.executions;
      const successCount = successMap.get(automation.id) ?? 0;
      return {
        ...automation,
        lastExecution: executions[0] ?? null,
        executionCount,
        recentFailures: failedMap.get(automation.id) ?? 0,
        successRate: executionCount ? Math.round((successCount / executionCount) * 100) : null,
        triggerLabel: this.triggerLabel(automation),
      };
    });
    return paginate(data, total, page, pageSize);
  }

  async findOne(organizationId: string, id: string) {
    const item = await this.prisma.automation.findFirst({
      where: { id, organizationId, ...notDeleted },
      include: {
        nodes: true,
        edges: true,
        versions: { orderBy: { version: "desc" }, take: 20 },
        activeVersion: true,
        executions: { take: 20, orderBy: { startedAt: "desc" }, include: { logs: { orderBy: { createdAt: "asc" } } } },
      },
    });
    if (!item) throw new NotFoundException(`Automation ${id} not found`);
    return {
      ...item,
      draft: this.definitionOf(item),
      validation: validateDefinition(this.definitionOf(item)),
    };
  }

  async create(organizationId: string, userId: string, dto: CreateAutomationDto) {
    const template = dto.templateKey ? SYSTEM_TEMPLATES.find((item) => item.key === dto.templateKey) : null;
    const definition = dto.definition
      ? parseDefinition(dto.definition)
      : template?.definition ?? emptyDefinition();
    if (!definition.nodes.some((node) => parseNodeType(node.type).type.startsWith("trigger.")) && !template) {
      definition.nodes.push({
        id: "trigger-1",
        type: "trigger.manual@1",
        label: "Execução manual",
        position: { x: 120, y: 80 },
        config: {},
      });
    }
    const triggerType = this.primaryTrigger(definition);
    return this.prisma.automation.create({
      data: {
        name: dto.name.trim(),
        description: dto.description?.trim() || template?.description || null,
        organizationId,
        createdById: userId,
        updatedById: userId,
        status: "DRAFT",
        triggerType,
        scopeType: dto.scopeType ?? "ORGANIZATION",
        scopeId: dto.scopeId ?? null,
        draftDefinition: definition as unknown as Prisma.InputJsonValue,
        webhookToken: randomBytes(24).toString("hex"),
        config: { triggerConfig: {}, conditions: [], actions: [] } as Prisma.InputJsonValue,
      },
    });
  }

  async saveDraft(organizationId: string, id: string, userId: string, dto: SaveDraftDto) {
    const current = await this.requireAutomation(organizationId, id);
    if (dto.revision != null && dto.revision !== current.revision) {
      throw new ConflictException("Esta automação foi alterada por outra pessoa. Recarregue o rascunho para continuar.");
    }
    const definition = parseDefinition(dto.definition);
    return this.prisma.automation.update({
      where: { id },
      data: {
        draftDefinition: definition as unknown as Prisma.InputJsonValue,
        revision: { increment: 1 },
        updatedById: userId,
        triggerType: this.primaryTrigger(definition),
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description.trim() || null } : {}),
        ...(dto.settings ? { settings: dto.settings as Prisma.InputJsonValue } : {}),
      },
    });
  }

  async validate(organizationId: string, id: string) {
    const automation = await this.requireAutomation(organizationId, id);
    const issues = validateDefinition(this.definitionOf(automation));
    return { ok: issues.every((issue) => issue.level !== "error"), issues };
  }

  async publish(organizationId: string, id: string, userId: string) {
    const automation = await this.requireAutomation(organizationId, id);
    if (automation.status === "ARCHIVED") throw new BadRequestException("Uma automação arquivada não pode ser publicada.");
    const definition = this.definitionOf(automation);
    if (automation.settings && typeof automation.settings === "object") {
      definition.settings = { ...definition.settings, ...(automation.settings as object) };
    }
    const issues = validateDefinition(definition);
    const errors = issues.filter((issue) => issue.level === "error");
    if (errors.length) {
      throw new BadRequestException({ message: `${errors.length} problemas precisam ser corrigidos`, issues });
    }
    return this.prisma.$transaction(async (tx) => {
      const last = await tx.automationVersion.findFirst({
        where: { automationId: id },
        orderBy: { version: "desc" },
      });
      const versionNumber = (last?.version ?? 0) + 1;
      const version = await tx.automationVersion.create({
        data: {
          organizationId,
          automationId: id,
          version: versionNumber,
          definition: definition as unknown as Prisma.InputJsonValue,
          checksum: checksumDefinition(definition),
          createdById: userId,
          publishedAt: new Date(),
        },
      });
      await tx.automationTriggerSubscription.updateMany({
        where: { automationId: id },
        data: { active: false },
      });
      const triggerTypes = [...new Set(
        definition.nodes
          .map((node) => getCatalogEntry(node.type)?.eventType)
          .filter((item): item is string => Boolean(item)),
      )];
      for (const eventType of triggerTypes) {
        await tx.automationTriggerSubscription.create({
          data: {
            organizationId,
            automationId: id,
            versionId: version.id,
            eventType,
            active: true,
            filters: definition.nodes.find((node) => getCatalogEntry(node.type)?.eventType === eventType)?.config as Prisma.InputJsonValue ?? Prisma.JsonNull,
          },
        });
      }
      await tx.auditLog.create({
        data: {
          organizationId,
          userId,
          action: "automation.published",
          entityType: "automation",
          entityId: id,
          after: { version: versionNumber },
        },
      });
      return tx.automation.update({
        where: { id },
        data: {
          status: "ACTIVE",
          activeVersionId: version.id,
          publishedAt: new Date(),
          pausedAt: null,
          updatedById: userId,
          triggerType: this.primaryTrigger(definition),
        },
        include: { activeVersion: true },
      });
    });
  }

  async pause(organizationId: string, id: string, userId: string, enabled?: boolean) {
    const automation = await this.requireAutomation(organizationId, id);
    const nextEnabled = enabled ?? automation.status !== "ACTIVE";
    if (nextEnabled && automation.status === "ARCHIVED") {
      throw new BadRequestException("Restaure a automação do arquivo antes de ativar.");
    }
    if (nextEnabled && !automation.activeVersionId) {
      throw new BadRequestException("Publique a automação antes de ativar.");
    }
    await this.prisma.automationTriggerSubscription.updateMany({
      where: { automationId: id, versionId: automation.activeVersionId ?? undefined },
      data: { active: nextEnabled },
    });
    return this.prisma.automation.update({
      where: { id },
      data: {
        status: nextEnabled ? "ACTIVE" : "PAUSED",
        pausedAt: nextEnabled ? null : new Date(),
        updatedById: userId,
      },
    });
  }

  async toggle(organizationId: string, id: string, userId: string, dto: ToggleAutomationDto) {
    return this.pause(organizationId, id, userId, dto.enabled);
  }

  async archive(organizationId: string, id: string, userId: string) {
    await this.requireAutomation(organizationId, id);
    await this.prisma.automationTriggerSubscription.updateMany({ where: { automationId: id }, data: { active: false } });
    return this.prisma.automation.update({
      where: { id },
      data: { status: "ARCHIVED", archivedAt: new Date(), updatedById: userId },
    });
  }

  async duplicate(organizationId: string, id: string, userId: string) {
    const current = await this.requireAutomation(organizationId, id);
    return this.prisma.automation.create({
      data: {
        organizationId,
        name: `${current.name} (cópia)`,
        description: current.description,
        status: "DRAFT",
        triggerType: current.triggerType,
        scopeType: current.scopeType,
        scopeId: current.scopeId,
        draftDefinition: current.draftDefinition ?? current.activeVersionId
          ? ((await this.prisma.automationVersion.findUnique({ where: { id: current.activeVersionId! } }))?.definition ?? Prisma.JsonNull)
          : (this.definitionOf(current) as unknown as Prisma.InputJsonValue),
        webhookToken: randomBytes(24).toString("hex"),
        createdById: userId,
        updatedById: userId,
        config: current.config as Prisma.InputJsonValue ?? Prisma.JsonNull,
      },
    });
  }

  async remove(organizationId: string, id: string, userId: string) {
    return this.archive(organizationId, id, userId);
  }

  async update(organizationId: string, id: string, userId: string, dto: UpdateAutomationDto) {
    if (dto.triggerType || dto.actions || dto.conditions || dto.triggerConfig) {
      const current = await this.requireAutomation(organizationId, id);
      const config = {
        triggerConfig: dto.triggerConfig ?? readLegacyConfig(current.config).triggerConfig,
        conditions: dto.conditions ?? readLegacyConfig(current.config).conditions,
        actions: dto.actions ?? readLegacyConfig(current.config).actions,
      };
      const definition = compileLegacyConfig(dto.triggerType ?? current.triggerType, config as Parameters<typeof compileLegacyConfig>[1]);
      return this.saveDraft(organizationId, id, userId, { definition: definition as unknown as Record<string, unknown>, name: dto.name, description: dto.description ?? undefined });
    }
    return this.prisma.automation.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description.trim() || null } : {}),
        ...(dto.enabled !== undefined ? { status: dto.enabled ? "ACTIVE" : "PAUSED" } : {}),
        updatedById: userId,
      },
    });
  }

  async versions(organizationId: string, id: string) {
    await this.requireAutomation(organizationId, id);
    return this.prisma.automationVersion.findMany({
      where: { organizationId, automationId: id },
      orderBy: { version: "desc" },
    });
  }

  async restoreVersion(organizationId: string, id: string, versionId: string, userId: string) {
    await this.requireAutomation(organizationId, id);
    const version = await this.prisma.automationVersion.findFirst({
      where: { id: versionId, automationId: id, organizationId },
    });
    if (!version) throw new NotFoundException("Versão não encontrada");
    return this.prisma.automation.update({
      where: { id },
      data: {
        draftDefinition: version.definition as Prisma.InputJsonValue,
        revision: { increment: 1 },
        updatedById: userId,
        status: "DRAFT",
      },
    });
  }

  async exportWorkflow(organizationId: string, id: string) {
    const automation = await this.findOne(organizationId, id);
    return {
      name: automation.name,
      description: automation.description,
      triggerType: automation.triggerType,
      definition: this.sanitizeExport(this.definitionOf(automation)),
    };
  }

  async test(organizationId: string, id: string, dto: TestAutomationDto) {
    const automation = await this.requireAutomation(organizationId, id);
    const definition = this.definitionOf(automation);
    const issues = validateDefinition(definition);
    const snapshot = {
      trigger: { dealId: dto.dealId, orderId: dto.orderId, contactId: dto.contactId, ...(dto.context ?? {}) },
      current: dto.context ?? {},
    };
    const execution = await this.runtime.runDraft({
      organizationId,
      automationId: id,
      definition,
      snapshot,
      dryRun: dto.dryRun !== false,
    });
    return { queued: true, executionId: execution.id, dryRun: dto.dryRun !== false, issues };
  }

  async testNode(organizationId: string, dto: TestNodeDto) {
    return this.runtime.testNode({
      organizationId,
      type: dto.type,
      config: dto.config,
      context: dto.context ?? {},
      dryRun: dto.dryRun !== false,
    });
  }

  async manualRun(organizationId: string, id: string, userId: string, dto: ManualRunDto) {
    const automation = await this.requireAutomation(organizationId, id);
    if (automation.status !== "ACTIVE") throw new BadRequestException("Publique e ative a automação para executar em um registro real.");
    await this.events.emitStandalone({
      organizationId,
      eventType: this.primaryEventType(this.definitionOf(automation)) ?? DOMAIN_EVENT_TYPES.MANUAL_RUN,
      aggregateType: dto.orderId ? "order" : "deal",
      aggregateId: dto.orderId ?? dto.dealId ?? id,
      origin: "USER",
      actorId: userId,
      payload: { dealId: dto.dealId, orderId: dto.orderId, contactId: dto.contactId, automationId: id },
      subjectId: dto.orderId ?? dto.dealId ?? null,
      subjectType: dto.orderId ? "order" : "deal",
    });
    return { queued: true };
  }

  async listExecutions(organizationId: string, automationId: string, query: PaginationQueryDto) {
    await this.requireAutomation(organizationId, automationId);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const { skip, take } = paginationArgs(page, pageSize);
    const where = { automationId, organizationId };
    const [data, total] = await Promise.all([
      this.prisma.automationExecution.findMany({
        where,
        skip,
        take,
        orderBy: { startedAt: "desc" },
        include: { logs: { orderBy: { createdAt: "asc" } }, nodeExecutions: { orderBy: { startedAt: "asc" } } },
      }),
      this.prisma.automationExecution.count({ where }),
    ]);
    return paginate(data, total, page, pageSize);
  }

  async recentExecutions(organizationId: string) {
    return this.prisma.automationExecution.findMany({
      where: { organizationId },
      take: 30,
      orderBy: { startedAt: "desc" },
      include: { automation: { select: { id: true, name: true } } },
    });
  }

  async listAllExecutions(organizationId: string, query: QueryExecutionsDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 30;
    const { skip, take } = paginationArgs(page, pageSize);
    const where: Prisma.AutomationExecutionWhereInput = {
      organizationId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.automationId ? { automationId: query.automationId } : {}),
      ...(query.subjectId ? { subjectId: query.subjectId } : {}),
      ...(query.search ? { automation: { name: { contains: query.search, mode: "insensitive" } } } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.automationExecution.findMany({
        where,
        skip,
        take,
        orderBy: { startedAt: "desc" },
        include: { automation: { select: { id: true, name: true } } },
      }),
      this.prisma.automationExecution.count({ where }),
    ]);
    return paginate(data, total, page, pageSize);
  }

  async getExecution(organizationId: string, executionId: string) {
    const execution = await this.prisma.automationExecution.findFirst({
      where: { id: executionId, organizationId },
      include: {
        automation: { select: { id: true, name: true, status: true } },
        version: true,
        logs: { orderBy: { createdAt: "asc" } },
        nodeExecutions: { orderBy: { startedAt: "asc" } },
      },
    });
    if (!execution) throw new NotFoundException("Execução não encontrada");
    return execution;
  }

  async retryExecution(organizationId: string, executionId: string, fromStart = false) {
    const execution = await this.runtime.retry(organizationId, executionId, !fromStart);
    if (!execution) throw new NotFoundException("Execução não encontrada");
    return execution;
  }

  async cancelExecution(organizationId: string, executionId: string) {
    const execution = await this.runtime.cancel(organizationId, executionId);
    if (!execution) throw new NotFoundException("Execução não encontrada");
    return execution;
  }

  async receiveWebhook(token: string, payload: unknown, headers: Record<string, string | string[] | undefined>) {
    const automation = await this.prisma.automation.findFirst({
      where: { webhookToken: token, status: "ACTIVE", deletedAt: null },
    });
    if (!automation) throw new NotFoundException("Webhook inválido");
    const serialized = JSON.stringify(payload ?? {});
    if (Buffer.byteLength(serialized) > 256_000) throw new BadRequestException("Payload do webhook excede o limite.");
    const eventId = String(headers["x-idempotency-key"] ?? headers["x-webhook-id"] ?? randomBytes(12).toString("hex"));
    await this.events.emitStandalone({
      organizationId: automation.organizationId,
      eventType: DOMAIN_EVENT_TYPES.WEBHOOK_RECEIVED,
      aggregateType: "webhook",
      aggregateId: eventId,
      origin: "WEBHOOK",
      payload: { body: payload, automationId: automation.id },
      deduplicationKey: `webhook:${automation.id}:${eventId}`,
    });
    return { accepted: true, executionHint: eventId };
  }

  private async requireAutomation(organizationId: string, id: string) {
    const item = await this.prisma.automation.findFirst({ where: { id, organizationId, ...notDeleted } });
    if (!item) throw new NotFoundException(`Automation ${id} not found`);
    return item;
  }

  private definitionOf(automation: { draftDefinition: Prisma.JsonValue | null; config: Prisma.JsonValue | null; triggerType: string }): WorkflowDefinition {
    if (automation.draftDefinition) return parseDefinition(automation.draftDefinition);
    return compileLegacyConfig(automation.triggerType, readLegacyConfig(automation.config));
  }

  private primaryTrigger(definition: WorkflowDefinition) {
    const trigger = definition.nodes.find((node) => parseNodeType(node.type).type.startsWith("trigger."));
    return trigger?.type ?? "GRAPH";
  }

  private primaryEventType(definition: WorkflowDefinition) {
    const trigger = definition.nodes.find((node) => parseNodeType(node.type).type.startsWith("trigger."));
    return trigger ? getCatalogEntry(trigger.type)?.eventType : null;
  }

  private triggerLabel(automation: { triggerType: string; draftDefinition: Prisma.JsonValue | null }) {
    const entry = getCatalogEntry(automation.triggerType);
    if (entry) return entry.label;
    const definition = automation.draftDefinition ? parseDefinition(automation.draftDefinition) : null;
    const trigger = definition?.nodes.find((node) => parseNodeType(node.type).type.startsWith("trigger."));
    return trigger ? getCatalogEntry(trigger.type)?.label ?? trigger.type : automation.triggerType;
  }

  private statusWhere(status?: string, enabled?: boolean): Prisma.AutomationWhereInput {
    if (status === "PAUSED") return { status: { in: ["PAUSED", "INACTIVE"] } };
    if (status === "ERROR") return { executions: { some: { status: "FAILED", startedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60_000) } } } };
    if (status && status !== "ALL") return { status: status as never };
    if (enabled === true) return { status: "ACTIVE" };
    if (enabled === false) return { status: { in: ["PAUSED", "INACTIVE"] } };
    return {};
  }

  private sanitizeExport(definition: WorkflowDefinition) {
    return {
      ...definition,
      nodes: definition.nodes.map((node) => ({
        ...node,
        config: Object.fromEntries(
          Object.entries(node.config ?? {}).filter(([key]) => !/token|secret|password|authorization/i.test(key)),
        ),
      })),
    };
  }
}
