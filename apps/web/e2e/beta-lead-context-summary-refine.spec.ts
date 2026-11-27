import { expect, test } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";

const SCREENSHOT_DIR = path.join(
  __dirname,
  ".beta-screenshots",
  "lead-context-summary-refine",
);

test.describe("Lead context summary refine", () => {
  test.setTimeout(240_000);

  test("formats phone, shows real channel and stage, syncs with header", async ({
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
    const summary = panel.getByTestId("lead-context-summary");
    await expect(summary).toBeVisible();

    await expect(summary.getByTestId("lead-context-contact-name")).toContainText(
      /Luciana/i,
    );
    await expect(summary.getByText(/Ver contato/i)).toHaveCount(0);
    await expect(summary.getByTestId("lead-context-phone")).toBeVisible();
    await expect(summary.getByTestId("lead-context-phone")).toContainText(
      /\+55 \(\d{2}\) /,
    );
    const phoneText =
      (await summary.getByTestId("lead-context-phone").innerText()) ?? "";
    expect(phoneText.replace(/\D/g, "")).toMatch(/^55\d{10,11}$/);
    // Must not invent a leading 9 on an 8-digit local — Luciana seed is 9 digits.
    expect(phoneText).toMatch(/\d{4,5}-\d{4}/);

    await expect(summary.getByText("Lead WhatsApp")).toHaveCount(0);
    await expect(summary.getByText(/^Quente$/)).toHaveCount(0);
    await expect(summary.getByTestId("lead-context-channel-badge")).toBeVisible();
    await expect(summary.getByTestId("lead-context-stage-badge")).toBeVisible();
    await expect(summary.getByTestId("lead-context-owner")).toContainText(
      /Responsável:/i,
    );

    const stageInSummary = (
      (await summary.getByTestId("lead-context-stage-badge").innerText()) ?? ""
    ).trim();
    expect(stageInSummary.length).toBeGreaterThan(0);
    expect(stageInSummary).not.toBe("Quente");

    const headerStage = page.getByTestId("pipeline-stage-selector");
    await expect(headerStage).toContainText(stageInSummary, { timeout: 15_000 });

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "summary-1920.png"),
      fullPage: false,
    });

    // Change stage via header and confirm Resumo syncs
    const originalStage = (await headerStage.innerText()).trim();
    await headerStage.click();
    const options = page.getByTestId("pipeline-stage-options");
    await expect(options).toBeVisible();
    const buttons = options.locator("button");
    const count = await buttons.count();
    let nextStage = "";
    for (let i = 0; i < count; i += 1) {
      const text = ((await buttons.nth(i).innerText()) ?? "").trim();
      if (text && text !== originalStage) {
        nextStage = text;
        await buttons.nth(i).click();
        break;
      }
    }
    expect(nextStage).toBeTruthy();
    await expect(summary.getByTestId("lead-context-stage-badge")).toContainText(
      nextStage,
      { timeout: 15_000 },
    );
    await expect(headerStage).toContainText(nextStage);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "stage-changed.png"),
      fullPage: false,
    });

    await page.getByTestId("beta-view-kanban").click();
    await expect(page).toHaveURL(/view=kanban/);
    await expect(page.getByText(nextStage).first()).toBeVisible({
      timeout: 30_000,
    });

    await page.getByTestId("beta-view-conversations").click();
    await expect(page).toHaveURL(/view=conversations/);
    if ((await page.getByTestId("lead-context-summary").count()) === 0) {
      await page
        .locator('[data-testid^="conversation-conv-"]')
        .filter({ hasText: /Luciana/i })
        .first()
        .click();
    }
    await expect(
      page.getByTestId("lead-context-stage-badge"),
    ).toContainText(nextStage, { timeout: 30_000 });

    // Restore original stage
    await page.getByTestId("pipeline-stage-selector").click();
    await page
      .getByTestId("pipeline-stage-options")
      .locator("button", { hasText: originalStage })
      .click();
    await expect(page.getByTestId("lead-context-stage-badge")).toContainText(
      originalStage,
      { timeout: 15_000 },
    );

    const panelBox = await panel.boundingBox();
    expect(panelBox?.width).toBeGreaterThan(200);
    expect(panelBox?.width).toBeLessThan(420);

    await page.setViewportSize({ width: 1366, height: 768 });
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "summary-1366.png"),
      fullPage: false,
    });
  });
});
