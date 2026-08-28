import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { hostname } from "node:os";
import { AUTOMATION_LIMITS, JOB_TYPES } from "../domain/constants";
import { DomainEventsService } from "./domain-events.service";
import { AutomationQueueService } from "./automation-queue.service";
import { AutomationRuntimeService } from "./automation-runtime.service";

@Injectable()
export class AutomationWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AutomationWorkerService.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private readonly workerId = `${hostname()}:${process.pid}:${Math.random().toString(36).slice(2, 8)}`;

  constructor(
    private readonly events: DomainEventsService,
    private readonly queue: AutomationQueueService,
    private readonly runtime: AutomationRuntimeService,
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
      await this.drainEvents();
      await this.drainJobs();
    } catch (error) {
      this.logger.error("Automation worker tick failed", error instanceof Error ? error.stack : String(error));
    } finally {
      this.running = false;
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
