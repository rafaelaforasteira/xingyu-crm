import { expect, test, type Browser, type Page } from "@playwright/test";

type ElementSnapshot = {
  selector: string;
  tag: string;
  attributes: Record<string, string>;
  directText: string;
  children: ElementSnapshot[];
};

type Difference = {
  selector: string;
  kind: "attribute" | "text" | "structure";
  server: unknown;
  client: unknown;
};

const APP_SHELL = "body > div.flex.min-h-screen";

async function snapshot(page: Page): Promise<ElementSnapshot> {
  return page.locator(APP_SHELL).evaluate((root) => {
    function uniqueSelector(element: Element): string {
      const parts: string[] = [];
      let current: Element | null = element;
      while (current && current !== document.body) {
        const parent: Element | null = current.parentElement;
        const siblings: Element[] = parent
          ? Array.from(parent.children).filter((child: Element) => child.tagName === current?.tagName)
          : [];
        const position: string =
          siblings.length > 1 ? `:nth-of-type(${siblings.indexOf(current) + 1})` : "";
        parts.unshift(`${current.tagName.toLowerCase()}${position}`);
        current = parent;
      }
      return `body > ${parts.join(" > ")}`;
    }

    function serialize(element: Element): ElementSnapshot {
      return {
        selector: uniqueSelector(element),
        tag: element.tagName.toLowerCase(),
        attributes: Object.fromEntries(
          Array.from(element.attributes)
            .map((attribute) => [attribute.name, attribute.value] as const)
            .sort(([left], [right]) => left.localeCompare(right)),
        ),
        directText: Array.from(element.childNodes)
          .filter((node) => node.nodeType === Node.TEXT_NODE)
          .map((node) => node.textContent ?? "")
          .join("")
          .replace(/\s+/g, " ")
          .trim(),
        children: Array.from(element.children).map(serialize),
      };
    }

    return serialize(root);
  });
}

function firstDifference(server: ElementSnapshot, client: ElementSnapshot): Difference | null {
  if (server.tag !== client.tag || server.children.length !== client.children.length) {
    return {
      selector: server.selector,
      kind: "structure",
      server: { tag: server.tag, childCount: server.children.length },
      client: { tag: client.tag, childCount: client.children.length },
    };
  }
  if (JSON.stringify(server.attributes) !== JSON.stringify(client.attributes)) {
    return {
      selector: server.selector,
      kind: "attribute",
      server: server.attributes,
      client: client.attributes,
    };
  }
  if (server.directText !== client.directText) {
    return {
      selector: server.selector,
      kind: "text",
      server: server.directText,
      client: client.directText,
    };
  }
  for (let index = 0; index < server.children.length; index += 1) {
    const difference = firstDifference(server.children[index], client.children[index]);
    if (difference) return difference;
  }
  return null;
}

async function preHydrationSnapshot(browser: Browser) {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  const response = await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  expect(response?.ok()).toBe(true);
  const result = {
    responseHtml: await response!.text(),
    root: await snapshot(page),
    htmlAttributes: await page.locator("html").evaluate((element) =>
      Object.fromEntries(Array.from(element.attributes).map(({ name, value }) => [name, value])),
    ),
    bodyAttributes: await page.locator("body").evaluate((element) =>
      Object.fromEntries(Array.from(element.attributes).map(({ name, value }) => [name, value])),
    ),
  };
  await context.close();
  return result;
}

test("AppShell has identical pre-hydration and hydrated markup", async ({ browser }) => {
  const before = await preHydrationSnapshot(browser);
  const context = await browser.newContext();
  const page = await context.newPage();
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  // Keep API-driven rerenders out of the hydration comparison.
  await page.route("**/api/**", async () => new Promise<void>(() => undefined));
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  await page.locator(APP_SHELL).waitFor();
  await page.waitForFunction((selector) => {
    const element = document.querySelector(selector);
    return Boolean(element && Object.keys(element).some((key) => key.startsWith("__reactFiber$")));
  }, APP_SHELL);
  await page.waitForTimeout(250);

  const after = await snapshot(page);
  const afterHtmlAttributes = await page.locator("html").evaluate((element) =>
    Object.fromEntries(Array.from(element.attributes).map(({ name, value }) => [name, value])),
  );
  const afterBodyAttributes = await page.locator("body").evaluate((element) =>
    Object.fromEntries(Array.from(element.attributes).map(({ name, value }) => [name, value])),
  );
  const difference = firstDifference(before.root, after);
  const hydrationErrors = [...consoleErrors, ...pageErrors].filter((message) =>
    /hydration|hydrated|did not match|server rendered html/i.test(message),
  );

  console.log(
    JSON.stringify(
      {
        serverHtmlLength: before.responseHtml.length,
        htmlAttributes: { server: before.htmlAttributes, client: afterHtmlAttributes },
        bodyAttributes: { server: before.bodyAttributes, client: afterBodyAttributes },
        firstDifference: difference,
        consoleErrors,
        pageErrors,
      },
      null,
      2,
    ),
  );

  expect(afterHtmlAttributes).toEqual(before.htmlAttributes);
  expect(afterBodyAttributes).toEqual(before.bodyAttributes);
  expect(difference, difference ? JSON.stringify(difference, null, 2) : undefined).toBeNull();
  expect(hydrationErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
  await context.close();
});
