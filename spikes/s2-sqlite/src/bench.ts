/**
 * S2 benchmark. Run: node --expose-gc --import tsx src/bench.ts <better-sqlite3|node:sqlite> <tier1|tier2|r1e4>
 * Merges its result into docs/slice0/data/s2-results.json. Criteria: docs/slice0/SPIKE_CRITERIA.md (pre-registered).
 */
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Graph, RULES, generate, makeChangeSet, rng, type Op } from "@lcl/spike-s1-graph";
import { openDb, type DriverName } from "./driver.ts";
import { Store, rebuildFromLog, type StoredChangeSet } from "./store.ts";

const SIZES: Record<string, { E: number; R: number }> = { r1e4: { E: 2_000, R: 10_000 }, tier1: { E: 10_000, R: 50_000 }, tier2: { E: 100_000, R: 1_000_000 } };
const driver = (process.argv[2] ?? "better-sqlite3") as DriverName;
const tier = process.argv[3] ?? "tier1";
const { E, R } = SIZES[tier]!;
const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../..");
const dir = join(root, ".tmp", `s2-bench-${driver.replace(":", "_")}-${tier}`);
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });

const q = (xs: number[], p: number) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.ceil(p * s.length) - 1)]!;
};
const stats = (xs: number[]) => ({ n: xs.length, p50: q(xs, 0.5), p95: q(xs, 0.95), p99: q(xs, 0.99), max: Math.max(...xs), mean: xs.reduce((a, b) => a + b, 0) / xs.length });
const time = <T>(f: () => T): [T, number] => {
  const t = performance.now();
  const v = f();
  return [v, performance.now() - t];
};
const gc = () => (globalThis as unknown as { gc?: () => void }).gc?.();
const size = (p: string) => (existsSync(p) ? statSync(p).size : 0);
const mkCs = (store: Store, ops: Op[], key: string): StoredChangeSet => ({ id: `cs-${key}`, idempotencyKey: key, baseRevision: store.head(), ops, provenance: { origin: "user", actor: "bench" }, createdAt: new Date().toISOString() });

console.log(`\n== S2 ${driver} ${tier}: ${E} elements / ${R} relations`);
const ds = generate(E, R, 42);
const path = join(dir, "live.sqlite");
let store = new Store(openDb(driver, path, { synchronous: "FULL" }));

// ---- bulk load through the real commit path (50 ops per commit, synchronous=FULL)
const load: Op[] = [...ds.elements.map((element) => ({ op: "add-element", element }) as Op), ...ds.relations.map((relation) => ({ op: "add-relation", relation }) as Op)];
const bulkMs: number[] = [];
const [, bulkTotal] = time(() => {
  for (let i = 0; i < load.length; i += 50) bulkMs.push(time(() => store.commit(mkCs(store, load.slice(i, i + 50), `load-${i}`)))[1]);
});
const bulk = { commits: bulkMs.length, totalMs: Math.round(bulkTotal), first500: stats(bulkMs.slice(0, 500)), last500: stats(bulkMs.slice(-500)), all: stats(bulkMs) };
console.log(`bulk load ${bulk.commits} commits in ${(bulkTotal / 1000).toFixed(1)}s; commit p95 first500 ${bulk.first500.p95.toFixed(2)} ms, last500 ${bulk.last500.p95.toFixed(2)} ms`);

// ---- S2-d cold open (fresh connection; OS file cache is warm, disclosed)
store.db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
store.db.close();
gc();
const [opened, openMs] = time(() => {
  const st = new Store(openDb(driver, path, { synchronous: "FULL" }));
  return st;
});
store = opened;
let readMs = 0;
const [graph, coldTotal] = time(() => {
  const els: ReturnType<Store["currentElements"]> = store.currentElements();
  const t0 = performance.now();
  const elements = [...els];
  const relations = [...store.currentRelations()];
  readMs = performance.now() - t0; // SQLite read + JSON.parse of props + row objects
  return Graph.fromRows(RULES, elements, relations);
});
gc();
const coldOpen = { openConnMs: openMs, readAndParseMs: readMs, buildGraphMs: coldTotal - readMs, totalMs: openMs + coldTotal, heapUsedMB: Math.round(process.memoryUsage().heapUsed / 1048576) };
console.log(`cold open: conn ${openMs.toFixed(0)} ms + read/parse ${readMs.toFixed(0)} ms + graph ${(coldTotal - readMs).toFixed(0)} ms = ${coldOpen.totalMs.toFixed(0)} ms`);

