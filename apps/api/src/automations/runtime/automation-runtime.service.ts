import { createHash, randomUUID } from "node:crypto";
import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@xingyu/database";
import { PrismaService } from "../../prisma/prisma.service";
import { AUTOMATION_LIMITS, DOMAIN_EVENT_TYPES, JOB_TYPES } from "../domain/constants";
import { isRecord, parseDefinition, type WorkflowDefinition, type WorkflowNode } from "../domain/definition";
import { evaluateGroup } from "../domain/conditions";
import { truncateJson } from "../domain/redaction";
import { compileLegacyConfig, readLegacyConfig } from "../catalog/legacy-compiler";
import { getCatalogEntry, parseNodeType } from "../catalog/node-catalog";
import { AutomationActionsService } from "./automation-actions.service";
import { AutomationQueueService } from "./automation-queue.service";
import type { AutomationDomainEvent, AutomationExecution } from "@xingyu/database";

@Injectable()
export class AutomationRuntimeService {
  private readonly logger = new Logger(AutomationRuntimeService.name);
  private lastBeat = new Date();

  constructor(
    private readonly prisma: PrismaService,
    private readonly actions: AutomationActionsService,
    private readonly queue: AutomationQueueService,
  ) {}

  async runDraft(input: {
    organizationId: string;
    automationId: string;
    definition: WorkflowDefinition;
    snapshot: Record<string, unknown>;
    dryRun: boolean;
  }) {
    const trigger = input.definition.nodes.find((node) => parseNodeType(node.type).type.startsWith("trigger."));
    if (!trigger) throw new Error("Adicione um gatilho antes de testar.");
    const execution = await this.prisma.automationExecution.create({
      data: {
        automationId: input.automationId,
        organizationId: input.organizationId,
        status: "QUEUED",
        currentNodeId: trigger.id,
        context: {
          trigger: input.snapshot.trigger ?? input.snapshot,
          current: input.snapshot.current ?? input.snapshot,
          nodes: {},
          variables: {},
          dryRun: input.dryRun,
          origin: "USER",
        } as Prisma.InputJsonValue,
      },
    });
    await this.queue.startJob(input.organizationId, execution.id, input.automationId, `test:${execution.id}`);
    return execution;
  }

  markBeat() {
    this.lastBeat = new Date();
  }

  health() {
    const age = Date.now() - this.lastBeat.getTime();
    return {
      status: age < 20_000 ? "operational" : "unavailable",
      lastBeatAt: this.lastBeat.toISOString(),
      ageMs: age,
    };
  }

  async processDomainEvent(event: AutomationDomainEvent) {
    this.markBeat();
    await this.resumeWaits(event);
    const subscriptions = await this.prisma.automationTriggerSubscription.findMany({
      where: { organizationId: event.organizationId, eventType: event.eventType, active: true },
      include: { automation: true, version: true },
    });
    for (const subscription of subscriptions) {
      if (subscription.automation.status !== "ACTIVE" || subscription.automation.deletedAt || subscription.automation.archivedAt) {
        continue;
      }
      if (event.origin === "AUTOMATION" && !this.allowReentry(subscription.version.definition, subscription.automation.id, event.correlationId)) {
        continue;
      }
      const definition = parseDefinition(subscription.version.definition);
      const trigger = definition.nodes.find((node) => getCatalogEntry(node.type)?.eventType === event.eventType);
      if (!trigger) continue;
      if (!this.matchesTriggerConfig(trigger, event)) continue;
      const snapshot = await this.buildSnapshot(event);
      if (!evaluateGroup((trigger.config ?? {}) as never, snapshot)) continue;
      await this.enroll({
        organizationId: event.organizationId,
        automationId: subscription.automationId,
        versionId: subscription.versionId,
        definition,
        event,
        snapshot,
        triggerNodeId: trigger.id,
      });
    }
    await this.processLegacyAutomations(event);
  }

