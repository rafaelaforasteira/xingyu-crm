import { Injectable, Logger } from "@nestjs/common";

export type ShopifyErrorCode =
  | "ENV_MISSING"
  | "INVALID_SHOP"
  | "INVALID_API_VERSION"
  | "INVALID_CLIENT_ID"
  | "INVALID_CLIENT_SECRET"
  | "INVALID_CLIENT_CREDENTIALS"
  | "APP_NOT_INSTALLED"
  | "INSUFFICIENT_SCOPE"
  | "TOKEN_REQUEST_FAILED"
  | "GRAPHQL_ERROR"
  | "GRAPHQL_REQUEST_FAILED"
  | "INVALID_SHOP_RESPONSE"
  | "NETWORK_TIMEOUT"
  | "NETWORK_ERROR";

const messages: Record<ShopifyErrorCode, string> = {
  ENV_MISSING: "Configure SHOPIFY_SHOP, SHOPIFY_CLIENT_ID e SHOPIFY_CLIENT_SECRET no backend.",
  INVALID_SHOP: "Informe o subdomínio da loja ou seu domínio myshopify.com válido.",
  INVALID_API_VERSION: "SHOPIFY_API_VERSION deve usar o formato YYYY-MM de uma versão trimestral.",
  INVALID_CLIENT_ID: "Client ID rejeitado pela Shopify.",
  INVALID_CLIENT_SECRET: "Client secret rejeitado pela Shopify.",
  INVALID_CLIENT_CREDENTIALS: "Credenciais rejeitadas; verifique Client ID e client secret.",
  APP_NOT_INSTALLED: "Verifique se o app está instalado e pertence à mesma organização da loja.",
  INSUFFICIENT_SCOPE: "A Shopify recusou o acesso; verifique os scopes instalados.",
  TOKEN_REQUEST_FAILED: "Não foi possível obter um token válido da Shopify.",
  GRAPHQL_ERROR: "A Shopify retornou erros na consulta GraphQL.",
  GRAPHQL_REQUEST_FAILED: "A requisição GraphQL foi recusada pela Shopify.",
  INVALID_SHOP_RESPONSE: "A Shopify não retornou os dados básicos esperados da loja.",
  NETWORK_TIMEOUT: "A requisição à Shopify excedeu o tempo limite.",
  NETWORK_ERROR: "Não foi possível comunicar com a Shopify.",
};

class ShopifyFailure extends Error {
  constructor(readonly code: ShopifyErrorCode) {
    super(messages[code]);
  }
}

export interface ShopifyShop {
  id: string;
  name: string;
  myshopifyDomain: string;
}
export type ShopifyConnectionResult =
  | { configured: true; authenticated: true; shop: ShopifyShop }
  | {
      configured: boolean;
      authenticated: false;
      errorCode: ShopifyErrorCode;
      errorMessage: string;
    };

@Injectable()
export class ShopifyAdminClient {
  private readonly logger = new Logger(ShopifyAdminClient.name);
  private readonly shop = process.env.SHOPIFY_SHOP?.trim() ?? "";
  private readonly clientId = process.env.SHOPIFY_CLIENT_ID?.trim() ?? "";
  private readonly clientSecret = process.env.SHOPIFY_CLIENT_SECRET?.trim() ?? "";
  private readonly version = process.env.SHOPIFY_API_VERSION?.trim() || "2026-07";
  private token: string | null = null;
  private expiresAt = 0;
  private tokenRequest: Promise<string> | null = null;

  private get configured(): boolean {
    return Boolean(this.shop && this.clientId && this.clientSecret);
  }

