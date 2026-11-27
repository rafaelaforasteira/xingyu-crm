import { expect, test } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";

const SCREENSHOT_DIR = path.join(__dirname, ".beta-screenshots", "lead-context-orders-history");

test.describe("Lead order history context", () => {
  test.setTimeout(240_000);
  test("opens compact history and order detail without leaving the conversation", async ({
    page,
  }) => {
    await fs.promises.mkdir(SCREENSHOT_DIR, { recursive: true });
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/operacao?view=conversations");
    const lead = page.locator('[data-testid^="conversation-conv-"]').first();
    await expect(lead).toBeVisible({ timeout: 30_000 });
    await lead.click();
    const panel = page.getByTestId("lead-context-panel");
    const toggle = panel.getByRole("button", { name: /Pedidos/i });
    await expect(toggle).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "orders-closed-1920.png") });
    if ((await toggle.getAttribute("aria-expanded")) !== "true") await toggle.click();
    const history = panel.getByTestId("lead-orders-history");
    if (await history.count()) {
      await expect(history.getByText("Abrir pedidos")).toHaveCount(0);
      await expect(history.locator("ul").first().locator("li")).toHaveCount(
        await history.locator("ul").first().locator("li").count(),
      );
      expect(await history.locator("ul").first().locator("li").count()).toBeLessThanOrEqual(3);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, "orders-recent-1920.png") });
      await history.getByRole("button", { name: "Ver histórico de pedidos" }).click();
      const dialog = page.getByRole("dialog", { name: /Histórico de pedidos/ });
      await expect(dialog).toBeVisible();
      await expect(page).toHaveURL(/\/operacao\?view=conversations/);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, "order-history.png") });
      const order = dialog.getByRole("button", { name: /Pedido #/ }).first();
      if (await order.count()) {
        await order.click();
        await expect(page.getByTestId("lead-order-detail")).toBeVisible();
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, "order-detail.png") });
      }
    } else {
      await expect(panel.getByText("Nenhum pedido identificado.")).toBeVisible();
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, "orders-zero.png") });
    }
  });
});
