import { describe, expect, it } from "vitest";
import { CORPUS, KINDS } from "../src/corpus.ts";

describe("S3 corpus integrity (gold must be checkable, otherwise scoring is meaningless)", () => {
  it("has 20 paragraphs with unique ids", () => {
    expect(CORPUS).toHaveLength(20);
    expect(new Set(CORPUS.map((p) => p.id)).size).toBe(20);
  });
  it("every gold quote and ambiguity phrase is a verbatim substring of its paragraph", () => {
    for (const p of CORPUS) {
      for (const g of p.gold) expect(p.text.includes(g.quote), `${p.id}: ${g.quote}`).toBe(true);
      for (const a of p.ambiguous) expect(p.text.includes(a), `${p.id}: ${a}`).toBe(true);
    }
  });
  it("uses only known kinds and covers every kind at least twice", () => {
    const counts = new Map<string, number>(KINDS.map((k) => [k, 0]));
    for (const p of CORPUS)
      for (const g of p.gold) {
        expect(KINDS).toContain(g.kind);
        counts.set(g.kind, (counts.get(g.kind) ?? 0) + 1);
      }
    for (const [k, n] of counts) expect(n, k).toBeGreaterThanOrEqual(2);
  });
  it("contains at least one negative-control paragraph with no gold", () => {
    expect(CORPUS.some((p) => p.gold.length === 0)).toBe(true);
  });
});
