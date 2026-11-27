import { expect, test } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";

const SCREENSHOT_DIR = path.join(
  __dirname,
  ".beta-screenshots",
  "lead-context-header-cleanup",
);

test.describe("Lead context header cleanup", () => {
  test.setTimeout(180_000);

  test("removes panel back arrow and keeps accordions", async ({ page }) => {
    await fs.promises.mkdir(SCREENSHOT_DIR, { recursive: true });
    await page.setViewportSize({ width: 1920, height: 1080 });

    await page.goto("/operacao?view=conversations");
    await expect(page.getByTestId("beta-conversation-workspace")).toBeVisible({
      timeout: 30_000,
    });

    const amanda = page
      .locator('[data-testid^="conversation-conv-"]')
      .filter({ hasText: /Amanda Vieira/i })
      .first();
    await amanda.click();
    await expect(page.getByTestId("conversation-lead-header")).toBeVisible({
      timeout: 30_000,
    });

    const panel = page.getByTestId("lead-context-panel");
    await expect(panel).toBeVisible();
    const header = panel.getByTestId("lead-context-panel-header");
    await expect(header).toBeVisible();
    await expect(header).toContainText(/Contexto do lead/i);
    await expect(
      panel.getByRole("button", { name: /Voltar para conversa/i }),
    ).toHaveCount(0);
    await expect(header.locator("svg")).toHaveCount(0);

    await expect(panel.getByRole("button", { name: /Resumo/i })).toBeVisible();
    await expect(panel.getByRole("button", { name: /Negociação/i })).toBeVisible();

    const negociacao = panel.getByRole("button", { name: /Negociação/i });
    await negociacao.click();
    await negociacao.click();

    await expect(page.getByTestId("conversation-thread-shell")).toBeVisible();
    await expect(page.getByTestId("pipeline-stage-selector")).toBeVisible();

    const panelBox = await panel.boundingBox();
    expect(panelBox?.width).toBeGreaterThan(200);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "full-1920.png"),
      fullPage: false,
    });
    if (panelBox) {
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, "panel.png"),
        clip: panelBox,
      });
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, "header-detail.png"),
        clip: {
          x: panelBox.x,
          y: panelBox.y,
          width: panelBox.width,
          height: 64,
        },
      });
    }

    await page.setViewportSize({ width: 1366, height: 768 });
    await expect(header).toContainText(/Contexto do lead/i);
    await expect(
      panel.getByRole("button", { name: /Voltar para conversa/i }),
    ).toHaveCount(0);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "full-1366.png"),
      fullPage: false,
    });
  });
});
