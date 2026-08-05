import { expect, test } from "@playwright/test";

test.describe("Conversation History MVP (beta workspace)", () => {
  test("lists conversations, opens Cláudia history, loads older, switches Amanda", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/operacao?view=conversations");
    await expect(page.getByTestId("beta-conversation-workspace")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByTestId("conversation-list")).toBeVisible();
    await expect(page.getByTestId("lead-context-panel")).toBeVisible();
    await expect(page.getByTestId("conversation-composer")).toBeVisible();

    const claudia = page
      .getByTestId("conversation-list")
      .locator('[data-testid^="conversation-"]')
      .filter({ hasText: /Cláudia/i })
      .first();
    await expect(claudia).toBeVisible({ timeout: 20_000 });
    await claudia.click();
    await expect(page).toHaveURL(/conversation=/);
    await expect(page.getByTestId("conversation-header")).toContainText(/Cláudia/i);
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

    const loadOlder = page.getByTestId("load-older-messages");
    await expect(loadOlder).toBeVisible({ timeout: 10_000 });
    const beforeCount = await page
      .locator('[data-testid^="message-"][data-direction]')
      .count();
    await loadOlder.click();
    await expect
      .poll(async () =>
        page.locator('[data-testid^="message-"][data-direction]').count(),
      )
      .toBeGreaterThan(beforeCount);

    await expect(page.getByRole("img", { name: /catalogo/i }).first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText("tabela-precos.txt").first()).toBeVisible();
    await expect(page.locator("audio").first()).toBeVisible();

    const amanda = page.getByTestId("conversation-conv-01");
    await amanda.scrollIntoViewIfNeeded();
    await expect(amanda).toBeVisible();
    await amanda.click();
    await expect(page).toHaveURL(/conversation=conv-01/, { timeout: 15_000 });
    await expect(page.getByTestId("conversation-header")).toContainText(/Amanda/i, {
      timeout: 15_000,
    });

    await page.reload();
    await expect(page).toHaveURL(/conversation=conv-01/, { timeout: 30_000 });
    await expect(page.getByTestId("conversation-header")).toContainText(/Amanda/i, {
      timeout: 30_000,
    });
  });

  test("internal search filters conversation list", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/operacao?view=conversations");
    await expect(page.getByTestId("conversation-list")).toBeVisible({
      timeout: 30_000,
    });

    const search = page.getByPlaceholder(/Buscar conversas/i);
    await search.fill("Letícia");
    await expect(
      page
        .getByTestId("conversation-list")
        .locator('[data-testid^="conversation-"]')
        .filter({ hasText: /Letícia/i }),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("mobile list → thread → back", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(
      "/operacao?view=conversations&conversation=conv-operacao-demo",
    );
    await expect(
      page.getByRole("button", { name: /Voltar para conversas/i }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("conversation-header")).toContainText(/Cláudia/i);
    await page.getByRole("button", { name: /Voltar para conversas/i }).click();
    await expect(page.getByTestId("conversation-list")).toBeVisible();
  });
});