  private domain(): string {
    if (!this.configured) throw new ShopifyFailure("ENV_MISSING");
    const slug = this.shop.toLowerCase().replace(/\.myshopify\.com$/, "");
    // No URLs, ports, paths, arbitrary hosts or redirects may receive credentials.
    if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(slug))
      throw new ShopifyFailure("INVALID_SHOP");
    if (!/^\d{4}-(01|04|07|10)$/.test(this.version))
      throw new ShopifyFailure("INVALID_API_VERSION");
    return `${slug}.myshopify.com`;
  }

  private async request(
    url: string,
    init: RequestInit,
  ): Promise<{ status: number; ok: boolean; body: any }> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch(url, { ...init, redirect: "error", signal: controller.signal });
      let body: any;
      try {
        body = await response.json();
      } catch {
        if (controller.signal.aborted) throw new ShopifyFailure("NETWORK_TIMEOUT");
      }
      return { status: response.status, ok: response.ok, body };
    } catch (error) {
      if (error instanceof ShopifyFailure) throw error;
      throw new ShopifyFailure(controller.signal.aborted ? "NETWORK_TIMEOUT" : "NETWORK_ERROR");
    } finally {
      clearTimeout(timer);
    }
  }

  private authFailure(status: number, body: any): ShopifyFailure {
    // Inspect provider diagnostics only to select a fixed, safe message. Never echo them.
    const code = typeof body?.error === "string" ? body.error.toLowerCase() : "";
    const description =
      typeof body?.error_description === "string" ? body.error_description.toLowerCase() : "";
    if (code === "invalid_client_id") return new ShopifyFailure("INVALID_CLIENT_ID");
    if (code === "invalid_client_secret") return new ShopifyFailure("INVALID_CLIENT_SECRET");
    if (code === "invalid_shop" || status === 404) return new ShopifyFailure("INVALID_SHOP");
    if (
      code === "app_not_installed" ||
      code === "unauthorized_client" ||
      /not installed|same organization|not permitted/.test(description)
    )
      return new ShopifyFailure("APP_NOT_INSTALLED");
    if (code === "invalid_scope") return new ShopifyFailure("INSUFFICIENT_SCOPE");
    if (code === "invalid_client" || status === 401)
      return new ShopifyFailure("INVALID_CLIENT_CREDENTIALS");
    return new ShopifyFailure("TOKEN_REQUEST_FAILED");
  }

  private async acquireToken(): Promise<string> {
    const startedAt = Date.now();
    const response = await this.request(`https://${this.domain()}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
    });
    if (!response.ok) throw this.authFailure(response.status, response.body);
    const { access_token: token, expires_in: expiresIn } = response.body ?? {};
    if (
      typeof token !== "string" ||
      !token.trim() ||
      typeof expiresIn !== "number" ||
      !Number.isFinite(expiresIn) ||
      expiresIn <= 0
    )
      throw new ShopifyFailure("TOKEN_REQUEST_FAILED");
    this.token = token;
    this.expiresAt = startedAt + expiresIn * 1000;
    return token;
  }

  private async getToken(): Promise<string> {
    if (this.token && Date.now() < this.expiresAt - 60_000) return this.token;
    if (!this.tokenRequest) this.tokenRequest = this.acquireToken();
    try {
      return await this.tokenRequest;
    } finally {
      this.tokenRequest = null;
    }
  }

  private async graphql<T>(query: string): Promise<T> {
    const domain = this.domain();
    const token = await this.getToken();
    const response = await this.request(
      `https://${domain}/admin/api/${this.version}/graphql.json`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
        body: JSON.stringify({ query }),
      },
    );
    if (response.status === 401) {
      this.token = null;
      this.expiresAt = 0;
      throw new ShopifyFailure("INVALID_CLIENT_CREDENTIALS");
    }
    if (response.status === 403) throw new ShopifyFailure("INSUFFICIENT_SCOPE");
    if (!response.ok) throw new ShopifyFailure("GRAPHQL_REQUEST_FAILED");
    if (!response.body) throw new ShopifyFailure("GRAPHQL_ERROR");
    if (response.body.errors != null && !Array.isArray(response.body.errors))
      throw new ShopifyFailure("GRAPHQL_ERROR");
    if (response.body.errors?.length) {
      const denied = response.body.errors.some(
        (error: any) => error?.extensions?.code === "ACCESS_DENIED",
      );
      throw new ShopifyFailure(denied ? "INSUFFICIENT_SCOPE" : "GRAPHQL_ERROR");
    }
    if (!response.body.data) throw new ShopifyFailure("GRAPHQL_ERROR");
    return response.body.data as T;
  }

  async testConnection(): Promise<ShopifyConnectionResult> {
    try {
      const data = await this.graphql<{ shop?: ShopifyShop }>(
        "query { shop { id name myshopifyDomain } }",
      );
      const shop = data.shop;
      if (
        !shop ||
        typeof shop.id !== "string" ||
        !shop.id.startsWith("gid://shopify/Shop/") ||
        typeof shop.name !== "string" ||
        !shop.name.trim() ||
        shop.myshopifyDomain !== this.domain()
      )
        throw new ShopifyFailure("INVALID_SHOP_RESPONSE");
      this.logger.log("Shopify connection test succeeded");
      // Return only the three explicitly requested fields.
      return {
        configured: true,
        authenticated: true,
        shop: { id: shop.id, name: shop.name, myshopifyDomain: shop.myshopifyDomain },
      };
    } catch (error) {
      const failure = error instanceof ShopifyFailure ? error : new ShopifyFailure("GRAPHQL_ERROR");
      this.logger.warn(`Shopify connection test failed: ${failure.code}`);
      return {
        configured: this.configured,
        authenticated: false,
        errorCode: failure.code,
        errorMessage: failure.message,
      };
    }
  }
}
