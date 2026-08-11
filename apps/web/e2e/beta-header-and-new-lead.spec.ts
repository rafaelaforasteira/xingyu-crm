import { expect, test } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";

const SCREENSHOT_DIR = path.join(__dirname, ".beta-screenshots", "header-adjustment");

test.describe("Beta header and new lead", () => {
  test.setTimeout(180_000);

  test("refines header search and creates a real lead", async ({ page }) => {
    await fs.promises.mkdir(SCREENSHOT_DIR, { recursive: true });
    const stamp = Date.now();
    const leadName = `Contato Header ${stamp}`;

    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/operacao?view=kanban");

    await expect(page.getByTestId("beta-operation-page")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByTestId("beta-header")).toBeVisible();
    await expect(page.getByTestId("beta-header-today")).toBeVisible();
    await expect(page.getByTestId("beta-header-notifications")).toBeVisible();
    await expect(page.getByTestId("beta-header-search")).toBeVisible();
    await expect(page.getByTestId("beta-header-new")).toBeVisible();

    const search = page.getByLabel("Buscar contatos, deals e pedidos");
    await expect(search).toHaveAttribute("placeholder", "Buscar contatos, deals e pedidos…");
    await expect(page.locator("kbd")).toHaveCount(0);
    await expect(page.getByText("⌘K")).toHaveCount(0);
    await expect(page.getByText("⌘ K")).toHaveCount(0);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "header-1920.png"),
      fullPage: false,
    });

    await page.setViewportSize({ width: 1366, height: 768 });
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "header-1366.png"),
      fullPage: false,
    });
    await page.setViewportSize({ width: 1920, height: 1080 });

    await search.focus();
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "search-focused.png"),
      fullPage: false,
    });

    await page.getByTestId("beta-header-new").click();
    await expect(page.getByTestId("beta-header-new-menu")).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Novo lead" })).toBeVisible();
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "new-menu-open.png"),
      fullPage: false,
    });

    await page.getByRole("menuitem", { name: "Novo lead" }).click();
    await expect(page.getByTestId("create-lead-form")).toBeVisible();
    await expect(page.getByText("Criar lead").first()).toBeVisible();
    await expect(page.getByTestId("create-lead-form").locator("#create-lead-pipeline")).toHaveCount(
      0,
    );
    await expect(
      page.getByTestId("create-lead-form").getByRole("combobox", { name: /pipeline/i }),
    ).toHaveCount(0);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "create-lead-form.png"),
      fullPage: false,
    });

    await page.getByLabel("Telefone *").fill(`3499${String(stamp).slice(-6)}`);
    await expect(page.getByText(/Nenhum contato encontrado/)).toBeVisible({ timeout: 15_000 });
    await page.getByLabel("Nome *").fill(leadName);
    await page.getByLabel("Valor estimado").fill("150");
    await page.getByTestId("create-lead-form").getByRole("button", { name: "Criar lead" }).click();

    await expect(page.getByText(/Lead #\d+ criado com sucesso/)).toBeVisible({
      timeout: 20_000,
    });
    await expect(page).toHaveURL(new RegExp(`deal=`), { timeout: 15_000 });
    await expect(page.getByTestId("deal-workspace-drawer")).toBeVisible({
      timeout: 15_000,
    });

    await page.getByLabel("Fechar drawer").click();
    await expect(page.getByTestId("deal-workspace-drawer")).toHaveCount(0);

    const createdCard = page.getByTestId("deal-card").filter({ hasText: leadName });
    await expect(createdCard.first()).toBeVisible({ timeout: 20_000 });
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "card-created.png"),
      fullPage: false,
    });

    await search.fill(leadName);
    await expect(page).toHaveURL(/q=/, { timeout: 10_000 });
    await expect(page).toHaveURL(/view=kanban/);
    await expect(createdCard.first()).toBeVisible({ timeout: 10_000 });
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "search-hit.png"),
      fullPage: false,
    });

    await search.fill(`zzz-inexistente-${stamp}`);
    await expect(page.getByTestId("beta-kanban-empty-search")).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText("Nenhum lead encontrado.")).toBeVisible();
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "search-empty.png"),
      fullPage: false,
    });

    await search.fill("");
    await expect(page.getByTestId("beta-kanban-empty-search")).toHaveCount(0, {
      timeout: 10_000,
    });
    await expect(createdCard.first()).toBeVisible({ timeout: 10_000 });

    await page.reload();
    await expect(page.getByTestId("beta-kanban")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByTestId("deal-card").filter({ hasText: leadName }).first()).toBeVisible({
      timeout: 20_000,
    });
  });
});
