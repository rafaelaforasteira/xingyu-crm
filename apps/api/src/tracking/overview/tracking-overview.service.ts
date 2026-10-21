import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import {
  ShopifyAdminClient,
  ShopifyFailure,
  type ShopifyTrackingOrderNode,
} from "../../integrations/shopify-admin.client";
import { mapShopifyOrdersToTrackingDataset } from "./shopify-tracking.mapper";
import type { TrackingDataset } from "./tracking-dataset.types";

export type TrackingOverviewResponse =
  | {
      source: "shopify";
      dataset: TrackingDataset;
      fetchedAt: string;
      orderCount: number;
      shopDomain: string | null;
      cache: "fresh" | "stale";
    }
  | {
      source: "unconfigured";
      errorCode: string;
      errorMessage: string;
      fetchedAt: string;
    }
  | {
      source: "error";
      errorCode: string;
      errorMessage: string;
      fetchedAt: string;
    };

type CacheEntry = {
  /** Soft TTL: serve as fresh. */
  freshUntil: number;
  /** Hard TTL: still serve as stale while a background refresh runs. */
  staleUntil: number;
  orders: ShopifyTrackingOrderNode[];
  dataset: TrackingDataset;
  shopDomain: string | null;
  fetchedAt: string;
};

const CACHE_FRESH_MS = 10 * 60_000;
const CACHE_STALE_MS = 60 * 60_000;
const LOOKBACK_MONTHS = 18;

@Injectable()
export class TrackingOverviewService implements OnModuleInit {
  private readonly logger = new Logger(TrackingOverviewService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private inflight = new Map<string, Promise<CacheEntry>>();

  constructor(private readonly shopify: ShopifyAdminClient) {}

  onModuleInit() {
    if (!this.shopify.isConfigured()) return;
    const key = this.cacheKey();
    void this.refresh(key).catch((error) => {
      this.logger.warn(
        `Startup Shopify warmup failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    });
  }

  async getOverview(_organizationId: string): Promise<TrackingOverviewResponse> {
    const fetchedAt = new Date().toISOString();

    if (!this.shopify.isConfigured()) {
      return {
        source: "unconfigured",
        errorCode: "ENV_MISSING",
        errorMessage:
          "Configure SHOPIFY_SHOP e SHOPIFY_ACCESS_TOKEN (ou CLIENT_ID + CLIENT_SECRET) no backend.",
        fetchedAt,
      };
    }

    try {
      const key = this.cacheKey();
      const hit = this.cache.get(key);
      const now = Date.now();

      if (hit && hit.freshUntil > now) {
        return this.toShopifyResponse(hit, "fresh");
      }

      if (hit && hit.staleUntil > now) {
        // Stale-while-revalidate: answer immediately, refresh in background.
        void this.refresh(key).catch((error) => {
          this.logger.warn(
            `Background Shopify refresh failed: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        });
        return this.toShopifyResponse(hit, "stale");
      }

      const entry = await this.refresh(key);
      return this.toShopifyResponse(entry, "fresh");
    } catch (error) {
      const failure =
        error instanceof ShopifyFailure
          ? error
          : new ShopifyFailure("GRAPHQL_ERROR");
      this.logger.warn(`Tracking overview Shopify failed: ${failure.code}`);

      if (failure.code === "ENV_MISSING") {
        return {
          source: "unconfigured",
          errorCode: failure.code,
          errorMessage: failure.message,
          fetchedAt,
        };
      }

      return {
        source: "error",
        errorCode: failure.code,
        errorMessage: failure.message,
        fetchedAt,
      };
    }
  }

  private toShopifyResponse(
    entry: CacheEntry,
    cache: "fresh" | "stale",
  ): TrackingOverviewResponse {
    return {
      source: "shopify",
      dataset: entry.dataset,
      fetchedAt: entry.fetchedAt,
      orderCount: entry.dataset.orders.length,
      shopDomain: entry.shopDomain,
      cache,
    };
  }

  private cacheKey(): string {
    return this.shopify.shopDomain() ?? "shopify";
  }

  private refresh(key: string): Promise<CacheEntry> {
    const existing = this.inflight.get(key);
    if (existing) return existing;

    const promise = this.fetchFresh(key)
      .then((entry) => {
        this.cache.set(key, entry);
        return entry;
      })
      .finally(() => {
        this.inflight.delete(key);
      });

    this.inflight.set(key, promise);
    return promise;
  }

  private async fetchFresh(key: string): Promise<CacheEntry> {
    const started = Date.now();
    const since = new Date();
    since.setUTCMonth(since.getUTCMonth() - LOOKBACK_MONTHS);
    since.setUTCHours(0, 0, 0, 0);
    const orders = await this.shopify.fetchOrdersForTracking(since);
    const dataset = mapShopifyOrdersToTrackingDataset(orders);
    const fetchedAt = new Date().toISOString();
    this.logger.log(
      `Shopify overview cache rebuilt key=${key} orders=${orders.length} mapped=${dataset.orders.length} in ${Date.now() - started}ms`,
    );
    return {
      freshUntil: Date.now() + CACHE_FRESH_MS,
      staleUntil: Date.now() + CACHE_STALE_MS,
      orders,
      dataset,
      shopDomain: this.shopify.shopDomain(),
      fetchedAt,
    };
  }
}