// ---- S2-c realistic commits (S1 in-memory apply + S2 durable commit), 300 each mode
const cr = rng(1234);
const runCommits = (n: number, tag: string) => {
  const mem: number[] = [];
  const db: number[] = [];
  for (let i = 0; i < n; i++) {
    const ops = makeChangeSet(ds, cr, 50);
    mem.push(time(() => graph.apply(ops))[1]);
    db.push(time(() => store.commit(mkCs(store, ops, `${tag}-${i}`)))[1]);
  }
  return { memory: stats(mem), store: stats(db), total: stats(mem.map((m, i) => m + db[i]!)) };
};
const commitFull = runCommits(300, "full");
store.db.exec("PRAGMA synchronous = NORMAL");
const commitNormal = runCommits(300, "normal"); // informational only: NOT the criterion
store.db.exec("PRAGMA synchronous = FULL");
console.log(`commit(50 ops) FULL: store p50/p95/p99 ${commitFull.store.p50.toFixed(2)}/${commitFull.store.p95.toFixed(2)}/${commitFull.store.p99.toFixed(2)} ms; +memory apply => total p95 ${commitFull.total.p95.toFixed(2)} ms (NORMAL store p95 ${commitNormal.store.p95.toFixed(2)} ms)`);

// ---- S2-h as-of neighbourhood
const head = store.head();
const asOf: number[] = [];
const r = rng(5);
for (let i = 0; i < 300; i++) {
  const el = ds.elements[Math.floor(r() * ds.elements.length)]!;
  const rev = 1 + Math.floor(r() * head);
  asOf.push(time(() => store.neighboursAsOf(el.id, rev))[1]);
}
const asOfHub: number[] = [0, 1, 2].map(() => time(() => store.neighboursAsOf(ds.hub, Math.floor(head / 2)))[1]);
console.log(`as-of 1-hop p50/p95/max ${q(asOf, 0.5).toFixed(2)}/${q(asOf, 0.95).toFixed(2)}/${Math.max(...asOf).toFixed(2)} ms; hub ${asOfHub.map((x) => x.toFixed(1)).join("/")} ms`);

// ---- S2-e rebuild from log
store.db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
const liveHash = store.stateHash();
const rebuiltPath = join(dir, "rebuilt.sqlite");
const dstDb = openDb(driver, rebuiltPath, { synchronous: "NORMAL" }); // regenerable artefact; swapped in only after hash+integrity check
const dst = new Store(dstDb);
const [, rebuildMs] = time(() => rebuildFromLog(store, dst, 500));
const [rebuiltHash, hashMs] = time(() => dst.stateHash());
const rebuild = { ms: Math.round(rebuildMs), hashMs: Math.round(hashMs), identical: rebuiltHash === liveHash, headEqual: dst.head() === store.head(), integrity: dst.integrityCheck() };
console.log(`rebuild-from-log ${(rebuildMs / 1000).toFixed(1)} s; hash identical=${rebuild.identical} head equal=${rebuild.headEqual}`);

const files = { dbMB: Math.round(size(path) / 1048576), walMB: Math.round(size(path + "-wal") / 1048576), rebuiltMB: Math.round(size(rebuiltPath) / 1048576) };
dst.db.close();
store.db.close();
rmSync(dir, { recursive: true, force: true, maxRetries: 5 });

const result = { driver, tier, elements: E, relations: R, node: process.version, platform: process.platform, bulk, coldOpen, commitFull, commitNormal, asOf: { ...stats(asOf), hubMs: asOfHub }, rebuild, files };
const out = join(root, "docs/slice0/data/s2-results.json");
const all = existsSync(out) ? JSON.parse(readFileSync(out, "utf8")) : {};
all[`${driver}:${tier}:${process.platform}`] = result;
writeFileSync(out, JSON.stringify(all, null, 2) + "\n");
console.log("saved", out);
