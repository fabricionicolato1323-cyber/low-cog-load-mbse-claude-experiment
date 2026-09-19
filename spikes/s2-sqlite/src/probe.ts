/** S2-a/b facts: what actually loads, versions, warnings. Run: node --import tsx src/probe.ts */
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { arch, platform } from "node:os";

const require = createRequire(import.meta.url);
const out: Record<string, unknown> = { node: process.version, platform: platform(), arch: arch() };

try {
  const Database = require("better-sqlite3");
  const db = new Database(":memory:");
  out["better-sqlite3"] = { ok: true, version: require("better-sqlite3/package.json").version, sqlite: db.prepare("select sqlite_version() v").get().v };
} catch (e) {
  out["better-sqlite3"] = { ok: false, error: String(e instanceof Error ? e.message : e).split("\n")[0] };
}

// node:sqlite in a clean child so any ExperimentalWarning is captured verbatim.
const r = spawnSync(process.execPath, ["-e", 'const {DatabaseSync}=require("node:sqlite");const d=new DatabaseSync(":memory:");console.log(JSON.stringify(d.prepare("select sqlite_version() v").get()))'], { encoding: "utf8" });
out["node:sqlite"] = { ok: r.status === 0, sqlite: r.status === 0 ? JSON.parse(r.stdout.trim()).v : undefined, stderr: r.stderr.trim().split("\n").slice(0, 2).join(" | ") || "(no warning)" };
console.log(JSON.stringify(out, null, 2));
