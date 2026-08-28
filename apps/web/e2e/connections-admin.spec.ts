import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";

test.describe("Connections center", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/connections/counts", (route) => route.fulfill({
      json: { all: 3, connected: 1, attention: 1, offline: 1 },
    }));
    await page.route("**/api/connections**", (route) => {
      const url = new URL(route.request().url());
      if (url.pathname.endsWith("/counts")) return route.fulfill({
        json: { all: 3, connected: 1, attention: 1, offline: 1 },
      });
      const status = url.searchParams.get("status");
      const rows = [
        { id: "wa-1", name: "WhatsApp Comercial", provider: "fake", type: "WHATSAPP", status: "CONNECTED", displayAccount: "+55 11 99999-0001", defaultPipeline: { id: "p1", name: "Comercial" }, enabledPipelineCount: 2, accessSummary: "Organization", lastActivityAt: new Date().toISOString() },
        { id: "wa-2", name: "WhatsApp Suporte", provider: "fake", type: "WHATSAPP", status: "ERROR", enabledPipelineCount: 1, accessSummary: "Organization" },
        { id: "wa-3", name: "WhatsApp Loja", provider: "fake", type: "WHATSAPP", status: "DISCONNECTED", enabledPipelineCount: 0, accessSummary: "Organization" },
      ];
      const filtered =
        status === "CONNECTED"
          ? rows.filter((item) => item.status === "CONNECTED")
          : status === "ATTENTION"
            ? rows.filter((item) => item.status === "ERROR")
            : status === "OFFLINE"
              ? rows.filter((item) => item.status === "DISCONNECTED")
              : rows;
      return route.fulfill({ json: { data: filtered, meta: { page: 1, pageSize: 20, total: filtered.length, totalPages: 1 }, counts: { all: 3, connected: 1, attention: 1, offline: 1 } } });
    });
  });

  test("admin sees connections and filters them", async ({ page }) => {
    await page.goto("/connections");
    await expect(page.getByRole("heading", { name: "Conexões" })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("button", { name: /Nova conexão/ })).toBeVisible();
    await expect(page.getByText("WhatsApp Comercial")).toBeVisible();
    await page.getByRole("tab", { name: /Offline/ }).click();
    await expect(page.getByText("WhatsApp Loja")).toBeVisible();
    await expect(page.getByText("WhatsApp Comercial")).toHaveCount(0);
  });

  test("connected menu keeps only edit, disconnect and delete", async ({ page }) => {
    await page.goto("/connections");
    await expect(page.getByText("WhatsApp Comercial")).toBeVisible({ timeout: 20_000 });
    await page.getByRole("button", { name: /Ações · WhatsApp Comercial/ }).click();
    await expect(page.getByRole("menuitem", { name: "Editar" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Desconectar" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Excluir conexão" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Reconectar" })).toHaveCount(0);
    await expect(page.getByRole("menuitem", { name: "Abrir" })).toHaveCount(0);
    await expect(page.getByRole("menuitem", { name: "Roteamento" })).toHaveCount(0);
    await expect(page.getByRole("menuitem", { name: "Acesso" })).toHaveCount(0);
    await expect(page.getByRole("menuitem", { name: "Diagnóstico" })).toHaveCount(0);
    await expect(page.getByRole("menuitem", { name: "Arquivar" })).toHaveCount(0);
  });

  test("disconnected menu offers reconnect instead of disconnect", async ({ page }) => {
    await page.goto("/connections");
    await expect(page.getByText("WhatsApp Loja")).toBeVisible({ timeout: 20_000 });
    await page.getByRole("button", { name: /Ações · WhatsApp Loja/ }).click();
    await expect(page.getByRole("menuitem", { name: "Editar" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Reconectar" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Excluir conexão" })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Desconectar" })).toHaveCount(0);
  });
});

test.describe("Connections consultant access", () => {
  const prisma = new PrismaClient();
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `connections-consultant-${suffix}@example.test`;
  const password = "ConnectionsE2e123!";
  let orgId = "";
  let userId = "";

  test.beforeAll(async () => {
    const organization = await prisma.organization.create({
      data: { name: `Connections E2E ${suffix}`, slug: `connections-e2e-${suffix}` },
    });
    orgId = organization.id;
    const user = await prisma.user.create({
      data: {
        organizationId: orgId,
        name: "Consultora Conexões",
        email,
        authRole: "CONSULTANT",
        passwordHash: await argon2.hash(password),
      },
    });
    userId = user.id;
  });

  test.afterAll(async () => {
    await prisma.userSession.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.organization.deleteMany({ where: { id: orgId } });
    await prisma.$disconnect();
  });

  test("consultant is redirected away", async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const login = await context.request.post("http://localhost:3000/api/auth/login", { data: { email, password } });
    expect(login.ok()).toBeTruthy();
    const page = await context.newPage();
    await page.goto("http://localhost:3000/connections");
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 20_000 });
    await expect(page.getByRole("heading", { name: "Conexões" })).toHaveCount(0);
    await context.close();
  });
});
