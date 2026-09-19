import { rng } from "./data.ts";
import { raf2, stats } from "./perf.ts";

/**
 * Minimal DOM-virtualised matrix: only cells in the viewport (+overscan) exist in the DOM. The data source is a lazy
 * function, so a 5,000 x 5,000 matrix (25M cells) is never materialised. Cells carry canonical ids (drill-down needs them).
 */
export interface GridSource { rows: number; cols: number; cell(r: number, c: number): { id: string; text: string } | undefined }

const CW = 88;
const CH = 28;
const HW = 120;
const HH = 28;

export function mountGrid(host: HTMLElement, src: GridSource, viewport = { w: 1000, h: 640 }) {
  host.innerHTML = "";
  const box = document.createElement("div");
  box.style.cssText = `position:relative;width:${viewport.w}px;height:${viewport.h}px;overflow:auto;border:1px solid #ccc;font:11px system-ui`;
  const spacer = document.createElement("div");
  spacer.style.cssText = `width:${src.cols * CW + HW}px;height:${src.rows * CH + HH}px;position:relative`;
  const cellsLayer = document.createElement("div");
  cellsLayer.style.cssText = "position:absolute;left:0;top:0";
  const colHead = document.createElement("div");
  colHead.style.cssText = `position:sticky;top:0;height:${HH}px;z-index:3;background:#f1f5f9;margin-left:0;width:${src.cols * CW + HW}px`;
  const rowHead = document.createElement("div");
  rowHead.style.cssText = `position:sticky;left:0;width:${HW}px;z-index:2;background:#f8fafc;height:0`;
  spacer.append(cellsLayer);
  box.append(spacer);
  host.append(box);

  const live = new Map<number, HTMLElement>();
  const heads = new Map<string, HTMLElement>();
  let pending = false;
  const render = () => {
    pending = false;
    const top = box.scrollTop;
    const left = box.scrollLeft;
    const r0 = Math.max(0, Math.floor(top / CH) - 2);
    const r1 = Math.min(src.rows - 1, Math.ceil((top + viewport.h) / CH) + 2);
    const c0 = Math.max(0, Math.floor(left / CW) - 2);
    const c1 = Math.min(src.cols - 1, Math.ceil((left + viewport.w) / CW) + 2);
    for (const [k, el] of live) {
      const r = Math.floor(k / src.cols);
      const c = k % src.cols;
      if (r < r0 || r > r1 || c < c0 || c > c1) {
        el.remove();
        live.delete(k);
      }
    }
    const frag = document.createDocumentFragment();
    for (let r = r0; r <= r1; r++)
      for (let c = c0; c <= c1; c++) {
        const k = r * src.cols + c;
        if (live.has(k)) continue;
        const d = document.createElement("div");
        const v = src.cell(r, c);
        d.style.cssText = `position:absolute;left:${HW + c * CW}px;top:${HH + r * CH}px;width:${CW}px;height:${CH}px;box-sizing:border-box;border:1px solid #e2e8f0;padding:2px 4px;overflow:hidden;white-space:nowrap`;
        if (v) {
          d.textContent = v.text;
          d.dataset["id"] = v.id;
          d.style.background = "#dcfce7";
        }
        live.set(k, d);
        frag.append(d);
      }
    cellsLayer.append(frag);
    // headers (sticky container children re-laid out on scroll)
    for (const [k, el] of heads) {
      const [kind, i] = k.split(":") as ["r" | "c", string];
      const n = Number(i);
      if ((kind === "r" && (n < r0 || n > r1)) || (kind === "c" && (n < c0 || n > c1))) {
        el.remove();
        heads.delete(k);
      }
    }
    const hf = document.createDocumentFragment();
    for (let c = c0; c <= c1; c++)
      if (!heads.has(`c:${c}`)) {
        const d = document.createElement("div");
        d.style.cssText = `position:absolute;left:${HW + c * CW}px;top:0;width:${CW}px;height:${HH}px;box-sizing:border-box;border:1px solid #cbd5e1;padding:2px 4px;font-weight:600;overflow:hidden`;
        d.textContent = `C${c}`;
        heads.set(`c:${c}`, d);
        hf.append(d);
      }
    colHead.append(hf);
    const rf = document.createDocumentFragment();
    for (let r = r0; r <= r1; r++)
      if (!heads.has(`r:${r}`)) {
        const d = document.createElement("div");
        d.style.cssText = `position:absolute;left:0;top:${r * CH}px;width:${HW}px;height:${CH}px;box-sizing:border-box;border:1px solid #cbd5e1;padding:2px 4px;font-weight:600;overflow:hidden`;
        d.textContent = `Row ${r}`;
        heads.set(`r:${r}`, d);
        rf.append(d);
      }
    rowHead.append(rf);
  };
  spacer.prepend(colHead);
  spacer.insertBefore(rowHead, cellsLayer);
  box.addEventListener("scroll", () => {
    if (!pending) {
      pending = true;
      requestAnimationFrame(render);
    }
  });
  render();
  return { box, domCells: () => live.size + heads.size, render };
}

export async function scenarioGrid(n: number, filled: number) {
  const r = rng(n);
  const sparse = new Map<number, string>();
  while (sparse.size < filled) sparse.set(Math.floor(r() * n) * n + Math.floor(r() * n), `x${sparse.size}`);
  const src: GridSource = { rows: n, cols: n, cell: (a, b) => { const id = sparse.get(a * n + b); return id ? { id, text: `sat ${id}` } : undefined; } };
  const host = document.getElementById("grid-host")!;
  const t0 = performance.now();
  const g = mountGrid(host, src);
  await raf2();
  const initialMs = performance.now() - t0;
  const domAtRest = g.domCells();

  const jump: number[] = [];
  const rr = rng(99);
  for (let i = 0; i < 100; i++) {
    const t = performance.now();
    g.box.scrollTop = Math.floor(rr() * (n * 28 - 640));
    g.box.scrollLeft = Math.floor(rr() * (n * 88 - 1000));
    await raf2();
    jump.push(performance.now() - t);
  }
  const cont: number[] = [];
  g.box.scrollTop = 0;
  g.box.scrollLeft = 0;
  await raf2();
  for (let i = 0; i < 200; i++) {
    const t = performance.now();
    g.box.scrollTop += 40;
    g.box.scrollLeft += 15;
    await raf2();
    cont.push(performance.now() - t);
  }
  return { n, filledCells: filled, virtualCells: n * n, initialMs, domAtRest, domMax: Math.max(domAtRest, g.domCells()), jumpScroll: stats(jump), continuousScroll: stats(cont) };
}
