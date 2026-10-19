import { Logger } from "@nestjs/common";
import { ShopifyAdminClient } from "./shopify-admin.client";
import { ShopifyAdapter } from "./shopify.adapter";

describe("Shopify backend connection foundation", () => {
  const envKeys = [
    "SHOPIFY_SHOP",
    "SHOPIFY_CLIENT_ID",
    "SHOPIFY_CLIENT_SECRET",
    "SHOPIFY_API_VERSION",
  ];
  const originalEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
  const originalFetch = global.fetch;
  let network: jest.Mock;
  const token = { access_token: "unit-access-token", expires_in: 3600 };
  const shop = {
    id: "gid://shopify/Shop/1",
    name: "Unit Store",
    myshopifyDomain: "unit-store.myshopify.com",
  };
  const respond = (body: unknown, status = 200) => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
  const success = () =>
    network
      .mockResolvedValueOnce(respond(token))
      .mockResolvedValueOnce(respond({ data: { shop } }));

  beforeEach(() => {
    process.env.SHOPIFY_SHOP = "unit-store";
    process.env.SHOPIFY_CLIENT_ID = "unit-client-id";
    process.env.SHOPIFY_CLIENT_SECRET = "unit-client-secret";
    process.env.SHOPIFY_API_VERSION = "2026-07";
    network = jest.fn();
    global.fetch = network;
    jest.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);
  });
  afterEach(() => {
    global.fetch = originalFetch;
    for (const key of envKeys) {
      if (originalEnv[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnv[key];
    }
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it.each(envKeys.slice(0, 3))("rejects missing %s without network", async (key) => {
    delete process.env[key];
    expect(await new ShopifyAdminClient().testConnection()).toMatchObject({
      configured: false,
      authenticated: false,
      errorCode: "ENV_MISSING",
    });
    expect(network).not.toHaveBeenCalled();
  });

  it.each([
    "https://unit-store.myshopify.com",
    "localhost:3333",
    "unit-store.myshopify.com/extra",
    "evil.example",
  ])("rejects unsafe shop %s", async (value) => {
    process.env.SHOPIFY_SHOP = value;
    expect(await new ShopifyAdminClient().testConnection()).toMatchObject({
      errorCode: "INVALID_SHOP",
    });
    expect(network).not.toHaveBeenCalled();
  });

  it("uses form credentials and the pinned GraphQL version, returning only shop fields", async () => {
    process.env.SHOPIFY_SHOP = "unit-store.myshopify.com";
    delete process.env.SHOPIFY_API_VERSION;
    network
      .mockResolvedValueOnce(respond(token))
      .mockResolvedValueOnce(
        respond({ data: { shop: { ...shop, privateField: "not-returned" } } }),
      );
    const result = await new ShopifyAdapter(new ShopifyAdminClient()).testConnection();
    expect(result).toEqual({ configured: true, authenticated: true, shop });
    expect(network.mock.calls[0][0]).toBe(
      "https://unit-store.myshopify.com/admin/oauth/access_token",
    );
    const request = network.mock.calls[0][1];
    expect(request.method).toBe("POST");
    expect(request.redirect).toBe("error");
    expect(request.headers.Accept).toBe("application/json");
    expect(request.headers["Content-Type"]).toBe("application/x-www-form-urlencoded");
    expect(Object.fromEntries(request.body)).toEqual({
      grant_type: "client_credentials",
      client_id: "unit-client-id",
      client_secret: "unit-client-secret",
    });
    expect(network.mock.calls[1][0]).toBe(
      "https://unit-store.myshopify.com/admin/api/2026-07/graphql.json",
    );
    expect(network.mock.calls[1][1].headers["X-Shopify-Access-Token"]).toBe(token.access_token);
    expect(JSON.parse(network.mock.calls[1][1].body)).toEqual({
      query: "query { shop { id name myshopifyDomain } }",
    });
  });

  it("reuses a valid token and coalesces concurrent token requests", async () => {
    success();
    network.mockResolvedValue(respond({ data: { shop } }));
    const client = new ShopifyAdminClient();
    await Promise.all([client.testConnection(), client.testConnection()]);
    await client.testConnection();
    expect(network.mock.calls.filter(([url]) => url.endsWith("access_token"))).toHaveLength(1);
  });

  it.each([3540, 3601])(
    "renews at expiry minus 60 seconds or later (%s seconds)",
    async (elapsed) => {
      jest.useFakeTimers().setSystemTime(new Date("2026-10-11T12:00:00Z"));
      success();
      success();
      const client = new ShopifyAdminClient();
      await client.testConnection();
      jest.setSystemTime(Date.now() + elapsed * 1000);
      await client.testConnection();
      expect(network.mock.calls.filter(([url]) => url.endsWith("access_token"))).toHaveLength(2);
    },
  );

  it.each([
    ["invalid_client", "INVALID_CLIENT_CREDENTIALS"],
    ["invalid_client_id", "INVALID_CLIENT_ID"],
    ["invalid_client_secret", "INVALID_CLIENT_SECRET"],
    ["unauthorized_client", "APP_NOT_INSTALLED"],
    ["app_not_installed", "APP_NOT_INSTALLED"],
    ["invalid_scope", "INSUFFICIENT_SCOPE"],
    ["unknown", "TOKEN_REQUEST_FAILED"],
  ])("maps auth error %s to a sanitized result", async (providerCode, errorCode) => {
    network.mockResolvedValue(
      respond(
        { error: providerCode, error_description: "unit-client-secret unit-access-token" },
        400,
      ),
    );
    const result = await new ShopifyAdminClient().testConnection();
    expect(result).toMatchObject({ configured: true, authenticated: false, errorCode });
    const output = JSON.stringify([result, (Logger.prototype.warn as jest.Mock).mock.calls]);
    expect(output).not.toContain("unit-client-secret");
    expect(output).not.toContain("unit-access-token");
    expect(network).toHaveBeenCalledTimes(1);
  });

  it.each([undefined, "ACCESS_DENIED"])(
    "handles GraphQL errors before data, including scope denial %s",
    async (code) => {
      network
        .mockResolvedValueOnce(respond(token))
        .mockResolvedValueOnce(
          respond({ errors: [{ message: "unit-access-token", extensions: { code } }] }),
        );
      expect(await new ShopifyAdminClient().testConnection()).toMatchObject({
        authenticated: false,
        errorCode: code ? "INSUFFICIENT_SCOPE" : "GRAPHQL_ERROR",
      });
    },
  );

  it("invalidates a token rejected by GraphQL so the next attempt reacquires it", async () => {
    network.mockResolvedValueOnce(respond(token)).mockResolvedValueOnce(respond({}, 401));
    success();
    const client = new ShopifyAdminClient();
    expect(await client.testConnection()).toMatchObject({ authenticated: false });
    expect(await client.testConnection()).toMatchObject({ authenticated: true });
    expect(network.mock.calls.filter(([url]) => url.endsWith("access_token"))).toHaveLength(2);
  });

  it("handles timeout without exposing the request or credentials", async () => {
    jest.useFakeTimers();
    network.mockImplementation(
      (_url, options) =>
        new Promise((_resolve, reject) =>
          options.signal.addEventListener("abort", () => reject(new Error("unit-client-secret"))),
        ),
    );
    const result = new ShopifyAdminClient().testConnection();
    await jest.advanceTimersByTimeAsync(10_000);
    expect(await result).toMatchObject({ errorCode: "NETWORK_TIMEOUT", authenticated: false });
  });

  it("handles network errors safely", async () => {
    network.mockRejectedValue(new Error("unit-client-secret"));
    expect(await new ShopifyAdminClient().testConnection()).toMatchObject({
      errorCode: "NETWORK_ERROR",
    });
  });

  it("rejects invalid expiry and allows retry after token failure", async () => {
    network.mockResolvedValueOnce(respond({ ...token, expires_in: 0 }));
    success();
    const client = new ShopifyAdminClient();
    expect(await client.testConnection()).toMatchObject({ errorCode: "TOKEN_REQUEST_FAILED" });
    expect(await client.testConnection()).toMatchObject({ authenticated: true });
  });

  it("rejects a shop response from another domain", async () => {
    network
      .mockResolvedValueOnce(respond(token))
      .mockResolvedValueOnce(
        respond({ data: { shop: { ...shop, myshopifyDomain: "other.myshopify.com" } } }),
      );
    expect(await new ShopifyAdminClient().testConnection()).toMatchObject({
      errorCode: "INVALID_SHOP_RESPONSE",
    });
  });
});
