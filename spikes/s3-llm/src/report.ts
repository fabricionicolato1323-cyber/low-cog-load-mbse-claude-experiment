/** Scores every docs/slice0/data/s3-*.jsonl against the pre-registered criteria and writes s3-summary.json + prints a table. */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CORPUS } from "./corpus.ts";
import { scoreParagraph, type PredItem } from "./score.ts";

const dataDir = resolve(dirname(fileURLToPath(import.meta.url)), "../../../docs/slice0/data");
const pct = (n: number, d: number) => (d === 0 ? NaN : n / d);
const q = (xs: number[], p: number) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.min(s.length - 1, Math.ceil(p * s.length) - 1)]! : NaN;
};

interface Rec {
  id: string; model: string; mode: string; valid: boolean; truncated: boolean; error?: string;
  parsed: { items: PredItem[]; ambiguities: { quote: string }[] } | null;
  wallMs: number; evalCount?: number; evalMs?: number;
}

const rows: Record<string, unknown>[] = [];
for (const f of readdirSync(dataDir).filter((n) => /^s3-.*\.jsonl$/.test(n)).sort()) {
  const recs = readFileSync(resolve(dataDir, f), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as Rec);
  if (recs.length === 0) continue;
  let predicted = 0, gold = 0, grounded = 0, matched = 0, typed = 0, ambGold = 0, ambHit = 0, ambFlag = 0;
  let negItems = 0;
  const wall: number[] = [];
  let tokSum = 0, evalMsSum = 0;
  for (const r of recs) {
    wall.push(r.wallMs);
    tokSum += r.evalCount ?? 0;
    evalMsSum += r.evalMs ?? 0;
    const p = CORPUS.find((c) => c.id === r.id)!;
    gold += p.gold.length;
    ambGold += p.ambiguous.length;
    if (!r.valid || !r.parsed) continue; // invalid response contributes no items (counted in validity)
    const s = scoreParagraph(p, r.parsed.items.map((i) => ({ ...i })), r.parsed.ambiguities.map((a) => a.quote));
    predicted += s.predicted; grounded += s.grounded; matched += s.matched; typed += s.typedMatched;
    ambHit += s.ambiguityHit; ambFlag += s.ambiguityFlagged;
    if (p.gold.length === 0) negItems += s.predicted;
  }
  const valid = recs.filter((r) => r.valid).length;
  const row = {
    file: f, model: recs[0]!.model, mode: recs[0]!.mode, paragraphs: recs.length, complete: recs.length === CORPUS.length,
    validRate: pct(valid, recs.length), truncated: recs.filter((r) => r.truncated).length,
    predicted, gold, groundedRate: pct(grounded, predicted),
    extractPrecision: pct(matched, predicted), extractRecall: pct(matched, gold),
    typedPrecision: pct(typed, predicted), typedRecall: pct(typed, gold), kindAccuracy: pct(typed, matched),
    negativeControlItems: negItems, ambiguityRecall: pct(ambHit, ambGold), ambiguityFlagged: ambFlag,
    latencyP50s: q(wall, 0.5) / 1000, latencyP95s: q(wall, 0.95) / 1000,
    tokensPerSec: evalMsSum > 0 ? tokSum / (evalMsSum / 1000) : NaN,
    meanTokensPerParagraph: tokSum / recs.length,
  };
  const g = row;
  const gates = {
    "S3-a valid>=.98": g.validRate >= 0.98 && g.truncated === 0,
    "S3-b grounded>=.95": g.groundedRate >= 0.95,
    "S3-c typedP>=.70": g.typedPrecision >= 0.7,
    "S3-d typedR>=.60": g.typedRecall >= 0.6,
    "S3-e kindAcc>=.80": g.kindAccuracy >= 0.8,
    "S3-f neg<=1": g.negativeControlItems <= 1,
    "S3-g p95<=30s": g.latencyP95s <= 30,
  };
  rows.push({ ...row, gates, allGates: Object.values(gates).every(Boolean) && row.complete });
}
writeFileSync(resolve(dataDir, "s3-summary.json"), JSON.stringify(rows, null, 2) + "\n");
const f2 = (x: unknown) => (typeof x === "number" ? (Number.isNaN(x) ? "-" : x.toFixed(2)) : String(x));
console.log("model | mode | n | valid | grounded | typedP | typedR | kindAcc | neg | ambR | p50s | p95s | tok/s | allGates");
for (const r of rows as Record<string, any>[])
  console.log([r.model, r.mode, r.paragraphs, f2(r.validRate), f2(r.groundedRate), f2(r.typedPrecision), f2(r.typedRecall), f2(r.kindAccuracy), r.negativeControlItems, f2(r.ambiguityRecall), f2(r.latencyP50s), f2(r.latencyP95s), f2(r.tokensPerSec), r.allGates].join(" | "));
console.log(JSON.stringify(rows.map((r: any) => ({ model: r.model, mode: r.mode, gates: r.gates })), null, 1));
