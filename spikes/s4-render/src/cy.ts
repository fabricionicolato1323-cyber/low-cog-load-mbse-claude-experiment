import cytoscape from "cytoscape";
import { clusterModel, layeredGraph, visibleView, type Graph } from "./data.ts";
import { layoutElk } from "./layout.ts";
import { raf2, stats, withJankMonitor } from "./perf.ts";

const STYLE: cytoscape.StylesheetJson = [
  { selector: "node", style: { "background-color": "#dbeafe", "border-color": "#1d4ed8", "border-width": 1, label: "data(label)", "font-size": 9, shape: "round-rectangle", width: "data(w)", height: "data(h)", "text-valign": "center" } },
  { selector: "edge", style: { width: 1, "line-color": "#94a3b8", "target-arrow-shape": "triangle", "target-arrow-color": "#94a3b8", "curve-style": "bezier" } },
  { selector: ".hl", style: { "background-color": "#fde68a", "line-color": "#f59e0b", "target-arrow-color": "#f59e0b", "border-color": "#b45309", "z-index": 10 } },
];

let cy: cytoscape.Core | undefined;

async function draw(g: Graph, pos: Map<string, { x: number; y: number }>): Promise<number> {
  const t0 = performance.now();
  cy?.destroy();
  cy = cytoscape({
    container: document.getElementById("cy"),
    elements: [
      ...g.nodes.map((n) => ({ group: "nodes" as const, data: { id: n.id, w: n.w, h: n.h, label: n.label }, position: pos.get(n.id) ?? { x: 0, y: 0 } })),
      ...g.edges.map((e) => ({ group: "edges" as const, data: { id: e.id, source: e.source, target: e.target } })),
    ],
    style: STYLE,
    layout: { name: "preset" },
    // Deliberately NOT enabling hideEdgesOnViewport / textureOnViewport: worst-case interaction cost.
  });
  cy.fit(undefined, 20);
  await raf2();
  return performance.now() - t0;
}

async function interactions(): Promise<{ panZoomStep: ReturnType<typeof stats>; selectHighlight3Hop: ReturnType<typeof stats>; visibleNodes: number }> {
  const c = cy!;
  const steps: number[] = [];
  const baseZoom = c.zoom();
  const w = c.width();
  const h = c.height();
  for (let i = 0; i < 60; i++) {
    const t0 = performance.now();
    if (i % 2 === 0) c.zoom({ level: baseZoom * (1 + 0.6 * ((i % 10) / 10)), renderedPosition: { x: w / 2 + (i % 7) * 20, y: h / 2 } });
    else c.panBy({ x: 40 * (i % 3 === 0 ? -1 : 1), y: 25 });
    await raf2();
    steps.push(performance.now() - t0);
  }
  c.fit(undefined, 20);
  await raf2();
  const sel: number[] = [];
  const nodes = c.nodes();
  for (let i = 0; i < 20; i++) {
    const start = nodes[Math.floor((i * 7919) % nodes.length)]!;
    const t0 = performance.now();
    c.elements().removeClass("hl");
    let frontier = c.collection().union(start);
    let all = frontier;
    for (let hop = 0; hop < 3; hop++) {
      frontier = frontier.neighborhood().difference(all);
      all = all.union(frontier);
    }
    all.addClass("hl");
    start.select();
    await raf2();
    sel.push(performance.now() - t0);
  }
  return { panZoomStep: stats(steps), selectHighlight3Hop: stats(sel), visibleNodes: c.nodes().length };
}

export async function scenarioGraph(n: number, layers: number, opts: { interact: boolean; screenshotId?: string }) {
  const g = layeredGraph(n, layers, 11);
  const jank = await withJankMonitor(() => layoutElk(g));
  const { pos, ms: layoutMs } = jank.value;
  const renderMs = await draw(g, pos);
  const inter = opts.interact ? await interactions() : null;
  return { nodes: g.nodes.length, edges: g.edges.length, layoutMs, renderMs, layoutPlusRenderMs: layoutMs + renderMs, mainThread: { longTaskMaxMs: jank.longTaskMaxMs, heartbeatMaxLagMs: jank.heartbeatMaxLagMs }, interactions: inter };
}

/** S4-d: 5,000-leaf model shown as a bounded, collapsed view; expand clusters on demand. */
export async function scenarioCollapsed() {
  const m = clusterModel();
  const expanded = new Set<number>();
  const run = async (label: string) => {
    const t0 = performance.now();
    const g = visibleView(m, expanded);
    const computeMs = performance.now() - t0;
    const { pos, ms: layoutMs } = await layoutElk(g);
    const renderMs = await draw(g, pos);
    return { label, visibleNodes: g.nodes.length, visibleEdges: g.edges.length, computeMs, layoutMs, renderMs, totalMs: performance.now() - t0 };
  };
  const initial = await run("initial: 100 group nodes");
  expanded.add(37);
  const expandOne = await run("expand one group (+49 nodes)");
  for (const c of [3, 12, 25, 41, 58, 66, 83]) expanded.add(c); // 8 expanded -> 92 + 400 = 492 visible
  const stress = await run("8 groups expanded (~490 visible)");
  const inter = await interactions();
  return { modelLeaves: m.leaves, modelEdges: m.edges.length, initial, expandOne, stress, interactionsAtStress: inter };
}
