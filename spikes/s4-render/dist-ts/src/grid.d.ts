/**
 * Minimal DOM-virtualised matrix: only cells in the viewport (+overscan) exist in the DOM. The data source is a lazy
 * function, so a 5,000 x 5,000 matrix (25M cells) is never materialised. Cells carry canonical ids (drill-down needs them).
 */
export interface GridSource {
    rows: number;
    cols: number;
    cell(r: number, c: number): {
        id: string;
        text: string;
    } | undefined;
}
export declare function mountGrid(host: HTMLElement, src: GridSource, viewport?: {
    w: number;
    h: number;
}): {
    box: HTMLDivElement;
    domCells: () => number;
    render: () => void;
};
export declare function scenarioGrid(n: number, filled: number): Promise<{
    n: number;
    filledCells: number;
    virtualCells: number;
    initialMs: number;
    domAtRest: number;
    domMax: number;
    jumpScroll: {
        n: number;
        p50: number;
        p95: number;
        max: number;
    };
    continuousScroll: {
        n: number;
        p50: number;
        p95: number;
        max: number;
    };
}>;
