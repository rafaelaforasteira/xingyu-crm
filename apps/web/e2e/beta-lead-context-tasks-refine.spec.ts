import { expect, test } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";

const SCREENSHOT_DIR = path.join(__dirname, ".beta-screenshots", "lead-context-tasks-refine");

test.describe("Lead context task manager", () => {
  test.setTimeout(240_000);

  test("keeps task management inside the selected lead", async ({ page }) => {
    await fs.promises.mkdir(SCREENSHOT_DIR, { recursive: true });
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/operacao?view=conversations");
    const lead = page
      .locator('[data-testid^="conversation-conv-"]')
      .filter({ hasText: /Luciana/i })
      .first();
    await expect(lead).toBeVisible({ timeout: 30_000 });
    await lead.click();
    const panel = page.getByTestId("lead-context-panel");
    const toggle = panel.getByRole("button", { name: /Tarefas/i });
    await expect(toggle).toBeVisible({ timeout: 30_000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "tasks-closed.png") });
    await toggle.click();
    const manager = panel.getByTestId("lead-tasks-manager");
    await expect(manager).toBeVisible();
    await expect(manager.getByText(/Próxima:/)).toHaveCount(0);
    await expect(manager.getByText("Concluir", { exact: true })).toHaveCount(0);
    await expect(manager.getByTestId("lead-task-row")).toHaveCount(
      await manager.getByTestId("lead-task-row").count(),
    );
    expect(await manager.getByTestId("lead-task-row").count()).toBeLessThanOrEqual(3);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "tasks-open.png") });

    await manager.getByRole("button", { name: /Nova tarefa/i }).click();
    const createDialog = page.getByRole("dialog", { name: "Nova tarefa" });
    await expect(createDialog.getByLabel("Título *")).toBeVisible();
    await expect(createDialog.getByLabel("Descrição")).toBeVisible();
    await expect(createDialog.getByLabel("Status")).toBeVisible();
    await expect(createDialog.getByLabel("Responsável")).toBeVisible();
    await expect(createDialog.getByLabel("Data de vencimento")).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "new-task-dialog.png") });
    await createDialog.getByRole("button", { name: "Cancelar" }).click();

    await manager.getByRole("button", { name: "Ver todas as tarefas" }).click();
    const allDialog = page.getByRole("dialog", { name: "Tarefas do lead" });
    await expect(allDialog.getByText(/Abertas \(/)).toBeVisible();
    await expect(allDialog.getByText(/Concluídas \(/)).toBeVisible();
    await expect(page).toHaveURL(/\/operacao\?view=conversations/);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "all-tasks-dialog.png") });
  });
});
