import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { PROPAGATION, RULES, generate, makeChangeSet, rng } from "../src/gen.ts";
import { Graph, ValidationError, type Element, type Id, type Op, type Relation } from "../src/graph.ts";

/** Independent oracle: plain-array BFS by edge scanning (no adjacency index), written to share no code with Graph. */
function oracleReach(rels: Relation[], start: Id, kinds: string[], dir: "out" | "in" | "both", hops: number): Map<Id, number> {
  const dist = new Map<Id, number>([[start, 0]]);
  for (let h = 1; h <= hops; h++) {
    const frontier = [...dist].filter(([, d]) => d === h - 1).map(([id]) => id);
    for (const id of frontier)
      for (const r of rels) {
        if (!kinds.includes(r.kind)) continue;
        if ((dir !== "in") && r.source === id && !dist.has(r.target)) dist.set(r.target, h);
        if ((dir !== "out") && r.target === id && !dist.has(r.source)) dist.set(r.source, h);
      }
  }
  dist.delete(start);
  return dist;
}

describe("S1-e graph correctness against an independent oracle", () => {
  const ds = generate(300, 1200, 5);
  const g = Graph.fromRows(RULES, ds.elements, ds.relations);
  const r = rng(3);

  it("bounded query agrees with the oracle on hop distance and set of reached elements (60 random cases)", () => {
    const kindsAll = ["satisfies", "derives", "refines", "allocates", "depends", "contains", "verifies", "realizes", "exchanges"];
    for (let i = 0; i < 60; i++) {
      const start = ds.elements[Math.floor(r() * ds.elements.length)]!.id;
      const kinds = kindsAll.filter(() => r() < 0.6);
      const dir = (["out", "in", "both"] as const)[Math.floor(r() * 3)]!;
      const hops = 1 + Math.floor(r() * 3);
      const res = g.query(start, { relKinds: kinds, dir, maxHops: hops, limit: 1e9 });
      const want = oracleReach(ds.relations, start, kinds, dir, hops);
      expect(new Map(res.page.map((x) => [x.id, x.hops]))).toEqual(want);
    }
  });

  it("witness paths are real: each `via` chain is connected, kind-filtered and has the reported length", () => {
    const start = ds.hub;
    const res = g.query(start, { relKinds: ["satisfies", "contains", "derives", "allocates"], dir: "both", maxHops: 3, limit: 1e9 });
    expect(res.total).toBeGreaterThan(0);
    for (const row of res.page) {
      expect(row.via).toHaveLength(row.hops);
      let cur = start;
      for (const rid of row.via) {
        const rel = g.relations.get(rid)!;
        expect(["satisfies", "contains", "derives", "allocates"]).toContain(rel.kind);
        expect(rel.source === cur || rel.target === cur).toBe(true);
        cur = rel.source === cur ? rel.target : rel.source;
      }
      expect(cur).toBe(row.id);
    }
  });

  it("multiplicity is not collapsed: `arrivals` equals the number of distinct shortest-level incoming relations", () => {
    const e = (id: string, kind = "function"): Element => ({ id, kind, props: {} });
    const rel = (id: string, s: string, t: string): Relation => ({ id, kind: "depends", source: s, target: t });
    const gg = Graph.fromRows(RULES, [e("a"), e("b"), e("c"), e("d")], [rel("1", "a", "b"), rel("2", "a", "c"), rel("3", "b", "d"), rel("4", "c", "d"), rel("5", "a", "d")]);
    const two = gg.query("a", { relKinds: ["depends"], dir: "out", maxHops: 2, limit: 100 });
    const d = two.page.find((x) => x.id === "d")!;
    expect(d.hops).toBe(1); // direct edge is shortest
    expect(d.arrivals).toBe(1);
    const viaOnly = Graph.fromRows(RULES, [e("a"), e("b"), e("c"), e("d")], [rel("1", "a", "b"), rel("2", "a", "c"), rel("3", "b", "d"), rel("4", "c", "d")]);
    expect(viaOnly.query("a", { relKinds: ["depends"], dir: "out", maxHops: 2 }).page.find((x) => x.id === "d")!.arrivals).toBe(2);
  });

  it("forward and inverse navigation agree for every relation", () => {
    for (const rel of ds.relations) {
      expect(g.out.get(rel.source)!.includes(rel)).toBe(true);
      expect(g.inn.get(rel.target)!.includes(rel)).toBe(true);
    }
    let a = 0;
    let b = 0;
    for (const l of g.out.values()) a += l.length;
    for (const l of g.inn.values()) b += l.length;
    expect(a).toBe(ds.relations.length);
    expect(b).toBe(ds.relations.length);
  });

  it("impact is read-only, respects depth, and every witness path exists", () => {
    const fp = g.fingerprint();
    const seed = ds.byKind.get("requirement")![0]!.id;
    const res = g.impact([seed], PROPAGATION, 3);
    expect(g.fingerprint()).toBe(fp);
    expect(res.get(seed)).toMatchObject({ depth: 0, cls: "direct" });
    for (const imp of res.values()) {
      expect(imp.depth).toBeLessThanOrEqual(3);
      expect(imp.via).toHaveLength(imp.depth);
      for (const rid of imp.via) expect(g.relations.has(rid)).toBe(true);
    }
    const seen = new Set([...res.values()].map((x) => x.cls));
    expect(seen.size).toBeGreaterThan(0);
  });
});

