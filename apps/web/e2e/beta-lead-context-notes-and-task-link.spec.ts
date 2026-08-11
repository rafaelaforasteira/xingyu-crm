import { expect, test } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";

const SCREENSHOT_DIR = path.join(
  __dirname,
  ".beta-screenshots",
  "lead-context-notes-and-task-link",
);

test.describe("Lead notes and task link", () => {
  test.setTimeout(240_000);

  test("adds an internal note and creates its linked task in context", async ({ page }) => {
    await fs.promises.mkdir(SCREENSHOT_DIR, { recursive: true });
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/operacao?view=conversations");
    const lead = page.locator('[data-testid^="conversation-conv-"]').first();
    await expect(lead).toBeVisible({ timeout: 30_000 });
    await lead.click();

    const panel = page.getByTestId("lead-context-panel");
    const toggle = panel.getByRole("button", { name: /Notas/i });
    await expect(toggle).toBeVisible({ timeout: 30_000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "notes-closed.png") });
    await toggle.click();

    const history = panel.getByTestId("lead-notes-history");
    await expect(history).toBeVisible();
    await expect(history.getByText("Abrir ficha")).toHaveCount(0);
    const marker = `Nota E2E ${Date.now()}`;
    await history.getByLabel("Nova anotação interna").fill(marker);
    await history.getByRole("button", { name: "Anotar" }).click();
    await expect(history.getByText(marker)).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "note-created.png") });

    const card = history.getByTestId("lead-note-row").filter({ hasText: marker });
    await card.getByRole("button", { name: /Criar tarefa a partir da nota/i }).click();
    const dialog = page.getByRole("dialog", { name: "Nova tarefa" });
    await expect(dialog.locator("#lead-task-description")).toHaveValue(marker);
    const taskTitle = `Tarefa da nota ${Date.now()}`;
    await dialog.locator("#lead-task-title").fill(taskTitle);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "task-from-note-dialog.png") });
    await dialog.getByRole("button", { name: "Criar tarefa" }).click();

    await expect(card.getByText(taskTitle)).toBeVisible({ timeout: 20_000 });
    await expect(page).toHaveURL(/\/operacao\?view=conversations/);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "note-linked-task.png") });
  });
});
