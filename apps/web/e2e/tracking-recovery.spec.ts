import { expect, test, type Page } from "@playwright/test";
import path from "node:path";
const authState = process.env.BRAINX_RECOVERY_AUTH_STATE;
if (authState) test.use({ storageState: authState });
test.describe.configure({ mode: "serial" });
test.setTimeout(240_000);
const select = async (page: Page, label: string, option: string) => {
  await page.getByRole("combobox", { name: label, exact: true }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
};
const openFilters = async (page: Page) => {
  await page.getByRole("button", { name: "Filtrar recuperação", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Filtros de recuperação", exact: true }),
  ).toBeVisible();
};
const ready = async (page: Page) => {
  await page.goto("/tracking/recuperacao");
  await expect(page.getByRole("heading", { name: "Resumo do período", exact: true })).toBeVisible({
    timeout: 120_000,
  });
  await expect(
    page.getByText("Dados demonstrativos · não são resultados reais", { exact: true }),
  ).toBeVisible();
};

test("Recovery admin page, HD/mobile composition, methods, quality and learning model", async ({
  page,
}) => {
  await ready(page);
  for (const title of [
    "BRAINX Intelligence",
    "Como a recuperação aconteceu",
    "Evolução da recuperação",
    "Tempo até a recuperação",
    "Quem recupera melhor",
    "Produtos e padrões da cesta",
    "Potencial de recuperação",
    "Oportunidades em aberto",
    "Qualidade dos dados",
  ])
    await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
  await expect(page.getByText("Totais reconciliados", { exact: true })).toBeVisible();
  await expect(page.getByText("Probabilidade do modelo", { exact: true })).toBeVisible();
  await expect(page.getByText("Indisponível", { exact: true })).toBeVisible();
  const api = await page.request.get("/api/tracking/recovery/overview");
  expect(api.status()).toBe(200);
  const dto = await api.json();
  expect(dto.source).toBe("demo");
  expect(dto.summary.expectedRecoverableCents).toBeNull();
  expect(dto.compositionBreakdown.map((m: { method: string }) => m.method)).toEqual([
    "AUTOMATIC",
    "CONSULTANT",
    "UNKNOWN",
  ]);
  expect(
    dto.compositionBreakdown.reduce(
      (n: number, m: { revenueCents: number }) => n + m.revenueCents,
      0,
    ),
  ).toBe(dto.summary.recoveredCents);
  expect(dto.compositionBreakdown.reduce((n: number, m: { cases: number }) => n + m.cases, 0)).toBe(
    dto.summary.recoveredCases,
  );
  const compositionWidget = page.getByRole("region", {
    name: "Composição da recuperação",
    exact: true,
  });
  await expect(compositionWidget.locator("[data-composition-method]")).toHaveCount(3);
  await expect(compositionWidget.getByText("Mista", { exact: true })).toHaveCount(0);
  expect(dto.predictionStatus.status).toBe("LEARNING");
  expect(dto.methodBreakdown.reduce((n: number, m: { cases: number }) => n + m.cases, 0)).toBe(
    dto.summary.recoveredCases,
  );
  // Recharts animates with JavaScript; reduced motion stabilizes both SVG and CSS captures.
  await page.emulateMedia({ reducedMotion: "reduce" });
  const screenshotDir = path.resolve(__dirname, "../../../artifacts/tracking-recovery");
  for (const width of [1366, 1440, 1920, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true);
    const collisions = await page.locator("[data-header-control]").evaluateAll((nodes) => {
      const r = nodes.map((n) => n.getBoundingClientRect());
      return r.some((a, i) =>
        r.some(
          (b, j) =>
            i < j && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top,
        ),
      );
    });
    expect(collisions).toBe(false);
    await page.screenshot({
      path: path.join(screenshotDir, "light-" + width + ".png"),
      fullPage: true,
      animations: "disabled",
    });
    if (width === 1366 || width === 1440) {
      await compositionWidget.screenshot({
        path: path.join(screenshotDir, `composition-widget-${width}.png`),
        animations: "disabled",
      });
    }
    if (width === 1366) {
      await page.screenshot({
        path: path.join(screenshotDir, "redesign-preview-1366.png"),
        fullPage: false,
        animations: "disabled",
      });
      const methodSection = page.locator('section[aria-labelledby="recovery-method-title"]');
      await methodSection.scrollIntoViewIfNeeded();
      await expect
        .poll(() =>
          methodSection
            .locator("path.recharts-sector")
            .evaluateAll(
              (paths) =>
                paths.length > 0 &&
                paths.every((path) => (path as SVGPathElement).getTotalLength() > 100),
            ),
        )
        .toBe(true);
      await methodSection.screenshot({
        path: path.join(screenshotDir, "redesign-methods-1366.png"),
        animations: "disabled",
      });
    }
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole("button", { name: "Recolher menu", exact: true }).click();
  await expect(page.getByTestId("beta-sidebar")).toHaveAttribute("data-collapsed", "true");
  await page.screenshot({
    path: path.join(screenshotDir, "light-1440-collapsed.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Expandir menu", exact: true }).click();
  // Explicit theme test; restored before continuing.
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await page.screenshot({
    path: path.join(screenshotDir, "dark-1440.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.evaluate(() => document.documentElement.classList.remove("dark"));
  const methodHelp = page.getByRole("button", {
    name: "Informações sobre Método de recuperação",
    exact: true,
  });
  // The shared tooltip dismisses on scroll; inspect a visible control before keyboard focus.
  await methodHelp.scrollIntoViewIfNeeded();
  await methodHelp.focus();
  await expect(page.getByRole("tooltip")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const animations = await page
    .locator('[data-module-theme="tracking"]')
    .first()
    .evaluate(
      (el) => el.getAnimations({ subtree: true }).filter((a) => a.playState === "running").length,
    );
  expect(animations).toBe(0);
});

test("Recovery filters use draft/apply, custom dates, status, method and valid empty states", async ({
  page,
}) => {
  await ready(page);
  await openFilters(page);
  await select(page, "Status", "Em aberto");
  await page.getByRole("button", { name: "Aplicar filtros", exact: true }).click();
  await expect(
    page.getByText("Os carrinhos deste período ainda estão dentro da janela de recuperação.", {
      exact: true,
    }),
  ).toBeVisible({ timeout: 90_000 });
  await expect(
    page.getByText("Ainda não houve recuperações nesta coorte.", { exact: true }).first(),
  ).toBeVisible();
  await openFilters(page);
  await page.getByRole("button", { name: "Limpar", exact: true }).click();
  await select(page, "Método de recuperação", "Automática");
  const request = page.waitForResponse(
    (r) => r.url().includes("/tracking/recovery/overview") && r.url().includes("method=AUTOMATIC"),
  );
  await page.getByRole("button", { name: "Aplicar filtros", exact: true }).click();
  const filtered = await (await request).json();
  expect(filtered.summary.recoveryRate).toBeNull();
  expect(
    filtered.methodBreakdown
      .filter((m: { method: string; cases: number }) => m.method !== "AUTOMATIC")
      .every((m: { cases: number }) => m.cases === 0),
  ).toBe(true);
  await openFilters(page);
  await page.getByRole("button", { name: "Limpar", exact: true }).click();
  await select(page, "Período", "Período personalizado");
  const enabledDays = page.locator("[data-date]:not([disabled])");
  const keys = await enabledDays.evaluateAll((nodes) =>
    nodes.map((n) => n.getAttribute("data-date")).filter(Boolean),
  );
  const first = keys[0]!,
    second = keys[1]!;
  await page.locator('[data-date="' + first + '"]').click();
  await page.locator('[data-date="' + second + '"]').click();
  const custom = page.waitForResponse(
    (r) =>
      r.url().includes("/tracking/recovery/overview") &&
      r.url().includes("startDate=" + first) &&
      r.url().includes("endDate=" + second),
  );
  await page.getByRole("button", { name: "Aplicar filtros", exact: true }).click();
  expect((await (await custom).json()).range).toEqual({ startDate: first, endDate: second });
  await openFilters(page);
  await page.getByRole("button", { name: "Limpar", exact: true }).click();
  await select(page, "Status", "Em aberto");
  await select(page, "Método de recuperação", "Automática");
  await page.getByRole("button", { name: "Aplicar filtros", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Nenhum carrinho abandonado neste período.", exact: true }),
  ).toBeVisible({ timeout: 90_000 });
});

test("Recovery visual analysis retains details, switches segments and expands the product ranking", async ({
  page,
}) => {
  await ready(page);
  const segments = page.locator('section[aria-labelledby="recovery-segments-title"]');
  await expect(segments.getByRole("table")).toHaveCount(0);
  await expect(segments.getByRole("article")).toHaveCount(3);
  await segments.getByRole("button", { name: "Faixa do carrinho", exact: true }).click();
  await expect(segments.getByRole("article")).toHaveCount(4);
  await segments.getByRole("button", { name: "Origem / canal", exact: true }).click();
  await expect(segments.getByRole("article").first()).toBeVisible();
  await expect(segments.getByRole("table")).toHaveCount(0);
  const products = page.locator('section[aria-labelledby="recovery-products-title"]');
  await expect(products.getByRole("article")).toHaveCount(5);
  await products.getByRole("button", { name: /Ver todos os/ }).click();
  await expect(products.getByRole("article")).toHaveCount(6);
  await products.getByRole("button", { name: "Maior recuperação", exact: true }).click();
  await expect(products.getByText("receita alocada", { exact: true }).first()).toBeVisible();
  await products.getByRole("button", { name: "Mostrar Top 5", exact: true }).click();
  await expect(products.getByRole("article")).toHaveCount(5);
  const model = page.locator('section[aria-labelledby="recovery-model-title"]');
  await expect(model.getByRole("progressbar")).toBeVisible();
  await expect(model.getByText("Não realizada · fonte demo", { exact: true })).toBeVisible();
  const quality = page.locator('section[aria-labelledby="recovery-quality-title"]');
  await quality
    .getByText("Todos os diagnósticos e regras de reconciliação", { exact: true })
    .click();
  await expect(quality.getByText("Checkouts duplicados", { exact: true })).toBeVisible();
});

test("Recovery opportunities sort, search and paginate with contained errors", async ({ page }) => {
  await ready(page);
  await expect(page.getByText(/oportunidades · página 1 de/)).toBeVisible({ timeout: 90_000 });
  await select(page, "Ordenar oportunidades", "Maior valor");
  await expect(page.getByRole("button", { name: "Próxima", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Próxima", exact: true }).click();
  await expect(page.getByText(/oportunidades · página 2 de/)).toBeVisible({ timeout: 90_000 });
  await page
    .getByRole("searchbox", { name: "Buscar oportunidade", exact: true })
    .fill("checkout-que-nao-existe");
  await expect(
    page.getByText("Nenhuma oportunidade em aberto para estes filtros.", { exact: true }),
  ).toBeVisible({ timeout: 90_000 });
  await page.route("**/api/tracking/recovery/overview**", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ message: "Unavailable" }),
    }),
  );
  await page.getByRole("button", { name: "Atualizar recuperação", exact: true }).click();
  await expect(
    page.getByText("Não foi possível carregar a recuperação.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Resumo do período", exact: true })).toBeVisible();
});

test("Recovery admin navigation stays accessible expanded and collapsed", async ({ page }) => {
  await ready(page);
  for (const collapsed of [false, true]) {
    if (collapsed) await page.getByRole("button", { name: "Recolher menu", exact: true }).click();
    const recovery = page.getByRole("link", { name: "Recuperação", exact: true });
    await expect(recovery).toHaveAttribute("href", "/tracking/recuperacao");
    await expect(recovery).toHaveAttribute("aria-current", "page");
    await expect(recovery.locator(".lucide-lock")).toHaveCount(0);
    await recovery.click();
    await expect(page).toHaveURL(/\/tracking\/recuperacao$/);
  }
});

test("Secondary client cannot render Recovery or bypass the existing route guard", async ({
  page,
}) => {
  await page.route("**/api/auth/me", async (route) => {
    const response = await route.fetch();
    const user = await response.json();
    await route.fulfill({
      response,
      json: {
        ...user,
        role: "CONSULTANT",
        permissions: ["tracking.overview", "profile.view", "profile.edit"],
      },
    });
  });
  await page.goto("/tracking/recuperacao");
  await expect(page).toHaveURL(/\/tracking\/vendas$/, { timeout: 90_000 });
  await expect(
    page.getByRole("heading", { name: "Recuperação de carrinhos", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByText("Recuperação", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Recuperação", exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Resumo do período", exact: true })).toBeVisible();
  for (const collapsed of [false, true]) {
    if (collapsed) await page.getByRole("button", { name: "Recolher menu", exact: true }).click();
    const recovery = page.getByRole("group", {
      name: "Recuperação — disponível apenas para administradores", exact: true,
    });
    await expect(recovery).toBeVisible();
    await expect(recovery).toHaveAttribute("aria-disabled", "true");
    await expect(recovery.locator(".lucide-lock")).toHaveCount(1);
    await expect(recovery).toHaveCSS("cursor", "default");
    await recovery.hover();
    await expect(page.getByRole("tooltip")).toHaveText("Disponível para administradores");
    await recovery.click({ force: true });
    await expect(page).toHaveURL(/\/tracking\/vendas$/);
    await expect(page.getByRole("link", { name: "Visão Geral", exact: true })).toHaveAttribute("href", "/tracking/vendas");
  }
});
