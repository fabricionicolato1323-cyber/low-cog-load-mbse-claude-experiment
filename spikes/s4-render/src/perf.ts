export const raf = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
/** Resolves after the frame that follows the next one: i.e. after a render scheduled "on next frame" has been painted. */
export const raf2 = async () => {
  await raf();
  await raf();
};
export const q = (xs: number[], p: number) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.min(s.length - 1, Math.ceil(p * s.length) - 1)]! : NaN;
};
export const stats = (xs: number[]) => ({ n: xs.length, p50: q(xs, 0.5), p95: q(xs, 0.95), max: xs.length ? Math.max(...xs) : NaN });

/** Measures main-thread responsiveness while `during` runs: worst long task and worst heartbeat lag. */
export async function withJankMonitor<T>(during: () => Promise<T>): Promise<{ value: T; longTaskMaxMs: number; heartbeatMaxLagMs: number }> {
  let longTaskMax = 0;
  let po: PerformanceObserver | undefined;
  try {
    po = new PerformanceObserver((list) => {
      for (const e of list.getEntries()) longTaskMax = Math.max(longTaskMax, e.duration);
    });
    po.observe({ type: "longtask", buffered: false });
  } catch {
    /* longtask unsupported: heartbeat still works */
  }
  let last = performance.now();
  let maxLag = 0;
  const hb = setInterval(() => {
    const now = performance.now();
    maxLag = Math.max(maxLag, now - last - 10);
    last = now;
  }, 10);
  const value = await during();
  await new Promise((r) => setTimeout(r, 30));
  clearInterval(hb);
  po?.disconnect();
  return { value, longTaskMaxMs: longTaskMax, heartbeatMaxLagMs: maxLag };
}
