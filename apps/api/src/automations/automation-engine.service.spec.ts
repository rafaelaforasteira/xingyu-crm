import { AutomationEngineService } from "./automation-engine.service";

describe("AutomationEngineService", () => {
  const prisma = {
    automation: { findMany: jest.fn(), findFirstOrThrow: jest.fn() },
    automationExecution: { create: jest.fn(), update: jest.fn() },
    automationExecutionLog: { create: jest.fn() },
    deal: { findFirst: jest.fn(), update: jest.fn() },
    taskStatusDefinition: { findFirst: jest.fn() },
    task: { create: jest.fn() },
    activity: { create: jest.fn() },
    pipelineStage: { findFirst: jest.fn() },
    user: { findFirst: jest.fn() },
    tag: { findFirst: jest.fn() },
    dealTag: { createMany: jest.fn() },
    notification: { create: jest.fn() },
    $transaction: jest.fn(),
  };

  const deal = {
    id: "deal-1",
    organizationId: "org-1",
    pipelineId: "pipeline-1",
    stageId: "stage-new",
    name: "Lead Amanda",
    value: 1200,
    ownerId: "user-1",
    contactId: "contact-1",
    companyId: null,
    status: "OPEN",
    source: "instagram",
    priority: "MEDIUM",
    lostReason: null,
    tags: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.deal.findFirst.mockResolvedValue(deal);
    prisma.automationExecution.create.mockResolvedValue({ id: "execution-1" });
    prisma.automationExecutionLog.create.mockResolvedValue({ id: "log-1" });
    prisma.automationExecution.update.mockResolvedValue({});
    prisma.taskStatusDefinition.findFirst.mockResolvedValue({ id: "status-open" });
    prisma.task.create.mockResolvedValue({ id: "task-1" });
    prisma.activity.create.mockResolvedValue({ id: "activity-1" });
  });

  it("executes a native task action when trigger and conditions match", async () => {
    prisma.automation.findMany.mockResolvedValue([
      {
        id: "automation-1",
        name: "Follow-up de alto valor",
        config: {
          triggerConfig: { pipelineId: "pipeline-1", toStageId: "stage-new" },
          conditions: [{ field: "value", operator: "GREATER_THAN", value: 500 }],
          actions: [{ type: "CREATE_TASK", config: { title: "Ligar para cliente", dueInMinutes: 60 } }],
        },
      },
    ]);

    const service = new AutomationEngineService(prisma as never);
    const result = await service.dispatch({
      organizationId: "org-1",
      type: "DEAL_STAGE_CHANGED",
      dealId: "deal-1",
      actorId: "user-1",
      pipelineId: "pipeline-1",
      stageId: "stage-new",
      fromStageId: "stage-old",
    });

    expect(result).toEqual({ matched: 1, succeeded: 1, failed: 0, skipped: 0 });
    expect(prisma.task.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ title: "Ligar para cliente", dealId: "deal-1", assigneeId: "user-1" }),
    }));
    expect(prisma.automationExecution.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: "SUCCESS" }),
    }));
  });

  it("does not run the same automation twice in a chain", async () => {
    prisma.automation.findMany.mockResolvedValue([{ id: "automation-1", name: "Loop", config: {} }]);
    const service = new AutomationEngineService(prisma as never);
    const result = await service.dispatch({
      organizationId: "org-1",
      type: "DEAL_STAGE_CHANGED",
      dealId: "deal-1",
      pipelineId: "pipeline-1",
      stageId: "stage-new",
      ancestry: ["automation-1"],
    });
    expect(result.skipped).toBe(1);
    expect(prisma.automationExecution.create).not.toHaveBeenCalled();
  });
});

