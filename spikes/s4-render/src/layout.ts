import ELK from "elkjs/lib/elk-api.js";
import workerUrl from "elkjs/lib/elk-worker.min.js?url";
import type { Graph } from "./data.ts";

/** ELK in a Web Worker: the layout must not block the UI thread (S4-e). */
const elk = new ELK({ workerUrl });

export interface Positions { pos: Map<string, { x: number; y: number }>; ms: number }

export async function layoutElk(g: Graph, direction: "RIGHT" | "DOWN" = "RIGHT", extra: Record<string, string> = {}): Promise<Positions> {
  const t0 = performance.now();
  const res = await elk.layout({
    id: "root",
    layoutOptions: { "elk.algorithm": "layered", "elk.direction": direction, "elk.spacing.nodeNode": "24", "elk.layered.spacing.nodeNodeBetweenLayers": "60", ...extra },
    children: g.nodes.map((n) => ({ id: n.id, width: n.w, height: n.h })),
    edges: g.edges.map((e) => ({ id: e.id, sources: [e.source], targets: [e.target] })),
  });
  const pos = new Map<string, { x: number; y: number }>();
  for (const c of res.children ?? []) pos.set(c.id, { x: (c.x ?? 0) + (c.width ?? 0) / 2, y: (c.y ?? 0) + (c.height ?? 0) / 2 });
  return { pos, ms: performance.now() - t0 };
}
