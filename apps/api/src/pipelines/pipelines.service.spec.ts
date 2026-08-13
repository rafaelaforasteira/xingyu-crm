import { BadRequestException, ConflictException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { PipelinesService } from "./pipelines.service";

type MockMethod = jest.Mock<Promise<unknown>, unknown[]>;

type PrismaMock = {
  pipeline: {
    findFirst: MockMethod;
  };
  pipelineStage: {
    aggregate: MockMethod;
    count: MockMethod;
    create: MockMethod;
    findFirst: MockMethod;
    findMany: MockMethod;
    update: MockMethod;
    updateMany: MockMethod;
  };
  deal: {
    aggregate: MockMethod;
    findMany: MockMethod;
    updateMany: MockMethod;
  };
  dealStageHistory: {
    createMany: MockMethod;
  };
  activity: {
    createMany: MockMethod;
  };
  auditLog: {
    create: MockMethod;
  };
  $transaction: jest.Mock<Promise<unknown>, [(tx: PrismaMock) => Promise<unknown>]>;
};

const organizationId = "org-test";
const pipelineId = "pipeline-test";
const userId = "user-test";

function method(): MockMethod {
  return jest.fn();
}

function createPrismaMock(): PrismaMock {
  const prisma: PrismaMock = {
    pipeline: {
      findFirst: method(),
    },
    pipelineStage: {
      aggregate: method(),
      count: method(),
      create: method(),
      findFirst: method(),
      findMany: method(),
      update: method(),
      updateMany: method(),
    },
    deal: {
      aggregate: method(),
      findMany: method(),
      updateMany: method(),
    },
    dealStageHistory: {
      createMany: method(),
    },
    activity: {
      createMany: method(),
    },
    auditLog: {
      create: method(),
    },
    $transaction: jest.fn(),
  };

  prisma.$transaction.mockImplementation(async (callback) => callback(prisma));
  return prisma;
}

function pipelineResult() {
  return {
    id: pipelineId,
    organizationId,
    name: "Pipeline de teste",
    description: null,
    color: "#7C3AED",
    icon: null,
    isDefault: false,
    favorite: false,
    position: 0,
    archived: false,
    accessMode: "ORGANIZATION" as const,
    defaultTeamId: null,
    defaultOwnerId: null,
    createdById: userId,
    updatedById: userId,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    deletedAt: null,
    defaultTeam: null,
    defaultOwner: null,
    stages: [],
    stagesCount: 0,
    dealsCount: 0,
    openValue: 0,
    channels: [],
  };
}

function stage(
  id: string,
  overrides: Partial<{
    name: string;
    type: "OPEN" | "WON" | "LOST";
    position: number;
    isInitial: boolean;
    archived: boolean;
  }> = {},
) {
  return {
    id,
    organizationId,
    pipelineId,
    name: overrides.name ?? id,
    description: null,
    color: "#A78BFA",
    position: overrides.position ?? 0,
    type: overrides.type ?? "OPEN",
    isInitial: overrides.isInitial ?? false,
    maxDurationMinutes: null,
    probability: null,
    archived: overrides.archived ?? false,
    isWon: overrides.type === "WON",
    isLost: overrides.type === "LOST",
    maxDaysInStage: null,
    rules: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    deletedAt: null,
  };
}

describe("PipelinesService stage management", () => {
  let prisma: PrismaMock;
  let service: PipelinesService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new PipelinesService(prisma as unknown as PrismaService);
    jest.spyOn(service, "findOne").mockResolvedValue(pipelineResult());
  });

  it("creates an initial open stage and removes the previous initial flag", async () => {
    const created = stage("stage-new", {
      name: "Diagnóstico",
      position: 4,
      isInitial: true,
    });
    prisma.pipelineStage.aggregate.mockResolvedValue({ _max: { position: 3 } });
    prisma.pipelineStage.create.mockResolvedValue(created);
    prisma.pipelineStage.updateMany.mockResolvedValue({ count: 1 });
    prisma.auditLog.create.mockResolvedValue({});

    await expect(
      service.addStage(
        organizationId,
        pipelineId,
        {
          name: " Diagnóstico ",
          type: "OPEN",
          isInitial: true,
          maxDurationMinutes: 90,
          probability: 40,
        },
        userId,
      ),
    ).resolves.toEqual(created);

    expect(prisma.pipelineStage.updateMany).toHaveBeenCalledWith({
      where: { pipelineId, deletedAt: null, isInitial: true },
      data: { isInitial: false },
    });
    expect(prisma.pipelineStage.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId,
        pipelineId,
        name: "Diagnóstico",
        type: "OPEN",
        isInitial: true,
        position: 4,
        maxDurationMinutes: 90,
        probability: 40,
      }),
    });
  });

  it("rejects a won or lost stage marked as initial", async () => {
    await expect(
      service.addStage(
        organizationId,
        pipelineId,
        { name: "Ganho", type: "WON", isInitial: true },
        userId,
      ),
    ).rejects.toThrow(new BadRequestException("Won or lost stages cannot be initial"));

    await expect(
      service.addStage(
        organizationId,
        pipelineId,
        { name: "Perdido", type: "LOST", isInitial: true },
        userId,
      ),
    ).rejects.toThrow(new BadRequestException("Won or lost stages cannot be initial"));

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("requires the full active-stage set and persists every reordered position", async () => {
    prisma.pipelineStage.findMany
      .mockResolvedValueOnce([{ id: "stage-a" }, { id: "stage-b" }, { id: "stage-c" }])
      .mockResolvedValueOnce([
        stage("stage-c", { position: 0 }),
        stage("stage-a", { position: 1 }),
        stage("stage-b", { position: 2 }),
      ]);
    prisma.pipelineStage.update.mockResolvedValue({});
    prisma.auditLog.create.mockResolvedValue({});

    await expect(
      service.reorderStages(
        organizationId,
        pipelineId,
        { stageIds: ["stage-c", "stage-a"] },
        userId,
      ),
    ).rejects.toThrow(
      new BadRequestException(
        "stageIds must contain every active stage in this pipeline exactly once",
      ),
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();

    prisma.pipelineStage.findMany
      .mockReset()
      .mockResolvedValueOnce([{ id: "stage-a" }, { id: "stage-b" }, { id: "stage-c" }])
      .mockResolvedValueOnce([
        stage("stage-c", { position: 0 }),
        stage("stage-a", { position: 1 }),
        stage("stage-b", { position: 2 }),
      ]);

    const result = await service.reorderStages(
      organizationId,
      pipelineId,
      { stageIds: ["stage-c", "stage-a", "stage-b"] },
      userId,
    );

    expect(prisma.pipelineStage.update.mock.calls).toEqual(
      expect.arrayContaining([
        [{ where: { id: "stage-c" }, data: { position: 0 } }],
        [{ where: { id: "stage-a" }, data: { position: 1 } }],
        [{ where: { id: "stage-b" }, data: { position: 2 } }],
      ]),
    );
    expect(result.map((entry) => entry.id)).toEqual(["stage-c", "stage-a", "stage-b"]);
  });

  it("blocks deletion when a stage has a deal and no target stage", async () => {
    prisma.pipelineStage.findFirst.mockResolvedValue(stage("stage-source", { isInitial: false }));
    prisma.pipelineStage.count.mockResolvedValueOnce(2).mockResolvedValueOnce(1);
    prisma.deal.findMany.mockResolvedValue([{ id: "deal-1" }]);

    await expect(
      service.removeStage(organizationId, pipelineId, "stage-source", {}, userId),
    ).rejects.toThrow(
      new ConflictException("Stage has deals; select targetStageId before deleting it"),
    );

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.pipelineStage.update).not.toHaveBeenCalled();
  });

  it("moves deals, records history, and soft-deletes the source in one transaction", async () => {
    const source = stage("stage-source", {
      name: "Triagem",
      position: 0,
    });
    const target = stage("stage-target", {
      name: "Ganho",
      type: "WON",
      position: 1,
    });
    const removed = {
      ...source,
      archived: true,
      isInitial: false,
      deletedAt: new Date("2026-01-02T00:00:00.000Z"),
    };
    prisma.pipelineStage.findFirst.mockResolvedValueOnce(source).mockResolvedValueOnce(target);
    prisma.pipelineStage.count.mockResolvedValueOnce(2).mockResolvedValueOnce(1);
    prisma.pipelineStage.findMany.mockResolvedValue([{ id: target.id }]);
    prisma.pipelineStage.update.mockResolvedValueOnce(removed).mockResolvedValueOnce(target);
    prisma.deal.findMany.mockResolvedValue([{ id: "deal-1" }, { id: "deal-2" }]);
    prisma.deal.updateMany.mockResolvedValue({ count: 2 });
    prisma.dealStageHistory.createMany.mockResolvedValue({ count: 2 });
    prisma.activity.createMany.mockResolvedValue({ count: 2 });
    prisma.auditLog.create.mockResolvedValue({});

    await expect(
      service.removeStage(
        organizationId,
        pipelineId,
        source.id,
        { targetStageId: target.id },
        userId,
      ),
    ).resolves.toEqual(removed);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.deal.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["deal-1", "deal-2"] } },
      data: expect.objectContaining({
        stageId: target.id,
        status: "WON",
        updatedById: userId,
      }),
    });
    expect(prisma.dealStageHistory.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          dealId: "deal-1",
          stageId: target.id,
          fromStageId: source.id,
          movedById: userId,
        }),
        expect.objectContaining({
          dealId: "deal-2",
          stageId: target.id,
          fromStageId: source.id,
          movedById: userId,
        }),
      ]),
    });
    expect(prisma.activity.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          organizationId,
          dealId: "deal-1",
          type: "STAGE_CHANGED",
        }),
      ]),
    });
    expect(prisma.pipelineStage.update).toHaveBeenCalledWith({
      where: { id: source.id },
      data: expect.objectContaining({
        archived: true,
        isInitial: false,
        deletedAt: expect.any(Date),
      }),
    });
  });

  it("rejects duplicate stage names case-insensitively within the pipeline", async () => {
    prisma.pipelineStage.findFirst.mockResolvedValue(stage("stage-existing", { name: "Contato" }));

    await expect(
      service.addStage(organizationId, pipelineId, { name: " contato ", type: "OPEN" }, userId),
    ).rejects.toThrow(
      new ConflictException("A stage with this name already exists in the pipeline"),
    );

    expect(prisma.pipelineStage.create).not.toHaveBeenCalled();
  });

  it("keeps at least one active stage", async () => {
    prisma.pipelineStage.findFirst.mockResolvedValue(stage("stage-only"));
    prisma.pipelineStage.count.mockResolvedValue(1);

    await expect(
      service.removeStage(organizationId, pipelineId, "stage-only", {}, userId),
    ).rejects.toThrow(new ConflictException("Pipeline must keep at least one active stage"));

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("promotes the first remaining open stage when deleting the initial stage", async () => {
    const source = stage("stage-source", { isInitial: true });
    const replacement = stage("stage-replacement", { position: 1 });
    prisma.pipelineStage.findFirst.mockResolvedValueOnce(source).mockResolvedValueOnce(replacement);
    prisma.pipelineStage.count.mockResolvedValueOnce(2).mockResolvedValueOnce(1);
    prisma.deal.findMany.mockResolvedValue([]);
    prisma.pipelineStage.findMany.mockResolvedValue([{ id: replacement.id }]);
    prisma.pipelineStage.update.mockResolvedValue(source);
    prisma.auditLog.create.mockResolvedValue({});

    await service.removeStage(organizationId, pipelineId, source.id, {}, userId);

    expect(prisma.pipelineStage.update).toHaveBeenCalledWith({
      where: { id: replacement.id },
      data: { isInitial: true },
    });
  });
});
