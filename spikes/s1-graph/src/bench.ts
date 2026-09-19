/**
 * S1 benchmark. Run: node --expose-gc --import tsx src/bench.ts [label ...]
 * Writes docs/slice0/data/s1-results.json. Criteria: docs/slice0/SPIKE_CRITERIA.md (pre-registered).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { getHeapStatistics } from "node:v8";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Graph, ValidationError, type Op } from "./graph.ts";
import { PROPAGATION, RULES, generate, makeChangeSet, rng, uuid } from "./gen.ts";

const SIZES: Record<string, { E: number; R: number }> = {
  "r1e4": { E: 2_000, R: 10_000 },
  "tier1": { E: 10_000, R: 50_000 },
  "r1e5": { E: 20_000, R: 100_000 },
  "tier2": { E: 100_000, R: 1_000_000 },
};
const labels = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(SIZES);

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

const QUERY = { relKinds: ["satisfies", "derives", "refines", "allocates", "depends", "contains"], dir: "both" as const, maxHops: 3, targetKinds: ["function", "logical", "requirement"], where: (e: { props: Record<string, unknown> }) => e.props["status"] === "approved", limit: 100 };

const results: Record<string, unknown> = { node: process.version, platform: process.platform, heapLimitMB: Math.round(getHeapStatistics().heap_size_limit / 1048576) };

for (const label of labels) {
  const { E, R } = SIZES[label]!;
  console.log(`\n== ${label}: ${E} elements / ${R} relations`);
  const [ds, genMs] = time(() => generate(E, R, 42));
  gc();
  const heapBefore = process.memoryUsage().heapUsed;
  const [g, buildMs] = time(() => Graph.fromRows(RULES, ds.elements, ds.relations));
  gc();
  const mem = process.memoryUsage();
  const r = rng(7);
  const starts = [...ds.byKind.get("requirement")!, ...ds.byKind.get("function")!];
  const pickStart = () => starts[Math.floor(r() * starts.length)]!.id;

  // --- S1-a bounded query
  const [, firstQueryMs] = time(() => g.query(pickStart(), QUERY));
  for (let i = 0; i < 30; i++) g.query(pickStart(), QUERY); // warm-up
  const qMs: number[] = [];
  const qTotals: number[] = [];
  for (let i = 0; i < 200; i++) {
    const s = pickStart();
    const [res, ms] = time(() => g.query(s, QUERY));
    qMs.push(ms);
    qTotals.push(res.total);
  }
  const hubRuns = [0, 1, 2].map(() => time(() => g.query(ds.hub, QUERY)));
  const hubTotal = hubRuns[0]![0].total;
  const hubDegree = (g.out.get(ds.hub)?.length ?? 0) + (g.inn.get(ds.hub)?.length ?? 0);

  // --- S1-b impact
  const seeds = ds.byKind.get("requirement")!;
  for (let i = 0; i < 10; i++) g.impact([seeds[Math.floor(r() * seeds.length)]!.id], PROPAGATION, 4);
  const iMs: number[] = [];
  const iSizes: number[] = [];
  for (let i = 0; i < 100; i++) {
    const s = seeds[Math.floor(r() * seeds.length)]!.id;
    const [res, ms] = time(() => g.impact([s], PROPAGATION, 4));
    iMs.push(ms);
    iSizes.push(res.size);
  }
  const [hubImpact, hubImpactMs] = time(() => g.impact([ds.hub], PROPAGATION, 4));

  // --- S1-c commit (in-memory apply + validate), 300 change sets of 50 ops
  const cr = rng(99);
  const sets: Op[][] = Array.from({ length: 300 }, () => makeChangeSet(ds, cr, 50));
  const cMs: number[] = [];
  for (const ops of sets) cMs.push(time(() => g.apply(ops))[1]);
  // failing change sets: last op is invalid -> full rollback; graph must be unchanged
  const fp0 = g.fingerprint();
  const rbMs: number[] = [];
  let rollbackOk = true;
  for (let i = 0; i < 50; i++) {
    const ops = makeChangeSet(ds, cr, 49);
    ops.push({ op: "add-relation", relation: { id: uuid(cr), kind: "satisfies", source: uuid(cr), target: uuid(cr) } });
    const [, ms] = time(() => {
      try {
        g.apply(ops);
        rollbackOk = false;
      } catch (e) {
        if (!(e instanceof ValidationError)) rollbackOk = false;
      }
    });
    rbMs.push(ms);
  }
  if (g.fingerprint() !== fp0) rollbackOk = false;

  const row = {
    label, elements: g.elements.size, relations: g.relations.size,
    generateMs: Math.round(genMs), buildMs: Math.round(buildMs),
    heapUsedMB: Math.round(mem.heapUsed / 1048576), rssMB: Math.round(mem.rss / 1048576),
    heapDeltaVsRowsMB: Math.round((mem.heapUsed - heapBefore) / 1048576),
    query: { ...stats(qMs), totalResults: stats(qTotals), firstQueryMs: firstQueryMs },
    hubQuery: { degree: hubDegree, results: hubTotal, runsMs: hubRuns.map(([, ms]) => ms) },
    impact: { ...stats(iMs), sizes: stats(iSizes), hubMs: hubImpactMs, hubSize: hubImpact.size },
    commit: { ...stats(cMs) },
    rollback: { ...stats(rbMs), ok: rollbackOk },
    idHeapNote: "string UUID ids",
  };
  results[label] = row;
  const f = (x: number) => x.toFixed(2);
  console.log(`build ${row.buildMs} ms (gen ${row.generateMs} ms); heapUsed ${row.heapUsedMB} MB rss ${row.rssMB} MB`);
  console.log(`query p50/p95/p99/max ${f(row.query.p50)}/${f(row.query.p95)}/${f(row.query.p99)}/${f(row.query.max)} ms; results p50 ${row.query.totalResults.p50} max ${row.query.totalResults.max}; first ${f(firstQueryMs)} ms`);
  console.log(`hub (deg ${hubDegree}) query runs ${hubRuns.map(([, ms]) => f(ms)).join(", ")} ms -> ${hubTotal} results`);
  console.log(`impact p50/p95/max ${f(row.impact.p50)}/${f(row.impact.p95)}/${f(row.impact.max)} ms; sizes p50 ${row.impact.sizes.p50} max ${row.impact.sizes.max}; hub ${f(hubImpactMs)} ms (${hubImpact.size})`);
  console.log(`commit(50 ops, in-mem) p50/p95/p99/max ${f(row.commit.p50)}/${f(row.commit.p95)}/${f(row.commit.p99)}/${f(row.commit.max)} ms; rollback p95 ${f(row.rollback.p95)} ms ok=${rollbackOk}`);
}

const out = resolve(dirname(fileURLToPath(import.meta.url)), "../../../docs/slice0/data/s1-results.json");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(results, null, 2) + "\n");
console.log("\nwrote", out);
