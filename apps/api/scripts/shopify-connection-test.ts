import { ShopifyAdapter } from "../src/integrations/shopify.adapter";
import { ShopifyAdminClient } from "../src/integrations/shopify-admin.client";

// Run from apps/api: node --env-file=../../.env -r ts-node/register scripts/shopify-connection-test.ts
// Internal diagnostic: no HTTP endpoint, tokens or provider error bodies are exposed.
void new ShopifyAdapter(new ShopifyAdminClient()).testConnection().then((result) => {
  console.log(JSON.stringify(result, null, 2));
  if (!result.authenticated) process.exitCode = 1;
});
