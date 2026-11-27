import { expect, test } from "@playwright/test";

for (const viewport of [
  { width: 390, height: 844 },
  { width: 1024, height: 768 },
  { width: 1366, height: 768 },
  { width: 1920, height: 1080 },
]) {
  test(`orders header and board are not clipped at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/orders?view=kanban");
    await expect(page.getByRole("heading", { name: "Pedidos" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Novo pedido" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Alterar idioma" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Configurar etapas" })).toBeVisible();
    const board = page.getByTestId("orders-board-scroll");
    await expect(board).toBeVisible();
    const column = page.getByTestId("orders-column").first();
    const boardBox = await board.boundingBox();
    const columnBox = await column.boundingBox();
    expect(boardBox).not.toBeNull();
    expect(columnBox).not.toBeNull();
    expect(columnBox!.y).toBeGreaterThanOrEqual(boardBox!.y);
    await page.screenshot({
      path: `e2e/.beta-screenshots/orders-${viewport.width}.png`,
      fullPage: true,
    });
  });
}

test("financial status is read-only on the card and drag remains available", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/orders?view=kanban");
  const listResponse = await page.request.get("/api/orders?page=1&pageSize=100");
  expect(listResponse.ok()).toBeTruthy();
  const listed = (await listResponse.json()) as {
    data: Array<{
      id: string;
      financialStatus?: string | null;
      operationalStageId?: string | null;
    }>;
  };
  const original = listed.data[0];
  expect(original).toBeTruthy();
  const card = page.locator(`[data-testid="order-kanban-card"][data-order-id="${original.id}"]`);
  try {
    const financialStatus = card.getByTestId("order-financial-status");
    await expect(financialStatus).toBeVisible();
    expect(await financialStatus.evaluate((element) => element.tagName)).toBe("SPAN");
    const targetColumn = page
      .locator(
        `[data-testid="orders-column"]:not([data-stage-id="${original.operationalStageId ?? ""}"])`,
      )
      .first();
    const sourceBox = await card.boundingBox();
    const targetBox = await targetColumn.boundingBox();
    expect(sourceBox).not.toBeNull();
    expect(targetBox).not.toBeNull();
    await page.mouse.move(sourceBox!.x + 20, sourceBox!.y + 20);
    await page.mouse.down();
    await page.mouse.move(targetBox!.x + 260, targetBox!.y + 20, { steps: 12 });
    await page.mouse.up();
    await expect(page).toHaveURL(/\/orders\?view=kanban$/);
  } finally {
    await page.request.patch(`/api/orders/${original.id}`, {
      data: {
        financialStatus: original.financialStatus ?? null,
        operationalStageId: original.operationalStageId,
      },
    });
  }
});

test("orders switches all controlled copy between supported locales", async ({ page }) => {
  await page.goto("/orders?view=kanban");
  const language = page.getByRole("button", { name: "Alterar idioma" });
  await language.click();
  await page.getByRole("button", { name: /English/ }).click();
  await expect(page.getByRole("heading", { name: "Orders" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "New order", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Order review", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Change language" }).click();
  await page.getByRole("button", { name: /简体中文/ }).click();
  await expect(page.getByRole("heading", { name: "订单", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "新订单", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "订单核对", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "切换语言" }).click();
  await page.getByRole("button", { name: /繁體中文/ }).click();
  await expect(page.getByRole("heading", { name: "訂單", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "新訂單", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "訂單核對", exact: true })).toBeVisible();
  await expect(page.getByText("SEPARATING", { exact: true })).toHaveCount(0);
  await expect(page.getByText("LEFT_FACTORY", { exact: true })).toHaveCount(0);
  await page.getByTestId("order-kanban-title").first().click();
  await expect(page.getByTestId("order-customer-card")).toContainText("客戶");
});

for (const viewport of [
  { width: 390, height: 844 },
  { width: 1024, height: 768 },
  { width: 1366, height: 768 },
  { width: 1920, height: 1080 },
]) {
  test(`order workspace shows the customer context card at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/orders?view=kanban");
    await page.getByTestId("order-kanban-title").first().click();
    const card = page.getByTestId("order-customer-card");
    await expect(card).toBeVisible();
    await expect(card).toContainText(/Histórico do cliente/);
    await expect(page.getByTestId("order-workspace-summary")).toBeVisible();
    await expect(page.getByTestId("order-workspace-products")).toBeVisible();
    await expect(page.getByTestId("order-workspace-financial")).toBeVisible();
    await expect(page.getByTestId("order-workspace-logistics")).toBeVisible();
    await expect(page.getByTestId("order-workspace-attribution")).toBeVisible();
    await expect(page.getByTestId("order-workspace-timeline")).toBeVisible();
    const box = await card.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeLessThanOrEqual(500);
    await page.screenshot({
      path: `e2e/.beta-screenshots/order-workspace-${viewport.width}.png`,
      fullPage: true,
    });
    if (viewport.width === 1366) {
      await page
        .getByTestId("order-identification-card")
        .getByRole("button", { name: "Editar" })
        .click();
      await page.screenshot({
        path: "e2e/.beta-screenshots/order-workspace-edit-1366.png",
        fullPage: true,
      });
      await page.getByRole("button", { name: "Cancelar", exact: true }).click();
    }
    await page.getByTestId("order-workspace-timeline").scrollIntoViewIfNeeded();
    await expect(page.getByTestId("order-workspace-timeline")).toBeInViewport();
  });
}

