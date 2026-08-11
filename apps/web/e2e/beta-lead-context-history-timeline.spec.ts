import { expect, test } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";

const SCREENSHOT_DIR = path.join(__dirname, ".beta-screenshots", "lead-context-history-timeline");

test.describe("Lead activity history timeline", () => {
  test.setTimeout(300_000);

  test("records stage and note events and opens the paginated history", async ({ page }) => {
    await fs.promises.mkdir(SCREENSHOT_DIR, { recursive: true });
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/operacao?view=conversations&conversation=conv-operacao-demo");
    await expect(page.getByTestId("conversation-lead-header")).toBeVisible({ timeout: 30_000 });
    const panel = page.getByTestId("lead-context-panel");
    const historyToggle = panel.getByRole("button", { name: "Histórico", exact: true });
    await expect(historyToggle).toBeVisible();
    await expect(historyToggle.locator("span").filter({ hasText: /^\d+$/ })).toHaveCount(0);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "history-closed-no-count-1920.png") });

    const stageTrigger = page.getByTestId("pipeline-stage-selector");
    const originalStage = (await stageTrigger.innerText()).trim();
    await stageTrigger.click();
    const options = page.getByTestId("pipeline-stage-options").locator("button");
    let target = "";
    for (let index = 0; index < await options.count(); index += 1) {
      const value = (await options.nth(index).innerText()).trim();
      if (value && value !== originalStage) { target = value; await options.nth(index).click(); break; }
    }
    expect(target).toBeTruthy();
    await expect(stageTrigger).toContainText(target);

    const notesToggle = panel.getByRole("button", { name: /^Notas \d+$/ });
    await notesToggle.click();
    const marker = `Nota privada E2E ${Date.now()}`;
    await panel.getByLabel("Nova anotação interna").fill(marker);
    await panel.getByRole("button", { name: "Anotar" }).click();
    await expect(panel.getByText(marker)).toBeVisible();
    await notesToggle.click();

    await historyToggle.click();
    await expect(panel.getByText("Moveu o lead").first()).toBeVisible({ timeout: 20_000 });
    await expect(panel.getByText("Adicionou uma nota").first()).toBeVisible();
    await expect(panel.getByText(marker)).toHaveCount(0);
    await expect(panel.getByText(`${originalStage} → ${target}`).first()).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "stage-note-timeline.png") });

    await panel.getByRole("button", { name: "Ver histórico completo" }).click();
    const dialog = page.getByRole("dialog", { name: /Histórico · Cláudia Nunes/ });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/HOJE|ONTEM|\d{2}\/\d{2}\/\d{4}/).first()).toBeVisible();
    await expect(dialog.getByText(marker)).toHaveCount(0);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "full-history-grouped.png") });
    await dialog.getByRole("button", { name: "Fechar diálogo" }).click();
    await expect(page).toHaveURL(/conversation=conv-operacao-demo/);

    await page.reload();
    await panel.getByRole("button", { name: "Histórico", exact: true }).click();
    await expect(panel.getByText("Adicionou uma nota").first()).toBeVisible({ timeout: 30_000 });
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "history-1366.png") });

    await stageTrigger.click();
    await page.getByTestId("pipeline-stage-options").locator("button", { hasText: originalStage }).click();
  });
});
