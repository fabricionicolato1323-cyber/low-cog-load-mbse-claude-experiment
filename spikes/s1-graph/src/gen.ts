import type { Element, Id, Op, Propagation, Relation, RuleSet } from "./graph.ts";

/** Deterministic PRNG (mulberry32). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** UUIDv7-shaped 36-char string from the PRNG (real ids are UUIDv7 strings: string cost is part of the measurement). */
export function uuid(r: () => number): Id {
  const hex = (n: number) => {
    let s = "";
    for (let i = 0; i < n; i++) s += Math.floor(r() * 16).toString(16);
    return s;
  };
  return `${hex(8)}-${hex(4)}-7${hex(3)}-${(8 + Math.floor(r() * 4)).toString(16)}${hex(3)}-${hex(12)}`;
}

/** Abstraction-layered engineering-shaped model. */
export const LAYERS = ["need", "requirement", "function", "logical", "physical", "test"] as const;
export const LAYER_SHARE = [0.04, 0.24, 0.2, 0.2, 0.22, 0.1];

export const RULES: RuleSet = {
  endpoints: {
    derives: { source: ["need"], target: ["requirement"] },
    refines: { source: ["requirement"], target: ["requirement"] },
    satisfies: { source: ["requirement"], target: ["function"] },
    depends: { source: ["function"], target: ["function"] },
    allocates: { source: ["function"], target: ["logical"] },
    exchanges: { source: ["logical"], target: ["logical"] },
    realizes: { source: ["logical"], target: ["physical"] },
    verifies: { source: ["test"], target: ["requirement"] },
    contains: { source: LAYERS, target: LAYERS },
  },
  maxOut: { allocates: 1 },
};

export const PROPAGATION: Propagation[] = [
  { kind: "satisfies", dir: "out", cls: "direct" },
  { kind: "allocates", dir: "out", cls: "direct" },
  { kind: "realizes", dir: "out", cls: "direct" },
  { kind: "depends", dir: "out", cls: "direct" },
  { kind: "derives", dir: "in", cls: "potential" },
  { kind: "refines", dir: "in", cls: "potential" },
  { kind: "verifies", dir: "in", cls: "potential" },
];

export interface Dataset {
  elements: Element[];
  relations: Relation[];
  byKind: Map<string, Element[]>;
  hub: Id; // highest total-degree element
}

/**
 * Relations mix: hierarchy (`contains`, a forest per layer), cross-layer traceability, within-layer dependency/exchange.
 * ~8% of cross-layer targets are drawn from a small hub set per layer (heavy tail, like shared standards/interfaces).
 */
export function generate(nElements: number, nRelations: number, seed = 1): Dataset {
  const r = rng(seed);
  const elements: Element[] = [];
  const byKind = new Map<string, Element[]>();
  LAYERS.forEach((k, li) => {
    const n = Math.max(2, Math.round(nElements * LAYER_SHARE[li]!));
    const list: Element[] = [];
    for (let i = 0; i < n; i++) {
      const e: Element = { id: uuid(r), kind: k, props: { name: `${k} ${i}`, status: r() < 0.6 ? "approved" : "draft", rank: Math.floor(r() * 100) } };
      list.push(e);
      elements.push(e);
    }
    byKind.set(k, list);
  });
  const hubs = new Map<string, Element[]>();
  for (const [k, list] of byKind) hubs.set(k, list.slice(0, Math.max(1, Math.floor(list.length * 0.005))));
  const pick = (k: string, useHub: boolean) => {
    const list = useHub ? hubs.get(k)! : byKind.get(k)!;
    return list[Math.floor(r() * list.length)]!;
  };
  const relations: Relation[] = [];
  const add = (kind: string, s: Element, t: Element) => relations.push({ id: uuid(r), kind, source: s.id, target: t.id });

  // hierarchy forest inside each layer: element i>0 has a parent among earlier elements (branching ~ 8)
  for (const list of byKind.values()) for (let i = 1; i < list.length; i++) add("contains", list[Math.floor((i - 1) / 8)]!, list[i]!);

  const allocated = new Set<Id>();
  const cross: [string, string, string, number][] = [
    ["derives", "need", "requirement", 0.1],
    ["satisfies", "requirement", "function", 0.2],
    ["allocates", "function", "logical", 0.0],
    ["realizes", "logical", "physical", 0.12],
    ["verifies", "test", "requirement", 0.12],
    ["refines", "requirement", "requirement", 0.06],
    ["depends", "function", "function", 0.1],
    ["exchanges", "logical", "logical", 0.1],
  ];
  const weights = cross.map(([, , , w]) => w);
  const wsum = weights.reduce((a, b) => a + b, 0);
  // each function gets exactly one `allocates` (respects the cardinality rule)
  for (const f of byKind.get("function")!) {
    if (relations.length >= nRelations) break;
    add("allocates", f, pick("logical", r() < 0.05));
    allocated.add(f.id);
  }
  while (relations.length < nRelations) {
    let x = r() * wsum;
    let ci = 0;
    while (ci < cross.length - 1 && x > weights[ci]!) x -= weights[ci++]!;
    const [kind, sk, tk] = cross[ci]!;
    if (kind === "allocates") continue;
    const s = pick(sk, false);
    const t = pick(tk, r() < 0.08);
    if (s !== t) add(kind, s, t);
  }
  const deg = new Map<Id, number>();
  for (const rel of relations) {
    deg.set(rel.source, (deg.get(rel.source) ?? 0) + 1);
    deg.set(rel.target, (deg.get(rel.target) ?? 0) + 1);
  }
  let hub = elements[0]!.id;
  let best = -1;
  for (const [id, d] of deg)
    if (d > best) {
      best = d;
      hub = id;
    }
  return { elements, relations, byKind, hub };
}

/** A realistic small ChangeSet (<= 50 ops): new requirement cluster + traceability + edits. All valid against RULES. */
export function makeChangeSet(ds: Dataset, r: () => number, nOps = 50): Op[] {
  const ops: Op[] = [];
  const reqs = ds.byKind.get("requirement")!;
  const funcs = ds.byKind.get("function")!;
  const logical = ds.byKind.get("logical")!;
  const newFuncs: Element[] = [];
  let i = 0;
  while (ops.length < nOps) {
    const t = i++ % 5;
    if (t === 0 || t === 1) {
      const e: Element = { id: uuid(r), kind: t === 0 ? "requirement" : "function", props: { name: `new ${i}`, status: "draft", rank: 1 } };
      ops.push({ op: "add-element", element: e });
      if (t === 1) newFuncs.push(e);
    } else if (t === 2 && newFuncs.length) {
      const f = newFuncs[Math.floor(r() * newFuncs.length)]!;
      ops.push({ op: "add-relation", relation: { id: uuid(r), kind: "satisfies", source: reqs[Math.floor(r() * reqs.length)]!.id, target: f.id } });
    } else if (t === 3 && newFuncs.length) {
      const f = newFuncs.pop()!;
      ops.push({ op: "add-relation", relation: { id: uuid(r), kind: "allocates", source: f.id, target: logical[Math.floor(r() * logical.length)]!.id } });
    } else {
      const e = funcs[Math.floor(r() * funcs.length)]!;
      ops.push({ op: "update-element", id: e.id, set: { status: "approved", rank: Math.floor(r() * 100) } });
    }
  }
  return ops;
}
