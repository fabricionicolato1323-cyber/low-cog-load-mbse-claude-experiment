import type { GoldItem, Kind, Paragraph } from "./corpus.ts";

export interface PredItem {
  kind: string;
  quote: string;
}

const STOP = new Set(["the", "a", "an", "of", "to", "and", "in", "on", "is", "are", "be", "by", "for", "at"]);

export function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[^\p{L}\p{N}.]+/u)
    .map((t) => t.replace(/^\.+|\.+$/g, ""))
    .filter((t) => t.length > 0 && !STOP.has(t));
}

export function normalise(s: string): string {
  return s.replace(/\s+/g, " ").trim().toLowerCase();
}

/** Verbatim = appears in the paragraph modulo whitespace/case. */
export function isGrounded(quote: string, paragraph: string): boolean {
  const q = normalise(quote);
  return q.length > 0 && normalise(paragraph).includes(q);
}

/** gold-token coverage >= 0.8 AND prediction-token precision >= 0.4 (pre-registered). */
export function quoteMatch(pred: string, gold: string): boolean {
  const p = new Set(tokens(pred));
  const g = new Set(tokens(gold));
  if (p.size === 0 || g.size === 0) return false;
  let inter = 0;
  for (const t of g) if (p.has(t)) inter++;
  return inter / g.size >= 0.8 && inter / p.size >= 0.4;
}

export function kindOk(pred: string, gold: GoldItem): boolean {
  return pred === gold.kind || (gold.alt as string[] | undefined)?.includes(pred) === true;
}

export interface ParagraphScore {
  predicted: number;
  gold: number;
  grounded: number;
  matched: number; // kind-agnostic, one-to-one
  typedMatched: number; // matched and kind ok
  ambiguityGold: number;
  ambiguityHit: number;
  ambiguityFlagged: number;
}

export function scoreParagraph(p: Paragraph, items: PredItem[], ambiguities: string[]): ParagraphScore {
  const usedGold = new Set<number>();
  let matched = 0;
  let typedMatched = 0;
  const grounded = items.filter((i) => isGrounded(i.quote, p.text)).length;
  // Greedy one-to-one; an exact-kind match is preferred over a kind-mismatched one.
  const order = items.map((_, i) => i);
  for (const pass of ["kind", "any"] as const) {
    for (const i of order) {
      const it = items[i]!;
      if ((it as PredItem & { _used?: boolean })._used) continue;
      for (let gi = 0; gi < p.gold.length; gi++) {
        if (usedGold.has(gi)) continue;
        const g = p.gold[gi]!;
        if (!quoteMatch(it.quote, g.quote)) continue;
        if (pass === "kind" && !kindOk(it.kind, g)) continue;
        usedGold.add(gi);
        (it as PredItem & { _used?: boolean })._used = true;
        matched++;
        if (kindOk(it.kind, g)) typedMatched++;
        break;
      }
    }
  }
  for (const it of items) delete (it as PredItem & { _used?: boolean })._used;
  let hit = 0;
  const usedAmb = new Set<number>();
  for (const a of ambiguities)
    for (let gi = 0; gi < p.ambiguous.length; gi++) {
      if (usedAmb.has(gi)) continue;
      if (quoteMatch(a, p.ambiguous[gi]!) || quoteMatch(p.ambiguous[gi]!, a)) {
        usedAmb.add(gi);
        hit++;
        break;
      }
    }
  return {
    predicted: items.length,
    gold: p.gold.length,
    grounded,
    matched,
    typedMatched,
    ambiguityGold: p.ambiguous.length,
    ambiguityHit: hit,
    ambiguityFlagged: ambiguities.length,
  };
}

export type { Kind };
