import { expect, test, type Locator, type Page } from "@playwright/test";

async function expectAnchored(page: Page, trigger: Locator) {
  const label = await trigger.getAttribute("aria-label");
  const popover = page.getByRole("dialog", {
    name: label?.replace("Alterar status de ", "Status de "),
  });
  await expect(popover).toBeVisible();
  await expect(popover).toHaveCSS("width", "180px");
  const [triggerBox, popoverBox] = await Promise.all([
    trigger.boundingBox(),
    popover.boundingBox(),
  ]);
  expect(triggerBox).not.toBeNull();
  expect(popoverBox).not.toBeNull();
  const gapBelow = (popoverBox?.y ?? 0) - ((triggerBox?.y ?? 0) + (triggerBox?.height ?? 0));
  const gapAbove = (triggerBox?.y ?? 0) - ((popoverBox?.y ?? 0) + (popoverBox?.height ?? 0));
  expect(Math.min(Math.abs(gapBelow - 6), Math.abs(gapAbove - 6))).toBeLessThan(2);
  return popover;
}

test.describe("Task status popover anchor", () => {
  test.setTimeout(240_000);

  test("anchors every menu to its circle across viewport sizes and scroll", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/operacao?view=conversations");
    const lead = page
      .locator('[data-testid^="conversation-conv-"]')
      .filter({ hasText: /Luciana/i })
      .first();
    await expect(lead).toBeVisible({ timeout: 30_000 });
    await lead.click();

    const panel = page.getByTestId("lead-context-panel");
    const manager = panel.getByTestId("lead-tasks-manager");
    await expect(manager).toBeVisible({ timeout: 30_000 });
    let triggers = manager.getByRole("button", { name: /^Alterar status de / });
    if ((await triggers.count()) === 0) {
      await manager.getByRole("button", { name: /Nova tarefa/i }).click();
      const dialog = page.getByRole("dialog", { name: "Nova tarefa" });
      await dialog.getByLabel("Título *").fill(`Validar âncora ${Date.now()}`);
      await dialog.getByRole("button", { name: "Criar tarefa" }).click();
      await expect(dialog).toHaveCount(0);
      triggers = manager.getByRole("button", { name: /^Alterar status de / });
    }

    for (const [width, height] of [
      [1920, 1080],
      [1440, 900],
      [1366, 768],
      [1024, 768],
    ] as const) {
      await page.setViewportSize({ width, height });
      const first = triggers.first();
      await first.scrollIntoViewIfNeeded();
      await first.click();
      const popover = await expectAnchored(page, first);
      await page.keyboard.press("Escape");
      await expect(popover).toHaveCount(0);
      await expect(first).toBeFocused();
    }

    if ((await triggers.count()) > 1) {
      const second = triggers.nth(1);
      await second.scrollIntoViewIfNeeded();
      await second.click();
      await expectAnchored(page, second);
      await page.keyboard.press("Escape");
    }

    const scroll = panel.getByTestId("lead-context-scroll");
    const first = triggers.first();
    await first.scrollIntoViewIfNeeded();
    await first.click();
    await scroll.evaluate((element) => {
      element.scrollTop += 24;
    });
    await expectAnchored(page, first);
  });
});
