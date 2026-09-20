/** DIAGNOSTIC ONLY (post-hoc, not a gate): precision/recall restricted to kinds whose gold labelling was near-exhaustive. */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CORPUS } from "./corpus.ts";
import { scoreParagraph } from "./score.ts";

const dataDir = resolve(dirname(fileURLToPath(import.meta.url)), "../../../docs/slice0/data");
const KEEP = new Set(["requirement", "constraint", "assumption"]);
const rows: unknown[] = [];
for (const f of readdirSync(dataDir).filter((n) => /^s3-.*-(constrained|unconstrained)\.jsonl$/.test(n)).sort()) {
  let pred = 0, gold = 0, typed = 0;
  for (const l of readFileSync(resolve(dataDir, f), "utf8").split("\n").filter(Boolean)) {
    const r = JSON.parse(l);
    const p = CORPUS.find((c) => c.id === r.id)!;
    const restricted = { ...p, gold: p.gold.filter((g) => KEEP.has(g.kind)), ambiguous: [] };
    gold += restricted.gold.length;
    if (!r.valid || !r.parsed) continue;
    const items = r.parsed.items.filter((i: { kind: string }) => KEEP.has(i.kind));
    const s = scoreParagraph(restricted, items, []);
    pred += s.predicted;
    typed += s.typedMatched;
  }
  const row = { file: f, predicted: pred, gold, typedPrecision: +(typed / pred).toFixed(2), typedRecall: +(typed / gold).toFixed(2) };
  rows.push(row);
  console.log(JSON.stringify(row));
}
writeFileSync(resolve(dataDir, "s3-diagnostic-restricted-kinds.json"), JSON.stringify(rows, null, 2) + "\n");
