import { expect, test } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";

const SCREENSHOT_DIR = path.join(
  __dirname,
  ".beta-screenshots",
  "conversation-filters",
);

test.describe("Beta conversation filters popover", () => {
  test.setTimeout(180_000);

  test("replaces inline filters with popover and persists URL state", async ({
    page,
  }) => {
    await fs.promises.mkdir(SCREENSHOT_DIR, { recursive: true });
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/operacao?view=conversations&q=Claudia");

    await expect(page.getByTestId("beta-conversation-workspace")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByPlaceholder(/Buscar conversas/i)).toBeVisible();
    await expect(page.getByTestId("conversation-filters-trigger")).toBeVisible();
    await expect(page.getByText("Todos os canais")).toHaveCount(0);
    await expect(page.getByLabel("Não lidas")).toHaveCount(0);
    await expect(page.getByLabel("Aguardando resposta", { exact: true })).toHaveCount(0);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "list-closed-1920.png"),
      fullPage: false,
    });

    await page.getByTestId("conversation-filters-trigger").click();
    const popover = page.getByTestId("conversation-filters-popover");
    await expect(popover).toBeVisible();
    await expect(popover.getByText("Filtrar conversas")).toBeVisible();
    await expect(popover.getByText("Canais")).toBeVisible();
    await expect(popover.getByText("Somente não lidas")).toBeVisible();
    await expect(popover.getByText("Situação da resposta")).toBeVisible();
    await expect(popover.getByText("Estado da conversa")).toBeVisible();
    await expect(popover.getByText("Etapas da esteira")).toBeVisible();
    await expect(popover.getByText("Tags")).toBeVisible();
    await expect(popover.getByText("Período da última mensagem")).toBeVisible();
    await expect(popover.getByText(/Responsável|Consultora/i)).toHaveCount(0);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "popover-open-1920.png"),
      fullPage: false,
    });

    await popover.getByText("Somente não lidas").click();
    await popover.getByLabel("Aguardando minha resposta").click();
    await popover.getByLabel("Últimos 7 dias").click();

    const stageChecks = popover.locator('input[type="checkbox"]');
    const stageCount = await stageChecks.count();
    if (stageCount > 2) {
      await stageChecks.nth(1).check();
      await stageChecks.nth(2).check();
    }

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "popover-selected.png"),
      fullPage: false,
    });

    await popover.getByTestId("conversation-filters-apply").click();
    await expect(popover).toHaveCount(0);
    await expect(page).toHaveURL(/unread=1/);
    await expect(page).toHaveURL(/reply=mine/);
    await expect(page).toHaveURL(/period=7d/);
    await expect(page).toHaveURL(/q=Claudia|q=Cl%C3%A1udia|q=.*[Cc]l/i);
    await expect(page).toHaveURL(/view=conversations/);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "badge-active.png"),
      fullPage: false,
    });

    await page.reload();
    await expect(page.getByTestId("conversation-filters-trigger")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page).toHaveURL(/unread=1/);
    await expect(page).toHaveURL(/reply=mine/);

    await page.getByTestId("conversation-filters-trigger").click();
    await expect(page.getByTestId("conversation-filters-popover")).toBeVisible();
    await expect(
      page.getByTestId("conversation-filters-popover").getByLabel("Somente não lidas"),
    ).toBeChecked();

    await page
      .getByTestId("conversation-filters-popover")
      .getByLabel("Aguardando resposta do cliente")
      .click();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("conversation-filters-popover")).toHaveCount(0);

    await page.getByTestId("conversation-filters-trigger").click();
    await expect(
      page.getByTestId("conversation-filters-popover").getByLabel("Aguardando minha resposta"),
    ).toBeChecked();

    await page.getByTestId("conversation-filters-clear").click();
    await expect(page.getByTestId("conversation-filters-popover")).toHaveCount(0);
    await expect(page).not.toHaveURL(/unread=1/);
    await expect(page).not.toHaveURL(/reply=/);
    await expect(page).toHaveURL(/view=conversations/);
    await expect(page).toHaveURL(/q=/);

    await page.setViewportSize({ width: 1366, height: 768 });
    await page.getByTestId("conversation-filters-trigger").click();
    await expect(page.getByTestId("conversation-filters-popover")).toBeVisible();
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "popover-1366.png"),
      fullPage: false,
    });
  });
});
