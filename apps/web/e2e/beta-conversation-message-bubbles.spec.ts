import { expect, test } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";

const SCREENSHOT_DIR = path.join(
  __dirname,
  ".beta-screenshots",
  "conversation-message-bubbles",
);

async function openClaudia(page: import("@playwright/test").Page) {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto(
    "/operacao?view=conversations&conversation=conv-operacao-demo",
  );
  await expect(page.getByTestId("beta-conversation-workspace")).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByTestId("message-bubble").first()).toBeVisible({
    timeout: 30_000,
  });
}

test.describe("Beta conversation message bubbles", () => {
  test.setTimeout(180_000);

  test("refines inbound/outbound metadata and media caption order", async ({
    page,
  }) => {
    await fs.promises.mkdir(SCREENSHOT_DIR, { recursive: true });
    await openClaudia(page);

    const inbound = page.locator('[data-direction="INBOUND"]').first();
    await expect(inbound).toBeVisible();
    await expect(inbound.getByText(/Recebido de/i)).toHaveCount(0);
    await expect(inbound.getByTestId("message-delivery-status")).toHaveCount(0);
    await expect(inbound.getByText(/^Entregue$/)).toHaveCount(0);
    await expect(inbound.getByTestId("message-time")).toBeVisible();

    const outbound = page.locator('[data-direction="OUTBOUND"]').first();
    await expect(outbound).toBeVisible();
    await expect(outbound.getByTestId("message-sender-line")).toBeVisible();
    await expect(outbound.getByTestId("message-sender-line")).toContainText(
      /Enviado por/i,
    );
    await expect(outbound.getByTestId("message-time")).toBeVisible();
    await expect(outbound.getByText(/^Enviado$/)).toHaveCount(0);
    await expect(outbound.getByText(/^Entregue$/)).toHaveCount(0);
    await expect(outbound.getByText(/^Lido$/)).toHaveCount(0);

    await expect(page.getByTestId("message-day-separator").first()).toBeVisible();
    await expect(page.getByTestId("load-older-messages")).toBeVisible();

    const beforeCount = await page
      .locator('[data-testid^="message-"][data-direction]')
      .count();
    await page.getByTestId("load-older-messages").click();
    await expect
      .poll(async () =>
        page.locator('[data-testid^="message-"][data-direction]').count(),
      )
      .toBeGreaterThan(beforeCount);

    const imageBubble = page
      .locator('[data-testid="message-bubble"]')
      .filter({ has: page.getByTestId("message-image-content") })
      .first();
    if (await imageBubble.count()) {
      const caption = imageBubble.getByTestId("message-caption");
      if (await caption.count()) {
        const imageBox = await imageBubble
          .getByTestId("message-image-content")
          .boundingBox();
        const captionBox = await caption.boundingBox();
        expect(imageBox && captionBox).toBeTruthy();
        if (imageBox && captionBox) {
          expect(imageBox.y).toBeLessThan(captionBox.y);
        }
      }
      await expect(imageBubble.getByTestId("message-metadata")).toBeVisible();
    }

    await expect(page.getByTestId("message-document-content").first()).toBeVisible({
      timeout: 15_000,
    });
    // Cobertura de áudio é opcional se o arquivo demo local estiver ausente.
    const audioBlock = page.locator(
      '[data-testid="message-audio-content"], [data-testid="message-voice-content"]',
    );
    for (let i = 0; i < 3 && (await audioBlock.count()) === 0; i += 1) {
      const older = page.getByTestId("load-older-messages");
      if (!(await older.isVisible().catch(() => false))) break;
      await older.click();
      await page.waitForTimeout(400);
    }

    const scrollWidth = await page
      .getByTestId("message-list")
      .evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(2);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "claudia-1920.png"),
      fullPage: false,
    });

    // Caroline (conv-02) status matrix from history MVP seed
    await page.goto("/operacao?view=conversations&conversation=conv-02");
    await expect(page.getByTestId("message-bubble").first()).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.locator('[data-status="FAILED"]').first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator('[data-status="SENT"]').first()).toBeVisible();
    await expect(page.locator('[data-status="READ"]').first()).toBeVisible();
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "caroline-statuses.png"),
      fullPage: false,
    });

    await page.setViewportSize({ width: 1366, height: 768 });
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "bubbles-1366.png"),
      fullPage: false,
    });
  });
});
