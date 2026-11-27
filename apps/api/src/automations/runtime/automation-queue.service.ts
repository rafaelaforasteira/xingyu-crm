import { Injectable } from "@nestjs/common";
import { Prisma } from "@xingyu/database";
import { PrismaService } from "../../prisma/prisma.service";
import { AUTOMATION_LIMITS, JOB_TYPES } from "../domain/constants";

@Injectable()
export class AutomationQueueService {
  constructor(private readonly prisma: PrismaService) {}

  async enqueue(input: {
    organizationId: string;
    automationId?: string | null;
    executionId?: string | null;
    nodeId?: string | null;
    jobType: string;
    payload?: Record<string, unknown>;
    runAt?: Date;
    uniqueKey?: string | null;
    maxAttempts?: number;
  }) {
    try {
      return await this.prisma.automationJob.create({
        data: {
          organizationId: input.organizationId,
          automationId: input.automationId ?? null,
          executionId: input.executionId ?? null,
          nodeId: input.nodeId ?? null,
          jobType: input.jobType,
          payload: (input.payload ?? {}) as Prisma.InputJsonValue,
          runAt: input.runAt ?? new Date(),
          uniqueKey: input.uniqueKey ?? null,
          maxAttempts: input.maxAttempts ?? 8,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return null;
      }
      throw error;
    }
  }

  async claim(workerId: string, limit = AUTOMATION_LIMITS.claimBatch) {
    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>`
      WITH picked AS (
        SELECT id FROM "AutomationJob"
        WHERE (
            (status = 'PENDING' AND "runAt" <= NOW())
            OR (status = 'RUNNING' AND "leaseUntil" IS NOT NULL AND "leaseUntil" < NOW())
          )
        ORDER BY "runAt" ASC, "createdAt" ASC
        FOR UPDATE SKIP LOCKED
        LIMIT ${limit}
      )
      UPDATE "AutomationJob" j
      SET status = 'RUNNING',
          "lockedAt" = NOW(),
          "lockedBy" = ${workerId},
          "leaseUntil" = NOW() + (${AUTOMATION_LIMITS.jobLeaseMs} || ' milliseconds')::interval,
          attempts = j.attempts + 1
      FROM picked
      WHERE j.id = picked.id
      RETURNING j.id
    `;
    if (!rows.length) return [];
    return this.prisma.automationJob.findMany({ where: { id: { in: rows.map((row) => row.id) } } });
  }

  async complete(id: string) {
    await this.prisma.automationJob.update({
      where: { id },
      data: { status: "COMPLETED", completedAt: new Date(), lockedAt: null, lockedBy: null, leaseUntil: null },
    });
  }

  async fail(id: string, error: string, retry: boolean, runAt?: Date) {
    await this.prisma.automationJob.update({
      where: { id },
      data: retry
        ? {
            status: "PENDING",
            lastError: error.slice(0, 1_800),
            runAt: runAt ?? new Date(Date.now() + 20_000),
            lockedAt: null,
            lockedBy: null,
            leaseUntil: null,
          }
        : { status: "FAILED", lastError: error.slice(0, 1_800), completedAt: new Date(), lockedAt: null, lockedBy: null, leaseUntil: null },
    });
  }

  async cancelForExecution(executionId: string) {
    await this.prisma.automationJob.updateMany({
      where: { executionId, status: { in: ["PENDING", "RUNNING"] } },
      data: { status: "CANCELED", completedAt: new Date(), lockedAt: null, lockedBy: null, leaseUntil: null },
    });
    await this.prisma.automationWaitSubscription.updateMany({
      where: { executionId, status: "WAITING" },
      data: { status: "CANCELED", resumedAt: new Date() },
    });
  }

  startJob(organizationId: string, executionId: string, automationId: string, uniqueKey?: string) {
    return this.enqueue({
      organizationId,
      executionId,
      automationId,
      jobType: JOB_TYPES.START_EXECUTION,
      uniqueKey: uniqueKey ?? `start:${executionId}`,
    });
  }
}
