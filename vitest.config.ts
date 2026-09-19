import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/*/test/**/*.test.ts", "adapters/*/test/**/*.test.ts", "spikes/*/test/**/*.test.ts", "tools/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**", "**/*.slow.test.ts", "**/e2e/**"],
    testTimeout: 30_000,
  },
});