test("workspace remains structured for an order with sparse relationships", async ({ page }) => {
  await page.goto("/orders?view=kanban");
  const response = await page.request.get("/api/orders?page=1&pageSize=100");
  expect(response.ok()).toBeTruthy();
  const payload = (await response.json()) as {
    data: Array<{ id: string }>;
  };
  const sparse = payload.data[0];
  const detailResponse = await page.request.get(`/api/orders/${sparse.id}`);
  expect(detailResponse.ok()).toBeTruthy();
  const detail = await detailResponse.json();
  await page.route(`**/api/orders/${sparse.id}`, async (route) => {
    await route.fulfill({
      json: {
        ...detail,
        contact: null,
        deal: null,
        shipments: [],
        attributions: [],
        trackingCode: null,
        events: [],
      },
    });
  });
  await page
    .locator(`[data-testid="order-kanban-card"][data-order-id="${sparse.id}"]`)
    .getByTestId("order-kanban-title")
    .click();
  await expect(page.getByTestId("order-workspace-summary")).toBeVisible();
  await expect(page.getByTestId("order-workspace-logistics")).toContainText(
    "Nenhum envio registrado",
  );
  await expect(page.getByTestId("order-workspace-attribution")).toContainText(
    "Nenhuma informação de atribuição disponível",
  );
  await expect(page.getByTestId("order-workspace-timeline")).toContainText(
    "Nenhum evento registrado",
  );
  await expect(page.getByTestId("order-customer-card")).toContainText(
    "Cliente ainda não vinculado ao CRM",
  );
});