describe("S1-e atomic apply", () => {
  it("failed change sets leave the graph exactly unchanged; valid ones apply fully (property test)", () => {
    const ds = generate(200, 800, 9);
    const g = Graph.fromRows(RULES, ds.elements, ds.relations);
    const r = rng(11);
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 40 }), fc.integer({ min: 0, max: 39 }), fc.boolean(), (n, poisonAt, poison) => {
        const ops: Op[] = makeChangeSet(ds, r, n);
        if (poison) ops.splice(Math.min(poisonAt, ops.length), 0, { op: "remove-element", id: ds.elements[0]!.id }); // has relations -> invalid
        const before = g.fingerprint();
        const relBefore = g.relations.size;
        try {
          g.apply(ops);
          expect(poison).toBe(false);
          expect(g.relations.size).toBeGreaterThanOrEqual(relBefore);
        } catch (e) {
          expect(e).toBeInstanceOf(ValidationError);
          expect(poison).toBe(true);
          expect(g.fingerprint()).toBe(before);
        }
        return true;
      }),
      { numRuns: 200, seed: 1 },
    );
  });

  it("enforces endpoint, cardinality, dangling and duplicate rules, each rolling back earlier ops", () => {
    const ds = generate(100, 300, 2);
    const g = Graph.fromRows(RULES, ds.elements, ds.relations);
    const f = ds.byKind.get("function")![0]!;
    const l = ds.byKind.get("logical")![1]!;
    const req = ds.byKind.get("requirement")![0]!;
    const fresh: Element = { id: "fresh-1", kind: "function", props: {} };
    const cases: [string, Op[]][] = [
      ["cardinality", [{ op: "add-element", element: fresh }, { op: "add-relation", relation: { id: "r-x1", kind: "allocates", source: f.id, target: l.id } }]], // f already has one allocates
      ["endpoint-constraint", [{ op: "add-element", element: fresh }, { op: "add-relation", relation: { id: "r-x2", kind: "satisfies", source: f.id, target: req.id } }]],
      ["dangling-endpoint", [{ op: "add-element", element: fresh }, { op: "add-relation", relation: { id: "r-x3", kind: "depends", source: fresh.id, target: "nope" } }]],
      ["duplicate-id", [{ op: "add-element", element: fresh }, { op: "add-element", element: fresh }]],
    ];
    for (const [code, ops] of cases) {
      const before = g.fingerprint();
      expect(() => g.apply(ops), code).toThrowError(expect.objectContaining({ code }));
      expect(g.fingerprint(), code).toBe(before);
      expect(g.elements.has("fresh-1")).toBe(false);
    }
  });
});
