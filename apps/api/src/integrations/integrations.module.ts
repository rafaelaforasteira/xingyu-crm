import { Module } from "@nestjs/common";
import { IntegrationsController } from "./integrations.controller";
import { IntegrationsService } from "./integrations.service";
import { ShopifyAdapter } from "./shopify.adapter";
import { WhatsAppAdapter } from "./whatsapp.adapter";
import { InstagramAdapter } from "./instagram.adapter";
import { MetaAdsAdapter } from "./meta-ads.adapter";
import { GoogleAnalyticsAdapter } from "./google-analytics.adapter";
import { WebhooksAdapter } from "./webhooks.adapter";

@Module({
  controllers: [IntegrationsController],
  providers: [
    IntegrationsService,
    ShopifyAdapter,
    WhatsAppAdapter,
    InstagramAdapter,
    MetaAdsAdapter,
    GoogleAnalyticsAdapter,
    WebhooksAdapter,
  ],
  exports: [
    IntegrationsService,
    ShopifyAdapter,
    WhatsAppAdapter,
    InstagramAdapter,
    MetaAdsAdapter,
    GoogleAnalyticsAdapter,
    WebhooksAdapter,
  ],
})
export class IntegrationsModule {}