test("order identification supports cancel, persistence and reload", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/orders?view=kanban");
  const listResponse = await page.request.get("/api/orders?page=1&pageSize=100");
  const listed = (await listResponse.json()) as { data: Array<{ id: string }> };
  const orderId = listed.data[0].id;
  const detailResponse = await page.request.get(`/api/orders/${orderId}`);
  const original = await detailResponse.json();
  const card = page.locator(`[data-testid="order-kanban-card"][data-order-id="${orderId}"]`);
  try {
    await card.getByTestId("order-kanban-title").click();
    const identification = page.getByTestId("order-identification-card");
    await expect(identification).toBeVisible();
    await expect(identification.locator("input")).toHaveCount(0);
    await identification.getByRole("button", { name: "Editar" }).click();
    await expect(page.getByLabel("Telefone")).toHaveValue(
      original.customerPhoneSnapshot || original.contact?.phone || original.contact?.whatsapp || "",
    );
    await page.getByLabel("Telefone").fill("+55 11 00000-0000");
    await page.getByRole("button", { name: "Cancelar", exact: true }).click();
    await expect(identification.locator("input")).toHaveCount(0);
    await expect(identification).not.toContainText("+55 11 00000-0000");

    await identification.getByRole("button", { name: "Editar" }).click();
    await page.getByLabel("Telefone").fill("+55 11 98888-7766");
    await page.getByLabel("Número").fill("321");
    await page.getByLabel("Complemento").fill("Sala 4");
    await page.getByLabel("Cidade").fill("Campinas");
    const update = page.waitForResponse(
      (response) =>
        response.url().includes(`/api/orders/${orderId}`) &&
        response.request().method() === "PATCH",
    );
    await page.getByRole("button", { name: "Salvar alterações" }).click();
    expect((await update).ok()).toBeTruthy();
    await expect(identification).toContainText("+55 (11) 98888-7766");
    await expect(identification).toContainText("321");
    await page.reload();
    await expect(page.getByTestId("order-identification-card")).toContainText(
      "+55 (11) 98888-7766",
    );
    await expect(page.getByTestId("order-identification-card")).toContainText("Sala 4");
    await expect(page.getByTestId("order-identification-card")).toContainText("Campinas");
  } finally {
    await page.request.patch(`/api/orders/${orderId}`, {
      data: {
        customerSnapshot: {
          name: original.customerNameSnapshot || "",
          email: original.customerEmailSnapshot || "",
          phone: original.customerPhoneSnapshot || "",
        },
        addressSnapshot: {
          recipientName: original.recipientNameSnapshot || "",
          address1: original.address1Snapshot || "",
          address2: original.address2Snapshot || "",
          number: original.addressNumberSnapshot || "",
          complement: original.complementSnapshot || "",
          neighborhood: original.neighborhoodSnapshot || "",
          city: original.citySnapshot || "",
          province: original.provinceSnapshot || "",
          postalCode: original.postalCodeSnapshot || "",
          country: original.countrySnapshot || "",
          countryCode: original.countryCodeSnapshot || "",
          formattedAddress: original.formattedAddressSnapshot || "",
        },
      },
    });
  }
});

test("failed identification update keeps the form and entered values", async ({ page }) => {
  await page.goto("/orders?view=kanban");
  const card = page.getByTestId("order-kanban-card").first();
  const orderId = await card.getAttribute("data-order-id");
  await card.getByTestId("order-kanban-title").click();
  await page
    .getByTestId("order-identification-card")
    .getByRole("button", { name: "Editar" })
    .click();
  await page.getByLabel("Telefone").fill("+86 138 0013 8000");
  await page.route(`**/api/orders/${orderId}`, async (route) => {
    if (route.request().method() === "PATCH")
      await route.fulfill({ status: 500, json: { message: "Falha simulada" } });
    else await route.continue();
  });
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(page.getByTestId("order-identification-form")).toBeVisible();
  await expect(page.getByLabel("Telefone")).toHaveValue("+86 138 0013 8000");
  await expect(page.getByText("Não foi possível salvar as alterações.")).toBeVisible();
});

test("complete stage persists the next configured stage and records history", async ({ page }) => {
  test.setTimeout(60_000);
  const stagesResponse = await page.request.get("/api/orders/stages");
  const stages = (await stagesResponse.json()) as Array<{
    id: string;
    position: number;
    active: boolean;
    archived: boolean;
    isFinal: boolean;
  }>;
  const ordered = stages
    .filter((stage) => stage.active && !stage.archived)
    .sort((left, right) => left.position - right.position);
  const ordersResponse = await page.request.get("/api/orders?page=1&pageSize=100");
  const listed = (await ordersResponse.json()) as {
    data: Array<{ id: string; operationalStageId?: string | null }>;
  };
  const original = listed.data.find((order) => {
    const index = ordered.findIndex((stage) => stage.id === order.operationalStageId);
    return index >= 0 && Boolean(ordered[index + 1]);
  });
  expect(original).toBeTruthy();
  const next = ordered[ordered.findIndex((stage) => stage.id === original!.operationalStageId) + 1];

  await page.goto("/orders?view=kanban");
  try {
    await page
      .locator(`[data-testid="order-kanban-card"][data-order-id="${original!.id}"]`)
      .getByTestId("order-kanban-title")
      .click();
    const update = page.waitForResponse(
      (response) =>
        response.url().includes(`/api/orders/${original!.id}`) &&
        response.request().method() === "PATCH",
    );
    await page.getByTestId("complete-order-stage").click();
    expect((await update).ok()).toBeTruthy();
    await expect(page.getByTestId("complete-order-stage")).toContainText("Concluída");
    await expect(page.getByTestId("order-current-stage")).toBeVisible();
    await expect(page.getByTestId("order-identification-card")).toBeVisible();
    const persisted = await (await page.request.get(`/api/orders/${original!.id}`)).json();
    expect(persisted.operationalStageId).toBe(next.id);
    expect(
      persisted.events.some(
        (event: { type: string }) => event.type === "OPERATIONAL_STAGE_CHANGED",
      ),
    ).toBe(true);
  } finally {
    await page.request.patch(`/api/orders/${original!.id}`, {
      data: { operationalStageId: original!.operationalStageId },
    });
  }
});

