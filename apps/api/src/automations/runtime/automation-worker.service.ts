import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { hostname } from "node:os";
import { AUTOMATION_LIMITS, DOMAIN_EVENT_TYPES, JOB_TYPES } from "../domain/constants";
import { DomainEventsService } from "./domain-events.service";
import { AutomationQueueService } from "./automation-queue.service";
import { AutomationRuntimeService } from "./automation-runtime.service";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class AutomationWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AutomationWorkerService.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private lastScheduleMinute = "";
  private readonly workerId = `${hostname()}:${process.pid}:${Math.random().toString(36).slice(2, 8)}`;

  constructor(
    private readonly events: DomainEventsService,
    private readonly queue: AutomationQueueService,
    private readonly runtime: AutomationRuntimeService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => {
      void this.tick();
    }, AUTOMATION_LIMITS.workerPollMs);
    void this.tick();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async tick() {
    if (this.running) return;
    this.running = true;
    this.runtime.markBeat();
    try {
      await this.emitScheduleTicks();
      await this.emitTaskDeadlineEvents();
      await this.drainEvents();
      await this.drainJobs();
    } catch (error) {
      this.logger.error("Automation worker tick failed", error instanceof Error ? error.stack : String(error));
    } finally {
      this.running = false;
    }
  }

  private async emitScheduleTicks() {
    const now = new Date();
    const minuteKey = now.toISOString().slice(0, 16);
    if (minuteKey === this.lastScheduleMinute) return;
    this.lastScheduleMinute = minuteKey;
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(now);
    const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
    const organizations = await this.prisma.organization.findMany({ where: { deletedAt: null }, select: { id: true } });
    for (const organization of organizations) {
      await this.events.emitStandalone({ organizationId: organization.id, eventType: DOMAIN_EVENT_TYPES.SCHEDULE_TICK, aggregateType: "schedule", aggregateId: `${organization.id}:${minuteKey}`, origin: "SYSTEM", payload: { weekday: value("weekday"), hour: value("hour"), minute: value("minute"), timestamp: now.toISOString() }, deduplicationKey: `schedule:${organization.id}:${minuteKey}` });
    }
  }

  private async emitTaskDeadlineEvents() {
    const now = new Date();
    const minuteStart = new Date(now);
    minuteStart.setSeconds(0, 0);
    const minuteEnd = new Date(minuteStart.getTime() + 60_000);
    const tasks = await this.prisma.task.findMany({
      where: {
        deletedAt: null,
        dueAt: { not: null, lt: minuteEnd },
        status: { notIn: ["COMPLETED", "CANCELLED"] },
      },
      select: {
        id: true, organizationId: true, dueAt: true, dealId: true, contactId: true,
        assigneeId: true, pipelineId: true, stageId: true,
      },
      take: 500,
    });
    for (const task of tasks) {
      if (!task.dueAt) continue;
      const isDueNow = task.dueAt >= minuteStart;
      const eventType = isDueNow ? DOMAIN_EVENT_TYPES.TASK_DUE : DOMAIN_EVENT_TYPES.TASK_OVERDUE;
      const periodKey = isDueNow
        ? task.dueAt.toISOString().slice(0, 16)
        : now.toISOString().slice(0, 10);
      await this.events.emitStandalone({
        organizationId: task.organizationId,
        eventType,
        aggregateType: "task",
        aggregateId: task.id,
        origin: "SYSTEM",
        payload: {
          taskId: task.id, dueAt: task.dueAt.toISOString(), dealId: task.dealId,
          contactId: task.contactId, ownerId: task.assigneeId,
          pipelineId: task.pipelineId, stageId: task.stageId,
        },
        subjectType: "task",
        subjectId: task.id,
        deduplicationKey: `${eventType}:${task.id}:${periodKey}`,
      });
    }
  }

  private async drainEvents() {
    const events = await this.events.claim(this.workerId);
    for (const event of events) {
      try {
        if (event.attempts > event.maxAttempts) {
          await this.events.fail(event.id, event.lastError ?? "Max attempts exceeded", false);
          continue;
        }
        await this.runtime.processDomainEvent(event);
        await this.events.complete(event.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await this.events.fail(event.id, message, event.attempts < event.maxAttempts);
      }
    }
  }

  private async drainJobs() {
    const jobs = await this.queue.claim(this.workerId);
    for (const job of jobs) {
      try {
        if (job.attempts > job.maxAttempts) {
          await this.queue.fail(job.id, job.lastError ?? "Max attempts exceeded", false);
          continue;
        }
        const payload = (job.payload ?? {}) as { handle?: string };
        if (job.jobType === JOB_TYPES.START_EXECUTION && job.executionId) {
          await this.runtime.startExecution(job.executionId);
        } else if (job.jobType === JOB_TYPES.CONTINUE && job.executionId && job.nodeId) {
          await this.runtime.continueExecution(job.executionId, job.nodeId, payload.handle ?? "out");
        } else if (job.jobType === JOB_TYPES.WAIT_TIMEOUT && job.executionId && job.nodeId) {
          await this.runtime.timeoutWait(job.executionId, job.nodeId);
        }
        await this.queue.complete(job.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const permanent = /não encontrado|inválid|inativ|desconect/i.test(message);
        await this.queue.fail(job.id, message, !permanent && job.attempts < job.maxAttempts);
      }
    }
  }
}
