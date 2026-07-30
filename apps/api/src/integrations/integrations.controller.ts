import { Controller, Get, Post, Body, Param, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiHeader } from "@nestjs/swagger";
import { IntegrationsService } from "./integrations.service";
import { ShopifyAdapter } from "./shopify.adapter";
import { WhatsAppAdapter } from "./whatsapp.adapter";
import { InstagramAdapter } from "./instagram.adapter";
import { MetaAdsAdapter } from "./meta-ads.adapter";
import { GoogleAnalyticsAdapter } from "./google-analytics.adapter";
import { WebhooksAdapter } from "./webhooks.adapter";

@ApiTags("integrations")
@ApiHeader({ name: "X-Demo-User-Id", required: false })
@Controller("integrations")
export class IntegrationsController {
  constructor(
    private readonly integrationsService: IntegrationsService,
    private readonly shopify: ShopifyAdapter,
    private readonly whatsapp: WhatsAppAdapter,
    private readonly instagram: InstagramAdapter,
    private readonly metaAds: MetaAdsAdapter,
    private readonly ga: GoogleAnalyticsAdapter,
    private readonly webhooks: WebhooksAdapter,
  ) {}

  @Get()
  @ApiOperation({ summary: "List integration adapters" })
  list() {
    return this.integrationsService.list();
  }

  @Get("status")
  @ApiOperation({ summary: "All integration adapters status" })
  status(@Query("ping") _ping?: string) {
    return {
      mode: "mock",
      adapters: ["shopify", "whatsapp", "instagram", "metaAds", "googleAnalytics", "webhooks"],
      demoMode: process.env.DEMO_MODE !== "false",
    };
  }

  @Get("shopify/store")
  @ApiOperation({ summary: "Shopify store info (mock)" })
  shopifyStore() {
    return this.shopify.getStoreInfo();
  }

  @Post("shopify/sync/products")
  shopifySyncProducts() {
    return this.shopify.syncProducts();
  }

  @Post("shopify/sync/orders")
  shopifySyncOrders() {
    return this.shopify.syncOrders();
  }

  @Post("whatsapp/send")
  whatsappSend(@Body() body: { to: string; body: string }) {
    return this.whatsapp.sendMessage(body.to, body.body);
  }

  @Get("whatsapp/templates")
  whatsappTemplates() {
    return this.whatsapp.getTemplates();
  }

  @Get("instagram/conversations")
  instagramConversations() {
    return this.instagram.listConversations();
  }

  @Post("instagram/dm")
  instagramDm(@Body() body: { recipientId: string; text: string }) {
    return this.instagram.sendDm(body.recipientId, body.text);
  }

  @Get("meta-ads/campaigns")
  metaCampaigns() {
    return this.metaAds.listCampaigns();
  }

  @Get("meta-ads/campaigns/:id/insights")
  metaInsights(@Param("id") id: string) {
    return this.metaAds.getInsights(id);
  }

  @Get("google-analytics/overview")
  gaOverview() {
    return this.ga.getOverview();
  }

  @Post("google-analytics/events")
  gaEvent(@Body() body: { name: string; params?: Record<string, unknown> }) {
    return this.ga.trackEvent(body.name, body.params);
  }

  @Post("webhooks/dispatch")
  webhookDispatch(@Body() body: { event: string; payload?: Record<string, unknown> }) {
    return this.webhooks.dispatch(body.event, body.payload ?? {});
  }

  @Post(":id/sync")
  @ApiOperation({ summary: "Trigger mock sync for an integration" })
  sync(@Param("id") id: string) {
    return this.integrationsService.sync(id);
  }
}
