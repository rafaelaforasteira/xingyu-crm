import { expect, test } from "@playwright/test";

test.describe("Conversation History MVP", () => {
  test("lists conversations, opens Cláudia history, loads older, switches Amanda", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/operacao?pipeline=pipe-novos&view=conversations");
    await expect(page.getByTestId("operation-conversations-view")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByTestId("conversation-list")).toBeVisible();

    const claudia = page
      .getByTestId("conversation-list")
      .locator('[data-testid^="conversation-"]')
      .filter({ hasText: /Cláudia/i })
      .first();
    await expect(claudia).toBeVisible({ timeout: 20_000 });
    await claudia.click();
    await expect(page).toHaveURL(/conversation=/);
    await expect(page.getByTestId("deal-operation-header")).toContainText(/Cláudia/i);
    await expect(page.getByTestId("message-list")).toBeVisible();
    await expect(page.getByTestId("message-bubble").first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId("message-sender-line").first()).toBeVisible();
    await expect(page.getByTestId("message-day-separator").first()).toBeVisible();

    const inbound = page.locator('[data-direction="INBOUND"]');
    const outbound = page.locator('[data-direction="OUTBOUND"]');
    await expect(inbound.first()).toBeVisible();
    await expect(outbound.first()).toBeVisible();

    await expect(page.getByTestId("conversation-composer")).toHaveCount(0);
    await expect(page.getByTestId("lead-context-panel")).toHaveCount(0);
    await expect(page.getByRole("tab", { name: /Tarefas|Pedidos|Notas/i })).toHaveCount(
      0,
    );

    const loadOlder = page.getByTestId("load-older-messages");
    await expect(loadOlder).toBeVisible({ timeout: 10_000 });
    const beforeCount = await page
      .locator("[data-testid^=\"message-\"][data-direction]")
      .count();
    await loadOlder.click();
    await expect
      .poll(async () =>
        page.locator("[data-testid^=\"message-\"][data-direction]").count(),
      )
      .toBeGreaterThan(beforeCount);
    const ids = await page
      .locator("[data-testid^=\"message-\"][data-direction]")
      .evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute("data-testid")).filter(Boolean),
      );
    expect(new Set(ids).size).toBe(ids.length);

    await expect(page.getByRole("img", { name: /catalogo/i }).first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText("tabela-precos.txt").first()).toBeVisible();
    await expect(page.locator("audio").first()).toBeVisible();

    await page.keyboard.press("Escape");

    const amanda = page.getByTestId("conversation-conv-01");
    await amanda.scrollIntoViewIfNeeded();
    await expect(amanda).toBeVisible();
    await amanda.click();
    await expect(page).toHaveURL(/conversation=conv-01/, { timeout: 15_000 });
    await expect(page.getByTestId("deal-operation-header")).toContainText(/Amanda/i, {
      timeout: 15_000,
    });

    await page.reload();
    await expect(page).toHaveURL(/conversation=conv-01/, { timeout: 30_000 });
    await expect(page.getByTestId("deal-operation-header")).toContainText(/Amanda/i, {
      timeout: 30_000,
    });
  });

  test("search and unread filter preserve URL", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/operacao?pipeline=pipe-novos&view=conversations");
    await expect(page.getByTestId("conversation-list")).toBeVisible({
      timeout: 30_000,
    });

    const search = page.getByTestId("operation-search");
    await search.fill("Letícia");
    await expect(page).toHaveURL(/q=/);
    await expect(
      page
        .getByTestId("conversation-list")
        .locator('[data-testid^="conversation-"]')
        .filter({ hasText: /Letícia/i }),
    ).toBeVisible({ timeout: 15_000 });

    await page.getByTestId("operation-filter-unread").click();
    await expect(page).toHaveURL(/filter=unread/);
    await expect(page).toHaveURL(/q=/);
  });

  test("invalid conversation is cleared with toast", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(
      "/operacao?pipeline=pipe-novos&view=conversations&conversation=conv-inexistente",
    );
    await expect(page.getByText(/Conversa não encontrada/i)).toBeVisible({
      timeout: 20_000,
    });
    await expect(page).not.toHaveURL(/conversation=conv-inexistente/);
  });

  test("mobile list → thread → back", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(
      "/operacao?pipeline=pipe-novos&view=conversations&conversation=conv-operacao-demo",
    );
    await expect(page.getByRole("button", { name: "Voltar às conversas" })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByTestId("deal-operation-header")).toContainText(/Cláudia/i);
    await page.getByRole("button", { name: "Voltar às conversas" }).click();
    await expect(page.getByTestId("conversation-list")).toBeVisible();
  });
});
