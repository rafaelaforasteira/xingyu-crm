import { demoSync, type IntegrationAdapter } from "./types";

export const instagramAdapter: IntegrationAdapter = {
  name: "Instagram",
  isConfigured: () => Boolean(process.env.INSTAGRAM_ACCESS_TOKEN?.trim()),
  sync: () => demoSync("Instagram"),
};