test("failed stage completion keeps the current stage and workspace open", async ({ page }) => {
  await page.goto("/orders?view=kanban");
  const card = page.getByTestId("order-kanban-card").first();
  const orderId = await card.getAttribute("data-order-id");
  await card.getByTestId("order-kanban-title").click();
  const before = await page.getByTestId("order-current-stage").textContent();
  await page.route(`**/api/orders/${orderId}`, async (route) => {
    if (route.request().method() === "PATCH")
      await route.fulfill({ status: 500, json: { message: "Falha simulada" } });
    else await route.continue();
  });
  const action = page.getByTestId("complete-order-stage");
  test.skip(await action.isDisabled(), "The selected demonstration order is already final");
  await action.click();
  await expect(page.getByText("Não foi possível concluir a etapa.")).toBeVisible();
  await expect(page.getByTestId("order-current-stage")).toHaveText(before || "");
  await expect(page.getByTestId("order-identification-card")).toBeVisible();
});

test("purchase context shows returning, first-purchase and unknown states truthfully", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const ordersResponse = await page.request.get("/api/orders?page=1&pageSize=100");
  expect(ordersResponse.ok()).toBeTruthy();
  const listed = (await ordersResponse.json()) as { data: Array<{ id: string }> };
  const orderId = listed.data[0].id;
  const original = await (await page.request.get(`/api/orders/${orderId}`)).json();
  await page.goto("/orders?view=kanban");
  const card = page.locator(`[data-testid="order-kanban-card"][data-order-id="${orderId}"]`);

  await card.getByTestId("order-kanban-title").click();
  const context = page.getByTestId("customer-purchase-context");
  await expect(context).toContainText("Cliente recorrente");
  const halo = context.locator("span").first().locator("span").first();
  expect(await halo.evaluate((element) => getComputedStyle(element).animationName)).toBe("none");
  await page.keyboard.press("Escape");

  await page.route(`**/api/orders/${orderId}`, async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        json: { ...original, isFirstPurchase: true, purchaseOrdinal: 1 },
      });
    } else await route.continue();
  });
  await page.reload();
  await card.getByTestId("order-kanban-title").click();
  await expect(context).toContainText("Novo cliente");
  await expect(context).toContainText("primeira compra registrada");
  await expect(context).toHaveClass(/bg-primary\/5/);
  await page.keyboard.press("Escape");
  await page.unroute(`**/api/orders/${orderId}`);

  await page.route(`**/api/orders/${orderId}`, async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        json: {
          ...original,
          isFirstPurchase: null,
          purchaseOrdinal: null,
          contact: original.contact ? { ...original.contact, orderCount: 0 } : null,
        },
      });
    } else await route.continue();
  });
  await page.reload();
  await card.getByTestId("order-kanban-title").click();
  await expect(context).toHaveCount(0);
});

