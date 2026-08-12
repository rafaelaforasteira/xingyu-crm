import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const SCREENSHOT_DIR = path.join(
  __dirname,
  ".beta-screenshots",
  "lead-context-scroll-tracking-tags",
);

test.describe("Scrollable lead context sheet", () => {
  test.setTimeout(240_000);

  test("opens every section, scrolls internally and keeps Tags inside tracking", async ({
    page,
  }) => {
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
    const scroll = panel.getByTestId("lead-context-scroll");
    const header = panel.getByTestId("lead-context-panel-header");
    await expect(panel).toBeVisible({ timeout: 30_000 });
    const sectionIds = [
      "summary",
      "negotiation",
      "tracking",
      "tasks",
      "orders",
      "notes",
      "files",
      "history",
      "otherDeals",
    ];
    for (const id of sectionIds) {
      await expect(
        panel.locator(`[data-context-section="${id}"]`).getByRole("button").first(),
      ).toHaveAttribute("aria-expanded", "true");
    }
    await expect(panel.getByRole("button", { name: /^Tags$/ })).toHaveCount(0);
    await expect(panel.getByTestId("lead-context-tags-block")).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "01-context-all-open.png") });

    const metrics = await scroll.evaluate((element) => ({
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
    }));
    expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight);
    const headerBefore = await header.boundingBox();
    await scroll.evaluate((element) => {
      element.scrollTop = Math.floor(element.scrollHeight / 2);
    });
    await expect.poll(() => scroll.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
    const headerAfter = await header.boundingBox();
    expect(Math.abs((headerAfter?.y ?? 0) - (headerBefore?.y ?? 0))).toBeLessThan(2);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "03-context-scroll-middle.png") });

    const orders = panel.getByRole("button", { name: /Pedidos/i });
    await orders.click();
    await expect(orders).toHaveAttribute("aria-expanded", "false");
    await scroll.evaluate((element) => {
      element.scrollTop = 0;
    });
    await panel.getByRole("button", { name: /^Rastreamento$/ }).scrollIntoViewIfNeeded();
    await panel.getByRole("button", { name: /Adicionar tag/i }).click();
    await expect(page.getByRole("dialog", { name: "Gerenciar tags do lead" })).toBeVisible();
    await expect(page.getByLabel("Buscar tag")).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "09-tag-selector.png") });
    const createdTag = `E2E ficha ${Date.now()}`;
    await page.getByLabel("Nome da nova tag").fill(createdTag);
    await page
      .getByRole("dialog", { name: "Gerenciar tags do lead" })
      .getByRole("button", { name: "Criar" })
      .click();
    await expect(page.getByText("Tag criada e adicionada")).toBeVisible();
    await page.keyboard.press("Escape");
    const createdChip = panel.getByTitle(createdTag);
    await expect(createdChip).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "10-tag-created.png") });
    await panel.getByRole("button", { name: `Remover tag ${createdTag}` }).click();
    await expect(createdChip).toHaveCount(0);

    for (const [width, height, file] of [
      [1440, 900, "19-context-1440.png"],
      [1366, 768, "20-context-1366.png"],
      [1024, 768, "21-context-1024.png"],
    ] as const) {
      await page.setViewportSize({ width, height });
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, file) });
    }
  });
});
