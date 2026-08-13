import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const SCREENSHOT_DIR = path.join(__dirname, ".beta-screenshots", "pipeline-stage-management");

test.describe("Beta pipeline stage management", () => {
  test.setTimeout(90_000);
  test("admin creates, edits, reloads and deletes a stage across both views", async ({ page }) => {
    await fs.promises.mkdir(SCREENSHOT_DIR, { recursive: true });
    const suffix = `${Date.now()}`.slice(-7);
    const originalName = `Etapa E2E ${suffix}`;
    const renamedName = `${originalName} editada`;

    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/operacao?view=kanban");
    await expect(page.getByTestId("beta-operation-page")).toBeVisible({ timeout: 30_000 });

    const settings = page.getByTestId("operation-configure-stages");
    await expect(settings).toBeVisible();
    await expect(settings).toHaveAttribute("aria-label", "Configurar esteira");
    await expect(settings).toHaveAttribute("title", "Configurar esteira");
    await settings.click();

    const manager = page.getByTestId("pipeline-stage-manager");
    await expect(manager).toBeVisible();
    await expect(manager.getByTestId("managed-stage-row").first()).toBeVisible();
    await expect(manager.getByLabel(/^Reordenar /).first()).toBeVisible();
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "pipeline-stage-manager-1920.png"),
      fullPage: true,
    });

    await manager.getByRole("button", { name: "Adicionar etapa" }).click();
    await page.getByLabel("Nome *").fill(originalName);
    await page.getByRole("option", { name: "Cor #F97316" }).click();
    await page.getByRole("button", { name: "Criar etapa" }).click();
    await expect(manager.getByText(originalName, { exact: true })).toBeVisible();

    await manager.getByRole("button", { name: `Ações de ${originalName}` }).click();
    await manager.getByRole("menuitem", { name: "Editar" }).click();
    await page.getByLabel("Nome *").fill(renamedName);
    await page.getByRole("option", { name: "Cor #60A5FA" }).click();
    await page.getByRole("button", { name: "Salvar" }).click();
    await expect(manager.getByText(renamedName, { exact: true })).toBeVisible();

    await manager.getByRole("button", { name: "Concluído" }).click();
    await page.reload();
    await settings.click();
    await expect(
      page.getByTestId("pipeline-stage-manager").getByText(renamedName, { exact: true }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Concluído" }).click();
    await page.getByTestId("beta-view-conversations").click();
    await expect(page).toHaveURL(/view=conversations/);
    await expect(settings).toBeVisible();
    await settings.click();
    await expect(
      page.getByTestId("pipeline-stage-manager").getByText(renamedName, { exact: true }),
    ).toBeVisible();

    await page.setViewportSize({ width: 1366, height: 768 });
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "pipeline-stage-manager-1366.png"),
      fullPage: true,
    });

    const currentManager = page.getByTestId("pipeline-stage-manager");
    await currentManager.getByRole("button", { name: `Ações de ${renamedName}` }).click();
    await currentManager.getByRole("menuitem", { name: "Excluir" }).click();
    await expect(page.getByText(/A etapa está vazia/)).toBeVisible();
    await page.getByRole("button", { name: "Excluir etapa" }).click();
    await expect(currentManager.getByText(renamedName, { exact: true })).toHaveCount(0);
  });
});
