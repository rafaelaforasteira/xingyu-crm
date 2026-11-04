import { defineConfig } from "vitest/config";

export default defineConfig({
  // Run source tests once, never the stale CommonJS copies emitted into dist/.
  test: { include: ["src/**/*.{test,spec}.{ts,tsx}"] },
});
