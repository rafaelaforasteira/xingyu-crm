import { expect, test } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";

const SCREENSHOT_DIR = path.join(
  __dirname,
  ".beta-screenshots",
  "conversation-thread-surface",
);

async function openAmanda(page: import("@playwright/test").Page) {
  await page.goto("/operacao?view=conversations");
  await expect(page.getByTestId("beta-conversation-workspace")).toBeVisible({
    timeout: 30_000,
  });
  const amanda = page
    .locator('[data-testid^="conversation-conv-"]')
    .filter({ hasText: /Amanda Vieira/i })
    .first();
  await amanda.click();
  await expect(page.getByTestId("conversation-thread-shell")).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByTestId("message-list")).toBeVisible();
}

test.describe("Beta conversation thread surface", () => {
  test.setTimeout(240_000);

  test("rounds shell, contains scroll, keeps texture and scroll behavior", async ({
    page,
  }) => {
    await fs.promises.mkdir(SCREENSHOT_DIR, { recursive: true });
    await page.setViewportSize({ width: 1920, height: 1080 });

    await page.goto("/operacao?view=conversations");
    await expect(page.getByTestId("conversation-empty-state")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByTestId("conversation-thread-shell")).toHaveCount(0);
    await expect(page.getByTestId("conversation-thread-texture")).toHaveCount(0);

    await openAmanda(page);

    const shell = page.getByTestId("conversation-thread-shell");
    const scroll = page.getByTestId("message-list");
    const texture = page.getByTestId("conversation-thread-texture");

    await expect(texture).toBeVisible();
    await expect(texture).toHaveAttribute("aria-hidden", "true");

    const radii = await shell.evaluate((el) => {
      const style = getComputedStyle(el);
      return {
        tl: style.borderTopLeftRadius,
        tr: style.borderTopRightRadius,
        bl: style.borderBottomLeftRadius,
        br: style.borderBottomRightRadius,
        overflow: style.overflow,
      };
    });
    for (const key of ["tl", "tr", "bl", "br"] as const) {
      const px = Number.parseFloat(radii[key]);
      expect(px).toBeGreaterThanOrEqual(12);
      expect(px).toBeLessThanOrEqual(18);
    }
    expect(["hidden", "clip"]).toContain(radii.overflow);

    const scrollStyle = await scroll.evaluate((el) => {
      const style = getComputedStyle(el);
      return {
        overflowY: style.overflowY,
        overflowX: style.overflowX,
      };
    });
    expect(["auto", "scroll"]).toContain(scrollStyle.overflowY);
    expect(["hidden", "clip"]).toContain(scrollStyle.overflowX);

    const boxes = await page.evaluate(() => {
      const shellEl = document.querySelector(
        '[data-testid="conversation-thread-shell"]',
      ) as HTMLElement | null;
      const scrollEl = document.querySelector(
        '[data-testid="message-list"]',
      ) as HTMLElement | null;
      if (!shellEl || !scrollEl) return null;
      const shellBox = shellEl.getBoundingClientRect();
      const scrollBox = scrollEl.getBoundingClientRect();
      return {
        shell: {
          top: shellBox.top,
          left: shellBox.left,
          right: shellBox.right,
          bottom: shellBox.bottom,
        },
        scroll: {
          top: scrollBox.top,
          left: scrollBox.left,
          right: scrollBox.right,
          bottom: scrollBox.bottom,
          scrollHeight: scrollEl.scrollHeight,
          clientHeight: scrollEl.clientHeight,
          scrollWidth: scrollEl.scrollWidth,
          clientWidth: scrollEl.clientWidth,
        },
      };
    });
    expect(boxes).toBeTruthy();
    if (!boxes) return;

    expect(boxes.scroll.top).toBeGreaterThanOrEqual(boxes.shell.top - 1);
    expect(boxes.scroll.left).toBeGreaterThanOrEqual(boxes.shell.left - 1);
    expect(boxes.scroll.right).toBeLessThanOrEqual(boxes.shell.right + 1);
    expect(boxes.scroll.bottom).toBeLessThanOrEqual(boxes.shell.bottom + 1);
    expect(boxes.scroll.scrollWidth - boxes.scroll.clientWidth).toBeLessThanOrEqual(
      2,
    );

    // Texture must not intercept clicks — click a bubble if present
    const bubble = page.getByTestId("message-bubble").first();
    if (await bubble.count()) {
      await bubble.click({ position: { x: 8, y: 8 } });
    }

    await expect(page.getByTestId("conversation-lead-header")).toBeVisible();
    await expect(page.getByTestId("conversation-composer")).toBeVisible();
    await expect(page.getByTestId("message-day-separator").first()).toBeVisible();

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "thread-1920.png"),
      fullPage: false,
    });

    // Scroll behavior
    if (boxes.scroll.scrollHeight > boxes.scroll.clientHeight + 20) {
      await scroll.evaluate((el) => {
        el.scrollTop = 0;
      });
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, "scrollbar-top.png"),
        fullPage: false,
      });

      await scroll.evaluate((el) => {
        el.scrollTop = el.scrollHeight / 2;
      });
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, "scrollbar-mid.png"),
        fullPage: false,
      });

      await scroll.evaluate((el) => {
        el.scrollTop = el.scrollHeight;
      });
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, "scrollbar-end.png"),
        fullPage: false,
      });
    }

    const loadOlder = page.getByTestId("load-older-messages");
    if (await loadOlder.isVisible().catch(() => false)) {
      const before = await scroll.evaluate((el) => ({
        top: el.scrollTop,
        height: el.scrollHeight,
      }));
      await loadOlder.click();
      await page.waitForTimeout(800);
      const after = await scroll.evaluate((el) => ({
        top: el.scrollTop,
        height: el.scrollHeight,
      }));
      // Height may grow; never jump to the absolute top after pagination.
      if (after.height > before.height) {
        expect(after.top).toBeGreaterThan(0);
      } else {
        expect(after.top).toBeGreaterThanOrEqual(0);
      }
    }

    // Corner crops
    const shellBox = await shell.boundingBox();
    if (shellBox) {
      const size = 72;
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, "corner-tl.png"),
        clip: {
          x: shellBox.x,
          y: shellBox.y,
          width: size,
          height: size,
        },
      });
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, "corner-tr.png"),
        clip: {
          x: shellBox.x + shellBox.width - size,
          y: shellBox.y,
          width: size,
          height: size,
        },
      });
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, "corner-bl.png"),
        clip: {
          x: shellBox.x,
          y: shellBox.y + shellBox.height - size,
          width: size,
          height: size,
        },
      });
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, "corner-br.png"),
        clip: {
          x: shellBox.x + shellBox.width - size,
          y: shellBox.y + shellBox.height - size,
          width: size,
          height: size,
        },
      });
    }

    await page.setViewportSize({ width: 1366, height: 768 });
    await expect(shell).toBeVisible();
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "thread-1366.png"),
      fullPage: false,
    });

    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "context-full.png"),
      fullPage: false,
    });
  });
});
