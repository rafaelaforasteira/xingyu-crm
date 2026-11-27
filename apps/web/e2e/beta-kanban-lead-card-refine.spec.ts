import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const SCREENSHOT_DIR = path.join(__dirname, ".beta-screenshots", "kanban-lead-card-refine");

test.describe("Kanban operational lead cards", () => {
  test("shows real identity and operational signals without legacy controls", async ({ page }) => {
    await fs.promises.mkdir(SCREENSHOT_DIR, { recursive: true });
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/operacao?view=kanban");
    const cards = page.getByTestId("deal-card");
    await expect(cards.first()).toBeVisible({ timeout: 30_000 });
    await expect(cards.first().getByTestId("kanban-lead-code")).toContainText(
      /^Lead (#\d{4,}|sem código)$/,
    );
    await expect(cards.first().getByTestId("kanban-card-rail")).toBeVisible();
    await expect(cards.first().getByTestId("kanban-owner-control")).toBeVisible();
    await expect(cards.first().getByTestId("kanban-task-control")).toBeVisible();
    await expect(cards.first().getByTestId("kanban-priority-control")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Mover / })).toHaveCount(0);
    await expect(cards.first().getByText(/Próxima tarefa:/)).toHaveCount(0);
    await expect(cards.first().getByText(/Quente|Frio/)).toHaveCount(0);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "board-1920.png"), fullPage: true });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "board-1440.png"), fullPage: true });
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "board-1366.png"), fullPage: true });
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "board-1024.png"), fullPage: true });
    await cards.first().getByTestId("kanban-owner-control").click();
    await expect(page.getByRole("dialog", { name: /Alterar respons/ })).toBeVisible();
    await page.keyboard.press("Escape");
    await cards.first().getByTestId("kanban-priority-control").click();
    await expect(page.getByRole("dialog", { name: "Alterar prioridade" })).toBeVisible();
    await page.keyboard.press("Escape");
    await cards.first().getByTestId("kanban-task-control").click();
    await expect(page.getByRole("dialog", { name: "Tarefas do lead" })).toBeVisible();
    await expect(page.getByTestId("lead-tasks-manager")).toBeVisible();
    await page
      .getByRole("dialog", { name: "Tarefas do lead" })
      .getByRole("button", { name: /Fechar/ })
      .click();
    await cards.first().click();
    await expect(page).toHaveURL(/deal=/);
    await expect(page.getByTestId("deal-workspace-drawer")).toBeVisible();
  });
});
