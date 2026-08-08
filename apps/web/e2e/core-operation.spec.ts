import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

type BoardDeal = {
  id: string;
  name: string;
  conversationId?: string | null;
  stageId?: string;
};

type BoardStage = {
  id: string;
  name: string;
  deals?: BoardDeal[];
};

const BETA_PIPELINE = "pipe-novos";

async function fetchBoard(request: APIRequestContext, pipelineId: string) {
  const res = await request.get(`/api/pipelines/${pipelineId}/board`);
  expect(res.ok(), await res.text()).toBeTruthy();
  return res.json() as Promise<{ id: string; stages: BoardStage[] }>;
}

function flatDeals(board: { stages: BoardStage[] }) {
  return board.stages.flatMap((stage) =>
    (stage.deals ?? []).map((deal) => ({ ...deal, stageId: deal.stageId ?? stage.id })),
  );
}

async function ensureDealWithConversation(
  request: APIRequestContext,
  pipelineId: string,
) {
  const board = await fetchBoard(request, pipelineId);
  const existing = flatDeals(board).find((deal) => deal.conversationId);
  if (existing) {
    return {
      dealId: existing.id,
      pipelineId,
      conversationId: existing.conversationId!,
    };
  }

  const stageId = board.stages[0]?.id;
  expect(stageId).toBeTruthy();

  const contactRes = await request.post("/api/contacts", {
    data: {
      firstName: "E2E",
      lastName: `Beta ${Date.now()}`,
      whatsapp: `+5511${String(Date.now()).slice(-8)}`,
    },
  });
  expect(contactRes.ok(), await contactRes.text()).toBeTruthy();
  const contact = await contactRes.json();

  const convRes = await request.post("/api/conversations", {
    data: {
      contactId: contact.id,
      status: "OPEN",
      subject: "E2E beta",
    },
  });
  expect(convRes.ok(), await convRes.text()).toBeTruthy();
  const conversation = await convRes.json();

  const dealRes = await request.post("/api/deals", {
    data: {
      name: `Beta deal ${Date.now()}`,
      pipelineId,
      stageId,
      contactId: contact.id,
      conversationId: conversation.id,
      value: 200,
    },
  });
  expect(dealRes.ok(), await dealRes.text()).toBeTruthy();
  const deal = await dealRes.json();
  return {
    dealId: deal.id as string,
    pipelineId,
    conversationId: conversation.id as string,
  };
}

async function openBetaKanban(page: Page) {
  await page.goto("/operacao?view=kanban");
  await expect(page.getByTestId("beta-operation-page")).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByTestId("kanban-stage").first()).toBeVisible({
    timeout: 20_000,
  });
}

