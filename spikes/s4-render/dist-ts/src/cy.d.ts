import { stats } from "./perf.ts";
export declare function scenarioGraph(n: number, layers: number, opts: {
    interact: boolean;
    screenshotId?: string;
}): Promise<{
    nodes: number;
    edges: number;
    layoutMs: number;
    renderMs: number;
    layoutPlusRenderMs: number;
    mainThread: {
        longTaskMaxMs: number;
        heartbeatMaxLagMs: number;
    };
    interactions: {
        panZoomStep: ReturnType<typeof stats>;
        selectHighlight3Hop: ReturnType<typeof stats>;
        visibleNodes: number;
    } | null;
}>;
/** S4-d: 5,000-leaf model shown as a bounded, collapsed view; expand clusters on demand. */
export declare function scenarioCollapsed(): Promise<{
    modelLeaves: number;
    modelEdges: number;
    initial: {
        label: string;
        visibleNodes: number;
        visibleEdges: number;
        computeMs: number;
        layoutMs: number;
        renderMs: number;
        totalMs: number;
    };
    expandOne: {
        label: string;
        visibleNodes: number;
        visibleEdges: number;
        computeMs: number;
        layoutMs: number;
        renderMs: number;
        totalMs: number;
    };
    stress: {
        label: string;
        visibleNodes: number;
        visibleEdges: number;
        computeMs: number;
        layoutMs: number;
        renderMs: number;
        totalMs: number;
    };
    interactionsAtStress: {
        panZoomStep: ReturnType<typeof stats>;
        selectHighlight3Hop: ReturnType<typeof stats>;
        visibleNodes: number;
    };
}>;
