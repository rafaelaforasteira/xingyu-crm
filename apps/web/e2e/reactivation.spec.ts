import { expect, test, type Page, type Response } from "@playwright/test";

type Diagnostics = {
  consoleErrors: string[];
  pageErrors: string[];
  serverErrors: string[];
};

type ReactivationContact = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
};

type ReactivationItem = {
  id: string;
  contact: ReactivationContact | null;
  score: number;
};

type ReactivationResponse = {
  data: ReactivationItem[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
};

const HYDRATION_ERROR =
  /hydration|hydrated|server rendered html|did not match/i;

test.use({
  launchOptions: {
    args: ["--disable-extensions"],
  },
});

function monitorPage(page: Page): Diagnostics {
  const diagnostics: Diagnostics = {
    consoleErrors: [],
    pageErrors: [],
    serverErrors: [],
  };

  page.on("console", (message) => {
    if (message.type() === "error") {
      diagnostics.consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => {
    diagnostics.pageErrors.push(error.message);
  });
  page.on("response", (response) => {
    if (response.status() >= 500) {
      diagnostics.serverErrors.push(`${response.status()} ${response.url()}`);
    }
  });

  return diagnostics;
}

function expectCleanPage(diagnostics: Diagnostics) {
  const hydrationErrors = [
    ...diagnostics.consoleErrors,
    ...diagnostics.pageErrors,
  ].filter((message) => HYDRATION_ERROR.test(message));

  expect(hydrationErrors, "hydration errors").toEqual([]);
  expect(diagnostics.pageErrors, "uncaught page errors").toEqual([]);
  expect(diagnostics.serverErrors, "HTTP 5xx responses").toEqual([]);
  expect(diagnostics.consoleErrors, "console.error messages").toEqual([]);
}

function isReactivationResponse(
  response: Response,
  expectedPage?: number,
  expectedSearch?: string,
) {
  if (response.request().method() !== "GET") return false;
  const url = new URL(response.url());
  if (!url.pathname.endsWith("/api/reactivation")) return false;
  if (
    expectedPage !== undefined &&
    url.searchParams.get("page") !== String(expectedPage)
  ) {
    return false;
  }
  if (
    expectedSearch !== undefined &&
    url.searchParams.get("search") !== expectedSearch
  ) {
    return false;
  }
  return true;
}

function asRecord(value: unknown): Record<string, unknown> {
  expect(value).not.toBeNull();
  expect(typeof value).toBe("object");
  expect(Array.isArray(value)).toBe(false);
  return value as Record<string, unknown>;
}

function parseReactivationResponse(value: unknown): ReactivationResponse {
  const response = asRecord(value);
  expect(Array.isArray(response.data)).toBe(true);
  const meta = asRecord(response.meta);
  const data = (response.data as unknown[]).map((entry) => {
    const item = asRecord(entry);
    const contact =
      item.contact === null
        ? null
        : (asRecord(item.contact) as unknown as ReactivationContact);
    expect(typeof item.id).toBe("string");
    expect(typeof item.score).toBe("number");
    if (contact) {
      expect(typeof contact.id).toBe("string");
      expect(typeof contact.name).toBe("string");
    }
    return {
      ...item,
      contact,
    } as unknown as ReactivationItem;
  });

  expect(typeof meta.total).toBe("number");
  expect(typeof meta.page).toBe("number");
  expect(typeof meta.pageSize).toBe("number");
  expect(typeof meta.totalPages).toBe("number");

  return {
    data,
    meta: meta as unknown as ReactivationResponse["meta"],
  };
}

test("loads, reloads, filters and paginates reactivation through the real API", async ({
  page,
}) => {
  test.setTimeout(60_000);
  const diagnostics = monitorPage(page);
  const firstResponsePromise = page.waitForResponse((response) =>
    isReactivationResponse(response, 1),
  );

  await page.goto("/reactivation", { waitUntil: "domcontentloaded" });
  const firstResponse = await firstResponsePromise;
  expect(firstResponse.ok()).toBeTruthy();
  const firstBody = parseReactivationResponse(
    (await firstResponse.json()) as unknown,
  );
  expect(firstBody.data.length).toBeGreaterThan(0);
  expect(firstBody.meta.page).toBe(1);
  expect(firstBody.meta.totalPages).toBeGreaterThan(1);

  await expect(
    page.getByRole("heading", { name: "Reativação", exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("reactivation-row")).toHaveCount(
    firstBody.data.length,
  );

  const reloadResponsePromise = page.waitForResponse((response) =>
    isReactivationResponse(response, 1),
  );
  await page.reload({ waitUntil: "domcontentloaded" });
  const reloadResponse = await reloadResponsePromise;
  expect(reloadResponse.ok()).toBeTruthy();
  const reloadBody = parseReactivationResponse(
    (await reloadResponse.json()) as unknown,
  );
  expect(reloadBody.data.map(({ id }) => id)).toEqual(
    firstBody.data.map(({ id }) => id),
  );
  await expect(page.getByTestId("reactivation-row")).toHaveCount(
    reloadBody.data.length,
  );

  const nextResponsePromise = page.waitForResponse((response) =>
    isReactivationResponse(response, 2),
  );
  await page.getByRole("button", { name: "Próxima", exact: true }).click();
  const nextResponse = await nextResponsePromise;
  expect(nextResponse.ok()).toBeTruthy();
  const nextBody = parseReactivationResponse(
    (await nextResponse.json()) as unknown,
  );
  expect(nextBody.meta.page).toBe(2);
  await expect(page.getByText(`2 / ${nextBody.meta.totalPages}`)).toBeVisible();
  await expect(page.getByTestId("reactivation-row")).toHaveCount(
    nextBody.data.length,
  );

  const searchable = firstBody.data.find(
    (item): item is ReactivationItem & { contact: ReactivationContact } =>
      Boolean(item.contact?.name),
  );
  expect(searchable, "the seed must contain a linked contact").toBeTruthy();
  const search = searchable?.contact.name ?? "";
  const filteredResponsePromise = page.waitForResponse((response) =>
    isReactivationResponse(response, 1, search),
  );
  await page.getByLabel("Buscar", { exact: true }).fill(search);
  const filteredResponse = await filteredResponsePromise;
  expect(filteredResponse.ok()).toBeTruthy();
  const filteredBody = parseReactivationResponse(
    (await filteredResponse.json()) as unknown,
  );
  expect(filteredBody.data.length).toBeGreaterThan(0);
  expect(
    filteredBody.data.every((item) => {
      const haystack = [
        item.contact?.name,
        item.contact?.email,
        item.contact?.phone,
      ]
        .filter((part): part is string => Boolean(part))
        .join(" ")
        .toLocaleLowerCase("pt-BR");
      return haystack.includes(search.toLocaleLowerCase("pt-BR"));
    }),
  ).toBe(true);
  await expect(
    page
      .getByTestId("reactivation-row")
      .filter({ hasText: search })
      .first(),
  ).toBeVisible();

  expectCleanPage(diagnostics);
});

test("degrades null and invalid reactivation payloads without invalid links", async ({
  page,
}) => {
  const diagnostics = monitorPage(page);

  await page.route("**/api/settings/users**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [], meta: { total: 0 } }),
    });
  });
  await page.route("**/api/settings/teams**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [], meta: { total: 0 } }),
    });
  });
  await page.route("**/api/reactivation**", async (route) => {
    const url = new URL(route.request().url());
    const search = url.searchParams.get("search");
    let payload: unknown;

    if (search === "payload-null") {
      payload = {
        data: null,
        meta: { total: 0, page: 1, pageSize: 20, totalPages: 0 },
      };
    } else if (search === "payload-invalid") {
      payload = {
        data: "not-an-array",
        meta: { total: 0, page: 1, pageSize: 20, totalPages: 0 },
      };
    } else {
      payload = {
        data: [
          {
            id: "detached-contact",
            contact: null,
            score: "79",
            reason: "Contato legado sem vínculo",
            status: "INACTIVE",
            classification: "cliente_sem_resposta",
            daysInactive: "120",
            lastInteractionAt: null,
            lastPurchaseAt: "invalid-date",
            owner: null,
            team: null,
            existingOpenDealId: null,
          },
          null,
          {
            id: "invalid-score",
            contact: { id: "incomplete-contact" },
            score: "not-a-number",
            reason: "Registro inválido",
            status: "INACTIVE",
            classification: "cliente_sem_resposta",
            daysInactive: 90,
          },
        ],
        meta: { total: 3, page: 1, pageSize: 20, totalPages: 1 },
      };
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(payload),
    });
  });

  await page.goto("/reactivation", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("reactivation-row")).toHaveCount(1);
  const detachedRow = page.getByTestId("reactivation-row").first();
  await expect(detachedRow).toContainText("Contato não vinculado");
  await expect(
    detachedRow.getByRole("button", { name: "Análise indisponível" }),
  ).toBeDisabled();
  await expect(detachedRow.locator('a[href*="/contacts/"]')).toHaveCount(0);
  await expect(page.locator('a[href*="/contacts/undefined"]')).toHaveCount(0);
  await expect(page.locator('a[href*="/contacts/null"]')).toHaveCount(0);

  const nullResponsePromise = page.waitForResponse(
    (response) => {
      const url = new URL(response.url());
      return (
        url.pathname.endsWith("/api/reactivation") &&
        url.searchParams.get("search") === "payload-null"
      );
    },
  );
  await page.getByLabel("Buscar", { exact: true }).fill("payload-null");
  expect((await nullResponsePromise).ok()).toBeTruthy();
  await expect(
    page.getByText("Nenhuma oportunidade de reativação", { exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("reactivation-row")).toHaveCount(0);

  const invalidResponsePromise = page.waitForResponse(
    (response) => {
      const url = new URL(response.url());
      return (
        url.pathname.endsWith("/api/reactivation") &&
        url.searchParams.get("search") === "payload-invalid"
      );
    },
  );
  await page.getByLabel("Buscar", { exact: true }).fill("payload-invalid");
  expect((await invalidResponsePromise).ok()).toBeTruthy();
  await expect(
    page.getByText("Nenhuma oportunidade de reativação", { exact: true }),
  ).toBeVisible();

  expectCleanPage(diagnostics);
});
