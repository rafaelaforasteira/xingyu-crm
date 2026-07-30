import { demoSync, type IntegrationAdapter } from "./types";

export const shopifyAdapter: IntegrationAdapter = {
  name: "Shopify",
  isConfigured: () => Boolean(process.env.SHOPIFY_ACCESS_TOKEN?.trim()),
  sync: () => demoSync("Shopify"),
};
