import { expect, test } from "@playwright/test";

test("conversation workspace respects desktop max width and stays usable on notebook", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto("/inbox");
  await expect(page).toHaveURL(/\/inbox\/[^/?#]+$/, { timeout: 30_000 });

  const workspace = page.getByTestId("conversation-workspace");
  await expect(workspace).toBeVisible();
  const box = await workspace.boundingBox();
  expect(box).toBeTruthy();
  expect(box!.width).toBeLessThanOrEqual(1500);

  const pane = page.getByTestId("conversation-pane");
  const paneBox = await pane.boundingBox();
  expect(paneBox).toBeTruthy();
  expect(paneBox!.width).toBeLessThanOrEqual(860);

  await page.setViewportSize({ width: 1366, height: 768 });
  await expect(page.getByTestId("conversation-list")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Mensagem" })).toBeVisible();
});

test("composer supports enter, shift+enter, emoji, attachments and sender labels", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/inbox");
  await expect(page).toHaveURL(/\/inbox\/[^/?#]+$/, { timeout: 30_000 });

  const composer = page.getByRole("textbox", { name: "Mensagem" });
  await expect(composer).toBeVisible();

  // Empty body should not enable send.
  await expect(page.getByRole("button", { name: "Enviar mensagem" })).toBeDisabled();

  // Shift+Enter creates a new line.
  await composer.click();
  await composer.type("Linha 1");
  await composer.press("Shift+Enter");
  await composer.type("Linha 2");
  await expect(composer).toHaveValue("Linha 1\nLinha 2");

  // Emoji inserts at cursor and Escape closes popover.
  await page.getByRole("button", { name: "Inserir emoji" }).click();
  await expect(page.getByTestId("emoji-popover")).toBeVisible();
  await page.getByRole("button", { name: "Inserir emoji 👍" }).click();
  await expect(page.getByTestId("emoji-popover")).toHaveCount(0);
  await expect(composer).toHaveValue(/👍/);

  // Attachment preview + remove.
  await page.getByRole("button", { name: "Anexar arquivo" }).click();
  await expect(page.getByTestId("attach-menu")).toBeVisible();
  const [fileChooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.getByRole("menuitem", { name: "Documento" }).click(),
  ]);
  await fileChooser.setFiles({
    name: "pedido-e2e.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("conteudo e2e"),
  });
  await expect(page.getByTestId("attachment-preview-list")).toContainText("pedido-e2e.txt");
  await page.getByRole("button", { name: "Remover pedido-e2e.txt" }).click();
  await expect(page.getByTestId("attachment-preview-list")).toHaveCount(0);

  // Enter sends a short message; bubble should not span full pane width.
  const unique = `E2E composer ${Date.now()}`;
  await composer.fill(unique);
  await composer.press("Enter");
  await expect(page.getByText("Mensagem enviada.")).toBeVisible();
  const bubble = page
    .getByTestId("message-list")
    .locator('article[data-testid^="message-"]')
    .filter({ hasText: unique });
  await expect(bubble).toBeVisible();
  await expect(bubble.getByTestId("message-sender-line")).toContainText(/Enviado por:/);
  await expect(bubble).toContainText("Enviado");

  const bubbleInner = bubble.getByTestId("message-bubble");
  const bubbleBox = await bubbleInner.boundingBox();
  const listBox = await page.getByTestId("message-list").boundingBox();
  expect(bubbleBox && listBox).toBeTruthy();
  expect(bubbleBox!.width).toBeLessThan(listBox!.width * 0.85);

  // Inbound historical labels remain readable.
  const inbound = page
    .getByTestId("message-list")
    .locator('[data-testid^="message-"][data-direction="INBOUND"]')
    .first();
  if (await inbound.count()) {
    await expect(inbound.getByTestId("message-sender-line")).toContainText(/Recebido de:/);
  }
});

test("mobile conversation composer remains usable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/inbox");
  await expect(page).toHaveURL(/\/inbox\/[^/?#]+$/, { timeout: 30_000 });
  await expect(page.getByTestId("conversation-list")).toBeHidden();
  await expect(page.getByRole("textbox", { name: "Mensagem" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Enviar mensagem" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Inserir emoji" })).toBeVisible();
});

test("audio recording can start and cancel with mocked MediaRecorder", async ({ page }) => {
  await page.addInitScript(() => {
    class FakeRecorder {
      static isTypeSupported() {
        return true;
      }
      constructor() {
        this.state = "inactive";
        this.mimeType = "audio/webm";
        this.ondataavailable = null;
        this.onstop = null;
      }
      start() {
        this.state = "recording";
      }
      stop() {
        this.state = "inactive";
        if (this.ondataavailable) {
          this.ondataavailable({ data: new Blob(["abc"], { type: "audio/webm" }) });
        }
        if (this.onstop) this.onstop();
      }
    }
    window.MediaRecorder = FakeRecorder;
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: async () => ({
          getTracks: () => [{ stop: () => undefined }],
        }),
      },
    });
  });

  await page.goto("/inbox");
  await expect(page).toHaveURL(/\/inbox\/[^/?#]+$/, { timeout: 30_000 });
  await page.getByRole("button", { name: "Gravar áudio" }).click();
  await expect(page.getByTestId("recording-indicator")).toBeVisible();
  await page.getByRole("button", { name: "Parar gravação" }).click();
  await expect(page.locator("audio").first()).toBeVisible();
  await page.getByRole("button", { name: "Cancelar áudio" }).click();
  await expect(page.locator('[data-testid="conversation-composer"] audio')).toHaveCount(0);
});
