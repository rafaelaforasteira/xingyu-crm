import { Injectable, NotFoundException } from "@nestjs/common";
import { shopifyAdapter } from "./adapters/shopify.adapter";
import { whatsappAdapter } from "./adapters/whatsapp.adapter";
import { instagramAdapter } from "./adapters/instagram.adapter";
import { metaAdsAdapter } from "./adapters/meta-ads.adapter";
import { googleAnalyticsAdapter } from "./adapters/google-analytics.adapter";
import { webhooksAdapter } from "./adapters/webhooks.adapter";

const adapters = {
  shopify: shopifyAdapter,
  whatsapp: whatsappAdapter,
  instagram: instagramAdapter,
  "meta-ads": metaAdsAdapter,
  "google-analytics": googleAnalyticsAdapter,
  webhooks: webhooksAdapter,
} as const;

@Injectable()
export class IntegrationsService {
  list() {
    return Object.entries(adapters).map(([id, adapter]) => ({
      id,
      name: adapter.name,
      status: adapter.isConfigured() ? "configured" : "demo",
      demo: !adapter.isConfigured(),
    }));
  }

  async sync(id: string) {
    const adapter = adapters[id as keyof typeof adapters];
    if (!adapter) throw new NotFoundException(`Integration ${id} not found`);
    const result = await adapter.sync();
    return { id, mode: adapter.isConfigured() ? "live" : "demo", ...result };
  }
}