test("product separation persists independently and can be unchecked", async ({ page }) => {
  test.setTimeout(60_000);
  const ordersResponse = await page.request.get("/api/orders?page=1&pageSize=100");
  const listed = (await ordersResponse.json()) as { data: Array<{ id: string }> };
  const orderId = listed.data[0].id;
  const original = await (await page.request.get(`/api/orders/${orderId}`)).json();
  const item = original.items[0];
  const originalStage = original.operationalStageId;
  const originalSeparated = Boolean(item.isSeparated);
  const targetSeparated = !originalSeparated;

  await page.goto("/orders?view=kanban");
  try {
    await page
      .locator(`[data-testid="order-kanban-card"][data-order-id="${orderId}"]`)
      .getByTestId("order-kanban-title")
      .click();
    const row = page.locator(`[data-testid="order-product-row"][data-item-id="${item.id}"]`);
    const checkbox = row.getByRole("checkbox");
    const update = page.waitForResponse(
      (response) =>
        response.url().includes(`/api/orders/${orderId}/items/${item.id}`) &&
        response.request().method() === "PATCH",
    );
    await checkbox.click();
    expect((await update).ok()).toBeTruthy();
    await expect(checkbox).toHaveAttribute("aria-checked", String(targetSeparated));
    await expect(row).toHaveClass(targetSeparated ? /bg-success\/5/ : /bg-card/);
    await page.reload();
    await expect(
      page
        .locator(`[data-testid="order-product-row"][data-item-id="${item.id}"]`)
        .getByRole("checkbox"),
    ).toHaveAttribute("aria-checked", String(targetSeparated));
    const persisted = await (await page.request.get(`/api/orders/${orderId}`)).json();
    expect(persisted.operationalStageId).toBe(originalStage);
    expect(
      persisted.items.find((current: { id: string }) => current.id === item.id).isSeparated,
    ).toBe(targetSeparated);
  } finally {
    await page.request.patch(`/api/orders/${orderId}/items/${item.id}`, {
      data: { isSeparated: originalSeparated },
    });
  }
});

test("failed product separation rolls the row back without blocking other items", async ({
  page,
}) => {
  await page.goto("/orders?view=kanban");
  await page.getByTestId("order-kanban-title").first().click();
  const rows = page.getByTestId("order-product-row");
  const first = rows.first();
  const firstId = await first.getAttribute("data-item-id");
  const checkbox = first.getByRole("checkbox");
  const before = await checkbox.getAttribute("aria-checked");
  await page.route(`**/api/orders/*/items/${firstId}`, async (route) => {
    await route.fulfill({ status: 500, json: { message: "Falha simulada" } });
  });
  await checkbox.click();
  await expect(page.getByText("Não foi possível atualizar a separação.")).toBeVisible();
  await expect(checkbox).toHaveAttribute("aria-checked", before || "false");
  if ((await rows.count()) > 1) await expect(rows.nth(1).getByRole("checkbox")).toBeEnabled();
});

test("large product list uses internal scroll and does not invent product links", async ({
  page,
}) => {
  const ordersResponse = await page.request.get("/api/orders?page=1&pageSize=100");
  const listed = (await ordersResponse.json()) as { data: Array<{ id: string }> };
  const orderId = listed.data[0].id;
  const original = await (await page.request.get(`/api/orders/${orderId}`)).json();
  const items = Array.from({ length: 24 }, (_, index) => ({
    ...original.items[index % original.items.length],
    id: `visual-item-${index}`,
    sku: `SKU-OPERACIONAL-LONGO-${String(index + 1).padStart(2, "0")}`,
    productName:
      index === 14
        ? "Brinco de Argola Cravejado com Zircônias Premium Dourado"
        : `Produto operacional ${index + 1}`,
    isSeparated: index < 3,
  }));
  await page.route(`**/api/orders/${orderId}`, async (route) => {
    if (route.request().method() === "GET") await route.fulfill({ json: { ...original, items } });
    else await route.continue();
  });
  await page.goto("/orders?view=kanban");
  await page
    .locator(`[data-testid="order-kanban-card"][data-order-id="${orderId}"]`)
    .getByTestId("order-kanban-title")
    .click();
  const products = page.getByTestId("order-workspace-products");
  await expect(products).toContainText("3 de 24 separados");
  const scroll = page.getByTestId("order-products-scroll");
  const dimensions = await scroll.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
  }));
  expect(dimensions.scrollHeight).toBeGreaterThan(dimensions.clientHeight);
  await scroll.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect(
    page.getByText("Brinco de Argola Cravejado com Zircônias Premium Dourado"),
  ).toBeVisible();
  await expect(products.getByRole("link", { name: /produto/i })).toHaveCount(0);
});
