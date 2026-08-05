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

async function createDeal(
  request: APIRequestContext,
  pipelineId: string,
  stageId: string,
  name: string,
) {
  const create = await request.post("/api/deals", {
    data: { name, pipelineId, stageId, value: 150 },
  });
  expect(create.ok(), await create.text()).toBeTruthy();
  return create.json() as Promise<BoardDeal & { pipelineId?: string }>;
}

async function ensureDealWithConversation(
  request: APIRequestContext,
  pipelineId: string,
  options?: { fresh?: boolean },
) {
  if (!options?.fresh) {
    const board = await fetchBoard(request, pipelineId);
    const existing = flatDeals(board).find((deal) => deal.conversationId);
    if (existing) {
      return {
        dealId: existing.id,
        pipelineId,
        conversationId: existing.conversationId!,
      };
    }
  }

  const board = await fetchBoard(request, pipelineId);
  const stageId = board.stages[0]?.id;
  expect(stageId).toBeTruthy();

  const contactRes = await request.post("/api/contacts", {
    data: {
      firstName: "E2E",
      lastName: `Operação ${Date.now()}`,
      whatsapp: `+5511${String(Date.now()).slice(-8)}`,
    },
  });
  expect(contactRes.ok(), await contactRes.text()).toBeTruthy();
  const contact = await contactRes.json();

  const convRes = await request.post("/api/conversations", {
    data: {
      contactId: contact.id,
      status: "OPEN",
      subject: "E2E operação",
    },
  });
  expect(convRes.ok(), await convRes.text()).toBeTruthy();
  const conversation = await convRes.json();

  const dealRes = await request.post("/api/deals", {
    data: {
      name: `E2E conversa ${Date.now()}`,
      pipelineId,
      stageId,
      contactId: contact.id,
      conversationId: conversation.id,
      value: 200,
    },
  });
  expect(dealRes.ok(), await dealRes.text()).toBeTruthy();
  const deal = await dealRes.json();

  // Seed one inbound-looking outbound message so the thread is not empty.
  await request.post(`/api/conversations/${conversation.id}/messages`, {
    data: { body: "Olá, preciso de atendimento." },
  });

  return {
    dealId: deal.id as string,
    pipelineId,
    conversationId: conversation.id as string,
  };
}

async function prepareBoard(request: APIRequestContext, pipelineId: string) {
  let board = await fetchBoard(request, pipelineId);
  expect(board.stages.length).toBeGreaterThan(0);
  let deals = flatDeals(board);

  if (deals.length === 0) {
    await createDeal(
      request,
      pipelineId,
      board.stages[0]!.id,
      `E2E operação lead ${Date.now()}`,
    );
    board = await fetchBoard(request, pipelineId);
    deals = flatDeals(board);
  }

  const linked = await ensureDealWithConversation(request, pipelineId);
  board = await fetchBoard(request, pipelineId);
  deals = flatDeals(board);

  let withoutConversation = deals.find((deal) => !deal.conversationId);
  if (!withoutConversation) {
    withoutConversation = await createDeal(
      request,
      pipelineId,
      board.stages[0]!.id,
      `E2E sem conversa ${Date.now()}`,
    );
    board = await fetchBoard(request, pipelineId);
    deals = flatDeals(board);
  }

  return {
    board,
    deals,
    linked,
    withoutConversation,
    stages: board.stages,
  };
}

async function openPipeline(page: Page, pipelineId: string) {
  await page.goto(`/operacao?pipeline=${pipelineId}`);
  await expect(page.getByTestId("operation-page")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId("kanban-stage").first()).toBeVisible({ timeout: 20_000 });
}

async function closeConversationPanel(page: Page) {
  await page
    .getByTestId("deal-operation-header")
    .getByRole("button", { name: /Fechar conversa|Voltar ao Kanban/i })
    .click();
}

