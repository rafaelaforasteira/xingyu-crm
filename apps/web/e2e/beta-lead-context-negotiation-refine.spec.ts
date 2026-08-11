import { expect, test } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";

const SCREENSHOT_DIR = path.join(
  __dirname,
  ".beta-screenshots",
  "lead-context-negotiation-refine",
);

test.describe("Lead context negotiation refine", () => {
  test.setTimeout(240_000);

  test("shows Lead # / Pipeline / Etapa without count, title, or open link", async ({
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

    // Resumo intact
    const summary = panel.getByTestId("lead-context-summary");
    await expect(summary.getByTestId("lead-context-contact-name")).toContainText(
      /Luciana/i,
    );
    await expect(summary.getByTestId("lead-context-channel-badge")).toBeVisible();
    await expect(summary.getByTestId("lead-context-stage-badge")).toBeVisible();

    const negociacaoBtn = panel.getByRole("button", { name: /^Negociação$/ });
    await expect(negociacaoBtn).toBeVisible();

    // Closed: header has no numeric badge
    await expect(negociacaoBtn).toHaveAttribute("aria-expanded", "false");
    await expect(negociacaoBtn.locator('[class*="Badge"], .badge')).toHaveCount(0);
    const closedHeaderText = ((await negociacaoBtn.innerText()) ?? "").trim();
    expect(closedHeaderText).toMatch(/^Negociação$/);
    expect(closedHeaderText).not.toMatch(/\d/);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "negotiation-closed-1920.png"),
      fullPage: false,
    });

    await negociacaoBtn.click();
    await expect(negociacaoBtn).toHaveAttribute("aria-expanded", "true");

    const negotiation = panel.getByTestId("lead-context-negotiation");
    await expect(negotiation).toBeVisible();

    await expect(negotiation.getByTestId("lead-context-lead-code")).toBeVisible();
    await expect(negotiation.getByTestId("lead-context-lead-code")).toContainText(
      /Lead #\d{4,}/,
    );
    await expect(negotiation.getByTestId("lead-context-pipeline")).toContainText(
      /Pipeline:/i,
    );
    await expect(negotiation.getByTestId("lead-context-stage")).toContainText(
      /Etapa:/i,
    );

    // Order: Lead # before Pipeline before Etapa
    const leadBox = await negotiation.getByTestId("lead-context-lead-code").boundingBox();
    const pipelineBox = await negotiation
      .getByTestId("lead-context-pipeline")
      .boundingBox();
    const stageBox = await negotiation.getByTestId("lead-context-stage").boundingBox();
    expect(leadBox && pipelineBox && stageBox).toBeTruthy();
    expect(leadBox!.y).toBeLessThan(pipelineBox!.y);
    expect(pipelineBox!.y).toBeLessThan(stageBox!.y);

    // No Deal.title, no Abrir negociação
    await expect(
      negotiation.getByText(/Lead sem resposta/i),
    ).toHaveCount(0);
    await expect(panel.getByText(/Abrir negociação/i)).toHaveCount(0);
    await expect(
      panel.getByRole("link", { name: /abrir negociação/i }),
    ).toHaveCount(0);

    // Header still has no count when open
    const openHeaderText = ((await negociacaoBtn.innerText()) ?? "").trim();
    expect(openHeaderText).toMatch(/^Negociação$/);
    expect(openHeaderText).not.toMatch(/\d/);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "negotiation-open-1920.png"),
      fullPage: false,
    });
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "negotiation-detail.png"),
      fullPage: false,
    });

    // Collapse / expand again
    await negociacaoBtn.click();
    await expect(negociacaoBtn).toHaveAttribute("aria-expanded", "false");
    await negociacaoBtn.click();
    await expect(negotiation).toBeVisible();
    await expect(negotiation.getByTestId("lead-context-lead-code")).toBeVisible();

    // Other section counts preserved
    const tarefas = panel.getByRole("button", { name: /Tarefas/i });
    await expect(tarefas).toContainText(/\d/);
    const pedidos = panel.getByRole("button", { name: /Pedidos/i });
    await expect(pedidos).toContainText(/\d/);
    const historico = panel.getByRole("button", { name: /Histórico/i });
    await expect(historico).toHaveText(/Histórico/);
    await expect(historico).not.toContainText(/\d/);
    await expect(
      panel.getByRole("button", { name: /Outras negociações/i }),
    ).toBeVisible();

    // Stage sync via header selector
    const headerStage = page.getByTestId("pipeline-stage-selector");
    const originalStage = ((await headerStage.innerText()) ?? "").trim();
    const stageInNegotiation = (
      (await negotiation.getByTestId("lead-context-stage").innerText()) ?? ""
    ).replace(/^Etapa:\s*/i, "").trim();
    expect(stageInNegotiation).toBe(originalStage);

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

    await expect(negotiation.getByTestId("lead-context-stage")).toContainText(
      nextStage,
      { timeout: 15_000 },
    );
    await expect(summary.getByTestId("lead-context-stage-badge")).toContainText(
      nextStage,
    );

    // Restore
    await page.getByTestId("pipeline-stage-selector").click();
    await page
      .getByTestId("pipeline-stage-options")
      .locator("button", { hasText: originalStage })
      .click();
    await expect(negotiation.getByTestId("lead-context-stage")).toContainText(
      originalStage,
      { timeout: 15_000 },
    );

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "panel-full-1920.png"),
      fullPage: false,
    });

    await page.setViewportSize({ width: 1366, height: 768 });
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "negotiation-1366.png"),
      fullPage: false,
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "negotiation-1440.png"),
      fullPage: false,
    });

    await page.setViewportSize({ width: 1024, height: 768 });
    await expect(negociacaoBtn).toBeVisible();
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "negotiation-1024.png"),
      fullPage: false,
    });
  });
});
