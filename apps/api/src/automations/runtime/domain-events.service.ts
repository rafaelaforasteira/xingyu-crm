import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@xingyu/database";
import { PrismaService } from "../../prisma/prisma.service";
import { AUTOMATION_LIMITS, type EventOrigin } from "../domain/constants";

type Db = Prisma.TransactionClient | PrismaService;

export interface DomainEventInput {
  organizationId: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  subjectType?: string | null;
  subjectId?: string | null;
  origin?: EventOrigin;
  actorId?: string | null;
  correlationId?: string | null;
  payload: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  deduplicationKey?: string | null;
}

@Injectable()
export class DomainEventsService {
  private readonly logger = new Logger(DomainEventsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async emit(db: Db, event: DomainEventInput) {
    try {
      await db.automationDomainEvent.create({
        data: {
          organizationId: event.organizationId,
          eventType: event.eventType,
          aggregateType: event.aggregateType,
          aggregateId: event.aggregateId,
          subjectType: event.subjectType ?? event.aggregateType,
          subjectId: event.subjectId ?? event.aggregateId,
          origin: event.origin ?? "SYSTEM",
          actorId: event.actorId ?? null,
          correlationId: event.correlationId ?? null,
          payload: event.payload as Prisma.InputJsonValue,
          metadata: (event.metadata ?? {}) as Prisma.InputJsonValue,
          deduplicationKey: event.deduplicationKey ?? null,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return;
      }
      this.logger.error(`Failed to enqueue domain event ${event.eventType}`, error instanceof Error ? error.stack : String(error));
      throw error;
    }
  }

  async emitStandalone(event: DomainEventInput) {
    return this.emit(this.prisma, event);
  }

  async claim(workerId: string, limit = AUTOMATION_LIMITS.claimBatch) {
    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>`
      WITH picked AS (
        SELECT id FROM "AutomationDomainEvent"
        WHERE status IN ('PENDING', 'RUNNING')
          AND "availableAt" <= NOW()
          AND ("leaseUntil" IS NULL OR "leaseUntil" < NOW())
        ORDER BY "availableAt" ASC, "createdAt" ASC
        FOR UPDATE SKIP LOCKED
        LIMIT ${limit}
      )
      UPDATE "AutomationDomainEvent" e
      SET status = 'RUNNING',
          "lockedAt" = NOW(),
          "lockedBy" = ${workerId},
          "leaseUntil" = NOW() + (${AUTOMATION_LIMITS.eventLeaseMs} || ' milliseconds')::interval,
          attempts = e.attempts + 1
      FROM picked
      WHERE e.id = picked.id
      RETURNING e.id
    `;
    if (!rows.length) return [];
    return this.prisma.automationDomainEvent.findMany({
      where: { id: { in: rows.map((row) => row.id) } },
    });
  }

  async complete(id: string) {
    await this.prisma.automationDomainEvent.update({
      where: { id },
      data: { status: "PROCESSED", processedAt: new Date(), lockedAt: null, lockedBy: null, leaseUntil: null },
    });
  }

  async fail(id: string, error: string, retry: boolean) {
    await this.prisma.automationDomainEvent.update({
      where: { id },
      data: retry
        ? {
            status: "PENDING",
            lastError: error.slice(0, 1_800),
            availableAt: new Date(Date.now() + 15_000),
            lockedAt: null,
            lockedBy: null,
            leaseUntil: null,
          }
        : { status: "FAILED", lastError: error.slice(0, 1_800), processedAt: new Date(), lockedAt: null, lockedBy: null, leaseUntil: null },
    });
  }
}
