/**
 * S4 runner: builds the bench page with Vite, serves it, drives it with Playwright (installed Microsoft Edge, headless),
 * runs each scenario in a fresh page, writes docs/slice0/data/s4-results.json and screenshots.
 * Run: node --import tsx src/run.ts [scenario ...]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { build, preview } from "vite";

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(here, "..");
const outDir = resolve(pkgRoot, "../../docs/slice0/data");
mkdirSync(outDir, { recursive: true });
const wanted = process.argv.slice(2);
const ALL = ["graph500", "collapsed5000", "grid500", "grid5000", "graph5000"];
const names = wanted.length ? wanted : ALL;
const TIMEOUT: Record<string, number> = { graph5000: 300_000, collapsed5000: 240_000 };
for (const v of ["collapsed5000_thorough1", "collapsed5000_cap3", "collapsed5000_cap3_thorough1"]) TIMEOUT[v] = 240_000;

await build({ root: pkgRoot, logLevel: "warn" });
const server = await preview({ root: pkgRoot, preview: { port: 4179, host: "127.0.0.1", strictPort: true } });
const url = "http://127.0.0.1:4179/";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const results: Record<string, unknown> = { browser: browser.version(), node: process.version, platform: process.platform, viewport: "1100x700 canvas; 1000x640 grid", headless: true, note: "software raster in headless Edge; CPU-only machine" };

for (const name of names) {
  const page = await browser.newPage({ viewport: { width: 1200, height: 1500 } });
  page.on("pageerror", (e) => console.log("pageerror", e.message));
  const t0 = Date.now();
  try {
    await page.goto(url);
    await page.waitForFunction("window.scenarios !== undefined");
    const res = await Promise.race([
      page.evaluate((n) => (window as any).scenarios[n](), name),
      new Promise((r) => setTimeout(() => r({ timeout: true }), TIMEOUT[name] ?? 120_000)),
    ]);
    results[name] = { ...(res as object), wallMs: Date.now() - t0 };
    if (!(res as any).timeout) {
      const target = name.startsWith("grid") ? "#grid-host" : "#cy";
      await page.locator(target).screenshot({ path: join(outDir, `s4-${name}.png`) }).catch(() => undefined);
    }
    console.log(name, JSON.stringify(results[name]).slice(0, 700));
  } catch (e) {
    results[name] = { error: String(e), wallMs: Date.now() - t0 };
    console.log(name, "ERROR", String(e).slice(0, 300));
  }
  await page.close();
}
await browser.close();
await server.close();
const file = join(outDir, wanted.length ? `s4-results-${wanted.join("+")}.json` : "s4-results.json");
writeFileSync(file, JSON.stringify(results, null, 2) + "\n");
console.log("wrote", file);
