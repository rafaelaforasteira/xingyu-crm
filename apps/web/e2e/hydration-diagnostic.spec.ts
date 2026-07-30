import { expect, test } from "@playwright/test";

test("root markup hydrates without external attributes", async ({ page, request }) => {
  const browserConsole: string[] = [];
  const pageErrors: string[] = [];

  page.on("console", (message) => browserConsole.push(`${message.type()}: ${message.text()}`));
  page.on("pageerror", (error) => pageErrors.push(error.message));

  const response = await request.get("/dashboard");
  expect(response.ok()).toBe(true);
  const serverHtml = await response.text();
  const serverBodyTag = serverHtml.match(/<body\b[^>]*>/i)?.[0] ?? "";
  const serverHtmlTag = serverHtml.match(/<html\b[^>]*>/i)?.[0] ?? "";

  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  const initialRoot = await page.evaluate(() => ({
    html: document.documentElement.outerHTML.match(/^<html\b[^>]*>/i)?.[0] ?? "",
    body: document.body.outerHTML.match(/^<body\b[^>]*>/i)?.[0] ?? "",
  }));
  await page.waitForLoadState("networkidle");
  const hydratedRoot = await page.evaluate(() => ({
    html: document.documentElement.outerHTML.match(/^<html\b[^>]*>/i)?.[0] ?? "",
    body: document.body.outerHTML.match(/^<body\b[^>]*>/i)?.[0] ?? "",
  }));

  console.log(
    JSON.stringify(
      { serverHtmlTag, serverBodyTag, initialRoot, hydratedRoot, browserConsole, pageErrors },
      null,
      2,
    ),
  );

  expect(serverHtmlTag).toBe('<html lang="pt-BR">');
  expect(serverBodyTag).toContain("font-sans");
  expect(initialRoot).toEqual(hydratedRoot);
  expect(`${initialRoot.html} ${initialRoot.body}`).not.toMatch(/bis_register|__processed_/i);
  expect(browserConsole.filter((entry) => /hydration|did not match/i.test(entry))).toEqual([]);
  expect(pageErrors).toEqual([]);
});
