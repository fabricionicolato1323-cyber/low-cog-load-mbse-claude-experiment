/** S1 supplementary: extreme hub degree. node --expose-gc --import tsx src/stress-hub.ts */
import { writeFileSync } from "node:fs";
import { Graph } from "./graph.ts";
import { RULES, generate, rng, uuid } from "./gen.ts";

const ds = generate(100_000, 1_000_000, 42);
const r = rng(77);
const out: Record<string, unknown> = {};
for (const deg of [1_000, 5_000, 20_000, 50_000]) {
  const hub = { id: uuid(r), kind: "physical", props: { name: `hub${deg}`, status: "approved", rank: 1 } };
  const rels = [...ds.relations];
  const targets = ds.elements.filter((e) => e.kind === "requirement" || e.kind === "function");
  for (let i = 0; i < deg; i++) rels.push({ id: uuid(r), kind: "contains", source: hub.id, target: targets[Math.floor(r() * targets.length)]!.id });
  const g = Graph.fromRows(RULES, [...ds.elements, hub], rels);
  const q = { relKinds: ["satisfies", "derives", "refines", "allocates", "depends", "contains"], dir: "both" as const, maxHops: 3, targetKinds: ["function", "logical", "requirement"], where: (e: { props: Record<string, unknown> }) => e.props["status"] === "approved", limit: 100 };
  const runs = [0, 1, 2].map(() => { const t = performance.now(); const res = g.query(hub.id, q); return { ms: +(performance.now() - t).toFixed(1), total: res.total }; });
  const ti = performance.now();
  const imp = g.impact([hub.id], [{ kind: "contains", dir: "out", cls: "direct" }, { kind: "satisfies", dir: "out", cls: "direct" }, { kind: "allocates", dir: "out", cls: "direct" }, { kind: "realizes", dir: "out", cls: "direct" }], 4);
  out[`deg${deg}`] = { queryRuns: runs, impactMs: +(performance.now() - ti).toFixed(1), impactSize: imp.size };
  console.log(deg, JSON.stringify(out[`deg${deg}`]));
}
writeFileSync(new URL("../../../docs/slice0/data/s1-hub-stress.json", import.meta.url), JSON.stringify(out, null, 2) + "\n");