test.describe("Core operation workspace (beta single-pipeline)", () => {
  test("loads default pipeline kanban with classic shell", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openBetaKanban(page);
    await expect(page.getByTestId("beta-header")).toBeVisible();
    await expect(page.getByTestId("beta-page-header")).toContainText(/Novos leads/i);
    await expect(page.getByTestId("beta-kanban")).toBeVisible();
    await expect(page.getByTestId("operation-header")).toHaveCount(0);
  });

  test("opens deal drawer from card and keeps kanban behind", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openBetaKanban(page);

    const card = page.getByTestId("deal-card").first();
    await expect(card).toBeVisible();
    const dealId = await card.getAttribute("data-deal-id");
    expect(dealId).toBeTruthy();

    await card.click();
    await expect(page).toHaveURL(new RegExp(`[?&]deal=${dealId}`));
    await expect(page.getByTestId("deal-workspace-drawer")).toBeVisible();
    await expect(page.getByTestId("beta-kanban")).toBeVisible();
    await expect(
      page.getByTestId("deal-workspace-drawer").getByRole("button", { name: "Conversa", exact: true }),
    ).toBeVisible();

    await page.getByLabel("Fechar drawer").click();
    await expect(page.getByTestId("deal-workspace-drawer")).toHaveCount(0);
    await expect(page).not.toHaveURL(/[?&]deal=/);
  });

  test("sends message from deal drawer composer", async ({ page, request }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    const linked = await ensureDealWithConversation(request, BETA_PIPELINE);
    await page.goto(`/operacao?view=kanban&deal=${linked.dealId}`);
    await expect(page.getByTestId("deal-workspace-drawer")).toBeVisible({
      timeout: 20_000,
    });

    const unique = `E2E beta ${Date.now()}`;
    const composer = page
      .getByTestId("deal-workspace-drawer")
      .getByPlaceholder(/Escreva uma mensagem/i);
    await expect(composer).toBeVisible();
    await composer.fill(unique);
    await page
      .getByTestId("deal-workspace-drawer")
      .locator('button[type="submit"]')
      .click();
    await expect(
      page.getByTestId("deal-workspace-drawer").getByText(unique, { exact: true }),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("reopens drawer from URL deal param", async ({ page, request }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const linked = await ensureDealWithConversation(request, BETA_PIPELINE);
    await page.goto(`/operacao?view=kanban&deal=${linked.dealId}`);
    await expect(page.getByTestId("deal-workspace-drawer")).toBeVisible({
      timeout: 20_000,
    });
    await page.reload();
    await expect(page.getByTestId("deal-workspace-drawer")).toBeVisible({
      timeout: 20_000,
    });
  });

  test("shows classic header on operação and blocks settings route", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/operacao");
    await expect(page.getByTestId("beta-operation-page")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByTestId("beta-header")).toBeVisible();
    await expect(page.getByTestId("app-main")).toHaveAttribute(
      "data-operation-mode",
      "default",
    );

    await page.goto("/settings");
    await expect(page).toHaveURL(/\/operacao/, { timeout: 15_000 });
  });

  test("mobile menu opens from classic header", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/operacao");
    await expect(page.getByTestId("beta-operation-page")).toBeVisible({
      timeout: 30_000,
    });
    await page.getByRole("button", { name: "Abrir menu" }).click();
    await expect(page.getByTestId("beta-nav-operation").last()).toBeVisible();
  });

  test("mobile opens deal fullscreen and returns to kanban", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openBetaKanban(page);
    await expect(page.getByTestId("deal-card").first()).toBeVisible({
      timeout: 20_000,
    });
    await page.getByTestId("deal-card").first().click();
    await expect(page.getByRole("button", { name: "Voltar ao quadro" })).toBeVisible();
    await page.getByRole("button", { name: "Voltar ao quadro" }).click();
    await expect(page.getByTestId("beta-kanban")).toBeVisible();
    await expect(page).not.toHaveURL(/[?&]deal=/);
  });

  test("beta menu shows only Operação", async ({ page }) => {
    await page.goto("/operacao");
    await expect(page.getByTestId("beta-nav-operation")).toBeVisible({
      timeout: 20_000,
    });
    const nav = page.getByTestId("beta-sidebar").locator("nav");
    await expect(nav.getByRole("link", { name: "Operação" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Configurações" })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: "Dashboard" })).toHaveCount(0);
  });

  test("switches between Kanban and Conversas with URL sync", async ({
    page,
    request,
  }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    const linked = await ensureDealWithConversation(request, BETA_PIPELINE);
    await page.goto(`/operacao?view=kanban&deal=${linked.dealId}`);
    await expect(page.getByTestId("beta-view-switcher")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByTestId("beta-view-kanban")).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page.getByTestId("deal-workspace-drawer")).toBeVisible({
      timeout: 15_000,
    });
    await page.getByLabel("Fechar drawer").click();
    await expect(page.getByTestId("deal-workspace-drawer")).toHaveCount(0);

    await page.getByTestId("beta-view-conversations").click();
    await expect(page).toHaveURL(/view=conversations/);
    await expect(page.getByTestId("beta-conversation-workspace")).toBeVisible();
    await expect(page.getByTestId("conversation-empty-state")).toBeVisible();
    await expect(page.getByTestId("conversation-list")).toBeVisible();
    await expect(page.getByTestId("lead-context-panel")).toBeVisible();

    const firstConversation = page
      .locator('[data-testid^="conversation-conv-"]')
      .first();
    await firstConversation.click();
    await expect(page).toHaveURL(/conversation=/);
    await expect(page.getByTestId("conversation-composer")).toBeVisible({
      timeout: 20_000,
    });

    await page.getByTestId("beta-view-kanban").click();
    await expect(page).toHaveURL(/view=kanban/);
    await expect(page.getByTestId("beta-kanban")).toBeVisible();
  });

  test("conversations view shows internal filters and demo chat", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/operacao?view=conversations");
    await expect(page.getByTestId("beta-conversation-workspace")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByPlaceholder(/Buscar conversas/i)).toBeVisible();

    const claudia = page
      .getByTestId("conversation-list")
      .locator('[data-testid^="conversation-"]')
      .filter({ hasText: /Cláudia/i })
      .first();
    if (await claudia.count()) {
      await claudia.click();
      await expect(page).toHaveURL(/conversation=/);
      await expect(page.getByTestId("conversation-header")).toContainText(/Cláudia/i);
    }
  });

  test("mobile conversations list opens thread fullscreen", async ({
    page,
    request,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const linked = await ensureDealWithConversation(request, BETA_PIPELINE);
    await page.goto(`/operacao?view=conversations&conversation=${linked.conversationId}`);
    await expect(
      page.getByRole("button", { name: /Voltar para conversas/i }),
    ).toBeVisible({ timeout: 20_000 });
    await page.getByRole("button", { name: /Voltar para conversas/i }).click();
    await expect(page.getByTestId("conversation-list")).toBeVisible();
  });

  test("ignores external pipeline query and stays on beta pipeline", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/operacao?pipeline=pipe-comercial&view=kanban");
    await expect(page.getByTestId("beta-operation-page")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page).not.toHaveURL(/pipeline=/);
    await expect(page.getByTestId("beta-page-header")).toContainText(/Novos leads/i);
  });
});
