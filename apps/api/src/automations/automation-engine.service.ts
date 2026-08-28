import { Injectable, Logger } from "@nestjs/common";
import { ActivityType, DealStatus, PipelineStageType, Prisma } from "@xingyu/database";
import { PrismaService } from "../prisma/prisma.service";
import type {
  AutomationAction,
  AutomationCondition,
  AutomationConfig,
  AutomationDispatchResult,
  AutomationEvent,
} from "./automation-engine.types";

const MAX_CHAIN_DEPTH = 5;

@Injectable()
export class AutomationEngineService {
  private readonly logger = new Logger(AutomationEngineService.name);

  constructor(private readonly prisma: PrismaService) {}

  async dispatch(event: AutomationEvent): Promise<AutomationDispatchResult> {
    const result: AutomationDispatchResult = { matched: 0, succeeded: 0, failed: 0, skipped: 0 };
    if ((event.depth ?? 0) > MAX_CHAIN_DEPTH) {
      result.skipped += 1;
      return result;
    }

    try {
      const automations = await this.prisma.automation.findMany({
        where: {
          organizationId: event.organizationId,
          status: "ACTIVE",
          triggerType: event.type,
          deletedAt: null,
        },
        orderBy: { createdAt: "asc" },
      });

      for (const automation of automations) {
        if (event.ancestry?.includes(automation.id)) {
          result.skipped += 1;
          continue;
        }
        const config = this.normalizeConfig(automation.config);
        if (!this.matchesTrigger(config, event)) continue;
        result.matched += 1;
        const succeeded = await this.executeAutomation(automation.id, automation.name, config, event);
        if (succeeded) result.succeeded += 1;
        else result.failed += 1;
      }
    } catch (error) {
      this.logger.error(
        `Automation dispatch failed for ${event.type}/${event.dealId}`,
        error instanceof Error ? error.stack : String(error),
      );
      result.failed += 1;
    }
    return result;
  }

  async simulate(organizationId: string, automationId: string, dealId: string) {
    const automation = await this.prisma.automation.findFirstOrThrow({
      where: { id: automationId, organizationId, deletedAt: null },
    });
    const deal = await this.loadDeal(organizationId, dealId);
    const config = this.normalizeConfig(automation.config);
    const event: AutomationEvent = {
      organizationId,
      type: automation.triggerType as AutomationEvent["type"],
      dealId,
      pipelineId: deal.pipelineId,
      stageId: deal.stageId,
      fromStageId: null,
    };
    const triggerMatches = this.matchesTrigger(config, event);
    const conditions = config.conditions.map((condition) => ({
      ...condition,
      matched: this.evaluateCondition(condition, deal),
    }));
    return {
      ok: triggerMatches && conditions.every((condition) => condition.matched),
      triggerMatches,
      conditions,
      actions: config.actions.map((action) => ({ type: action.type, config: action.config })),
      deal: { id: deal.id, name: deal.name, pipelineId: deal.pipelineId, stageId: deal.stageId },
    };
  }

  private async executeAutomation(
    automationId: string,
    automationName: string,
    config: AutomationConfig,
    event: AutomationEvent,
  ) {
    const execution = await this.prisma.automationExecution.create({
      data: {
        automationId,
        status: "RUNNING",
        context: {
          eventType: event.type,
          dealId: event.dealId,
          actorId: event.actorId,
          pipelineId: event.pipelineId,
          stageId: event.stageId,
          fromStageId: event.fromStageId,
          depth: event.depth ?? 0,
        } as Prisma.InputJsonValue,
      },
    });

    try {
      const deal = await this.loadDeal(event.organizationId, event.dealId);
      const conditionMatches = config.conditions.every((condition) =>
        this.evaluateCondition(condition, deal),
      );
      if (!conditionMatches) {
        await this.finishExecution(execution.id, "SKIPPED", null, "Condições não atendidas");
        return true;
      }
      if (!config.actions.length) {
        await this.finishExecution(execution.id, "SKIPPED", null, "Nenhuma ação configurada");
        return true;
      }

      for (const [index, action] of config.actions.entries()) {
        await this.log(execution.id, "info", `Executando ação ${index + 1}: ${action.type}`, action);
        await this.executeAction(action, event, automationId);
        await this.log(execution.id, "info", `Ação ${action.type} concluída`);
      }
      await this.finishExecution(execution.id, "SUCCESS", null, `Automação ${automationName} concluída`);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.finishExecution(execution.id, "FAILED", message, `Falha: ${message}`);
      this.logger.error(`Automation ${automationId} failed: ${message}`);
      return false;
    }
  }

