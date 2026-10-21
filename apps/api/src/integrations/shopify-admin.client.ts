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
  ENV_MISSING:
    "Configure SHOPIFY_SHOP e SHOPIFY_ACCESS_TOKEN (custom app) ou SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET.",
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

export class ShopifyFailure extends Error {
  constructor(readonly code: ShopifyErrorCode) {
    super(messages[code]);
  }
}

export interface ShopifyMoneySet {
  shopMoney?: { amount?: string; currencyCode?: string } | null;
}

export interface ShopifyTrackingOrderNode {
  id: string;
  name?: string | null;
  createdAt: string;
  processedAt?: string | null;
  cancelledAt?: string | null;
  displayFinancialStatus?: string | null;
  totalPriceSet?: ShopifyMoneySet | null;
  totalRefundedSet?: ShopifyMoneySet | null;
  customer?: {
    id: string;
    displayName?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  customerJourneySummary?: {
    firstVisit?: {
      landingPage?: string | null;
      referrerUrl?: string | null;
      utmParameters?: {
        source?: string | null;
        medium?: string | null;
        campaign?: string | null;
        content?: string | null;
        term?: string | null;
      } | null;
    } | null;
    lastVisit?: {
      landingPage?: string | null;
      referrerUrl?: string | null;
      utmParameters?: {
        source?: string | null;
        medium?: string | null;
        campaign?: string | null;
        content?: string | null;
        term?: string | null;
      } | null;
    } | null;
  } | null;
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
  private readonly accessToken = process.env.SHOPIFY_ACCESS_TOKEN?.trim() ?? "";
  private readonly clientId = process.env.SHOPIFY_CLIENT_ID?.trim() ?? "";
  private readonly clientSecret = process.env.SHOPIFY_CLIENT_SECRET?.trim() ?? "";
  private readonly version = process.env.SHOPIFY_API_VERSION?.trim() || "2026-07";
  private token: string | null = null;
  private expiresAt = 0;
  private tokenRequest: Promise<string> | null = null;

  private get hasStaticAccessToken(): boolean {
    return Boolean(this.accessToken);
  }

  private get hasClientCredentials(): boolean {
    return Boolean(this.clientId && this.clientSecret);
  }

  private get configured(): boolean {
    return Boolean(this.shop && (this.hasStaticAccessToken || this.hasClientCredentials));
  }

  isConfigured(): boolean {
    return this.configured;
  }

  shopDomain(): string | null {
    try {
      return this.domain();
    } catch {
      return null;
    }
  }

  private domain(): string {
    if (!this.shop) throw new ShopifyFailure("ENV_MISSING");
    if (!this.hasStaticAccessToken && !this.hasClientCredentials)
      throw new ShopifyFailure("ENV_MISSING");
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
    const timer = setTimeout(() => controller.abort(), 30_000);
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
    // Custom apps (Admin API access token) — preferred when present.
    if (this.hasStaticAccessToken) return this.accessToken;
    if (this.token && Date.now() < this.expiresAt - 60_000) return this.token;
    if (!this.tokenRequest) this.tokenRequest = this.acquireToken();
    try {
      return await this.tokenRequest;
    } finally {
      this.tokenRequest = null;
    }
  }

  async graphql<T>(
    query: string,
    variables?: Record<string, unknown>,
    attempt = 0,
  ): Promise<T> {
    const domain = this.domain();
    const token = await this.getToken();
    const response = await this.request(
      `https://${domain}/admin/api/${this.version}/graphql.json`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
        body: JSON.stringify(variables ? { query, variables } : { query }),
      },
    );
    if (response.status === 401) {
      this.token = null;
      this.expiresAt = 0;
      throw new ShopifyFailure("INVALID_CLIENT_CREDENTIALS");
    }
    if (response.status === 403) throw new ShopifyFailure("INSUFFICIENT_SCOPE");
    if (response.status === 429 && attempt < 5) {
      await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
      return this.graphql(query, variables, attempt + 1);
    }
    if (!response.ok) throw new ShopifyFailure("GRAPHQL_REQUEST_FAILED");
    if (!response.body) throw new ShopifyFailure("GRAPHQL_ERROR");
    if (response.body.errors != null && !Array.isArray(response.body.errors))
      throw new ShopifyFailure("GRAPHQL_ERROR");
    if (response.body.errors?.length) {
      const throttled = response.body.errors.some(
        (error: any) =>
          error?.extensions?.code === "THROTTLED" ||
          /throttl/i.test(String(error?.message ?? "")),
      );
      if (throttled && attempt < 5) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
        return this.graphql(query, variables, attempt + 1);
      }
      const denied = response.body.errors.some(
        (error: any) => error?.extensions?.code === "ACCESS_DENIED",
      );
      throw new ShopifyFailure(denied ? "INSUFFICIENT_SCOPE" : "GRAPHQL_ERROR");
    }
    if (!response.body.data) throw new ShopifyFailure("GRAPHQL_ERROR");
    return response.body.data as T;
  }

  /**
   * Paginated orders for Tracking Visão Geral (live, not persisted).
   * Caps pages to keep the request bounded (~18 months of history).
   */
  async fetchOrdersForTracking(since: Date): Promise<ShopifyTrackingOrderNode[]> {
    // Inclusive calendar day in UTC for the Shopify search query + local cutoff.
    const sinceDay = since.toISOString().slice(0, 10);
    const sinceMs = Date.parse(`${sinceDay}T00:00:00.000Z`);
    // Only finalized money — skips PENDING/EXPIRED noise and cuts page count ~30%.
    const searchQuery = `(financial_status:paid OR financial_status:partially_refunded OR financial_status:refunded) AND created_at:>=${sinceDay}`;
    // Newest first; paginate until the lookback window is fully covered (no soft cap
    // that drops older history used for LTV / existing-customer classification).
    const ordersQuery = `
      query OrdersForTracking($cursor: String, $query: String!) {
        orders(first: 250, after: $cursor, query: $query, sortKey: CREATED_AT, reverse: true) {
          pageInfo { hasNextPage endCursor }
          edges {
            node {
              id
              name
              createdAt
              processedAt
              cancelledAt
              displayFinancialStatus
              totalPriceSet { shopMoney { amount currencyCode } }
              totalRefundedSet { shopMoney { amount currencyCode } }
              customer {
                id
                displayName
                email
                phone
              }
              customerJourneySummary {
                firstVisit {
                  landingPage
                  referrerUrl
                  utmParameters { source medium campaign content term }
                }
                lastVisit {
                  landingPage
                  referrerUrl
                  utmParameters { source medium campaign content term }
                }
              }
            }
          }
        }
      }
    `;

    const collected: ShopifyTrackingOrderNode[] = [];
    let cursor: string | null = null;
    const maxPages = 250; // safety valve (~25k orders)

    for (let page = 0; page < maxPages; page += 1) {
      const data = await this.graphql<{
        orders?: {
          pageInfo?: { hasNextPage?: boolean; endCursor?: string | null };
          edges?: Array<{ node?: ShopifyTrackingOrderNode | null } | null>;
        };
      }>(ordersQuery, { cursor, query: searchQuery });

      const edges = data.orders?.edges ?? [];
      let reachedSince = false;
      for (const edge of edges) {
        const node = edge?.node;
        if (!node?.id) continue;
        const createdMs = Date.parse(node.createdAt);
        if (Number.isFinite(createdMs) && createdMs < sinceMs) {
          reachedSince = true;
          break;
        }
        collected.push(node);
      }

      const pageInfo = data.orders?.pageInfo;
      if (reachedSince || !pageInfo?.hasNextPage || !pageInfo.endCursor) break;
      cursor = pageInfo.endCursor;
    }

    this.logger.log(
      `Shopify tracking fetch: ${collected.length} orders since ${sinceDay}`,
    );
    return collected;
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
