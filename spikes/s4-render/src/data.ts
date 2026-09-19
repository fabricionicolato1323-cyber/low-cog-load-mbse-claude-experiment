export interface GNode { id: string; w: number; h: number; label: string; layer?: number }
export interface GEdge { id: string; source: string; target: string; count?: number }
export interface Graph { nodes: GNode[]; edges: GEdge[] }

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

/** Layered architecture-like DAG with ~1.5 edges per node, mostly to the next layer, a few skips/back edges. */
export function layeredGraph(n: number, layers: number, seed = 1): Graph {
  const r = rng(seed);
  const nodes: GNode[] = [];
  const byLayer: string[][] = Array.from({ length: layers }, () => []);
  for (let i = 0; i < n; i++) {
    const layer = Math.min(layers - 1, Math.floor((i * layers) / n));
    const id = `n${i}`;
    nodes.push({ id, w: 110, h: 36, label: `Element ${i}`, layer });
    byLayer[layer]!.push(id);
  }
  const edges: GEdge[] = [];
  let e = 0;
  for (const nd of nodes) {
    const l = nd.layer!;
    const k = 1 + (r() < 0.5 ? 1 : 0);
    for (let j = 0; j < k; j++) {
      const tl = r() < 0.85 ? l + 1 : r() < 0.7 ? l + 2 : l - 1;
      const pool = byLayer[Math.max(0, Math.min(layers - 1, tl))]!;
      const t = pool[Math.floor(r() * pool.length)]!;
      if (t !== nd.id) edges.push({ id: `e${e++}`, source: nd.id, target: t });
    }
  }
  return { nodes, edges };
}

/** 5,000 leaves: 10 top x 10 mid x 50 leaves. Edges are locality-biased (70% same mid, 20% same top, 10% anywhere). */
export interface ClusterModel { leaves: number; edges: [number, number][]; mid(i: number): number }
export function clusterModel(leaves = 5000, edgeCount = 7500, seed = 3): ClusterModel {
  const r = rng(seed);
  const midOf = (i: number) => Math.floor(i / 50);
  const edges: [number, number][] = [];
  while (edges.length < edgeCount) {
    const s = Math.floor(r() * leaves);
    const x = r();
    let t: number;
    if (x < 0.7) t = midOf(s) * 50 + Math.floor(r() * 50);
    else if (x < 0.9) t = Math.floor(s / 500) * 500 + Math.floor(r() * 500);
    else t = Math.floor(r() * leaves);
    if (t !== s) edges.push([s, t]);
  }
  return { leaves, edges, mid: midOf };
}

/** Bounded view: collapsed clusters become one meta-node; edges are aggregated (count kept, never silently dropped). */
export function visibleView(m: ClusterModel, expandedMids: ReadonlySet<number>): Graph {
  const nodes: GNode[] = [];
  const nMid = Math.ceil(m.leaves / 50);
  for (let c = 0; c < nMid; c++) {
    if (expandedMids.has(c)) for (let i = c * 50; i < Math.min(m.leaves, c * 50 + 50); i++) nodes.push({ id: `n${i}`, w: 100, h: 34, label: `Leaf ${i}` });
    else nodes.push({ id: `M${c}`, w: 150, h: 52, label: `Group ${c} (50)` });
  }
  const vis = (i: number) => (expandedMids.has(m.mid(i)) ? `n${i}` : `M${m.mid(i)}`);
  const agg = new Map<string, GEdge>();
  for (const [s, t] of m.edges) {
    const a = vis(s);
    const b = vis(t);
    if (a === b) continue;
    const k = `${a}>${b}`;
    const ex = agg.get(k);
    if (ex) ex.count = (ex.count ?? 1) + 1;
    else agg.set(k, { id: k, source: a, target: b, count: 1 });
  }
  return { nodes, edges: [...agg.values()] };
}