  private async executeAction(action: AutomationAction, event: AutomationEvent, automationId: string) {
    const deal = await this.loadDeal(event.organizationId, event.dealId);
    switch (action.type) {
      case "CREATE_TASK": {
        const title = this.requiredString(action.config.title, "Título da tarefa");
        const status = await this.prisma.taskStatusDefinition.findFirst({
          where: {
            organizationId: event.organizationId,
            deletedAt: null,
            archived: false,
            active: true,
            category: "OPEN",
          },
          orderBy: { position: "asc" },
        });
        if (!status) throw new Error("Nenhum status aberto de tarefa está configurado");
        const dueInMinutes = Number(action.config.dueInMinutes ?? 0);
        const dueAt = dueInMinutes > 0 ? new Date(Date.now() + dueInMinutes * 60_000) : null;
        const task = await this.prisma.task.create({
          data: {
            organizationId: event.organizationId,
            title,
            description: typeof action.config.description === "string" ? action.config.description : null,
            type: "FOLLOW_UP",
            status: "PENDING",
            statusDefinitionId: status.id,
            priority: (typeof action.config.priority === "string" ? action.config.priority : "MEDIUM") as never,
            dueAt,
            assigneeId: deal.ownerId ?? event.actorId ?? null,
            createdById: event.actorId ?? deal.ownerId ?? null,
            contactId: deal.contactId,
            companyId: deal.companyId,
            dealId: deal.id,
            pipelineId: deal.pipelineId,
            stageId: deal.stageId,
          },
        });
        await this.prisma.activity.create({
          data: {
            organizationId: event.organizationId,
            type: ActivityType.TASK_CREATED,
            title: `Tarefa criada pela automação: ${title}`,
            taskId: task.id,
            dealId: deal.id,
            contactId: deal.contactId,
            actorId: event.actorId ?? null,
            metadata: { automationId },
          },
        });
        return;
      }
      case "MOVE_STAGE": {
        const targetStageId = this.requiredString(action.config.targetStageId, "Etapa de destino");
        if (targetStageId === deal.stageId) return;
        const stage = await this.prisma.pipelineStage.findFirst({
          where: {
            id: targetStageId,
            organizationId: event.organizationId,
            pipelineId: deal.pipelineId,
            deletedAt: null,
            archived: false,
          },
        });
        if (!stage) throw new Error("Etapa de destino inválida para este pipeline");
        const now = new Date();
        const status = stage.isWon || stage.type === PipelineStageType.WON
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
              lostReason: status === DealStatus.LOST ? deal.lostReason : null,
              updatedById: event.actorId ?? undefined,
            },
          });
          await tx.dealStageHistory.create({
            data: {
              dealId: deal.id,
              stageId: stage.id,
              fromStageId: deal.stageId,
              movedById: event.actorId ?? null,
              movedAt: now,
              note: "Movido por automação",
            },
          });
          await tx.activity.create({
            data: {
              organizationId: event.organizationId,
              type: ActivityType.STAGE_CHANGED,
              title: `Negócio movido automaticamente para ${stage.name}`,
              dealId: deal.id,
              contactId: deal.contactId,
              companyId: deal.companyId,
              actorId: event.actorId ?? null,
              metadata: { automationId, fromStageId: deal.stageId, stageId: stage.id },
            },
          });
        });
        await this.dispatch({
          ...event,
          type: "DEAL_STAGE_CHANGED",
          stageId: stage.id,
          fromStageId: deal.stageId,
          ancestry: [...(event.ancestry ?? []), automationId],
          depth: (event.depth ?? 0) + 1,
        });
        return;
      }
      case "ASSIGN_OWNER": {
        const ownerId = this.requiredString(action.config.ownerId, "Responsável");
        const owner = await this.prisma.user.findFirst({
          where: { id: ownerId, organizationId: event.organizationId, deletedAt: null },
          select: { id: true, name: true },
        });
        if (!owner) throw new Error("Responsável não encontrado nesta organização");
        await this.prisma.deal.update({ where: { id: deal.id }, data: { ownerId } });
        await this.prisma.activity.create({
          data: {
            organizationId: event.organizationId,
            type: ActivityType.OWNER_CHANGED,
            title: `Responsável definido automaticamente: ${owner.name}`,
            dealId: deal.id,
            contactId: deal.contactId,
            actorId: event.actorId ?? null,
            metadata: { automationId, ownerId },
          },
        });
        return;
      }
      case "ADD_TAG": {
        const tagId = this.requiredString(action.config.tagId, "Tag");
        const tag = await this.prisma.tag.findFirst({
          where: { id: tagId, organizationId: event.organizationId, deletedAt: null },
          select: { id: true, name: true },
        });
        if (!tag) throw new Error("Tag não encontrada nesta organização");
        await this.prisma.dealTag.createMany({ data: [{ dealId: deal.id, tagId }], skipDuplicates: true });
        await this.prisma.activity.create({
          data: {
            organizationId: event.organizationId,
            type: ActivityType.TAG_ADDED,
            title: `Tag adicionada automaticamente: ${tag.name}`,
            dealId: deal.id,
            contactId: deal.contactId,
            actorId: event.actorId ?? null,
            metadata: { automationId, tagId },
          },
        });
        return;
      }
      case "CREATE_NOTIFICATION": {
        const userId = deal.ownerId ?? event.actorId;
        if (!userId) throw new Error("O negócio não possui responsável para receber a notificação");
        const title = this.requiredString(action.config.title, "Título da notificação");
        await this.prisma.notification.create({
          data: {
            organizationId: event.organizationId,
            userId,
            type: "SYSTEM",
            title,
            body: typeof action.config.body === "string" ? action.config.body : null,
            href: `/pipelines?dealId=${deal.id}`,
            entityType: "DEAL",
            entityId: deal.id,
          },
        });
        return;
      }
      default:
        throw new Error(`Ação não suportada: ${String(action.type)}`);
    }
  }

  private async loadDeal(organizationId: string, dealId: string) {
    const deal = await this.prisma.deal.findFirst({
      where: { id: dealId, organizationId, deletedAt: null },
      include: { tags: true },
    });
    if (!deal) throw new Error("Negócio não encontrado para execução da automação");
    return deal;
  }

  private matchesTrigger(config: AutomationConfig, event: AutomationEvent) {
    const trigger = config.triggerConfig;
    if (trigger.pipelineId && trigger.pipelineId !== event.pipelineId) return false;
    if (trigger.fromStageId && trigger.fromStageId !== event.fromStageId) return false;
    if (trigger.toStageId && trigger.toStageId !== event.stageId) return false;
    return true;
  }

  private evaluateCondition(condition: AutomationCondition, deal: Awaited<ReturnType<AutomationEngineService["loadDeal"]>>) {
    const fieldMap: Record<string, unknown> = {
      value: Number(deal.value),
      ownerId: deal.ownerId,
      pipelineId: deal.pipelineId,
      stageId: deal.stageId,
      status: deal.status,
      source: deal.source,
      priority: deal.priority,
    };
    const actual = fieldMap[condition.field];
    const expected = condition.value;
    switch (condition.operator) {
      case "EQUALS": return String(actual ?? "") === String(expected ?? "");
      case "NOT_EQUALS": return String(actual ?? "") !== String(expected ?? "");
      case "GREATER_THAN": return Number(actual) > Number(expected);
      case "LESS_THAN": return Number(actual) < Number(expected);
      case "CONTAINS": return String(actual ?? "").toLowerCase().includes(String(expected ?? "").toLowerCase());
      case "IS_EMPTY": return actual === null || actual === undefined || actual === "";
      case "IS_NOT_EMPTY": return actual !== null && actual !== undefined && actual !== "";
      default: return false;
    }
  }

  private normalizeConfig(value: Prisma.JsonValue | null): AutomationConfig {
    const raw = value && typeof value === "object" && !Array.isArray(value)
      ? value as Record<string, unknown>
      : {};
    return {
      triggerConfig: raw.triggerConfig && typeof raw.triggerConfig === "object" && !Array.isArray(raw.triggerConfig)
        ? raw.triggerConfig as AutomationConfig["triggerConfig"]
        : {},
      conditions: Array.isArray(raw.conditions) ? raw.conditions as unknown as AutomationCondition[] : [],
      actions: Array.isArray(raw.actions) ? raw.actions as unknown as AutomationAction[] : [],
    };
  }

  private requiredString(value: unknown, label: string) {
    if (typeof value !== "string" || !value.trim()) throw new Error(`${label} não configurado`);
    return value.trim();
  }

  private async log(executionId: string, level: string, message: string, data?: unknown) {
    await this.prisma.automationExecutionLog.create({
      data: {
        executionId,
        level,
        message,
        data: data === undefined ? undefined : data as Prisma.InputJsonValue,
      },
    });
  }

  private async finishExecution(executionId: string, status: string, error: string | null, message: string) {
    await this.log(executionId, error ? "error" : "info", message);
    await this.prisma.automationExecution.update({
      where: { id: executionId },
      data: { status, error, finishedAt: new Date() },
    });
  }
}