  async startExecution(executionId: string) {
    const execution = await this.prisma.automationExecution.findUnique({
      where: { id: executionId },
      include: { version: true, automation: true },
    });
    if (!execution || ["CANCELED", "SUCCEEDED", "FAILED", "TIMED_OUT"].includes(execution.status)) return;
    const definition = execution.version
      ? parseDefinition(execution.version.definition)
      : this.definitionFromAutomation(execution.automation);
    const trigger = definition.nodes.find((node) => parseNodeType(node.type).type.startsWith("trigger."));
    const startNodeId = execution.currentNodeId ?? trigger?.id;
    if (!startNodeId) {
      await this.finish(execution.id, "FAILED", "Fluxo sem gatilho.");
      return;
    }
    await this.runFrom(execution, definition, startNodeId, "out");
  }

  async continueExecution(executionId: string, nodeId: string, handle = "out") {
    const execution = await this.prisma.automationExecution.findUnique({
      where: { id: executionId },
      include: { version: true, automation: true },
    });
    if (!execution || ["CANCELED", "SUCCEEDED", "FAILED", "TIMED_OUT"].includes(execution.status)) return;
    const definition = execution.version
      ? parseDefinition(execution.version.definition)
      : this.definitionFromAutomation(execution.automation);
    await this.runFrom(execution, definition, nodeId, handle);
  }

  async cancel(organizationId: string, executionId: string) {
    const execution = await this.prisma.automationExecution.findFirst({
      where: { id: executionId, organizationId },
    });
    if (!execution) return null;
    await this.queue.cancelForExecution(executionId);
    return this.prisma.automationExecution.update({
      where: { id: executionId },
      data: { status: "CANCELED", finishedAt: new Date(), error: "Cancelada" },
    });
  }

  async retry(organizationId: string, executionId: string, fromFailed = true) {
    const execution = await this.prisma.automationExecution.findFirst({
      where: { id: executionId, organizationId },
      include: { nodeExecutions: { orderBy: { startedAt: "desc" } }, version: true, automation: true },
    });
    if (!execution) return null;
    const failed = execution.nodeExecutions.find((item) => item.status === "FAILED");
    await this.prisma.automationExecution.update({
      where: { id: execution.id },
      data: { status: "QUEUED", error: null, finishedAt: null, retryCount: { increment: 1 } },
    });
    const nodeId = fromFailed ? failed?.nodeId ?? execution.currentNodeId : undefined;
    await this.queue.enqueue({
      organizationId,
      automationId: execution.automationId,
      executionId: execution.id,
      nodeId: nodeId ?? null,
      jobType: nodeId ? JOB_TYPES.CONTINUE : JOB_TYPES.START_EXECUTION,
      uniqueKey: `retry:${execution.id}:${Date.now()}`,
    });
    return execution;
  }

  private async enroll(input: {
    organizationId: string;
    automationId: string;
    versionId: string | null;
    definition: WorkflowDefinition;
    event: AutomationDomainEvent;
    snapshot: Record<string, unknown>;
    triggerNodeId: string;
  }) {
    const settings = input.definition.settings ?? {};
    const subjectType = input.event.subjectType ?? input.event.aggregateType;
    const subjectId = input.event.subjectId ?? input.event.aggregateId;
    const active = await this.prisma.automationExecution.findFirst({
      where: { automationId: input.automationId, subjectType, subjectId, status: { in: ["QUEUED", "RUNNING", "WAITING"] } },
    });
    if (settings.concurrency === "skipIfActive" || settings.reentry === "skipIfActive") {
      if (active) return;
    }
    if (settings.reentry === "once") {
      const previous = await this.prisma.automationExecution.findFirst({
        where: { automationId: input.automationId, subjectType, subjectId, status: "SUCCEEDED" },
      });
      if (previous) return;
    }
    if (settings.reentry === "replace" && active) {
      await this.cancel(input.organizationId, active.id);
    }
    const fingerprint = createHash("sha1")
      .update(`${input.automationId}:${input.event.id}:${input.triggerNodeId}`)
      .digest("hex");
    const execution = await this.prisma.automationExecution.create({
      data: {
        automationId: input.automationId,
        organizationId: input.organizationId,
        versionId: input.versionId,

        triggerEventId: input.event.id,
        status: "QUEUED",
        subjectType,
        subjectId,
        currentNodeId: input.triggerNodeId,
        input: truncateJson(input.event.payload).value as Prisma.InputJsonValue,
        context: {
          trigger: {
            ...(isRecord(input.snapshot.trigger) ? input.snapshot.trigger : {}),
            eventType: input.event.eventType,
            eventId: input.event.id,
          },
          current: isRecord(input.snapshot.current) ? input.snapshot.current : input.snapshot,
          nodes: {},
          variables: {},
          now: new Date().toISOString(),
          origin: input.event.origin,
          correlationId: input.event.correlationId ?? input.event.id,
          depth: Number((isRecord(input.event.metadata) ? input.event.metadata.depth : 0) ?? 0),
          fingerprint,
        } as Prisma.InputJsonValue,
      },
    });
    await this.queue.startJob(input.organizationId, execution.id, input.automationId, `start:${execution.id}`);
  }

