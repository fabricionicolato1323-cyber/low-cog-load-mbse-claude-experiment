export interface GNode {
    id: string;
    w: number;
    h: number;
    label: string;
    layer?: number;
}
export interface GEdge {
    id: string;
    source: string;
    target: string;
    count?: number;
}
export interface Graph {
    nodes: GNode[];
    edges: GEdge[];
}
export declare function rng(seed: number): () => number;
/** Layered architecture-like DAG with ~1.5 edges per node, mostly to the next layer, a few skips/back edges. */
export declare function layeredGraph(n: number, layers: number, seed?: number): Graph;
/** 5,000 leaves: 10 top x 10 mid x 50 leaves. Edges are locality-biased (70% same mid, 20% same top, 10% anywhere). */
export interface ClusterModel {
    leaves: number;
    edges: [number, number][];
    mid(i: number): number;
}
export declare function clusterModel(leaves?: number, edgeCount?: number, seed?: number): ClusterModel;
/** Bounded view: collapsed clusters become one meta-node; edges are aggregated (count kept, never silently dropped). */
export declare function visibleView(m: ClusterModel, expandedMids: ReadonlySet<number>): Graph;
