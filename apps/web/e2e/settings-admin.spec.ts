import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";

test.describe("Settings admin panel", () => {
  test("admin sees profile and admin blocks without organization or security card", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "Configurações", exact: true })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.locator("[data-settings-block='profile']")).toBeVisible();
    await expect(page.locator("[data-settings-block='security']")).toHaveCount(0);
    await expect(page.locator("[data-settings-block='users']")).toBeVisible();
    await expect(page.locator("[data-settings-block='teams']")).toBeVisible();
    const teamsBlock = page.locator("[data-settings-block='teams']");
    await teamsBlock.scrollIntoViewIfNeeded();
    await expect(teamsBlock.getByText("Organize os usuários por equipe e responsabilidade.")).toHaveCount(0);
    await expect(teamsBlock.getByRole("button", { name: "Criar equipe" })).toBeVisible();
    await expect(teamsBlock.getByRole("button", { name: "Gerenciar", exact: true })).toHaveCount(0);
    await expect(teamsBlock.getByRole("button", { name: /Gerenciar equipe/ }).first()).toBeVisible();
    await expect(teamsBlock.getByRole("button", { name: /Adicionar membros à equipe/ }).first()).toBeVisible();
    await expect(page.locator("[data-settings-block='permissions']")).toHaveCount(0);
    await expect(page.getByText("PERMISSÕES", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Permissões", { exact: true })).toHaveCount(0);
    await expect(page.locator("[data-settings-block='organization']")).toHaveCount(0);
    await expect(page.locator("[data-settings-block='account']")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Sair da conta" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Adicionar usuário" })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Todos/ })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Ativos/ })).toBeVisible();
    await expect(page.getByPlaceholder("Buscar usuário")).toBeVisible();
    await expect(page.getByText("Gerencie quem possui acesso ao CRM.")).toHaveCount(0);
    await expect(page.getByTestId("settings-profile-grid").getByText("Senha", { exact: true })).toBeVisible();
    const usersBlock = page.locator("[data-settings-block='users']");
    await usersBlock.scrollIntoViewIfNeeded();
    await expect(usersBlock.getByRole("tab", { name: /Todos [1-9]/ })).toBeVisible({ timeout: 30_000 });
    await expect(usersBlock.getByText("Administradora Xingyu").first()).toBeVisible();
    await page.setViewportSize({ width: 1366, height: 900 });
    await page.screenshot({
      path: "e2e/.beta-screenshots/settings-users-toolbar-1366.png",
      fullPage: false,
    });
  });
});

test.describe("Settings consultant visibility", () => {
  const prisma = new PrismaClient();
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const password = "SettingsE2e123!";
  const email = `settings-consultant-${suffix}@example.test`;
  let orgId = "";
  let userId = "";

  test.beforeAll(async () => {
    const passwordHash = await argon2.hash(password);
    const org = await prisma.organization.create({
      data: { name: `Settings E2E ${suffix}`, slug: `settings-e2e-${suffix}` },
    });
    orgId = org.id;
    const user = await prisma.user.create({
      data: {
        organizationId: orgId,
        name: "Consultora Settings",
        email,
        authRole: "CONSULTANT",
        passwordHash,
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

  test("consultant sees only profile card", async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const login = await context.request.post("http://localhost:3000/api/auth/login", {
      data: { email, password },
    });
    expect(login.ok()).toBeTruthy();
    const page = await context.newPage();
    await page.goto("http://localhost:3000/settings");
    await expect(page.locator("[data-settings-block='profile']")).toBeVisible({ timeout: 20_000 });
    await expect(page.locator("[data-settings-block='security']")).toHaveCount(0);
    await expect(page.locator("[data-settings-block='organization']")).toHaveCount(0);
    await expect(page.locator("[data-settings-block='users']")).toHaveCount(0);
    await expect(page.locator("[data-settings-block='teams']")).toHaveCount(0);
    await expect(page.locator("[data-settings-block='permissions']")).toHaveCount(0);
    const orgPatch = await context.request.patch("http://localhost:3000/api/settings/organization", {
      data: { name: "Hacked" },
    });
    expect(orgPatch.status()).toBe(403);
    await context.close();
  });
});

test.describe("Settings supervisor visibility", () => {
  const prisma = new PrismaClient();
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const password = "SettingsE2e123!";
  const email = `settings-manager-${suffix}@example.test`;
  let orgId = "";
  let userId = "";

  test.beforeAll(async () => {
    const passwordHash = await argon2.hash(password);
    const org = await prisma.organization.create({
      data: { name: `Settings Mgr ${suffix}`, slug: `settings-mgr-${suffix}` },
    });
    orgId = org.id;
    const user = await prisma.user.create({
      data: {
        organizationId: orgId,
        name: "Supervisor Settings",
        email,
        authRole: "MANAGER",
        passwordHash,
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

  test("supervisor sees only profile card", async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const login = await context.request.post("http://localhost:3000/api/auth/login", {
      data: { email, password },
    });
    expect(login.ok()).toBeTruthy();
    const page = await context.newPage();
    await page.goto("http://localhost:3000/settings");
    await expect(page.locator("[data-settings-block='profile']")).toBeVisible({ timeout: 20_000 });
    await expect(page.locator("[data-settings-block='security']")).toHaveCount(0);
    await expect(page.locator("[data-settings-block='users']")).toHaveCount(0);
    await expect(page.locator("[data-settings-block='permissions']")).toHaveCount(0);
    await context.close();
  });
});
