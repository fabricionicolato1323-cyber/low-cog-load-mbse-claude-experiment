export declare const raf: () => Promise<void>;
/** Resolves after the frame that follows the next one: i.e. after a render scheduled "on next frame" has been painted. */
export declare const raf2: () => Promise<void>;
export declare const q: (xs: number[], p: number) => number;
export declare const stats: (xs: number[]) => {
    n: number;
    p50: number;
    p95: number;
    max: number;
};
/** Measures main-thread responsiveness while `during` runs: worst long task and worst heartbeat lag. */
export declare function withJankMonitor<T>(during: () => Promise<T>): Promise<{
    value: T;
    longTaskMaxMs: number;
    heartbeatMaxLagMs: number;
}>;
