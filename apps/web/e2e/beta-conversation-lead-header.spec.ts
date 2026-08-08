import { expect, test } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";

const SCREENSHOT_DIR = path.join(
  __dirname,
  ".beta-screenshots",
  "conversation-lead-header",
);

test.describe("Beta conversation lead header", () => {
  test.setTimeout(240_000);

  test("empty state without auto-selection, header metadata, and stage move", async ({
    page,
  }) => {
    await fs.promises.mkdir(SCREENSHOT_DIR, { recursive: true });
    await page.setViewportSize({ width: 1920, height: 1080 });

    await page.goto("/operacao?view=conversations");
    await expect(page.getByTestId("beta-conversation-workspace")).toBeVisible({
      timeout: 30_000,
    });

    await expect(page).not.toHaveURL(/conversation=/);
    await expect(page.getByTestId("conversation-empty-state")).toBeVisible();
    await expect(
      page.getByText("Nenhuma conversa selecionada"),
    ).toBeVisible();
    await expect(
      page.getByText(
        /Selecione uma conversa ao lado para visualizar as mensagens e informações do lead/i,
      ),
    ).toBeVisible();
    await expect(page.getByTestId("conversation-list")).toBeVisible();
    await expect(page.getByTestId("conversation-lead-header")).toHaveCount(0);
    await expect(page.getByTestId("lead-context-panel")).toContainText(
      /Selecione uma conversa/i,
    );

    const firstCard = page.locator('[data-testid^="conversation-conv-"]').first();
    await expect(firstCard).toBeVisible({ timeout: 30_000 });
    await expect(firstCard).not.toHaveAttribute("aria-current", "page");

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "empty-1920.png"),
      fullPage: false,
    });

    await page.setViewportSize({ width: 1366, height: 768 });
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "empty-1366.png"),
      fullPage: false,
    });

    await page.setViewportSize({ width: 1920, height: 1080 });

    const amanda = page
      .locator('[data-testid^="conversation-conv-"]')
      .filter({ hasText: /Amanda Vieira/i })
      .first();
    await amanda.click();
    await expect(page).toHaveURL(/conversation=/);
    await expect(amanda).toHaveAttribute("aria-current", "page");

    const header = page.getByTestId("conversation-lead-header");
    await expect(header).toBeVisible({ timeout: 30_000 });
    await expect(header.getByTestId("conversation-header-back")).toHaveCount(0);
    await expect(header.getByText(/\bOPEN\b/)).toHaveCount(0);
    await expect(header.getByTestId("conversation-header")).toContainText(
      /Amanda Vieira/i,
    );
    await expect(header.getByTestId("conversation-header-lead-code")).toContainText(
      /Lead #\d+/,
    );
    await expect(header.getByTestId("conversation-header-assignee")).toBeVisible();
    await expect(header.getByTestId("conversation-header-channel")).toBeVisible();
    await expect(page.getByTestId("pipeline-stage-selector")).toBeVisible();
    await expect(page.getByTestId("message-list")).toBeVisible();

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "selected-1920.png"),
      fullPage: false,
    });

    await page.setViewportSize({ width: 1366, height: 768 });
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "selected-1366.png"),
      fullPage: false,
    });
    await page.setViewportSize({ width: 1920, height: 1080 });

    const stageTrigger = page.getByTestId("pipeline-stage-selector");
    const originalStage = (await stageTrigger.innerText()).trim();
    await stageTrigger.click();
    const options = page.getByTestId("pipeline-stage-options");
    await expect(options).toBeVisible();
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "dropdown-open.png"),
      fullPage: false,
    });

    const optionButtons = options.locator("button");
    const optionCount = await optionButtons.count();
    expect(optionCount).toBeGreaterThan(1);

    let targetName = "";
    let targetTestId = "";
    for (let i = 0; i < optionCount; i += 1) {
      const text = ((await optionButtons.nth(i).innerText()) ?? "").trim();
      if (text && text !== originalStage) {
        targetName = text;
        targetTestId =
          (await optionButtons.nth(i).getAttribute("data-testid")) ?? "";
        break;
      }
    }
    expect(targetName).toBeTruthy();
    await page.getByTestId(targetTestId).click();
    await expect(options).toHaveCount(0);
    await expect(stageTrigger).toContainText(targetName);
    await expect(page.getByText(/Lead movido para/i)).toBeVisible({
      timeout: 15_000,
    });

    const listStage = amanda.getByTestId("conversation-stage-tag");
    if (await listStage.count()) {
      await expect(listStage).toContainText(targetName, { timeout: 15_000 });
    }

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "stage-changed.png"),
      fullPage: false,
    });

    await page.getByTestId("beta-view-kanban").click();
    await expect(page).toHaveURL(/view=kanban/);
    await expect(page.getByText(targetName).first()).toBeVisible({
      timeout: 30_000,
    });

    await page.getByTestId("beta-view-conversations").click();
    await expect(page).toHaveURL(/view=conversations/);
    // conversation param may be cleared by switcher; re-open Amanda if needed
    if (!(await page.getByTestId("conversation-lead-header").count())) {
      await page
        .locator('[data-testid^="conversation-conv-"]')
        .filter({ hasText: /Amanda Vieira/i })
        .first()
        .click();
    }
    await expect(page.getByTestId("pipeline-stage-selector")).toContainText(
      targetName,
      { timeout: 30_000 },
    );

    await page.reload();
    await expect(page.getByTestId("beta-conversation-workspace")).toBeVisible({
      timeout: 30_000,
    });
    if (!(await page.getByTestId("conversation-lead-header").count())) {
      await page
        .locator('[data-testid^="conversation-conv-"]')
        .filter({ hasText: /Amanda Vieira/i })
        .first()
        .click();
    }
    await expect(page.getByTestId("pipeline-stage-selector")).toContainText(
      targetName,
      { timeout: 30_000 },
    );

    // Restore original stage to keep fixtures clean
    await page.getByTestId("pipeline-stage-selector").click();
    await expect(page.getByTestId("pipeline-stage-options")).toBeVisible();
    await page
      .getByTestId("pipeline-stage-options")
      .locator("button", { hasText: originalStage })
      .click();
    await expect(page.getByTestId("pipeline-stage-selector")).toContainText(
      originalStage,
      { timeout: 15_000 },
    );

    // Rapid navigation between contacts
    const names = ["Amanda Vieira", "Cláudia", "Luciana"];
    for (const name of names) {
      const card = page
        .locator('[data-testid^="conversation-conv-"]')
        .filter({ hasText: new RegExp(name, "i") })
        .first();
      if ((await card.count()) === 0) continue;
      await card.click();
      await expect(page.getByTestId("conversation-header")).toContainText(
        new RegExp(name.split(/\s+/)[0]!, "i"),
        { timeout: 15_000 },
      );
      await expect(page.getByTestId("conversation-header-lead-code")).toBeVisible();
      await expect(page.getByTestId("pipeline-stage-selector")).toBeVisible();
    }

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "context-full.png"),
      fullPage: false,
    });
  });

  test("keeps thread open when stage filter no longer matches", async ({
    page,
  }) => {
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

    const stageTrigger = page.getByTestId("pipeline-stage-selector");
    const originalStage = (await stageTrigger.innerText()).trim();

    await page.getByTestId("conversation-filters-trigger").click();
    const popover = page.getByTestId("conversation-filters-popover");
    await expect(popover).toBeVisible();
    const stageSection = popover.getByText("Etapas da esteira").locator("..");
    const stageChecks = stageSection.locator('input[type="checkbox"]');
    const count = await stageChecks.count();
    if (count === 0) {
      await popover.getByTestId("conversation-filters-clear").click({ force: true });
      return;
    }

    // Check the checkbox whose label matches current stage if possible
    let applied = false;
    for (let i = 0; i < count; i += 1) {
      const label = stageChecks.nth(i).locator("xpath=ancestor::label[1]");
      const text = ((await label.innerText().catch(() => "")) || "").trim();
      if (text.includes(originalStage)) {
        await stageChecks.nth(i).check();
        applied = true;
        break;
      }
    }
    if (!applied) await stageChecks.nth(0).check();
    await popover.getByTestId("conversation-filters-apply").click();
    await expect(page).toHaveURL(/stages=/);

    const conversationBefore = page.url();
    await stageTrigger.click();
    const options = page.getByTestId("pipeline-stage-options");
    await expect(options).toBeVisible();
    const optionButtons = options.locator("button");
    const optionCount = await optionButtons.count();
    let moved = false;
    for (let i = 0; i < optionCount; i += 1) {
      const text = ((await optionButtons.nth(i).innerText()) ?? "").trim();
      if (text && text !== originalStage) {
        await optionButtons.nth(i).click();
        moved = true;
        break;
      }
    }
    expect(moved).toBe(true);

    await expect(page).toHaveURL(/conversation=/);
    expect(page.url()).toContain(
      new URL(conversationBefore).searchParams.get("conversation") ?? "conversation=",
    );
    await expect(page).toHaveURL(/stages=/);
    await expect(page.getByTestId("conversation-lead-header")).toBeVisible();
    await expect(page.getByTestId("message-list")).toBeVisible();

    // Restore stage + clear filters
    await page.getByTestId("pipeline-stage-selector").click();
    await page
      .getByTestId("pipeline-stage-options")
      .locator("button", { hasText: originalStage })
      .click();
    await page.getByTestId("conversation-filters-trigger").click();
    await page
      .getByTestId("conversation-filters-popover")
      .getByTestId("conversation-filters-clear")
      .click({ force: true });
  });

  test("invalid conversation id does not fall back to first contact", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(
      "/operacao?view=conversations&conversation=conv-inexistente-xyz",
    );
    await expect(page.getByTestId("beta-conversation-workspace")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page).toHaveURL(/conversation=conv-inexistente-xyz/);
    await expect(
      page.locator('[data-testid^="conversation-conv-"][aria-current="page"]'),
    ).toHaveCount(0);
    await expect(page.getByText(/Amanda Vieira/i).first()).toBeVisible();
    // Amanda may appear in the list, but must not be the selected thread identity
    const header = page.getByTestId("conversation-header");
    if (await header.count()) {
      await expect(header).not.toContainText(/Amanda Vieira/i);
    }
  });
});
