import { expect, test } from "@playwright/test";

test.describe("Unified Kanban deal workspace", () => {
  test.setTimeout(240_000);

  test("reuses conversation and lead context features without leaving Kanban", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto("/operacao?view=kanban");
    const card = page.getByTestId("deal-card").first();
    await expect(card).toBeVisible({ timeout: 30_000 });
    await card.click();

    const drawer = page.getByTestId("deal-workspace-drawer");
    await expect(drawer).toBeVisible();
    await expect(page).toHaveURL(/view=kanban.*deal=|deal=.*view=kanban/);
    await expect(drawer.getByTestId("deal-workspace-header")).toBeVisible();
    await expect(drawer.getByText(/Lead #\d+/).first()).toBeVisible();
    await expect(drawer.getByText(/Lead sem resposta/i)).toHaveCount(0);
    await expect(drawer.getByText("Quente", { exact: true })).toHaveCount(0);

    for (const tab of ["Conversa", "Visão geral", "Tarefas", "Pedidos", "Notas", "Arquivos", "Histórico"]) {
      await expect(drawer.getByRole("tab", { name: tab })).toBeVisible();
    }
    await expect(drawer.getByTestId("conversation-pane")).toBeVisible();
    await expect(drawer.getByText("Notas", { exact: true })).toHaveCount(1);

    await drawer.getByRole("tab", { name: "Visão geral" }).click();
    await expect(drawer.getByTestId("lead-context-panel")).toBeVisible();
    await drawer.getByRole("tab", { name: "Tarefas" }).click();
    await expect(drawer.getByTestId("lead-tasks-manager")).toBeVisible();
    await drawer.getByRole("tab", { name: "Notas" }).click();
    await expect(drawer.getByTestId("lead-notes-history")).toBeVisible();

    for (const [width, height] of [[1920, 1080], [1440, 900], [1024, 768]] as const) {
      await page.setViewportSize({ width, height });
      await expect(drawer).toBeVisible();
      const box = await drawer.locator("aside").boundingBox();
      expect(box?.width).toBeLessThan(width);
    }

    await drawer.getByRole("button", { name: "Fechar drawer" }).click();
    await expect(drawer).toHaveCount(0);
    await expect(page).toHaveURL(/view=kanban/);
  });
});
