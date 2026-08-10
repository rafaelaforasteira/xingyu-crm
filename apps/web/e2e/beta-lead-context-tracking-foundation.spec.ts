import { expect, test } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";

const SCREENSHOT_DIR = path.join(
  __dirname,
  ".beta-screenshots",
  "lead-context-tracking-foundation",
);

test.describe("Lead context tracking foundation", () => {
  test.setTimeout(240_000);

  test("replaces Canal with Rastreamento and shows known tracking fields", async ({
    page,
  }) => {
    await fs.promises.mkdir(SCREENSHOT_DIR, { recursive: true });
    await page.setViewportSize({ width: 1920, height: 1080 });

    await page.goto("/operacao?view=conversations");
    await expect(page.getByTestId("beta-conversation-workspace")).toBeVisible({
      timeout: 30_000,
    });

    const luciana = page
      .locator('[data-testid^="conversation-conv-"]')
      .filter({ hasText: /Luciana/i })
      .first();
    await expect(luciana).toBeVisible({ timeout: 30_000 });
    await luciana.click();

    const panel = page.getByTestId("lead-context-panel");
    await expect(panel).toBeVisible({ timeout: 30_000 });

    await expect(panel.getByRole("button", { name: /^Canal$/ })).toHaveCount(0);
    const trackingBtn = panel.getByRole("button", { name: /^Rastreamento$/ });
    await expect(trackingBtn).toBeVisible();
    await expect(trackingBtn).toHaveAttribute("aria-expanded", "false");
    const closedText = ((await trackingBtn.innerText()) ?? "").trim();
    expect(closedText).toMatch(/^Rastreamento$/);
    expect(closedText).not.toMatch(/\d/);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "tracking-closed-1920.png"),
      fullPage: false,
    });

    await trackingBtn.click();
    await expect(trackingBtn).toHaveAttribute("aria-expanded", "true");
    const tracking = panel.getByTestId("lead-context-tracking");
    await expect(tracking).toBeVisible();

    await expect(tracking.getByTestId("lead-tracking-origin")).toContainText(
      /WhatsApp/i,
    );
    await expect(tracking.getByTestId("lead-tracking-entry")).toHaveText(
      "Mensagem recebida",
    );
    await expect(tracking.getByTestId("lead-tracking-first-contact")).toBeVisible();
    await expect(tracking.getByTestId("lead-tracking-created-at")).toBeVisible();
    await expect(tracking.getByTestId("lead-tracking-utm-empty")).toHaveText(
      "Não identificada",
    );
    await expect(tracking.getByText(/organic/i)).toHaveCount(0);
    await expect(tracking.getByTestId("lead-tracking-utm-source")).toHaveCount(0);

    // Summary + negotiation intact
    await expect(panel.getByTestId("lead-context-summary")).toBeVisible();
    await expect(panel.getByTestId("lead-context-channel-badge")).toBeVisible();
    await expect(panel.getByRole("button", { name: /^Negociação$/ })).toBeVisible();
    await expect(panel.getByRole("button", { name: /Tarefas/i })).toContainText(/\d/);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "tracking-open-no-utm-1920.png"),
      fullPage: false,
    });
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "panel-full-1920.png"),
      fullPage: false,
    });

    await trackingBtn.click();
    await expect(trackingBtn).toHaveAttribute("aria-expanded", "false");
    await trackingBtn.click();
    await expect(tracking.getByTestId("lead-tracking-origin")).toBeVisible();

    // Caroline has Attribution (meta / cpc) — structured UTMs without inventing
    const caroline = page
      .locator('[data-testid^="conversation-conv-"]')
      .filter({ hasText: /Caroline/i })
      .first();
    if ((await caroline.count()) > 0) {
      await caroline.click();
      await expect(panel.getByTestId("lead-context-tracking")).toBeVisible({
        timeout: 15_000,
      });
      const openBtn = panel.getByRole("button", { name: /^Rastreamento$/ });
      if ((await openBtn.getAttribute("aria-expanded")) !== "true") {
        await openBtn.click();
      }
      const carolineTracking = panel.getByTestId("lead-context-tracking");
      await expect(
        carolineTracking.getByTestId("lead-tracking-utm-source"),
      ).toContainText(/meta/i);
      await expect(
        carolineTracking.getByTestId("lead-tracking-utm-medium"),
      ).toBeVisible();
      await expect(
        carolineTracking.getByTestId("lead-tracking-utm-campaign"),
      ).toBeVisible();
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, "tracking-with-utm.png"),
        fullPage: false,
      });
    }

    await page.setViewportSize({ width: 1366, height: 768 });
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "tracking-1366.png"),
      fullPage: false,
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "tracking-1440.png"),
      fullPage: false,
    });

    await page.setViewportSize({ width: 1024, height: 768 });
    await expect(panel.getByRole("button", { name: /^Rastreamento$/ })).toBeVisible();
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "tracking-1024.png"),
      fullPage: false,
    });
  });
});
