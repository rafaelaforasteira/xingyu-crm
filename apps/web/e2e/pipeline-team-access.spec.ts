import { expect, request as playwrightRequest, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";

test.describe.serial("pipeline team access isolated security matrix", () => {
  const prisma = new PrismaClient();
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const ids = {
    org: `e2e-acl-org-${suffix}`,
    admin: `e2e-acl-admin-${suffix}`,
    user: `e2e-acl-user-${suffix}`,
    outsider: `e2e-acl-outsider-${suffix}`,
    team: `e2e-acl-team-${suffix}`,
    pipelineA: `e2e-acl-pipe-a-${suffix}`,
    pipelineB: `e2e-acl-pipe-b-${suffix}`,
    stageA: `e2e-acl-stage-a-${suffix}`,
    stageB: `e2e-acl-stage-b-${suffix}`,
    dealA: `e2e-acl-deal-a-${suffix}`,
    dealB: `e2e-acl-deal-b-${suffix}`,
    conversationB: `e2e-acl-conv-b-${suffix}`,
    messageB: `e2e-acl-msg-b-${suffix}`,
    taskB: `e2e-acl-task-b-${suffix}`,
    noteB: `e2e-acl-note-b-${suffix}`,
    activityB: `e2e-acl-activity-b-${suffix}`,
    orderB: `e2e-acl-order-b-${suffix}`,
  };
  const password = "PipelineAclE2e123!";
  const adminEmail = `acl-admin-${suffix}@example.test`;
  const userEmail = `acl-user-${suffix}@example.test`;
  let adminApi: Awaited<ReturnType<typeof playwrightRequest.newContext>>;
  let userApi: Awaited<ReturnType<typeof playwrightRequest.newContext>>;

  test.beforeAll(async () => {
    const passwordHash = await argon2.hash(password);
    await prisma.organization.create({ data: { id: ids.org, name: "ACL E2E", slug: ids.org } });
    await prisma.team.create({ data: { id: ids.team, organizationId: ids.org, name: "Comercial E2E" } });
    await prisma.user.createMany({ data: [
      { id: ids.admin, organizationId: ids.org, name: "Admin ACL", email: adminEmail, authRole: "ADMIN", passwordHash },
      { id: ids.user, organizationId: ids.org, teamId: ids.team, name: "Amanda ACL", email: userEmail, authRole: "CONSULTANT", passwordHash },
      { id: ids.outsider, organizationId: ids.org, name: "Vanessa ACL", email: `acl-outsider-${suffix}@example.test`, authRole: "CONSULTANT", passwordHash },
    ] });
    await prisma.pipeline.createMany({ data: [
      { id: ids.pipelineA, organizationId: ids.org, name: "COMERCIAL ACL", accessMode: "ORGANIZATION", position: 0 },
      { id: ids.pipelineB, organizationId: ids.org, name: "PÓS-VENDA ACL", accessMode: "RESTRICTED", position: 1 },
    ] });
    await prisma.pipelineStage.createMany({ data: [
      { id: ids.stageA, organizationId: ids.org, pipelineId: ids.pipelineA, name: "Entrada A", isInitial: true },
      { id: ids.stageB, organizationId: ids.org, pipelineId: ids.pipelineB, name: "Entrada B", isInitial: true },
    ] });
    await prisma.conversation.create({ data: { id: ids.conversationB, organizationId: ids.org, subject: "Conversa restrita" } });
    await prisma.deal.createMany({ data: [
      { id: ids.dealA, organizationId: ids.org, pipelineId: ids.pipelineA, stageId: ids.stageA, name: "Lead permitido", ownerId: ids.user },
      { id: ids.dealB, organizationId: ids.org, pipelineId: ids.pipelineB, stageId: ids.stageB, conversationId: ids.conversationB, name: "Lead restrito" },
    ] });
    await prisma.message.create({ data: { id: ids.messageB, conversationId: ids.conversationB, direction: "INBOUND", body: "segredo" } });
    await prisma.task.create({ data: { id: ids.taskB, organizationId: ids.org, dealId: ids.dealB, pipelineId: ids.pipelineB, stageId: ids.stageB, title: "Tarefa restrita" } });
    await prisma.note.create({ data: { id: ids.noteB, organizationId: ids.org, dealId: ids.dealB, content: "Nota restrita" } });
    await prisma.activity.create({ data: { id: ids.activityB, organizationId: ids.org, dealId: ids.dealB, type: "OTHER", title: "Histórico restrito" } });
    await prisma.order.create({ data: { id: ids.orderB, organizationId: ids.org, dealId: ids.dealB, number: `ACL-${suffix}` } });
    await prisma.pipelineUserAccess.create({ data: { organizationId: ids.org, pipelineId: ids.pipelineB, userId: ids.outsider } });

    adminApi = await playwrightRequest.newContext({ baseURL: "http://localhost:3000" });
    userApi = await playwrightRequest.newContext({ baseURL: "http://localhost:3000" });
    expect((await adminApi.post("/api/auth/login", { data: { email: adminEmail, password } })).ok()).toBeTruthy();
    expect((await userApi.post("/api/auth/login", { data: { email: userEmail, password } })).ok()).toBeTruthy();
  });

  test.afterAll(async () => {
    await adminApi?.dispose();
    await userApi?.dispose();
    await prisma.userSession.deleteMany({ where: { user: { organizationId: ids.org } } });
    await prisma.activity.deleteMany({ where: { organizationId: ids.org } });
    await prisma.note.deleteMany({ where: { organizationId: ids.org } });
    await prisma.task.deleteMany({ where: { organizationId: ids.org } });
    await prisma.order.deleteMany({ where: { organizationId: ids.org } });
    await prisma.message.deleteMany({ where: { conversation: { organizationId: ids.org } } });
    await prisma.deal.deleteMany({ where: { organizationId: ids.org } });
    await prisma.conversation.deleteMany({ where: { organizationId: ids.org } });
    await prisma.pipelineUserAccess.deleteMany({ where: { organizationId: ids.org } });
    await prisma.pipelineTeamAccess.deleteMany({ where: { organizationId: ids.org } });
    await prisma.pipelineStage.deleteMany({ where: { organizationId: ids.org } });
    await prisma.pipeline.deleteMany({ where: { organizationId: ids.org } });
    await prisma.user.deleteMany({ where: { organizationId: ids.org } });
    await prisma.team.deleteMany({ where: { organizationId: ids.org } });
    await prisma.organization.deleteMany({ where: { id: ids.org } });
    await prisma.$disconnect();
  });

  test("blocks direct IDOR and list/search leakage before a grant", async () => {
    const forbidden = [
      `/api/deals/${ids.dealB}`,
      `/api/conversations/${ids.conversationB}`,
      `/api/conversations/${ids.conversationB}/messages`,
      `/api/tasks/${ids.taskB}`,
      `/api/notes/${ids.noteB}`,
      `/api/activities/timeline?dealId=${ids.dealB}`,
      `/api/orders/${ids.orderB}`,
    ];
    for (const url of forbidden) expect((await userApi.get(url)).status(), url).toBe(403);

    const deals = await (await userApi.get("/api/deals?pageSize=50")).json();
    expect(deals.data.map((item: { id: string }) => item.id)).toEqual([ids.dealA]);
    for (const [url, restrictedId] of [["/api/conversations?pageSize=50", ids.conversationB], ["/api/tasks?pageSize=50", ids.taskB], ["/api/activities?pageSize=50", ids.activityB]]) {
      const body = await (await userApi.get(url)).json();
      expect(body.data.map((item: { id: string }) => item.id)).not.toContain(restrictedId);
    }
    const search = await (await userApi.get("/api/search?q=restrito")).json();
    expect(search.deals).toEqual([]);
  });

  test("supports Team, Direct, union and revoke while ADMIN keeps bypass", async () => {
    expect((await adminApi.get(`/api/deals/${ids.dealB}`)).ok()).toBeTruthy();
    const grantBoth = await adminApi.put(`/api/pipelines/access/${ids.pipelineB}`, { data: { accessMode: "RESTRICTED", teamIds: [ids.team], userIds: [ids.user, ids.outsider] } });
    expect(grantBoth.ok(), await grantBoth.text()).toBeTruthy();
    expect((await userApi.get(`/api/conversations/${ids.conversationB}`)).ok()).toBeTruthy();

    await adminApi.put(`/api/pipelines/access/${ids.pipelineB}`, { data: { accessMode: "RESTRICTED", teamIds: [ids.team], userIds: [ids.outsider] } });
    expect((await userApi.get(`/api/conversations/${ids.conversationB}`)).ok()).toBeTruthy();

    await adminApi.put(`/api/pipelines/access/${ids.pipelineB}`, { data: { accessMode: "RESTRICTED", teamIds: [], userIds: [ids.outsider] } });
    expect((await userApi.get(`/api/conversations/${ids.conversationB}`)).status()).toBe(403);

    await adminApi.put(`/api/pipelines/access/${ids.pipelineB}`, { data: { accessMode: "RESTRICTED", teamIds: [], userIds: [ids.user, ids.outsider] } });
    expect((await userApi.get(`/api/conversations/${ids.conversationB}/messages`)).ok()).toBeTruthy();
  });

  test("returns only eligible users for new assignments", async () => {
    const users = await (await userApi.get(`/api/pipelines/access/${ids.pipelineB}/eligible-users`)).json();
    expect(users.map((item: { id: string }) => item.id)).toEqual(expect.arrayContaining([ids.admin, ids.user, ids.outsider]));
    await adminApi.put(`/api/pipelines/access/${ids.pipelineB}`, { data: { accessMode: "RESTRICTED", teamIds: [], userIds: [ids.outsider] } });
  });

  test("limited user sees only the authorized pipeline in the real UI", async ({ browser }) => {
    const context = await browser.newContext();
    const login = await context.request.post("http://localhost:3000/api/auth/login", { data: { email: userEmail, password } });
    expect(login.ok()).toBeTruthy();
    const page = await context.newPage();
    await page.goto("http://localhost:3000/pipelines");
    await expect(page.getByRole("heading", { name: "Pipelines", exact: true })).toBeVisible();
    await expect(page.getByText("COMERCIAL ACL", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("PÓS-VENDA ACL", { exact: true })).toHaveCount(0);
    const direct = await context.request.get(`http://localhost:3000/api/pipelines/${ids.pipelineB}`);
    expect(direct.status()).toBe(403);
    await context.close();
  });
});