  private async runFrom(
    execution: AutomationExecution & { version: { definition: Prisma.JsonValue } | null; automation: { triggerType: string; config: Prisma.JsonValue | null } },
    definition: WorkflowDefinition,
    nodeId: string,
    incomingHandle: string,
  ) {
    let currentId: string | null = nodeId;
    let handle = incomingHandle;
    let steps = 0;
    const context = (execution.context && typeof execution.context === "object" ? execution.context : {}) as Record<string, unknown>;
    const nodesOut = (context.nodes && typeof context.nodes === "object" ? context.nodes : {}) as Record<string, unknown>;
    while (currentId && steps < AUTOMATION_LIMITS.maxStepsPerExecution) {
      steps += 1;
      const node = definition.nodes.find((item) => item.id === currentId);
      if (!node) {
        await this.finish(execution.id, "FAILED", "Etapa desapareceu da definição publicada.");
        return;
      }
      if (parseNodeType(node.type).type.startsWith("visual.")) {
        currentId = this.nextNode(definition, node.id, "out");
        continue;
      }
      const dryRun = Boolean((context as { dryRun?: boolean }).dryRun);
      const attempt = await this.nextAttempt(execution.id, node.id);
      const nodeExec = await this.prisma.automationNodeExecution.create({
        data: {
          organizationId: execution.organizationId ?? "",
          executionId: execution.id,
          nodeId: node.id,
          nodeType: node.type,
          status: "RUNNING",
          attempt,
          input: truncateJson({ handle, config: node.config }).value as Prisma.InputJsonValue,
        },
      });
      try {
        const result = await this.actions.execute(node.type, (node.config ?? {}) as Record<string, unknown>, {
          organizationId: execution.organizationId ?? "",
          executionId: execution.id,
          automationId: execution.automationId,
          nodeId: node.id,
          dryRun,
          actorId: (context.trigger as { actorId?: string } | undefined)?.actorId,
          context: { ...context, nodes: nodesOut, now: new Date().toISOString() },
        });
        nodesOut[node.id] = { output: result.output };
        if (node.config && typeof (node.config as { name?: string }).name === "string") {
          const vars = (context.variables ?? {}) as Record<string, unknown>;
          vars[(node.config as { name: string }).name] = result.output;
          context.variables = vars;
        }
        const nodeStatus = result.stop === "FAILED" ? "FAILED" : result.stop === "SKIPPED" ? "SKIPPED" : "SUCCEEDED";
        await this.prisma.automationNodeExecution.update({
          where: { id: nodeExec.id },
          data: {
            status: nodeStatus,
            output: truncateJson(result.output).value as Prisma.InputJsonValue,
            finishedAt: new Date(),
            errorMessage: result.error ?? null,
          },
        });
        await this.prisma.automationExecutionLog.create({
          data: {
            executionId: execution.id,
            nodeId: node.id,
            level: nodeStatus === "FAILED" ? "error" : "info",
            message: this.nodeLogMessage(node, nodeStatus, result.error, result.branch),
          },
        });
        context.nodes = nodesOut;
        await this.prisma.automationExecution.update({
          where: { id: execution.id },
          data: { context: context as Prisma.InputJsonValue, currentNodeId: node.id, status: "RUNNING" },
        });
        if (result.stop) {
          await this.finish(execution.id, result.stop === "SUCCEEDED" ? "SUCCEEDED" : result.stop === "SKIPPED" ? "SKIPPED" : "FAILED", result.error ?? null);
          return;
        }
        if (result.delayUntil) {
          await this.prisma.automationExecution.update({
            where: { id: execution.id },
            data: { status: "WAITING", waitingUntil: result.delayUntil, currentNodeId: node.id },
          });
          const nextId = this.nextNode(definition, node.id, result.branch ?? "out");
          await this.queue.enqueue({
            organizationId: execution.organizationId ?? "",
            automationId: execution.automationId,
            executionId: execution.id,
            nodeId: nextId,
            jobType: JOB_TYPES.CONTINUE,
            runAt: result.delayUntil,
            uniqueKey: `delay:${execution.id}:${node.id}:${result.delayUntil.toISOString()}`,
            payload: { handle: "out" },
          });
          return;
        }
        if (result.wait) {
          await this.prisma.automationWaitSubscription.create({
            data: {
              organizationId: execution.organizationId ?? "",
              executionId: execution.id,
              nodeId: node.id,
              eventType: result.wait.eventType,
              subjectType: result.wait.subjectType ?? null,
              subjectId: result.wait.subjectId ?? null,
              resumeNodeIds: { received: this.nextNode(definition, node.id, "received"), timeout: this.nextNode(definition, node.id, "timeout") } as Prisma.InputJsonValue,
              timeoutHandle: result.wait.timeoutHandle,
              expiresAt: result.wait.timeoutAt ?? null,
            },
          });
          await this.prisma.automationExecution.update({
            where: { id: execution.id },
            data: { status: "WAITING", waitingUntil: result.wait.timeoutAt ?? null, currentNodeId: node.id },
          });
          if (result.wait.timeoutAt) {
            await this.queue.enqueue({
              organizationId: execution.organizationId ?? "",
              automationId: execution.automationId,
              executionId: execution.id,
              nodeId: node.id,
              jobType: JOB_TYPES.WAIT_TIMEOUT,
              runAt: result.wait.timeoutAt,
              uniqueKey: `wait-timeout:${execution.id}:${node.id}`,
            });
          }
          return;
        }
        currentId = this.nextNode(definition, node.id, result.branch ?? handle ?? "out");
        handle = "in";
        if (!currentId) {
          await this.finish(execution.id, "SUCCEEDED", null);
          return;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await this.prisma.automationNodeExecution.update({
          where: { id: nodeExec.id },
          data: { status: "FAILED", errorMessage: message, errorCode: "NODE_FAILED", finishedAt: new Date() },
        });
        await this.finish(execution.id, "FAILED", message);
        return;
      }
    }
    await this.finish(execution.id, "FAILED", "A execução atingiu o limite de etapas.");
  }

  async timeoutWait(executionId: string, nodeId: string) {
    const wait = await this.prisma.automationWaitSubscription.findFirst({
      where: { executionId, nodeId, status: "WAITING" },
    });
    if (!wait) return;
    const resume = (wait.resumeNodeIds as { timeout?: string })?.timeout;
    await this.prisma.automationWaitSubscription.update({ where: { id: wait.id }, data: { status: "TIMEOUT", resumedAt: new Date() } });
    if (resume) await this.continueExecution(executionId, resume, "timeout");
    else await this.finish(executionId, "TIMED_OUT", "Tempo de espera esgotado.");
  }

  private async resumeWaits(event: AutomationDomainEvent) {
    const waits = await this.prisma.automationWaitSubscription.findMany({
      where: {
        organizationId: event.organizationId,
        eventType: event.eventType,
        status: "WAITING",
        OR: [
          { subjectId: event.subjectId ?? event.aggregateId },
          { subjectId: null },
        ],
      },
    });
    for (const wait of waits) {
      const resume = (wait.resumeNodeIds as { received?: string })?.received;
      await this.prisma.automationWaitSubscription.update({ where: { id: wait.id }, data: { status: "RESUMED", resumedAt: new Date() } });
      if (resume) {
        await this.queue.enqueue({
          organizationId: event.organizationId,
          executionId: wait.executionId,
          nodeId: resume,
          jobType: JOB_TYPES.CONTINUE,
          uniqueKey: `resume:${wait.executionId}:${wait.nodeId}:${event.id}`,
          payload: { handle: "received" },
        });
      }
    }
  }

  private nextNode(definition: WorkflowDefinition, sourceId: string, handle: string) {
    const edges = definition.edges.filter((edge) => edge.source === sourceId);
    const exact = edges.find((edge) => (edge.sourceHandle ?? "out") === handle);
    return (exact ?? (handle === "out" ? edges[0] : undefined))?.target ?? null;
  }

  private async nextAttempt(executionId: string, nodeId: string) {
    const count = await this.prisma.automationNodeExecution.count({ where: { executionId, nodeId } });
    return count + 1;
  }

  private nodeLogMessage(node: WorkflowNode, status: string, error?: string | null, branch?: string) {
    const label = node.label || parseNodeType(node.type).type;
    if (status === "FAILED") return `${label} falhou: ${error ?? "erro desconhecido"}`;
    if (status === "SKIPPED") return `${label} não continuou neste caminho.`;
    if (branch && branch !== "out") return `${label} avaliado. Seguiu pelo caminho "${branch}".`;
    return `${label} concluído.`;
  }

  private async finish(executionId: string, status: string, error: string | null) {
    await this.prisma.automationExecution.update({
      where: { id: executionId },
      data: { status, error, finishedAt: new Date() },
    });
    await this.prisma.automationExecutionLog.create({
      data: { executionId, level: error ? "error" : "info", message: error ?? `Execução ${status.toLowerCase()}` },
    });
  }

  private allowReentry(definition: Prisma.JsonValue, automationId: string, correlationId: string | null) {
    const parsed = parseDefinition(definition);
    if (parsed.settings?.allowAutomationReentry) return true;
    if (correlationId?.includes(automationId)) return false;
    return false;
  }

  private matchesTriggerConfig(node: WorkflowNode, event: AutomationDomainEvent) {
    const config = node.config ?? {};
    const payload = (event.payload ?? {}) as Record<string, unknown>;
    if (config.pipelineId && config.pipelineId !== payload.pipelineId) return false;
    if (config.toStageId && config.toStageId !== payload.stageId && config.toStageId !== payload.toStageId) return false;
    if (config.fromStageId && config.fromStageId !== payload.fromStageId) return false;
    if (config.status && config.status !== payload.status) return false;
    return true;
  }

  private definitionFromAutomation(automation: { triggerType: string; config: Prisma.JsonValue | null; draftDefinition?: Prisma.JsonValue | null }) {
    if (automation.draftDefinition) return parseDefinition(automation.draftDefinition);
    return compileLegacyConfig(automation.triggerType, readLegacyConfig(automation.config));
  }

  private async processLegacyAutomations(event: AutomationDomainEvent) {
    const legacyType = Object.entries(DOMAIN_EVENT_TYPES).find(([, value]) => value === event.eventType)?.[0];
    if (!legacyType || !["DEAL_CREATED", "DEAL_STAGE_CHANGED"].includes(legacyType)) return;
    const automations = await this.prisma.automation.findMany({
      where: {
        organizationId: event.organizationId,
        status: "ACTIVE",
        triggerType: legacyType,
        activeVersionId: null,
        deletedAt: null,
        archivedAt: null,
      },
    });
    for (const automation of automations) {
      const definition = compileLegacyConfig(automation.triggerType, readLegacyConfig(automation.config));
      const trigger = definition.nodes.find((node) => parseNodeType(node.type).type.startsWith("trigger."));
      if (!trigger) continue;
      const snapshot = await this.buildSnapshot(event);
      await this.enroll({
        organizationId: event.organizationId,
        automationId: automation.id,
        versionId: automation.activeVersionId,
        definition,
        event,
        snapshot,
        triggerNodeId: trigger.id,
      });
    }
  }

  private async buildSnapshot(event: AutomationDomainEvent) {
    const payload = (event.payload ?? {}) as Record<string, unknown>;
    const dealId = String(payload.dealId ?? (event.aggregateType === "deal" ? event.aggregateId : "") ?? "");
    const orderId = String(payload.orderId ?? (event.aggregateType === "order" ? event.aggregateId : "") ?? "");
    const contactId = String(payload.contactId ?? "");
    const deal = dealId
      ? await this.prisma.deal.findFirst({
          where: { id: dealId, organizationId: event.organizationId, deletedAt: null },
          include: { contact: true, stage: true, pipeline: true, owner: { select: { id: true, name: true } }, tags: { include: { tag: true } } },
        })
      : null;
    const order = orderId
      ? await this.prisma.order.findFirst({
          where: { id: orderId, organizationId: event.organizationId, deletedAt: null },
          include: { payments: true, contact: true },
        })
      : null;
    const trigger = {
      ...payload,
      eventType: event.eventType,
      eventId: event.id,
      origin: event.origin,
      actorId: event.actorId,
      aggregateId: event.aggregateId,
      dealId: deal?.id,
      orderId: order?.id,
      contactId: deal?.contactId ?? order?.contactId ?? contactId,
      channelId: payload.channelId,
      deal: deal ? this.serializeDeal(deal) : payload.deal,
      order: order ? this.serializeOrder(order) : payload.order,
      contact: deal?.contact ?? order?.contact ?? payload.contact,
    };
    return {
      trigger,
      current: {
        deal: trigger.deal,
        order: trigger.order,
        contact: trigger.contact,
      },
    };
  }

  private serializeDeal(deal: {
    id: string;
    name: string;
    value: unknown;
    pipelineId: string;
    stageId: string;
    ownerId: string | null;
    contactId: string | null;
    status: string;
    source: string | null;
    contact?: unknown;
    stage?: { id: string; name: string } | null;
    pipeline?: { id: string; name: string } | null;
    owner?: { id: string; name: string } | null;
    tags?: Array<{ tag?: { id: string; name: string } }>;
  }) {
    return {
      id: deal.id,
      name: deal.name,
      value: Number(deal.value ?? 0),
      pipelineId: deal.pipelineId,
      stageId: deal.stageId,
      ownerId: deal.ownerId,
      contactId: deal.contactId,
      status: deal.status,
      source: deal.source,
      stage: deal.stage,
      pipeline: deal.pipeline,
      owner: deal.owner,
      tags: deal.tags?.map((item) => item.tag).filter(Boolean) ?? [],
      contact: deal.contact,
    };
  }

  private serializeOrder(order: {
    id: string;
    number: string;
    status: string;
    finalValue: unknown;
    contactId: string | null;
    dealId: string | null;
    payments?: Array<{ status: string }>;
    contact?: unknown;
  }) {
    return {
      id: order.id,
      number: order.number,
      status: order.status,
      total: Number(order.finalValue ?? 0),
      contactId: order.contactId,
      dealId: order.dealId,
      paymentConfirmed: order.payments?.some((payment) => payment.status === "APPROVED") ?? false,
      contact: order.contact,
    };
  }

  async testNode(input: {
    organizationId: string;
    type: string;
    config: Record<string, unknown>;
    context: Record<string, unknown>;
    dryRun: boolean;
  }) {
    const started = Date.now();
    try {
      const result = await this.actions.execute(input.type, input.config, {
        organizationId: input.organizationId,
        executionId: `test-${randomUUID()}`,
        automationId: "test",
        nodeId: "test",
        dryRun: input.dryRun,
        context: input.context,
      });
      return { ok: true, durationMs: Date.now() - started, output: truncateJson(result.output).value, error: result.error ?? null };
    } catch (error) {
      return { ok: false, durationMs: Date.now() - started, output: null, error: error instanceof Error ? error.message : String(error) };
    }
  }
}
