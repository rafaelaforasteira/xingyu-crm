import { expect, test } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";

const SCREENSHOT_DIR = path.join(
  __dirname,
  ".beta-screenshots",
  "conversation-list-crm-cards",
);

test.describe("Beta conversation list CRM cards", () => {
  test.setTimeout(180_000);

  test("renders enriched lead cards without breaking filters or columns", async ({
    page,
  }) => {
    await fs.promises.mkdir(SCREENSHOT_DIR, { recursive: true });
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/operacao?view=conversations");

    await expect(page.getByTestId("beta-conversation-workspace")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByPlaceholder(/Buscar conversas/i)).toBeVisible();
    await expect(page.getByTestId("conversation-filters-trigger")).toBeVisible();

    const first = page.locator('[data-testid^="conversation-conv-"]').first();
    await expect(first).toBeVisible({ timeout: 30_000 });
    await expect(first.getByTestId("conversation-lead-code")).toBeVisible();
    await expect(first.getByTestId("conversation-lead-code")).toContainText(
      /Lead #\d+/,
    );
    await expect(first.getByTestId("conversation-stage-tag")).toBeVisible();

    const timeText = await first.locator("time").first().textContent();
    if (timeText) {
      expect(timeText).not.toMatch(/há /i);
      expect(timeText).toMatch(
        /Ontem|\d{2}:\d{2}|\d{2}\/\d{2}\/\d{4}|segunda|terça|terca|quarta|quinta|sexta|sábado|sabado|domingo/i,
      );
    }

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "list-1920.png"),
      fullPage: false,
    });

    await page.setViewportSize({ width: 1366, height: 768 });
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "list-1366.png"),
      fullPage: false,
    });

    const unread = page.locator('[data-testid^="conversation-conv-"][data-unread="true"]').first();
    if (await unread.count()) {
      await expect(unread.getByTestId("conversation-unread-count")).toBeVisible();
      await unread.screenshot({
        path: path.join(SCREENSHOT_DIR, "item-unread.png"),
      });
    }

    const awaiting = page
      .locator('[data-testid^="conversation-conv-"][data-awaiting-reply="true"]')
      .first();
    if (await awaiting.count()) {
      await awaiting.screenshot({
        path: path.join(SCREENSHOT_DIR, "item-awaiting.png"),
      });
      await awaiting.click();
      await expect(awaiting).toHaveAttribute("aria-current", "page");
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, "item-selected-awaiting.png"),
        fullPage: false,
      });
    } else {
      await first.click();
      await expect(first).toHaveAttribute("aria-current", "page");
    }

    const codeBefore = await first
      .getByTestId("conversation-lead-code")
      .textContent();
    await page.reload();
    await expect(page.getByTestId("beta-conversation-workspace")).toBeVisible({
      timeout: 30_000,
    });
    const firstAfter = page.locator('[data-testid^="conversation-conv-"]').first();
    await expect(firstAfter.getByTestId("conversation-lead-code")).toHaveText(
      codeBefore ?? /Lead #/,
    );

    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.getByTestId("conversation-filters-trigger").click();
    const popover = page.getByTestId("conversation-filters-popover");
    await expect(popover).toBeVisible();
    await popover.getByTestId("conversation-filters-clear").click({ force: true });
    await expect(page.getByTestId("conversation-filters-popover")).toHaveCount(0);
  });
});
