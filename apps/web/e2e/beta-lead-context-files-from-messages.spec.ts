import { expect, test } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";

const SCREENSHOT_DIR = path.join(
  __dirname,
  ".beta-screenshots",
  "lead-context-files-from-messages",
);

test.describe("Curated lead files from messages", () => {
  test.setTimeout(360_000);

  test("saves individual media, previews the curated folder and removes only its reference", async ({
    page,
  }) => {
    await fs.promises.mkdir(SCREENSHOT_DIR, { recursive: true });
    await page.setViewportSize({ width: 1920, height: 1080 });
    const existingResponse = await page.request.get("/api/deals/deal-operacao-demo/files");
    const existing = (await existingResponse.json()) as {
      data: Array<{ id: string; attachmentId?: string | null }>;
    };
    const fixtureAttachments = new Set([
      "conv-operacao-demo-att-image",
      "conv-operacao-demo-att-doc",
      "conv-operacao-demo-att-audio",
    ]);
    for (const file of existing.data.filter((item) =>
      fixtureAttachments.has(item.attachmentId ?? ""),
    )) {
      await page.request.delete(`/api/deals/deal-operacao-demo/files/${file.id}`);
    }
    await page.goto("/operacao?view=conversations");
    await page.getByTestId("conversation-conv-operacao-demo").click();
    const panel = page.getByTestId("lead-context-panel");
    const filesToggle = panel.getByRole("button", { name: /Arquivos/i });
    await expect(filesToggle).toBeVisible({ timeout: 30_000 });
    await filesToggle.click();
    const section = panel.getByTestId("lead-files-section");
    await expect(section.getByText("Nenhum arquivo salvo.")).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "files-zero-1920.png") });

    const findMessage = async (messageId: string) => {
      const message = page.getByTestId(`message-${messageId}`);
      for (let pageIndex = 0; pageIndex < 10 && (await message.count()) === 0; pageIndex += 1) {
        const loadOlder = page.getByTestId("load-older-messages");
        await expect(loadOlder).toBeVisible();
        await loadOlder.click();
        await page.waitForTimeout(300);
      }
      await expect(message).toBeVisible();
      return message;
    };

    const saveFromMessage = async (messageId: string) => {
      const message = await findMessage(messageId);
      await message.scrollIntoViewIfNeeded();
      await message.hover();
      await message.getByRole("button", { name: "Abrir ações da mensagem" }).click();
      const menu = page.getByRole("dialog", { name: "Ações dos arquivos da mensagem" });
      await expect(menu.getByRole("button", { name: "Guardar em Arquivos" })).toBeVisible();
      await menu.getByRole("button", { name: "Guardar em Arquivos" }).click();
      await expect(page.getByText("Arquivo guardado.").last()).toBeVisible();
    };

    let imageMessage = await findMessage("conv-operacao-demo-hist-11");
    await imageMessage.scrollIntoViewIfNeeded();
    imageMessage = await findMessage("conv-operacao-demo-hist-11");
    await imageMessage.hover();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "message-image-actions.png") });
    await imageMessage.getByRole("button", { name: "Abrir ações da mensagem" }).click();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "menu-save-file.png") });
    await page
      .getByRole("dialog", { name: "Ações dos arquivos da mensagem" })
      .getByRole("button", { name: "Guardar em Arquivos" })
      .click();
    await expect(section.getByText("catalogo.png")).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "files-one.png") });

    imageMessage = await findMessage("conv-operacao-demo-hist-11");
    await imageMessage.hover();
    await imageMessage.getByRole("button", { name: "Abrir ações da mensagem" }).click();
    await expect(page.getByText("Salvo em Arquivos", { exact: true })).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "message-saved-state.png") });
    await page.keyboard.press("Escape");

    await saveFromMessage("conv-operacao-demo-hist-13");
    await saveFromMessage("conv-operacao-demo-hist-14");
    await expect(section.getByTestId("lead-file-row")).toHaveCount(3);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "files-three-outbound.png") });

    await section.getByRole("button", { name: "Ver todos os arquivos" }).click();
    const allFiles = page.getByRole("dialog", { name: /Arquivos · Cláudia Nunes/ });
    await expect(allFiles.getByTestId("lead-file-row")).toHaveCount(3);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "all-files-dialog.png") });
    await allFiles.getByText("catalogo.png").click();
    await expect(page.getByTestId("lead-file-preview")).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "image-preview.png") });
    await page.getByRole("button", { name: "Fechar diálogo" }).last().click();
    await allFiles.getByText("tabela-precos.txt").click();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "document-preview.png") });
    await page.getByRole("button", { name: "Fechar diálogo" }).last().click();
    await allFiles.getByText("nota-voz.webm").click();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "audio-preview.png") });
    await page.getByRole("button", { name: "Fechar diálogo" }).last().click();
    await page.getByRole("button", { name: "Fechar diálogo" }).last().click();

    imageMessage = await findMessage("conv-operacao-demo-hist-11");
    await imageMessage.scrollIntoViewIfNeeded();
    await imageMessage.hover();
    await imageMessage.getByRole("button", { name: "Abrir ações da mensagem" }).click();
    await page
      .getByRole("dialog", { name: "Ações dos arquivos da mensagem" })
      .getByRole("button", { name: "Remover dos Arquivos" })
      .click();
    await expect(page.getByText("Arquivo removido dos Arquivos.").last()).toBeVisible();
    await expect(section.getByText("catalogo.png")).toHaveCount(0);

    await page.setViewportSize({ width: 1366, height: 768 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "files-mobile-safe-1366.png") });
  });
});