test.describe("Core operation workspace", () => {
  test("loads default pipeline kanban", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/operacao");
    await expect(page.getByTestId("operation-page")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("operation-header")).toContainText("Operação");
    await expect(page.getByTestId("operation-kanban")).toBeVisible();
    await expect(page.getByTestId("kanban-stage").first()).toBeVisible({ timeout: 20_000 });
  });

  test("opens conversation panel from card and keeps kanban", async ({ page, request }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const prepared = await prepareBoard(request, "pipe-comercial");
    await openPipeline(page, "pipe-comercial");

    const card = page.getByTestId("deal-card").first();
    await expect(card).toBeVisible();
    const dealId = await card.getAttribute("data-deal-id");
    expect(dealId).toBeTruthy();

    await card.click();
    await expect(page).toHaveURL(new RegExp(`[?&]deal=${dealId}`));
    await expect(page.getByTestId("operation-conversation-panel")).toBeVisible();
    await expect(page.getByTestId("deal-operation-header")).toBeVisible();
    await expect(page.getByTestId("operation-kanban")).toBeVisible();

    await closeConversationPanel(page);
    await expect(page.getByTestId("operation-conversation-panel")).toHaveCount(0);
    await expect(page).not.toHaveURL(/[?&]deal=/);
    await expect(page.getByTestId("operation-kanban")).toBeVisible();
    expect(prepared.deals.length).toBeGreaterThan(0);
  });

  test("sends message and updates card preview", async ({ page, request }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    const linked = await ensureDealWithConversation(request, "pipe-comercial", {
      fresh: true,
    });

    await page.goto(
      `/operacao?pipeline=${linked.pipelineId}&deal=${linked.dealId}`,
    );
    await expect(page.getByTestId("operation-conversation-panel")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByTestId("message-list")).toBeVisible({ timeout: 20_000 });

    const unique = `E2E operação ${Date.now()}`;
    const composer = page.getByRole("textbox", { name: "Mensagem" });
    await expect(composer).toBeVisible();
    await composer.fill(unique);
    await page.getByRole("button", { name: "Enviar mensagem" }).click();
    await expect(page.getByText("Mensagem enviada.")).toBeVisible();
    await expect(
      page.getByTestId("message-list").getByText(unique, { exact: true }),
    ).toBeVisible({ timeout: 15_000 });

    await closeConversationPanel(page);
    await expect(
      page.getByTestId("deal-card").filter({ hasText: unique }).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("moves stage from panel selector", async ({ page, request }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    const prepared = await prepareBoard(request, "pipe-comercial");
    expect(prepared.stages.length).toBeGreaterThan(1);

    const deal = prepared.deals[0]!;
    const currentIndex = prepared.stages.findIndex((stage) =>
      (stage.deals ?? []).some((item) => item.id === deal.id),
    );
    const target =
      prepared.stages[currentIndex === 0 ? 1 : 0] ?? prepared.stages[1]!;

    await page.goto(`/operacao?pipeline=pipe-comercial&deal=${deal.id}`);
    await expect(page.getByTestId("operation-conversation-panel")).toBeVisible({
      timeout: 20_000,
    });

    const select = page.getByTestId("deal-stage-select");
    await expect(select).toBeVisible();
    await select.selectOption(target.id);
    await expect(page.getByText("Etapa atualizada")).toBeVisible();

    await closeConversationPanel(page);
    await expect(
      page.locator(
        `[data-testid="kanban-stage"][data-stage-id="${target.id}"] [data-deal-id="${deal.id}"]`,
      ),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("reopens panel from URL deal param", async ({ page, request }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const prepared = await prepareBoard(request, "pipe-comercial");
    const dealId = prepared.deals[0]!.id;

    await page.goto(`/operacao?pipeline=pipe-comercial&deal=${dealId}`);
    await expect(page.getByTestId("operation-conversation-panel")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page).toHaveURL(new RegExp(`deal=${dealId}`));
    await page.reload();
    await expect(page.getByTestId("operation-conversation-panel")).toBeVisible({
      timeout: 20_000,
    });
  });

  test("deal without conversation shows empty state", async ({ page, request }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const prepared = await prepareBoard(request, "pipe-comercial");
    expect(prepared.withoutConversation?.id).toBeTruthy();

    await page.goto(
      `/operacao?pipeline=pipe-comercial&deal=${prepared.withoutConversation!.id}`,
    );
    await expect(page.getByTestId("operation-conversation-panel")).toBeVisible({
      timeout: 20_000,
    });
    await expect(
      page.getByText("Ainda não existe uma conversa vinculada a este lead."),
    ).toBeVisible();
    await expect(
      page.getByText(
        "A conversa aparecerá aqui quando o cliente entrar por um canal conectado.",
      ),
    ).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Mensagem" })).toHaveCount(0);
  });

  test("hides global header on operação and keeps it on settings", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/operacao");
    await expect(page.getByTestId("operation-page")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("global-header")).toHaveCount(0);
    await expect(page.getByTestId("app-main")).toHaveAttribute(
      "data-operation-mode",
      "core",
    );

    await page.goto("/settings");
    await expect(page.getByTestId("global-header")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("app-main")).toHaveAttribute(
      "data-operation-mode",
      "default",
    );
  });

  test("mobile menu button opens sidebar when header is hidden", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/operacao");
    await expect(page.getByTestId("operation-page")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("global-header")).toHaveCount(0);
    await page.getByTestId("operation-open-sidebar").click();
    await expect(
      page.locator('a[href="/operacao"][aria-current="page"]').last(),
    ).toBeVisible();
  });

  test("kanban fills width when panel closed and shrinks when open", async ({
    page,
    request,
  }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    const linked = await ensureDealWithConversation(request, "pipe-novos");
    await page.goto(`/operacao?pipeline=${linked.pipelineId}`);
    await expect(page.getByTestId("kanban-columns")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("kanban-columns")).toHaveAttribute(
      "data-fill-columns",
      "true",
    );

    const closedBox = await page.getByTestId("operation-kanban").boundingBox();
    expect(closedBox).toBeTruthy();
    expect(closedBox!.width).toBeGreaterThan(1200);

    await page.goto(
      `/operacao?pipeline=${linked.pipelineId}&deal=${linked.dealId}`,
    );
    await expect(page.getByTestId("operation-conversation-panel")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByTestId("kanban-columns")).toHaveAttribute(
      "data-fill-columns",
      "false",
    );

    const panel = page.getByTestId("operation-conversation-panel");
    const panelBox = await panel.boundingBox();
    expect(panelBox).toBeTruthy();
    expect(panelBox!.width).toBeGreaterThanOrEqual(600);
    expect(panelBox!.width).toBeLessThanOrEqual(720);

    await expect(page.getByTestId("deal-operation-header")).toContainText(/Cláudia|E2E|Lead|Conversa/i);
    await expect(page.getByTestId("message-list")).toBeVisible();
    const outbound = page
      .getByTestId("message-list")
      .locator('[data-testid^="message-"][data-direction="OUTBOUND"]')
      .first();
    if (await outbound.count()) {
      await expect(outbound.getByTestId("message-sender-line")).toContainText(
        /Enviado por:/,
      );
    }
  });

  test("filters remain after closing conversation", async ({ page, request }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await prepareBoard(request, "pipe-comercial");
    await page.goto("/operacao?pipeline=pipe-comercial&filter=no-conversation");
    await expect(page.getByTestId("operation-page")).toBeVisible({ timeout: 30_000 });
    await expect(page).toHaveURL(/filter=no-conversation/);

    const card = page.getByTestId("deal-card").first();
    if (await card.count()) {
      await card.click();
      await expect(page.getByTestId("operation-conversation-panel")).toBeVisible();
      await closeConversationPanel(page);
    }
    await expect(page).toHaveURL(/filter=no-conversation/);
    await expect(page.getByTestId("operation-kanban")).toBeVisible();
  });

  test("demo deal with conversation opens messenger panel", async ({ page, request }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const board = await fetchBoard(request, "pipe-novos");
    const demo = flatDeals(board).find((deal) => deal.id === "deal-operacao-demo");
    if (!demo?.conversationId) {
      test.info().annotations.push({
        type: "note",
        description: "Demo deal absent — seed may not have run; using any linked deal.",
      });
    }
    const target =
      demo?.conversationId != null
        ? demo
        : flatDeals(board).find((deal) => deal.conversationId);
    expect(target?.conversationId).toBeTruthy();

    await page.goto(`/operacao?pipeline=pipe-novos&deal=${target!.id}`);
    await expect(page.getByTestId("operation-conversation-panel")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByTestId("deal-operation-header")).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Mensagem" })).toBeVisible();
    await expect(page.getByText("Enter para enviar")).toBeVisible();
    await expect(page.getByRole("button", { name: "Inserir emoji" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Anexar arquivo" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Gravar áudio" })).toBeVisible();
  });

  test("notebook drawer keeps controlled conversation width", async ({ page, request }) => {
    // Below 2xl (1536): drawer layout with ~60vw capped at 700px
    await page.setViewportSize({ width: 1366, height: 768 });
    const linked = await ensureDealWithConversation(request, "pipe-comercial");
    await page.goto(
      `/operacao?pipeline=${linked.pipelineId}&deal=${linked.dealId}`,
    );
    await expect(page.getByTestId("operation-conversation-panel")).toBeVisible({
      timeout: 20_000,
    });
    const panelBox = await page.getByTestId("operation-conversation-panel").boundingBox();
    expect(panelBox).toBeTruthy();
    expect(panelBox!.width).toBeGreaterThan(500);
    expect(panelBox!.width).toBeLessThanOrEqual(700);
    await expect(page.getByTestId("operation-kanban")).toBeVisible();
  });

  test("mobile opens conversation full screen and returns to kanban", async ({
    page,
    request,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await prepareBoard(request, "pipe-comercial");
    await openPipeline(page, "pipe-comercial");
    await expect(page.getByTestId("deal-card").first()).toBeVisible({ timeout: 20_000 });
    await page.getByTestId("deal-card").first().click();
    await expect(page.getByTestId("operation-conversation-panel")).toBeVisible();
    await expect(page.getByTestId("operation-kanban")).toBeHidden();
    await page.getByRole("button", { name: "Voltar ao Kanban" }).click();
    await expect(page.getByTestId("operation-kanban")).toBeVisible();
    await expect(page.getByTestId("operation-conversation-panel")).toHaveCount(0);
  });

  test("simplified menu shows Operação and Configurações", async ({ page }) => {
    await page.goto("/operacao");
    const nav = page.locator("div.hidden.lg\\:block aside nav").first();
    await expect(nav.getByRole("link", { name: "Operação" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Configurações" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Dashboard" })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: "Conversas" })).toHaveCount(0);
  });
});
