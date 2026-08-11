import { BadRequestException, ConflictException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { DealsService } from "./deals.service";

type MockMethod = jest.Mock<Promise<unknown>, unknown[]>;

type TransactionMock = {
  $queryRaw: MockMethod;
  $executeRaw: MockMethod;
  pipeline: { findFirst: MockMethod };
  pipelineStage: { findFirst: MockMethod; findUnique: MockMethod; findMany: MockMethod };
  deal: {
    create: MockMethod;
    findFirst: MockMethod;
    findMany: MockMethod;
    update: MockMethod;
    updateMany: MockMethod;
  };
  dealStageHistory: {
    create: MockMethod;
    createMany: MockMethod;
  };
  activity: {
    create: MockMethod;
    createMany: MockMethod;
  };
  user: { findFirst: MockMethod; findMany: MockMethod };
  contact: { findFirst: MockMethod; create: MockMethod };
  attribution: { create: MockMethod };
  note: { create: MockMethod };
  task: { create: MockMethod };
  taskStatusDefinition: { findFirst: MockMethod };
  company: { findFirst: MockMethod };
  team: { findFirst: MockMethod };
  conversation: { findFirst: MockMethod };
};

type PrismaMock = {
  $transaction: jest.Mock<Promise<unknown>, [(transaction: TransactionMock) => Promise<unknown>]>;
  contact: { findFirst: MockMethod };
};

const organizationId = "org-test";
const pipelineId = "pipeline-test";
const userId = "user-test";

function method(): MockMethod {
  return jest.fn();
}

function createTransactionMock(): TransactionMock {
  return {
    $queryRaw: method(),
    $executeRaw: method(),
    pipeline: { findFirst: method() },
    pipelineStage: { findFirst: method(), findUnique: method(), findMany: method() },
    deal: {
      create: method(),
      findFirst: method(),
      findMany: method(),
      update: method(),
      updateMany: method(),
    },
    dealStageHistory: {
      create: method(),
      createMany: method(),
    },
    activity: {
      create: method(),
      createMany: method(),
    },
    user: { findFirst: method(), findMany: method() },
    contact: { findFirst: method(), create: method() },
    attribution: { create: method() },
    note: { create: method() },
    task: { create: method() },
    taskStatusDefinition: { findFirst: method() },
    company: { findFirst: method() },
    team: { findFirst: method() },
    conversation: { findFirst: method() },
  };
}

function createPrismaMock(transaction: TransactionMock): PrismaMock {
  return {
    $transaction: jest.fn(async (callback) => callback(transaction)),
    contact: { findFirst: method() },
  };
}

function deal(
  overrides: Partial<{
    pipelineId: string;
    stageId: string;
    status: "OPEN" | "WON" | "LOST";
    closedAt: Date | null;
    lostReason: string | null;
  }> = {},
) {
  return {
    id: "deal-test",
    organizationId,
    pipelineId: overrides.pipelineId ?? pipelineId,
    stageId: overrides.stageId ?? "stage-source",
    contactId: "contact-test",
    companyId: null,
    ownerId: userId,
    teamId: null,
    conversationId: null,
    status: overrides.status ?? "OPEN",
    closedAt: overrides.closedAt ?? null,
    lostReason: overrides.lostReason ?? null,
  };
}

function stage(id: string, type: "OPEN" | "WON" | "LOST", targetPipelineId = pipelineId) {
  return {
    id,
    pipelineId: targetPipelineId,
    name: `Stage ${type}`,
    type,
    isWon: type === "WON",
    isLost: type === "LOST",
  };
}

describe("DealsService Kanban integrity", () => {
  let transaction: TransactionMock;
  let prisma: PrismaMock;
  let service: DealsService;

  beforeEach(() => {
    transaction = createTransactionMock();
    prisma = createPrismaMock(transaction);
    service = new DealsService(prisma as unknown as PrismaService);

    transaction.user.findFirst.mockResolvedValue({ id: userId });
    transaction.pipeline.findFirst.mockResolvedValue({ id: pipelineId });
    transaction.pipelineStage.findUnique.mockResolvedValue({ name: "Stage OPEN" });
    transaction.dealStageHistory.create.mockResolvedValue({});
    transaction.activity.create.mockResolvedValue({});
    transaction.$queryRaw.mockResolvedValue([{ seq: 1 }]);
  });

  it("rejects a stage that is not active in the selected pipeline", async () => {
    transaction.pipelineStage.findFirst.mockResolvedValue(null);

    await expect(
      service.create(
        organizationId,
        {
          name: "Deal mismatch",
          pipelineId,
          stageId: "stage-from-another-pipeline",
        },
        userId,
      ),
    ).rejects.toThrow(
      new BadRequestException(
        "Stage stage-from-another-pipeline is not an active stage in pipeline pipeline-test",
      ),
    );

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(transaction.deal.create).not.toHaveBeenCalled();
    expect(transaction.dealStageHistory.create).not.toHaveBeenCalled();
    expect(transaction.activity.create).not.toHaveBeenCalled();
  });

  it("moves the deal, history, and activity through one transaction", async () => {
    const source = deal();
    const target = stage("stage-won", "WON");
    transaction.deal.findFirst.mockResolvedValue(source);
    transaction.pipelineStage.findFirst.mockResolvedValue(target);
    transaction.deal.update.mockResolvedValue({
      ...source,
      stageId: target.id,
      status: "WON",
    });

    await service.moveStage(organizationId, source.id, { stageId: target.id }, userId);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(transaction.deal.update).toHaveBeenCalledWith({
      where: { id: source.id },
      data: expect.objectContaining({
        stageId: target.id,
        status: "WON",
        closedAt: expect.any(Date),
        enteredStageAt: expect.any(Date),
        lostReason: null,
        updatedById: userId,
      }),
      include: { stage: true },
    });
    expect(transaction.dealStageHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        dealId: source.id,
        stageId: target.id,
        fromStageId: source.stageId,
        movedById: userId,
        movedAt: expect.any(Date),
      }),
    });
    expect(transaction.activity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId,
        dealId: source.id,
        type: "STAGE_CHANGED",
        actorId: userId,
      }),
    });
  });

  it("reopens a won deal when it returns to an OPEN stage", async () => {
    const source = deal({
      stageId: "stage-won",
      status: "WON",
      closedAt: new Date("2026-01-01T00:00:00.000Z"),
      lostReason: "stale reason",
    });
    const target = stage("stage-open", "OPEN");
    transaction.deal.findFirst.mockResolvedValue(source);
    transaction.pipelineStage.findFirst.mockResolvedValue(target);
    transaction.deal.update.mockResolvedValue({
      ...source,
      stageId: target.id,
      status: "OPEN",
      closedAt: null,
      lostReason: null,
    });

    await service.moveStage(organizationId, source.id, { stageId: target.id }, userId);

    expect(transaction.deal.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          stageId: target.id,
          status: "OPEN",
          closedAt: null,
          lostReason: null,
          enteredStageAt: expect.any(Date),
          updatedById: userId,
        }),
      }),
    );
    expect(transaction.dealStageHistory.create).toHaveBeenCalledTimes(1);
    expect(transaction.activity.create).toHaveBeenCalledTimes(1);
  });

  it("reuses a contact and blocks an active duplicate inside the transaction", async () => {
    transaction.pipelineStage.findFirst.mockResolvedValue(stage("stage-open", "OPEN"));
    transaction.contact.findFirst.mockResolvedValue({ id: "contact-test", firstName: "Maria" });
    transaction.deal.findFirst.mockResolvedValue({
      id: "existing",
      leadSequence: 12,
      stageId: "stage-open",
    });

    await expect(
      service.createManualLead(
        organizationId,
        { phone: "(47) 98833-4464", contactName: "Maria Silva", pipelineId, stageId: "stage-open" },
        userId,
      ),
    ).rejects.toThrow(ConflictException);

    expect(transaction.contact.create).not.toHaveBeenCalled();
    expect(transaction.$executeRaw).toHaveBeenCalledTimes(1);
    expect(transaction.deal.create).not.toHaveBeenCalled();
  });

  it("creates contact and deal with automatic identity in one transaction", async () => {
    const target = stage("stage-open", "OPEN");
    transaction.pipelineStage.findFirst.mockResolvedValue(target);
    transaction.contact.findFirst.mockResolvedValue(null);
    transaction.contact.create.mockResolvedValue({
      id: "contact-new",
      firstName: "Maria",
      lastName: "Silva",
    });
    transaction.deal.findFirst.mockResolvedValue(null);
    transaction.$queryRaw.mockResolvedValue([{ seq: 28 }]);
    transaction.deal.create.mockResolvedValue({
      id: "deal-new",
      leadSequence: 28,
      contactId: "contact-new",
    });

    await service.createManualLead(
      organizationId,
      { phone: "+55 47 98833-4464", contactName: "Maria Silva", pipelineId, stageId: target.id },
      userId,
    );

    expect(transaction.contact.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ phone: "5547988334464" }),
    });
    expect(transaction.deal.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "Lead #0028 · Maria Silva",
          leadSequence: 28,
          value: undefined,
        }),
      }),
    );
    expect(transaction.dealStageHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ dealId: "deal-new", stageId: target.id }),
    });
  });
});
