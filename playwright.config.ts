import { defineConfig } from "@playwright/test";

/** Uses the system Microsoft Edge (channel) so no browser download is needed on a dev machine. Local-only; never run in CI here. */
export default defineConfig({
  testDir: "packages/web/e2e",
  timeout: 30_000,
  reporter: "list",
  use: { channel: "msedge", headless: true, baseURL: "http://127.0.0.1:4173" },
  webServer: { command: "npm run build -w @lcl/web && npm run preview -w @lcl/web", url: "http://127.0.0.1:4173", reuseExistingServer: false, timeout: 120_000, cwd: "." },
});
