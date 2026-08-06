import { expect, test, type Locator, type Page } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";

const SCREENSHOT_DIR = path.join(
  __dirname,
  ".beta-screenshots",
  "conversation-composer",
);

async function openDemoComposer(page: Page) {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto(
    "/operacao?view=conversations&conversation=conv-operacao-demo",
  );
  await expect(page.getByTestId("beta-conversation-workspace")).toBeVisible({
    timeout: 30_000,
  });
  const textarea = page.getByTestId("composer-textarea");
  await expect(textarea).toBeVisible({ timeout: 30_000 });
  return textarea;
}

function centersAligned(a: { y: number; height: number }, b: { y: number; height: number }, tol = 4) {
  const centerA = a.y + a.height / 2;
  const centerB = b.y + b.height / 2;
  return Math.abs(centerA - centerB) <= tol;
}

function bottomsAligned(a: { y: number; height: number }, b: { y: number; height: number }, tol = 4) {
  return Math.abs(a.y + a.height - (b.y + b.height)) <= tol;
}

async function box(locator: Locator) {
  const value = await locator.boundingBox();
  expect(value).toBeTruthy();
  return value!;
}

test.describe("Beta conversation composer polish", () => {
  test.setTimeout(180_000);

  test("aligns actions, grows upward, keeps scroll inside border", async ({
    page,
  }) => {
    await fs.promises.mkdir(SCREENSHOT_DIR, { recursive: true });
    const textarea = await openDemoComposer(page);
    const wrapper = page.getByTestId("composer-textarea-wrapper");
    const emoji = page.getByTestId("composer-emoji-button");
    const attach = page.getByTestId("composer-attach-button");
    const mic = page.getByTestId("composer-mic-button");
    const send = page.getByTestId("composer-send-button");
    const hint = page.getByTestId("composer-keyboard-hint");

    await expect(textarea).toHaveAttribute("placeholder", "Digite uma mensagem…");
    await expect(hint).toHaveText(
      "Enter para enviar · Shift + Enter para quebrar linha",
    );
    await expect(textarea).toHaveAttribute("lang", "pt-BR");
    await expect(textarea).toHaveAttribute("spellcheck", "true");
    await expect(emoji).toBeVisible();
    await expect(attach).toBeVisible();
    await expect(mic).toBeVisible();
    await expect(send).toBeVisible();

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "empty-1920.png"),
      fullPage: false,
    });

    const collapsedField = await box(textarea);
    const collapsedEmoji = await box(emoji);
    const collapsedAttach = await box(attach);
    const collapsedMic = await box(mic);
    const collapsedSend = await box(send);

    expect(centersAligned(collapsedEmoji, collapsedField, 6)).toBe(true);
    expect(centersAligned(collapsedAttach, collapsedField, 6)).toBe(true);
    expect(centersAligned(collapsedMic, collapsedField, 6)).toBe(true);
    expect(centersAligned(collapsedSend, collapsedField, 6)).toBe(true);
    expect(collapsedField.height).toBeLessThanOrEqual(52);

    await textarea.fill("Uma linha");
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "one-line.png"),
      fullPage: false,
    });

    await textarea.click();
    await textarea.press("Control+A");
    await textarea.press("Backspace");
    await textarea.type("Primeira linha");
    await textarea.press("Shift+Enter");
    await textarea.type("Segunda linha");
    await textarea.press("Shift+Enter");
    await textarea.type("Terceira linha");
    await textarea.press("Shift+Enter");
    await textarea.type("Quarta linha");
    await textarea.press("Shift+Enter");
    await textarea.type("Quinta linha");
    await textarea.press("Shift+Enter");
    await textarea.type("Sexta linha");

    await expect(textarea).toHaveValue(/Primeira linha[\s\S]*Sexta linha/);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "multi-line.png"),
      fullPage: false,
    });

    const expandedField = await box(wrapper);
    const expandedEmoji = await box(emoji);
    const expandedMic = await box(mic);
    const expandedSend = await box(send);

    expect(Math.abs(expandedEmoji.x - collapsedEmoji.x)).toBeLessThanOrEqual(2);
    expect(Math.abs(expandedMic.x - collapsedMic.x)).toBeLessThanOrEqual(2);
    expect(Math.abs(expandedSend.x - collapsedSend.x)).toBeLessThanOrEqual(2);
    expect(bottomsAligned(expandedEmoji, expandedField, 6)).toBe(true);
    expect(bottomsAligned(expandedMic, expandedField, 6)).toBe(true);
    expect(bottomsAligned(expandedSend, expandedField, 6)).toBe(true);
    expect(expandedField.height).toBeGreaterThan(collapsedField.height - 1);

    for (let i = 0; i < 12; i += 1) {
      await textarea.press("Shift+Enter");
      await textarea.type(`extra ${i}`);
    }

    const metrics = await textarea.evaluate((el: HTMLTextAreaElement) => ({
      height: el.getBoundingClientRect().height,
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
      overflowY: getComputedStyle(el).overflowY,
    }));
    expect(metrics.height).toBeLessThanOrEqual(168);
    expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight);
    expect(metrics.overflowY).toMatch(/auto|scroll/);

    const fieldBox = await box(wrapper);
    const textareaBox = await box(textarea);
    expect(textareaBox.x).toBeGreaterThanOrEqual(fieldBox.x - 1);
    expect(textareaBox.x + textareaBox.width).toBeLessThanOrEqual(
      fieldBox.x + fieldBox.width + 1,
    );
    expect(textareaBox.y + textareaBox.height).toBeLessThanOrEqual(
      fieldBox.y + fieldBox.height + 1,
    );

    const micBox = await box(mic);
    expect(textareaBox.x + textareaBox.width).toBeLessThanOrEqual(micBox.x + 2);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "max-height-scroll.png"),
      fullPage: false,
    });

    await textarea.fill("");
    const cleared = await box(wrapper);
    expect(cleared.height).toBeLessThanOrEqual(52);

    await page.goto(
      "/operacao?view=conversations&conversation=conv-operacao-demo",
    );
    await expect(page.getByTestId("composer-textarea")).toBeVisible({
      timeout: 30_000,
    });
    const freshComposer = page.getByTestId("conversation-composer");
    const freshTextarea = page.getByTestId("composer-textarea");
    const freshSend = page.getByTestId("composer-send-button");
    const freshWrapper = page.getByTestId("composer-textarea-wrapper");
    await expect(freshComposer).toHaveAttribute("data-recording", "false");
    await expect(freshComposer).toHaveAttribute("data-sending", "false");
    await freshTextarea.fill("Mensagem de teste do compositor");
    await expect(freshTextarea).toHaveValue("Mensagem de teste do compositor");
    await expect(freshComposer).toHaveAttribute("data-body-length", String("Mensagem de teste do compositor".length), {
      timeout: 10_000,
    });
    await expect(freshComposer).toHaveAttribute("data-can-send", "true");
    await expect(freshSend).toBeEnabled({ timeout: 10_000 });
    await freshSend.click();
    await expect(freshTextarea).toHaveValue("", { timeout: 15_000 });
    const afterSend = await box(freshWrapper);
    expect(afterSend.height).toBeLessThanOrEqual(52);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "after-send.png"),
      fullPage: false,
    });

    await freshTextarea.fill("palvraerrada");
    const blocked = await freshTextarea.evaluate((el) => {
      const event = new MouseEvent("contextmenu", {
        bubbles: true,
        cancelable: true,
        button: 2,
      });
      el.dispatchEvent(event);
      return event.defaultPrevented;
    });
    expect(blocked).toBe(false);

    await page.setViewportSize({ width: 1366, height: 768 });
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "composer-1366.png"),
      fullPage: false,
    });
    await expect(page.getByTestId("conversation-composer")).toBeVisible();
    const scrollWidth = await page
      .getByTestId("conversation-composer")
      .evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(1);
  });
});
