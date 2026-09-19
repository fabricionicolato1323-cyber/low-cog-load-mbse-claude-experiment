import type { Graph } from "./data.ts";
export interface Positions {
    pos: Map<string, {
        x: number;
        y: number;
    }>;
    ms: number;
}
export declare function layoutElk(g: Graph, direction?: "RIGHT" | "DOWN"): Promise<Positions>;
