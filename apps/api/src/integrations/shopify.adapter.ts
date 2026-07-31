import { Injectable, Logger } from "@nestjs/common";
import { BaseMockAdapter, IntegrationResult } from "./base.adapter";

@Injectable()
export class ShopifyAdapter extends BaseMockAdapter {
  private readonly logger = new Logger(ShopifyAdapter.name);

  async syncProducts(): Promise<IntegrationResult<{ synced: number }>> {
    this.logger.log("[demo] Shopify syncProducts");
    return this.success({ synced: 0 }, "Shopify product sync simulated (demo mode)");
  }

  async syncOrders(): Promise<IntegrationResult<{ synced: number }>> {
    this.logger.log("[demo] Shopify syncOrders");
    return this.success({ synced: 0 }, "Shopify order sync simulated (demo mode)");
  }

  async getStoreInfo(): Promise<IntegrationResult<{ name: string; domain: string }>> {
    return this.success({
      name: "Xingyu Demo Store",
      domain: process.env.SHOPIFY_STORE_DOMAIN || "demo.myshopify.com",
    });
  }
}
