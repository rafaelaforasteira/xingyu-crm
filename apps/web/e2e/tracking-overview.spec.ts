import { expect, test } from "@playwright/test";
test("Tracking overview: responsive layout, filters, dates and refresh", async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/tracking/vendas");
  await expect(
    page.getByRole("heading", { name: "Inteligência de Vendas", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Dados demonstrativos", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "De onde vêm as vendas?", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Evolução da relação com o cliente" }),
  ).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Saúde da base" })).toHaveCount(0);
  for (const [width, height, label] of [
    [1600, 1000, "wide"],
    [1280, 900, "desktop"],
    [768, 1024, "tablet"],
    [390, 844, "mobile"],
  ] as const) {
    await page.setViewportSize({ width, height });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);
    await page.waitForTimeout(1000); // Allow Recharts requestAnimationFrame drawing to finish after resize.
    if (width === 390) {
      await page.getByRole("region", { name: "Fluxo financeiro", exact: true }).screenshot({ path: "../../artifacts/tracking-refinement-funnel-mobile.png", animations: "disabled" });
      await page.getByRole("region", { name: "Inteligência das vendas realizadas", exact: true }).screenshot({ path: "../../artifacts/tracking-refinement-metrics-mobile.png", animations: "disabled" });
    }
    await page.screenshot({
      path: "../../artifacts/tracking-overview-" + label + ".png",
      fullPage: true,
      animations: "disabled",
    });
  }
  await page.getByRole("button", { name: "Filtrar dados de vendas", exact: true }).click();
  const panel = page.getByRole("dialog", { name: "Filtros de vendas", exact: true });
  await expect(panel).toBeVisible();
  await expect(panel).toHaveAttribute("aria-modal", "true");
  await page.screenshot({ path: "../../artifacts/tracking-overview-mobile-filters.png" });
  await page.getByLabel("Tipo de cliente", { exact: true }).selectOption("NEW");
  await page.getByLabel("Número da compra", { exact: true }).selectOption("2");
  await expect(page.locator('[aria-label="2 filtros ativos"]')).toHaveCount(0);
  await page.getByRole("button", { name: "Aplicar filtros", exact: true }).click();
  await expect(panel).toHaveCount(0);
  await expect(page.locator('[aria-label="2 filtros ativos"]')).toBeVisible();
  await expect(page.getByRole("heading", { name: "Clientes do período", exact: true })).toHaveCount(
    0,
  );
  const filteredRefresh = page.getByRole("button", {
    name: "Atualizar dados da análise",
    exact: true,
  });
  await filteredRefresh.click();
  await expect(filteredRefresh).toBeEnabled();
  await expect(page.locator('[aria-label="2 filtros ativos"]')).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "Filtrar dados de vendas", exact: true }).click();
  await page.getByRole("button", { name: "Limpar", exact: true }).click();
  await page.getByRole("button", { name: "Aplicar filtros", exact: true }).click();
  const refresh = page.getByRole("button", { name: "Atualizar dados da análise", exact: true });
  await expect(refresh).toHaveAttribute("title", "Atualizar dados");
  const scrollBeforeRefresh = await page.evaluate(() => window.scrollY);
  await refresh.evaluate((el: HTMLButtonElement) => {
    el.click();
    el.click();
  });
  await expect(refresh).toBeDisabled();
  await expect(page.getByText("Dados atualizados", { exact: true })).toBeVisible();
  await expect(refresh).toBeEnabled();
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollBeforeRefresh);
  await expect(page.getByText("Recuperação das perdas", { exact: false })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Clientes do período", exact: true })).toHaveCount(
    0,
  );
  await expect(page.getByText("Conversão ainda indisponível", { exact: true })).toBeVisible();
  await page
    .getByLabel("Composição da receita por canal", { exact: true })
    .getByRole("button")
    .first()
    .focus();
  await expect(page.getByRole("tooltip")).toContainText("pedidos");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Entender LTV médio", exact: true }).focus();
  await expect(page.getByRole("tooltip")).toContainText("data final");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  await page.getByRole("button", { name: "Filtrar dados de vendas", exact: true }).click();
  await page.getByLabel("Período", { exact: true }).selectOption("custom");
  await expect(page.getByRole("grid")).toBeVisible();
  await expect(page.locator('input[type="date"]')).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Aplicar filtros", exact: true })).toBeDisabled();
  await page.screenshot({ path: "../../artifacts/tracking-overview-calendar.png" });
  const availableDays = page.getByRole("grid").locator("button:not([disabled])");
  await availableDays.nth(1).click();
  await availableDays.nth(5).click();
  await page.getByLabel("Tipo de cliente", { exact: true }).selectOption("REACTIVATED");
  await page.getByRole("button", { name: "Aplicar filtros", exact: true }).click();
  await refresh.click();
  await expect(refresh).toBeEnabled();
  await page.getByRole("button", { name: "Filtrar dados de vendas", exact: true }).click();
  await expect(page.getByLabel("Período", { exact: true })).toHaveValue("custom");
  await expect(page.getByLabel("Tipo de cliente", { exact: true })).toHaveValue("REACTIVATED");
  await page.keyboard.press("Escape");
  await expect(panel).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const animations = await page
    .locator('[aria-label="Fluxo financeiro"]')
    .evaluate(
      (el) => el.getAnimations({ subtree: true }).filter((a) => a.playState === "running").length,
    );
  expect(animations).toBe(0);
  const valuesMatch = await page.locator("span.tabular-nums > span[aria-hidden='true']").evaluateAll(nodes => nodes.every(node => node.textContent === node.previousElementSibling?.textContent));
  expect(valuesMatch).toBe(true);
  expect(errors).toEqual([]);
});
