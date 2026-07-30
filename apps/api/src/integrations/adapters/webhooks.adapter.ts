import { demoSync, type IntegrationAdapter } from "./types";

export const webhooksAdapter: IntegrationAdapter = {
  name: "Webhooks",
  isConfigured: () => Boolean(process.env.WEBHOOK_SECRET?.trim()),
  sync: () => demoSync("Webhooks"),
};
